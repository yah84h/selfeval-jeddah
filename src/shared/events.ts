// قنوات الأحداث من main إلى renderer (ملف مستقل بلا اعتماديات حتى يصلح لـ preload المعزول)
export const EVENTS = {
  updateStatus: 'event:update-status',
  dataChanged: 'event:data-changed'
} as const
