import { atom } from 'jotai'
import type { PrimitiveAtom } from 'jotai'
import { createMemoizeAtom } from '../utils/weakCache'

type Config = {
  instanceID?: number
  name?: string
  serialize?: boolean
  actionCreators?: any
  latency?: number
  predicate?: any
  autoPause?: boolean
}

type Message = {
  type: string
  payload?: any
  state?: any
}

type ConnectionResult = {
  subscribe: (dispatch: any) => () => void
  unsubscribe: () => void
  send: (action: string, state: any) => void
  init: (state: any) => void
  error: (payload: any) => void
}

type Extension = {
  connect: (options?: Config) => ConnectionResult
}

type Options = { name?: string }

const memoizeAtom = createMemoizeAtom()

const getExtension = (): Extension | undefined => {
  try {
    return (window as any).__REDUX_DEVTOOLS_EXTENSION__ as Extension
  } catch (e) {
    if (
      typeof process === 'object' &&
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined'
    ) {
      console.warn('Please install/enable Redux devtools extension')
    }
  }
}

export function devtoolsAtom<Value>(
  anAtom: PrimitiveAtom<Value>,
  options?: Options
): PrimitiveAtom<Value> {
  return memoizeAtom(() => {
    const extension = getExtension()

    const getName = () =>
      options?.name ||
      derivedAtom.debugLabel ||
      anAtom.debugLabel ||
      anAtom.toString()

    const refAtom = atom<{
      devtools?: ConnectionResult
      unsubscribe?: () => void
      isTimeTraveling?: boolean
    }>(() => ({}))

    const listenerAtom = atom(null, (get, set, action: 'init' | 'cleanup') => {
      if (!extension) {
        return
      }
      const ref = get(refAtom)
      if (action === 'init') {
        ref.devtools = extension.connect({ name: getName() })
        ref.devtools.init(get(anAtom))
        ref.unsubscribe = ref.devtools.subscribe((message: Message) => {
          if (message.type === 'ACTION' && message.payload) {
            try {
              set(anAtom, JSON.parse(message.payload))
            } catch (e) {
              console.error(
                'please dispatch a serializable value that JSON.parse() support\n',
                e
              )
            }
          } else if (message.type === 'DISPATCH' && message.state) {
            if (
              message.payload?.type === 'JUMP_TO_ACTION' ||
              message.payload?.type === 'JUMP_TO_STATE'
            ) {
              ref.isTimeTraveling = true
              set(anAtom, JSON.parse(message.state))
            }
          } else if (
            message.type === 'DISPATCH' &&
            message.payload?.type === 'COMMIT'
          ) {
            ref.devtools?.init(get(anAtom))
          } else if (
            message.type === 'DISPATCH' &&
            message.payload?.type === 'IMPORT_STATE'
          ) {
            const computedStates =
              message.payload.nextLiftedState?.computedStates || []
            computedStates.forEach(
              ({ state }: { state: any }, index: number) => {
                if (index === 0) {
                  ref.devtools?.init(state)
                } else {
                  set(anAtom, state)
                }
              }
            )
          }
        })
      } else if (action === 'cleanup') {
        ref.unsubscribe?.()
      }
    })

    listenerAtom.onMount = (setAtom) => {
      setAtom('init')
      return () => setAtom('cleanup')
    }

    const derivedAtom: PrimitiveAtom<Value> = atom(
      (get) => {
        get(listenerAtom)
        return get(anAtom)
      },
      (get, set, update) => {
        const writeReturn = set(anAtom, update)
        const ref = get(refAtom)
        if (ref.isTimeTraveling) {
          ref.isTimeTraveling = false
        } else {
          ref.devtools?.send(
            `${getName()} - ${new Date().toLocaleString()}`,
            get(anAtom)
          )
        }
        return writeReturn
      }
    )

    return derivedAtom
  }, [anAtom]) // Note: Ignore options here, so it can't be changed
}
