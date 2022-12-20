import * as JotaiOptics from 'jotai-optics'

/**
 * @deprecated use `jotai-optics` instead
 */
export const focusAtom: typeof JotaiOptics.focusAtom = (...args: any[]) => {
  console.warn('[DEPRECATED] use `jotai-optics` instead.')
  return (JotaiOptics.focusAtom as any)(...args)
}
