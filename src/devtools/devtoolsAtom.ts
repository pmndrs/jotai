import { PrimitiveAtom, atom } from 'jotai'

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

const getExtension = (): Extension => {
  try {
    return (window as any).__REDUX_DEVTOOLS_EXTENSION__ as Extension
  } catch (e) {
    throw new Error('Please install/enable Redux devtools extension')
  }
}

export function devtoolsAtom<Value>(
  anAtom: PrimitiveAtom<Value>,
  options?: Options
): PrimitiveAtom<Value> {
  const isWriteable = !!anAtom.write
  const atomName = options?.name || anAtom.debugLabel || anAtom.toString()

  const extension = getExtension()
  const devtools = extension.connect({ name: atomName })

  let isTimeTraveling = false

  const listenerAtom = atom(
    null,
    (get, set, message: Message | { type: 'init' }) => {
      if (message.type === 'init') {
        return devtools.init(get(anAtom))
      }

      if (message.type === 'ACTION' && message.payload) {
        try {
          if (isWriteable) {
            set(subscribeAtom, JSON.parse(message.payload))
          }
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
          isTimeTraveling = true

          if (isWriteable) {
            set(subscribeAtom, JSON.parse(message.state))
          }
        }
      } else if (
        message.type === 'DISPATCH' &&
        message.payload?.type === 'COMMIT'
      ) {
        devtools.init(get(anAtom))
      } else if (
        message.type === 'DISPATCH' &&
        message.payload?.type === 'IMPORT_STATE'
      ) {
        const computedStates =
          message.payload.nextLiftedState?.computedStates || []
        computedStates.forEach(({ state }: { state: any }, index: number) => {
          if (index === 0) {
            devtools.init(state)
          } else {
            if (isWriteable) {
              set(subscribeAtom, state)
            }
          }
        })
      }
    }
  )

  listenerAtom.onMount = (setAtom) => {
    const unsubscribe = devtools.subscribe((message: Message) =>
      setAtom(message)
    )

    setAtom({ type: 'init' })

    return unsubscribe
  }

  const subscribeAtom: PrimitiveAtom<Value> = atom(
    (get) => {
      get(listenerAtom)

      return anAtom.read(get)
    },
    (get, set, update) => {
      const writeReturn = anAtom.write(get, set, update)

      if (isTimeTraveling) {
        isTimeTraveling = false
      } else {
        devtools.send(
          `${atomName} - ${new Date().toLocaleString()}`,
          anAtom.read(get)
        )
      }

      return writeReturn
    }
  )

  subscribeAtom.onMount = anAtom.onMount
  subscribeAtom.debugLabel = anAtom.debugLabel

  return subscribeAtom
}
