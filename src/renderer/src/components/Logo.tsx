// شعار وزارة التعليم (مضمّن محليًا — يعمل دون إنترنت)
import logoUrl from '@/assets/moe-logo.png'

export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  // الشعار عريض؛ size يحدد الارتفاع
  return <img src={logoUrl} height={size} style={{ height: size, width: 'auto' }} alt="وزارة التعليم" className={`shrink-0 ${className}`} />
}
