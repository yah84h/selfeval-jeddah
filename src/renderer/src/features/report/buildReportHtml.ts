// يبني HTML مستقلًا للتقرير الرسمي (للتصدير PDF عبر نافذة مخفية في main)
import type { ProgressReport, School } from '@shared/types'
import { buildEvidenceLog, defaultReportOptions, gregDate, hijriDate, readinessLabel, reportRef, type ReportOptions } from './reportModel'

const esc = (s: string): string => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string)
const size = (n: number): string => (n < 1024 * 1024 ? `${Math.ceil(n / 1024)} كيلوبايت` : `${(n / 1024 / 1024).toFixed(1)} ميجابايت`)
const dateOnly = (iso: string): string => new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', numberingSystem: 'latn' }).format(new Date(iso))

export function buildReportHtml(progress: ProgressReport, school: School | null, version: string, opt: ReportOptions = defaultReportOptions): string {
  const ref = reportRef(school)
  const log = opt.includeEvidenceLog ? buildEvidenceLog(progress) : []

  const domainBars = progress.domains.map(d => {
    const pct = d.total ? Math.round((d.completed / d.total) * 100) : 0
    const na = d.criteria.reduce((s, c) => s + c.indicators.filter(i => i.notApplicable).length, 0)
    return `<div class="bar"><div class="bar-head"><b>${d.id}. ${esc(d.name)}</b><span>${d.completed}/${d.total} منجز <strong>${pct}%</strong></span></div><div class="line"><i style="width:${pct}%"></i></div><small>المتبقي: ${d.total - d.completed} شاهد${na ? ` · ${na} مؤشر لا ينطبق` : ''}</small></div>`
  }).join('')

  const detail = progress.domains.map(d => `
    <section class="domain">
      <h2>${d.icon} المجال ${d.id}: ${esc(d.name)} <span class="pct">${d.completed}/${d.total}</span></h2>
      ${d.criteria.map(c => {
        const visible = c.indicators.filter(i => !i.notApplicable)
        const na = c.indicators.filter(i => i.notApplicable)
        const indicators = opt.scope === 'missing' ? visible.filter(i => i.completed < i.total) : visible
        if (!indicators.length && !na.length) return ''
        return `
        <h3>${esc(c.id)} — ${esc(c.name)} <span class="pct">${c.completed}/${c.total}</span></h3>
        ${indicators.map(i => `
          <div class="ind">
            <div class="ind-title"><code>${esc(i.displayCode.replace(/[()]/g, ''))}</code><span>${esc(i.text)}</span><b>${i.completed}/${i.total}</b></div>
            <ul>${i.witnesses.filter(w => opt.scope === 'all' || (!w.complete && !w.excluded)).map(w => `<li class="${w.excluded ? 'na' : w.complete ? 'ok' : 'no'}"><i>${w.excluded ? '–' : w.complete ? '✓' : '!'}</i>${esc(w.displayName)}${w.isCustom ? ' <small>(مخصص)</small>' : ''}${opt.includeFileNames && w.files.length ? ` <small class="files">— ${esc(w.files.map(f => f.fileName).join('، '))}</small>` : ''}<em>${w.excluded ? `لا ينطبق${opt.showExcludedReasons && w.excludeReason ? ` — ${esc(w.excludeReason)}` : ''}` : w.complete ? `${w.files.length} ملف` : 'ناقص'}</em></li>`).join('')}</ul>
          </div>`).join('')}
        ${na.length && opt.scope === 'all' ? `<p class="na-note">مؤشرات لا تنطبق على المدرسة (مستبعدة): ${na.map(i => `${esc(i.code)} ${esc(i.text)}${opt.showExcludedReasons && i.excludeReason ? ` — ${esc(i.excludeReason)}` : ''}`).join(' · ')}</p>` : ''}`
      }).join('')}
    </section>`).join('')

  const logTable = log.length ? `
    <section class="log">
      <h2 class="plain">سجل مطابقة الشواهد والوثائق المرفقة <span class="pct">آخر ${log.length} وثيقة من أصل ${progress.uploadedFiles}</span></h2>
      <table><thead><tr><th>رمز المؤشر</th><th>عنوان الشاهد</th><th>اسم الملف المحلي</th><th>الحجم</th><th>تاريخ التوثيق</th><th>الحالة</th></tr></thead>
      <tbody>${log.map(r => `<tr><td><code>${esc(r.code.replace(/[()]/g, ''))}</code><br><small>معيار ${esc(r.criterion)}</small></td><td><b>${esc(r.witness)}</b></td><td class="mono" dir="ltr">${esc(r.file.fileName)}</td><td>${size(r.file.fileSize)}</td><td>${dateOnly(r.file.createdAt)}</td><td><span class="pill">مكتمل وموثق</span></td></tr>`).join('')}</tbody></table>
    </section>` : ''

  const signatures = opt.includeSignatures ? `
    <section class="sign">
      <h2 class="plain">إقرار واعتماد لجنة التقويم الذاتي بالمدرسة</h2>
      <p>نقر نحن الموقعين أدناه بصحة واكتمال الشواهد والوثائق المرفقة في هذا التقرير، وأنها تمثل الواقع التعليمي والتربوي الفعلي للمدرسة للعام الدراسي الحالي، وجاهزة للعرض والمطابقة من قبل أخصائي التقويم الخارجي.</p>
      <div class="sign-grid">
        <div><small>رئيس فريق التقويم الذاتي / المنسق</small><b>${esc(school?.coordinator || '……………………')}</b><div class="sig">التوقيع: ………………… التاريخ: …… / …… / 14……هـ</div></div>
        <div><small>قائد المدرسة والمشرف العام</small><b>${esc(school?.principal || '……………………')}</b><div class="sig">التوقيع: ………………… الختم الرسمي</div></div>
        <div><small>مرجع التحقق المحلي</small><b class="mono" dir="ltr">${esc(ref)}</b><div class="sig">أُنشئ بواسطة دليل التقويم المدرسي v${esc(version)} — ${progress.uploadedFiles} ملف موثق محليًا</div></div>
      </div>
    </section>` : ''

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير التقويم المدرسي</title>
<style>
  body{font-family:"Tajawal","Segoe UI",Tahoma,Arial,sans-serif;color:#29233c;margin:0;font-size:11.5px}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #4b20b8;padding-bottom:10px}
  header .org{font-size:10.5px;line-height:1.7;color:#716b82} header .org b{color:#29233c;display:block}
  header .ttl{text-align:center} header .ttl h1{margin:4px 0 2px;font-size:17px;color:#4b20b8} header .ttl p{margin:0;font-size:10px;color:#716b82}
  header .ref{font-size:10.5px;line-height:1.7;color:#716b82;text-align:left} header .ref b{color:#29233c}
  .mono{font-family:Consolas,Menlo,monospace}
  .school{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#f5f2fc;border-radius:10px;padding:8px 10px;margin:12px 0}
  .school small{display:block;color:#716b82;font-size:10px} .school b{font-size:11.5px}
  .summary{display:grid;grid-template-columns:200px 1fr;gap:12px;margin-bottom:14px}
  .ring{border:1px solid #e5e0ee;border-radius:12px;padding:12px;text-align:center;background:#f7f4fd}
  .ring .big{font-size:34px;font-weight:800;color:#4b20b8;margin:6px 0 0} .ring small{display:block;color:#716b82;font-size:10px}
  .ring .pill{margin-top:8px}
  .bars{border:1px solid #e5e0ee;border-radius:12px;padding:10px 12px}
  .bars h3{margin:0 0 6px;font-size:12px;border:0;color:#29233c}
  .bar{margin:6px 0} .bar-head{display:flex;justify-content:space-between;font-size:11px} .bar-head strong{color:#4b20b8}
  .line{height:5px;border-radius:99px;background:#ebe7f5;overflow:hidden;margin-top:3px} .line i{display:block;height:100%;background:linear-gradient(90deg,#08aaa5,#4b20b8)}
  .bar small{color:#716b82;font-size:9.5px}
  .pill{display:inline-block;background:#c8f3ef;color:#0b6f6b;border-radius:99px;padding:2px 8px;font-size:10px;font-weight:700}
  .domain{break-inside:avoid-page;margin-bottom:10px}
  h2{background:#ece6fa;color:#4b20b8;padding:6px 10px;border-radius:8px;font-size:13px;margin:12px 0 6px}
  h2.plain{background:none;padding:0;color:#29233c;border-bottom:1px solid #e5e0ee;border-radius:0}
  h3{color:#08aaa5;font-size:12px;margin:8px 0 4px;border-bottom:1px solid #e5e0ee;padding-bottom:3px}
  .pct{float:left;font-weight:700;font-size:10.5px;color:#716b82}
  .ind{margin:4px 0 8px;break-inside:avoid}
  .ind-title{display:flex;gap:8px;align-items:flex-start;font-weight:700}
  .ind-title code{background:#ece6fa;color:#4b20b8;border-radius:5px;padding:1px 6px;font-size:10px;white-space:nowrap}
  .ind-title span{flex:1} .ind-title b{color:#716b82;font-size:10.5px}
  ul{list-style:none;margin:4px 0 0;padding:0 18px 0 0}
  li{display:flex;gap:6px;align-items:center;padding:2px 0;font-size:11px}
  li i{font-style:normal;width:15px;height:15px;border-radius:50%;display:inline-grid;place-items:center;font-size:9.5px;font-weight:800;flex-shrink:0}
  li.ok i{background:#e6f8f1;color:#0f9d6e} li.no i{background:#fdeef1;color:#d1364f} li.na{opacity:.6;text-decoration:line-through} li.na i{background:#fff6e5;color:#c77d05}
  li em{font-style:normal;color:#716b82;font-size:10px;margin-right:auto} li small{color:#4b20b8} li small.files{color:#716b82}
  .na-note{color:#716b82;font-size:10px;margin:2px 0 6px}
  table{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:6px} th{background:#f5f2fc;color:#716b82;text-align:right;padding:5px 6px;font-weight:700} td{padding:5px 6px;border-bottom:1px solid #eee9f6;vertical-align:top} td code{color:#4b20b8;font-weight:700} td small{color:#716b82;font-size:9.5px}
  .sign{margin-top:14px;border:1px solid #e5e0ee;border-radius:12px;padding:10px 12px;background:#faf8fe;break-inside:avoid}
  .sign p{font-size:10.5px;color:#716b82;line-height:1.7;margin:4px 0 8px}
  .sign-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .sign-grid div{background:#fff;border:1px solid #e5e0ee;border-radius:8px;padding:8px}
  .sign-grid small{display:block;color:#716b82;font-size:10px} .sign-grid b{display:block;margin-top:2px;font-size:11.5px}
  .sign-grid .sig{margin-top:18px;border-top:1px dashed #e5e0ee;padding-top:4px;font-size:9.5px;color:#716b82;border:0;border-top:1px dashed #e5e0ee;border-radius:0;background:none;padding-left:0;padding-right:0}
  footer{margin-top:14px;border-top:1px solid #e5e0ee;padding-top:6px;color:#716b82;font-size:9.5px;display:flex;justify-content:space-between}
</style></head><body>
<header>
  <div class="org"><b>المملكة العربية السعودية</b>وزارة التعليم<br>الإدارة العامة للتعليم بمحافظة جدة<br>إدارة الجودة والاعتماد المدرسي</div>
  <div class="ttl"><h1>تقرير جاهزية وشواهد التقويم المدرسي</h1><p>مطابق لمعايير هيئة تقويم التعليم والتدريب (الإصدار المحلي v${esc(version)})</p></div>
  <div class="ref"><b>REF:</b> <span class="mono">${esc(ref)}</span><br><b>التاريخ:</b> ${gregDate()}<br><b>الهجري:</b> ${hijriDate()}<br><span style="color:#0f9d6e">✓ Verified Local Copy</span></div>
</header>
<div class="school">
  <div><small>اسم المنشأة التعليمية</small><b>${esc(school?.name ?? '')}</b></div>
  <div><small>الرقم الوزاري المعتمد</small><b class="mono">${esc(school?.ministryNumber || '—')}</b></div>
  <div><small>المرحلة ونوع التعليم</small><b>${esc([school?.stage, school?.gender].filter(Boolean).join(' - ') || '—')}</b></div>
  <div><small>قائد المدرسة / منسق التقويم</small><b>${esc([school?.principal, school?.coordinator].filter(Boolean).join(' / ') || '—')}</b></div>
</div>
<div class="summary">
  <div class="ring"><small>المؤشر العام لاكتمال الشواهد</small><div class="big">${progress.percent}%</div><small>${progress.completed} من أصل ${progress.total}</small><span class="pill">✓ ${esc(readinessLabel(progress.percent))}</span></div>
  <div class="bars"><h3>التوزيع الإحصائي وفق المجالات الأربعة</h3>${domainBars}</div>
</div>
<h2 class="plain">تفصيل المعايير والمؤشرات والشواهد</h2>
${detail}
${logTable}
${signatures}
<footer><span>مسار التخزين المحلي المعتمد — دليل التقويم المدرسي v${esc(version)}</span><span>${esc(school?.name ?? '')}</span></footer>
</body></html>`
}
