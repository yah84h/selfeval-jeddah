# دليل التقويم المدرسي — تطبيق سطح المكتب

تطبيق مثبَّت (Windows + macOS) لإدارة شواهد التقويم الذاتي للاعتماد المدرسي وفق الدليل الإجرائي:
**4 مجالات → 11 معيارًا → 52 مؤشرًا → 162 شاهدًا مطلوبًا**، مع رفع الملفات، شواهد مخصصة، تقرير إنجاز، نسخ احتياطي، وتحديث ذاتي.

- **البيانات محلية 100%**: قاعدة SQLite + ملفات الشواهد على جهاز المدرسة، بلا أي خادم.
- **التحديث لا يمس البيانات**: البرنامج في مجلد التثبيت، والبيانات في مجلد المستخدم المستقل.
- **زر «التحقق من التحديثات»** يجلب أحدث إصدار من GitHub Releases ويثبّته بعد نسخة احتياطية تلقائية.

## التقنية
| الطبقة | الاختيار | السبب |
|---|---|---|
| الغلاف | Electron 42 + electron-vite 5 | مثبِّت ومحدِّث ناضجان لويندوز وماك |
| الواجهة | React 19 + TypeScript + Tailwind 4 | نفس نمط مشاريعنا السابقة |
| القاعدة | SQLite عبر `sql.js` (WASM) | بلا وحدات أصلية تحتاج إعادة بناء على كل نظام |
| الملفات | نظام الملفات مباشرة (`evidence/<المؤشر>/<الشاهد>/`) | المدرسة ترى ملفاتها من المستكشف |
| التحديث | `electron-updater` + GitHub Releases | زر واحد للعميل، CI يبني المثبِّتات |
| التحقق | `zod` على كل قناة IPC | لا تصل مدخلات غير صالحة إلى الخدمات |

## البنية
```
src/
├─ main/                 # عملية Electron الرئيسية
│  ├─ index.ts           # النافذة، الأمان، بروتوكول evidence://، الصيانة عند التشغيل
│  ├─ db/                # database.ts (sql.js + كتابة ذرّية) · migrations.ts (ترحيلات مرقّمة)
│  ├─ services/          # school · evidence · witness · progress · backup · settings · updater · activity · container
│  └─ ipc/handlers.ts    # معالجات IPC مع تحقق zod
├─ preload/index.ts      # window.api (contextIsolation + sandbox)
├─ renderer/src/         # React
│  ├─ app/Shell.tsx      # الشريط الجانبي والتنقل
│  ├─ pages/             # Dashboard · Standards · Report · Trash · Backup · Settings · About · Onboarding · Lock
│  ├─ features/evidence/ # رفع/حذف/تسمية الشواهد + المعاينة
│  └─ components/ui/     # Button · Card · Dialog · DialogProvider (confirm/prompt)
└─ shared/               # evaluationData.ts (بيانات الدليل) · types.ts · ipc.ts · api.ts
tests/                   # vitest للخدمات + اختبار دخاني حقيقي للتطبيق (Playwright)
docs/                    # release-guide-ar.md · qa-checklist.md
```

## التشغيل
```bash
npm install --legacy-peer-deps
npm run dev            # تطوير
npm test               # 12 اختبار خدمات (قاعدة، ملفات عربية، سلة، نسخ، دمج، PIN)
npm run typecheck
npm run build && npx electron-builder --dir   # تجربة حزمة محلية
```
اختبار دخاني للتطبيق الحقيقي (يتطلب Electron مُنزَّلًا): `node tests/e2e/smoke.mjs`

## مجلد بيانات العميل
- Windows: `%AppData%\selfeval-jeddah\`
- macOS: `~/Library/Application Support/selfeval-jeddah/`

```
settings.json        # إعدادات التثبيت (النسخ التلقائي، رمز القفل)
data/data.db         # SQLite
data/evidence/       # ملفات الشواهد بأسمائها الأصلية
data/trash/          # المحذوفات (30 يومًا)
data/backups/        # النسخ الاحتياطية (يدوية، تلقائية، قبل التحديث، قبل الاستعادة)
```

## النشر
انظر `docs/release-guide-ar.md`. باختصار: عدّل `owner/repo` في `electron-builder.yml`، ثم `npm version patch && git push --tags`.
