// المحتوى التعريفي للدليل (الأهداف، المتطلبات، الأدوات، دليل الاستخدام) — منقول من النسخة الأصلية
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, ShieldCheck } from 'lucide-react'
import type { NavTarget } from '@/app/navigation'
import { indicatorCount, witnessCount } from '@shared/evaluationData'
import { Card, SectionHeading } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const goals = [
  ['🎯', 'ترسيخ ثقافة التقويم الذاتي', 'ترسيخ ثقافة التقويم الذاتي في المدرسة'],
  ['📈', 'تعزيز التطوير والتحسين المستمر', 'تعزيز التطوير والتحسين المستمر للأداء وفق نتائج التقويم المدرسي في الدورة الأولى'],
  ['💼', 'دعم الاستثمار الأمثل', 'دعم الاستثمار الأمثل للموارد المادية والبشرية المتاحة في المدرسة'],
  ['🤝', 'تعزيز مشاركة أصحاب المصلحة', 'تعزيز مشاركة أصحاب المصلحة في عمليات تقويم الأداء المدرسي وتطويره'],
  ['💡', 'إيجاد حلول مبتكرة', 'إيجاد حلول مبتكرة وطرق إبداعية لتلبية احتياجات المدرسة ومعالجة مشكلاتها'],
  ['⭐', 'رفع مستوى الجاهزية', 'رفع مستوى جاهزية المدرسة للتقويم الخارجي وتحقيق التميز واستدامته']
]
const requirements = [
  ['تطبيق الأنظمة واللوائح', 'تطبيق الأنظمة واللوائح والتعليمات المرتبطة بالتقويم الذاتي التي تصدرها الهيئة، والعمل بموجبها'],
  ['إعداد خطط التحسين', 'إعداد خطط التحسين في ضوء نتائج التقويم الذاتي، وتنفيذها، ومتابعة التطوير والاستدامة'],
  ['تطبيق عمليات التقويم', 'تطبيق عمليات التقويم الذاتي وفقاً لمعايير تقويم المدارس ومؤشراتها المعتمدة من الهيئة'],
  ['التزام أخلاقيات التقويم', 'التزام أخلاقيات التقويم والأمانة العلمية في تطبيق عمليات التقويم الذاتي'],
  ['تنفيذ برامج تدريبية', 'تنفيذ برنامج تدريبي لأعضاء فريق التقويم الذاتي على تطبيق المعايير والأدوات المتاحة'],
  ['المحافظة على السرية', 'المحافظة على سرية كافة البيانات، وعدم الإفصاح عن نتائج التقويم الذاتي'],
  ['رفع البيانات', 'تطبيق عمليات التقويم الذاتي وجمع البيانات، ورفعها على منصة تميز الرقمية للتقويم']
]
const tools = [
  ['📄', 'وثائقي', 'تحليل الوثائق', 'تحليل وثائق المدرسة'],
  ['📋', 'استقصائي', 'الاستبانات', 'استبانة المتعلم، استبانة المعلم، استبانة الأسرة'],
  ['👁️', 'ملاحظة', 'الملاحظات', 'الملاحظة الصفية، ملاحظة البيئة التعليمية'],
  ['💬', 'حوار', 'المقابلات', 'مقابلة المتعلمين، مقابلة المعلمين، مقابلة الموجه الطلابي، مقابلة الإدارة'],
  ['📊', 'تقييم', 'الاختبارات الوطنية', 'اختبارات نافس للمرحلة الابتدائية والمتوسطة'],
  ['📚', 'تطوير مهني', 'نظام الرخص المهنية', 'نظام الرخص المهنية للمعلمين']
]
const steps = [
  ['01', 'إعداد ملف المدرسة', 'عند أول تشغيل اكتب اسم المدرسة وبياناتها. تُحفظ على هذا الجهاز فقط، ويمكن تعديلها من الإعدادات.'],
  ['02', 'رفع الشواهد', 'من «المجالات والمعايير» اختر المجال ثم المعيار ثم افتح المؤشر. تحت كل وثيقة مطلوبة اضغط «رفع شاهد» أو اسحب الملفات إليها مباشرة.'],
  ['03', 'المعاينة والتعديل والحذف', 'عاين PDF والصور داخل البرنامج، وافتح ملفات Office بالبرنامج الافتراضي. الحذف ينقل الملف إلى سلة المحذوفات (30 يومًا) ويمكن استعادته. «تعديل» يغيّر مسمى الوثيقة في ملف مدرستك فقط.'],
  ['04', 'التقرير والنسخ الاحتياطي والتحديث', 'من «تقرير الإنجاز» اطبع أو احفظ PDF. من «النسخ الاحتياطي» أنشئ نسخة واحفظها خارج الجهاز. من «الإعدادات والتحديث» اضغط «التحقق من التحديثات» للحصول على أحدث إصدار دون المساس ببياناتك.']
]

