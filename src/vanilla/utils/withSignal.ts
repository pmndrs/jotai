import {
  INTERNAL_isPromiseLike as isPromiseLike,
  INTERNAL_registerAbortHandler as registerAbortHandler,
} from '../internals.ts'
import type { AtomFactory, JoinOptions } from '../typeUtils'

export function withSignal<Opts extends Record<string, unknown> | never>(
  base: AtomFactory<Opts>,
): AtomFactory<JoinOptions<Opts, { signal: AbortSignal }>> {
  function atomWithSignal(...args: [unknown?, unknown?]): unknown {
    const [read, write] = args
    if (typeof read === 'function') {
      return base((get, options: Record<string, unknown> = {} as any) => {
        let controller: AbortController | undefined
        if (!('signal' in options)) {
          Object.defineProperty(options, 'signal', {
            get: () => {
              if (!controller) {
                controller = new AbortController()
              }
              return controller.signal
            },
          })
        }
        const valueOrPromise = (read as any)(get, options)
        try {
          return valueOrPromise
        } finally {
          if (isPromiseLike(valueOrPromise)) {
            registerAbortHandler(valueOrPromise, () => controller?.abort())
          }
        }
      }, write as any)
    }
    return base(...(args as Parameters<typeof base>))
  }
  return atomWithSignal as any
}
