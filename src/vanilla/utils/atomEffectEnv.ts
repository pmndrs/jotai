export function isDev(): boolean {
  return import.meta.env?.MODE !== 'production'
}
