// شعار التطبيق (رسم SVG مضمّن — يعمل دون إنترنت). ضع شعار الجهة الرسمي في assets/logo.png واستبدله هنا عند الحاجة.
import logoUrl from '@/assets/logo.svg'

export function Logo({ size = 40 }: { size?: number }) {
  return <img src={logoUrl} width={size} height={size} alt="دليل التقويم المدرسي" className="shrink-0 rounded-xl" />
}
