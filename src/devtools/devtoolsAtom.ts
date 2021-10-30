import { PrimitiveAtom, atom } from 'jotai'
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
    console.warn('Please install/enable Redux devtools extension')
  }
}

export function devtoolsAtom<Value>(
  anAtom: PrimitiveAtom<Value>,
  options?: Options
): PrimitiveAtom<Value> {
  const extension = getExtension()
  const nameAtom = atom(
    () =>
      options?.name ||
      newAtom.debugLabel ||
      anAtom.debugLabel ||
      anAtom.toString()
  )

  const refAtom = memoizeAtom(
    () =>
      atom(
        () =>
          ({ isTimeTraveling: false } as {
            devtools?: ConnectionResult
            isTimeTraveling: boolean
          })
      ),
    [anAtom]
  )
  const unsubscribeValueAtom = atom({} as { value?: () => void })

  const subscribeAtom = atom(null, (get, set, type: 'init' | 'unsubscribe') => {
    if (!extension) {
      return
    }
    const ref = get(refAtom)

    if (type === 'init') {
      ref.devtools = extension.connect({ name: get(nameAtom) })
      ref.devtools.init(get(anAtom))

      const unsubscribe = ref.devtools.subscribe((message: Message) => {
        set(listenerAtom, message)
      })

      set(unsubscribeValueAtom, { value: unsubscribe })
    } else if (type === 'unsubscribe') {
      const unsubscribe = get(unsubscribeValueAtom).value
      unsubscribe?.()
    }
  })

  const listenerAtom = atom(
    null,
    (get, set, message: Message | { type: 'init' | 'unsubscribe' }) => {
      if (!extension) {
        return
      }

      if (message.type === 'init') {
        set(subscribeAtom, 'init')
      } else if (message.type === 'unsubscribe') {
        set(subscribeAtom, 'unsubscribe')
      }
      const ref = get(refAtom)

      if (message.type === 'ACTION' && message.payload) {
        try {
          set(newAtom, JSON.parse(message.payload))
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

          set(newAtom, JSON.parse(message.state))
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
        computedStates.forEach(({ state }: { state: any }, index: number) => {
          if (index === 0) {
            ref.devtools?.init(state)
          } else {
            set(newAtom, state)
          }
        })
      }
    }
  )

  listenerAtom.onMount = (setAtom) => {
    setAtom({ type: 'init' })
    return () => setAtom({ type: 'unsubscribe' })
  }

  const newAtom: PrimitiveAtom<Value> = atom(
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
          `${get(nameAtom)} - ${new Date().toLocaleString()}`,
          get(anAtom)
        )
      }

      return writeReturn
    }
  )

  newAtom.onMount = anAtom.onMount

  return newAtom
}
