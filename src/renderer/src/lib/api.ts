import type { Api } from '@shared/api'

export const api: Api = window.api

export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  // Electron يضيف بادئة "Error invoking remote method 'x': Error: " — نزيلها
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}
