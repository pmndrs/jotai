import * as JotaiRedux from 'jotai-redux'

/**
 * @deprecated use `jotai-redux` instead
 */
export const atomWithStore: typeof JotaiRedux.atomWithStore = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED] use `jotai-redux` instead.')
  return (JotaiRedux.atomWithStore as any)(...args)
}
