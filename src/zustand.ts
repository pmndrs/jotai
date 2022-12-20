import * as JotaiZustand from 'jotai-zustand'

/**
 * @deprecated use `jotai-zustand` instead
 */
export const atomWithStore: typeof JotaiZustand.atomWithStore = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED] use `jotai-zustand` instead.')
  return (JotaiZustand.atomWithStore as any)(...args)
}
