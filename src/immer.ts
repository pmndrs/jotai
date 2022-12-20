import * as JotaiImmer from 'jotai-immer'

/**
 * @deprecated use `jotai-immer` instead.
 */
export const atomWithImmer: typeof JotaiImmer.atomWithImmer = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED]: use `jotai-immer` instead.')
  return (JotaiImmer.atomWithImmer as any)(...args)
}

/**
 * @deprecated use `jotai-immer` instead.
 */
export const useImmerAtom: typeof JotaiImmer.useImmerAtom = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED]: use `jotai-immer` instead.')
  return (JotaiImmer.useImmerAtom as any)(...args)
}

/**
 * @deprecated use `jotai-immer` instead.
 */
export const withImmer: typeof JotaiImmer.withImmer = (...args: any[]) => {
  console.warn('[DEPRECATED]: use `jotai-immer` instead.')
  return (JotaiImmer.withImmer as any)(...args)
}