export function AboutPage({ onNavigate }: { onNavigate: (t: NavTarget) => void }) {
  return (
    <>
      <SectionHeading eyebrow="دليل شامل للتقويم الذاتي" title="دليل التقويم الذاتي المدرسي" description="الدليل الإجرائي للتقويم المدرسي الذاتي للاعتماد المدرسي — المعايير والمؤشرات والأدوات اللازمة لتطبيق التقويم الذاتي."
        action={<Button variant="teal" onClick={() => onNavigate({ page: 'standards' })}>ابدأ الاستكشاف <ArrowLeft size={16} /></Button>} />

      <Card className="mb-6 bg-gradient-to-l from-primary to-[#7139db] p-6 text-white">
        <div className="grid grid-cols-3 gap-4 text-center">
          {[['4', 'مجالات رئيسية'], [String(indicatorCount), 'مؤشرًا تفصيليًا'], [String(witnessCount), 'شاهدًا مطلوبًا']].map(([n, l]) => <div key={l}><div className="text-3xl font-extrabold">{n}</div><div className="text-sm text-white/80">{l}</div></div>)}
        </div>
      </Card>

      <Section n="01" eyebrow="🎯 لماذا التقويم الذاتي؟" title="أهداف التقويم الذاتي">
        <div className="grid grid-cols-3 gap-3">
          {goals.map(([icon, title, text], i) => <Card key={title} className="p-4"><div className="flex items-center justify-between"><span className="text-2xl">{icon}</span><span className="text-xs font-bold text-muted">{String(i + 1).padStart(2, '0')}</span></div><h3 className="mt-2 text-sm font-extrabold">{title}</h3><p className="mt-1 text-xs leading-6 text-muted">{text}</p></Card>)}
        </div>
        <Card className="mt-3 border-primary-line bg-primary-soft p-4 text-sm leading-7"><b>📌 الهدف العام:</b> يهدف التقويم الذاتي إلى تمكين المدرسة من التعرف بذاتها على دوافع القوة وفرص التحسين لديها، وتحقيق التطوير والتحسين المستمر.</Card>
      </Section>

      <Section n="02" eyebrow="✅ طريق النجاح" title="متطلبات تطبيق التقويم الذاتي">
        <Card className="divide-y divide-line">
          {requirements.map(([title, text], i) => <div key={title} className="flex items-start gap-3 px-5 py-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-soft text-xs font-extrabold text-teal">{i + 1}</span><div className="flex-1"><b className="text-sm">{title}</b><p className="text-xs leading-6 text-muted">{text}</p></div><CheckCircle2 size={16} className="text-teal" /></div>)}
        </Card>
        <Card className="mt-3 flex items-start gap-3 border-warn/30 bg-warn-soft p-4 text-sm leading-7"><ShieldCheck size={22} className="shrink-0 text-warn" /><div><b>ملاحظة مهمة:</b> يتطلب تطبيق التقويم الذاتي للدورة الثانية وفق مستهدفات خطة التحسين للدورة الأولى. تمر العمليات بثلاث مراحل: الإعداد والتهيئة، ثم التنفيذ، ثم الإغلاق.</div></Card>
      </Section>

      <Section n="03" eyebrow="🛠️ منهجية جمع البيانات" title="أدوات التقويم">
        <div className="grid grid-cols-3 gap-3">
          {tools.map(([icon, category, title, text]) => <Card key={title} className="p-4"><div className="flex items-center justify-between"><span className="text-2xl">{icon}</span><span className="rounded-full bg-blue-soft px-2 py-0.5 text-[11px] font-bold text-blue">{category}</span></div><h3 className="mt-2 text-sm font-extrabold">{title}</h3><p className="mt-1 text-xs leading-6 text-muted">{text}</p></Card>)}
        </div>
      </Section>

      <Section n="04" eyebrow="🧭 خطوة بخطوة" title="دليل الاستخدام">
        <div className="space-y-3">
          {steps.map(([n, title, text]) => <Card key={n} className="flex items-start gap-4 p-4"><span className="text-2xl font-extrabold text-primary-line">{n}</span><div><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-1 text-sm leading-7 text-muted">{text}</p></div></Card>)}
        </div>
      </Section>

      <Card className="mt-6 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary"><GraduationCap size={26} /></div>
        <p className="mt-3 text-xs font-bold text-teal">من إعداد</p>
        <h2 className="text-lg font-extrabold">مدرسة الموهوبين التقنية الثانوية بنين بجدة</h2>
        <p className="text-sm text-muted">الإدارة العامة للتعليم بمحافظة جدة — إدارة تنمية القدرات، قسم الموهوبين · تحت إشراف الدكتور محمود بن علي العسيري</p>
        <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted"><BookOpen size={12} /> © 1447هـ</p>
      </Card>
    </>
  )
}

function Section({ n, eyebrow, title, children }: { n: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-3"><span className="text-3xl font-extrabold text-primary-line">{n}</span><div><p className="text-xs font-bold text-teal">{eyebrow}</p><h2 className="text-lg font-extrabold">{title}</h2></div></div>
      {children}
    </section>
  )
}
