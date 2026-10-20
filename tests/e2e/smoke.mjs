// اختبار دخاني: يشغّل التطبيق المبني فعليًا (Electron) في بيئة مؤقتة ويتحقق من الواجهة والـ IPC
import { _electron as electron } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "selfeval-e2e-"));
const sample = path.join(tmpHome, "سجل الخطة التشغيلية.pdf");
fs.writeFileSync(sample, "%PDF-1.4 smoke");

const app = await electron.launch({
  args: [".", "--no-sandbox"],
  env: {
    ...process.env,
    HOME: tmpHome,
    XDG_CONFIG_HOME: path.join(tmpHome, ".config"),
    ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
  },
});
const errors = [];
const win = await app.firstWindow();
win.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
win.on("pageerror", (e) => errors.push(String(e)));
await win.waitForLoadState("domcontentloaded");

const check = (cond, label) => {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) process.exitCode = 1;
};

// 1) شاشة الإعداد الأولي
await win.getByText("إعداد ملف المدرسة").waitFor({ timeout: 15000 });
check(true, "شاشة الإعداد الأولي تظهر");
await win
  .getByPlaceholder("مثال: مدرسة الموهوبين التقنية الثانوية")
  .fill("مدرسة الاختبار الدخاني");
await win.getByRole("button", { name: "إنشاء الملف والبدء" }).click();
await win
  .getByText("الرئيسية والإحصائيات", { exact: true })
  .first()
  .waitFor({ timeout: 10000 });
check(true, "إنشاء ملف المدرسة والانتقال إلى لوحة التحكم");

// 2) IPC: معلومات التطبيق + رفع ملف عبر المسار + الإنجاز
const info = await win.evaluate(() => window.api.app.info());
check(
  info.schemaVersion >= 1 && info.dataDir.length > 0,
  `معلومات التطبيق (إصدار ${info.version}، مجلد البيانات موجود)`,
);
const added = await win.evaluate(
  (p) =>
    window.api.evidence.addFromPaths({
      indicatorCode: "(1-1-1-1)",
      witnessName: "سجل الخطة التشغيلية",
      paths: [p],
    }),
  sample,
);
check(
  added.added.length === 1 && added.errors.length === 0,
  "رفع شاهد عبر IPC",
);
const progress = await win.evaluate(() => window.api.progress.get());
check(
  progress.completed === 1 && progress.uploadedFiles === 1,
  `الإنجاز يُحدَّث (${progress.completed}/${progress.total})`,
);
check(
  fs.existsSync(
    path.join(
      info.dataDir,
      "evidence",
      "1-1-1-1",
      "سجل الخطة التشغيلية",
      "سجل الخطة التشغيلية.pdf",
    ),
  ),
  "الملف محفوظ باسمه العربي في مجلد البيانات",
);

// 3) الواجهة تعكس التغيير (حدث dataChanged)
await win.getByText("المجالات والمعايير").click();
await win.locator("text=تضع المدرسة خطة تشغيلية").first().click();
await win
  .getByText("سجل الخطة التشغيلية.pdf")
  .first()
  .waitFor({ timeout: 10000 });
check(true, "الملف يظهر تحت المؤشر في الواجهة");

// 4) المعاينة عبر بروتوكول evidence://
const url = await win.evaluate(
  (id) => window.api.evidence.previewUrl(id),
  added.added[0].id,
);
const loaded = await win.evaluate(
  (u) =>
    new Promise((res) => {
      const f = document.createElement("iframe");
      f.src = u;
      f.onload = () => res(true);
      f.onerror = () => res(false);
      document.body.appendChild(f);
      setTimeout(() => res(false), 5000);
    }),
  url,
);
check(
  loaded,
  `بروتوكول المعاينة يعمل (${url.split("/").slice(0, 3).join("/")}/…)`,
);

// 5) نسخة احتياطية واستعادة بالدمج
const backup = await win.evaluate(() => window.api.backup.create());
check(backup.size > 0 && fs.existsSync(backup.path), "إنشاء نسخة احتياطية");
const restored = await win.evaluate(
  (p) => window.api.backup.restore({ path: p, mode: "merge" }),
  backup.path,
);
check(
  restored.skippedEvidence === 1 && restored.addedEvidence === 0,
  "الاستعادة بالدمج لا تكرر الملفات",
);

// 6) حالة التحديث (وضع التطوير لأن التطبيق غير مُحزَّم)
const upd = await win.evaluate(() => window.api.update.check());
check(upd.state === "dev", `آلية التحديث تستجيب (${upd.state})`);

// 7) الصفحات تفتح بلا أخطاء
for (const label of [
  "تقرير الإنجاز والطباعة",
  "سلة المحذوفات",
  "النسخ الاحتياطي والاستعادة",
  "الإعدادات والتحديث",
  "عن الدليل",
]) {
  await win.getByRole("button", { name: label }).click();
  await win.waitForTimeout(250);
}
check(true, "كل الصفحات تفتح");
await win.screenshot({
  path: path.join(process.cwd(), "tests", "e2e", "last-run.png"),
});

check(
  errors.length === 0,
  errors.length
    ? `أخطاء في الواجهة: ${errors.join(" | ")}`
    : "لا أخطاء في console",
);
await app.close();
fs.rmSync(tmpHome, { recursive: true, force: true });
console.log(process.exitCode ? "FAILED" : "SMOKE OK");
