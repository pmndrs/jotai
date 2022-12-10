export { RESTART } from 'jotai-xstate'

import * as JotaiXstate from 'jotai-xstate'

export const atomWithMachine: typeof JotaiXstate.atomWithMachine = (
  ...args: any[]
) => {
  console.warn('[DEPRECATED] use `jotai-xstate` instead.')
  return (JotaiXstate.atomWithMachine as any)(...args)
}
