import * as JotaiDevtools from 'jotai-devtools'

/**
 * @deprecated use `jotai-devtools` instead.
 */
export const useAtomsDebugValue: typeof JotaiDevtools.useAtomsDebugValue = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED]: use `jotai-devtools` instead.')
  return (JotaiDevtools.useAtomsDebugValue as any)(...args)
}

/**
 * @deprecated use `jotai-devtools` instead.
 */
export const useAtomDevtools: typeof JotaiDevtools.useAtomDevtools = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED]: use `jotai-devtools` instead.')
  return (JotaiDevtools.useAtomDevtools as any)(...args)
}

/**
 * @deprecated use `jotai-devtools` instead.
 */
export const useAtomsSnapshot: typeof JotaiDevtools.useAtomsSnapshot = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED]: use `jotai-devtools` instead.')
  return (JotaiDevtools.useAtomsSnapshot as any)(...args)
}

/**
 * @deprecated use `jotai-devtools` instead.
 */
export const useGotoAtomsSnapshot: typeof JotaiDevtools.useGotoAtomsSnapshot = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED]: use `jotai-devtools` instead.')
  return (JotaiDevtools.useGotoAtomsSnapshot as any)(...args)
}

/**
 * @deprecated use `jotai-devtools` instead.
 */
export const useAtomsDevtools: typeof JotaiDevtools.useAtomsDevtools = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED]: use `jotai-devtools` instead.')
  return (JotaiDevtools.useAtomsDevtools as any)(...args)
}
