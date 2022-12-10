import * as JotaiValtio from 'jotai-valtio'

/**
 * @deprecated use `jotai-valtio` instead
 */
export const atomWithProxy: typeof JotaiValtio.atomWithProxy = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED] use `jotai-valtio` instead.')
  return (JotaiValtio.atomWithProxy as any)(...args)
}
