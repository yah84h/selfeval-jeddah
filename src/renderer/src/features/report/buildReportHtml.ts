// يبني HTML مستقلًا للتقرير (للتصدير PDF عبر نافذة مخفية في main)
import type { ProgressReport, School } from '@shared/types'

const esc = (s: string): string => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string)

export function buildReportHtml(progress: ProgressReport, school: School | null, version: string): string {
  const date = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long', numberingSystem: 'latn' }).format(new Date())
  const domainRows = progress.domains.map(d => `
    <section class="domain">
      <h2>${d.icon} المجال ${d.id}: ${esc(d.name)} <span class="pct">${d.completed}/${d.total} · ${d.total ? Math.round((d.completed / d.total) * 100) : 0}%</span></h2>
      ${d.criteria.map(c => `
        <h3>${esc(c.id)} — ${esc(c.name)} <span class="pct">${c.completed}/${c.total}</span></h3>
        ${c.indicators.map(i => `
          <div class="ind">
            <div class="ind-title"><code>${esc(i.code)}</code><span>${esc(i.text)}</span><b>${i.completed}/${i.total}</b></div>
            <ul>${i.witnesses.map(w => `<li class="${w.complete ? 'ok' : 'no'}"><i>${w.complete ? '✓' : '!'}</i>${esc(w.displayName)}${w.isCustom ? ' <small>(مخصص)</small>' : ''}<em>${w.complete ? `${w.files.length} ملف` : 'ناقص'}</em></li>`).join('')}</ul>
          </div>`).join('')}
      `).join('')}
    </section>`).join('')

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير التقويم الذاتي</title>
<style>
  body{font-family:"Tajawal","Segoe UI",Tahoma,Arial,sans-serif;color:#29233c;margin:0;font-size:12px}
  header{border-bottom:3px solid #4b20b8;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end}
  h1{margin:0;font-size:20px;color:#4b20b8} .meta{color:#716b82;font-size:11px;line-height:1.7}
  .summary{display:flex;gap:10px;margin:12px 0 18px}
  .summary div{flex:1;border:1px solid #e5e0ee;border-radius:10px;padding:8px 10px}
  .summary b{display:block;font-size:20px} .summary span{color:#716b82;font-size:11px}
  .domain{break-inside:avoid-page;margin-bottom:14px}
  h2{background:#f4f0ff;color:#4b20b8;padding:7px 10px;border-radius:8px;font-size:14px;margin:12px 0 6px}
  h3{color:#08aaa5;font-size:12.5px;margin:10px 0 4px;border-bottom:1px solid #e5e0ee;padding-bottom:3px}
  .pct{float:left;font-weight:700;font-size:11px;color:#716b82}
  .ind{margin:4px 0 8px;break-inside:avoid}
  .ind-title{display:flex;gap:8px;align-items:flex-start;font-weight:700}
  .ind-title code{background:#eef4ff;color:#3b82f6;border-radius:5px;padding:1px 6px;font-size:10.5px;white-space:nowrap}
  .ind-title span{flex:1} .ind-title b{color:#716b82;font-size:11px}
  ul{list-style:none;margin:4px 0 0;padding:0 18px 0 0}
  li{display:flex;gap:6px;align-items:center;padding:2px 0;font-size:11.5px}
  li i{font-style:normal;width:16px;height:16px;border-radius:50%;display:inline-grid;place-items:center;font-size:10px;font-weight:800}
  li.ok i{background:#e6f8f1;color:#0f9d6e} li.no i{background:#fdeef1;color:#d1364f}
  li em{font-style:normal;color:#716b82;font-size:10.5px;margin-right:auto} li small{color:#4b20b8}
  footer{margin-top:16px;border-top:1px solid #e5e0ee;padding-top:6px;color:#716b82;font-size:10px;display:flex;justify-content:space-between}
</style></head><body>
<header>
  <div><h1>تقرير إنجاز التقويم الذاتي المدرسي</h1><div class="meta">${esc(school?.name ?? '')}${school?.ministryNumber ? ` · الرقم الوزاري ${esc(school.ministryNumber)}` : ''}${school?.principal ? `<br>قائد المدرسة: ${esc(school.principal)}` : ''}${school?.coordinator ? ` · منسق التقويم: ${esc(school.coordinator)}` : ''}</div></div>
  <div class="meta">تاريخ التقرير: ${date}</div>
</header>
<div class="summary">
  <div><b>${progress.percent}%</b><span>نسبة الإنجاز</span></div>
  <div><b>${progress.completed}</b><span>وثائق مكتملة</span></div>
  <div><b>${progress.total - progress.completed}</b><span>وثائق ناقصة</span></div>
  <div><b>${progress.total}</b><span>إجمالي الوثائق</span></div>
  <div><b>${progress.uploadedFiles}</b><span>ملفات مرفوعة</span></div>
</div>
${domainRows}
<footer><span>دليل التقويم الذاتي المدرسي — الإصدار ${esc(version)}</span><span>مدرسة الموهوبين التقنية الثانوية بنين بجدة</span></footer>
</body></html>`
}
