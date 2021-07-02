import { atom, PrimitiveAtom } from 'jotai'

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

type Devtools = ConnectionResult & { shouldInit?: boolean }

const IS_DEVTOOL_ENV =
  typeof process === 'object' &&
  process.env.NODE_ENV === 'development' &&
  typeof window !== 'undefined' &&
  '__REDUX_DEVTOOLS_EXTENSION__' in window

const getExtension = (): Extension => {
  try {
    return (window as any).__REDUX_DEVTOOLS_EXTENSION__ as Extension
  } catch (e) {
    throw new Error('Please install or enable Redux Devtools')
  }
}

const devtoolAtomCache = new WeakMap()

// TODO: this was an atom family, but i've changed it to a fn
// this will probably result in an infinite loop when used unless memoized
export const devtoolAtom = (anAtom: PrimitiveAtom<any>) =>
  atom((get) => {
    if (!IS_DEVTOOL_ENV) return
    const isWriteable = !!anAtom.write
    const isTimeTravelingAtom = atom(false)
    const lastValueAtom = atom(undefined)
    const atomName = anAtom.debugLabel || anAtom.toString()
    const extension = getExtension()
    const cachedDevtools = devtoolAtomCache.get(anAtom)
    const devtools: Devtools =
      cachedDevtools || extension.connect({ name: atomName })

    let unsubscribe: undefined | (() => void)

    const subscribeAtom = atom<void, { type: 'mount' }>(
      (get) => {
        if (isWriteable) {
          const isTimeTraveling = get(isTimeTravelingAtom)
          if (!isTimeTraveling)
            devtools.send(
              `${atomName} - ${new Date().toLocaleString()}`, // TODO: maybe someone would want to customize this
              get(anAtom)
            )
        }
      },
      (get, set, update) => {
        const listener = (message: Message) => {
          if (message.type === 'DISPATCH' && message.state) {
            if (
              message.payload?.type === 'JUMP_TO_ACTION' ||
              message.payload?.type === 'JUMP_TO_STATE'
            ) {
              set(isTimeTravelingAtom, true) // TODO: when to set false?
            }
            if (message.payload?.type !== 'TOGGLE_ACTION')
              set(anAtom, JSON.parse(message.state))
          } else if (
            message.type === 'DISPATCH' &&
            message.payload?.type === 'COMMIT'
          ) {
            devtools.init(get(lastValueAtom))
          } else if (
            message.type === 'DISPATCH' &&
            message.payload?.type === 'IMPORT_STATE'
          ) {
            const computedStates =
              message.payload.nextLiftedState?.computedStates || []
            computedStates.forEach(
              ({ state }: { state: any }, index: number) => {
                if (index === 0) {
                  devtools?.init(state)
                } else {
                  set(anAtom, state)
                }
              }
            )
          }
        }

        switch (update.type) {
          case 'mount': {
            unsubscribe = isWriteable ? devtools.subscribe(listener) : undefined
            if (devtools.shouldInit) {
              devtools.init(get(anAtom))
              devtools.shouldInit = false
              devtoolAtomCache.set(anAtom, devtools)
            }
          }
        }
      }
    )

    subscribeAtom.onMount = (setAtom) => {
      setAtom({ type: 'mount' })
      return () => unsubscribe?.()
    }

    get(subscribeAtom)

    if (!isWriteable) {
      devtools.send(`${atomName} - ${new Date().toLocaleString()}`, get(anAtom))
    }
  })
