import {
  AtomState,
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
  RESTORE_ATOMS,
} from '../core/store'
import { useContext, useEffect, useRef } from 'react'
import { Atom, Scope } from '../core/atom'
import { getScopeContext } from '../core/contexts'

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
  payload?: { type: string; actionId: number }
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

export function useAtomsDevtools(name: string, scope?: Scope) {
  let extension: Extension | undefined
  try {
    extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__ as Extension
  } catch {}
  if (!extension) {
    if (
      typeof process === 'object' &&
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined'
    ) {
      console.warn('Please install/enable Redux devtools extension')
    }
  }

  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)
  const store = scopeContainer.s

  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const isTimeTraveling = useRef(false)
  const isRecording = useRef(true)
  const devtools = useRef<ConnectionResult & { shouldInit?: boolean }>()
  const actions = useRef<{ value: unknown | symbol; atomKey: string }[]>([])

  useEffect(() => {
    let devtoolsUnsubscribe: () => void | undefined
    if (extension) {
      devtools.current = extension.connect({ name })

      devtoolsUnsubscribe = devtools.current.subscribe((message: Message) => {
        switch (message.type) {
          case 'ACTION':
            return
          case 'DISPATCH':
            switch (message.payload?.type) {
              case 'RESET':
                // Todo
                return
              case 'COMMIT':
                devtools.current!.init(undefined)
                return
              case 'JUMP_TO_STATE':
              case 'JUMP_TO_ACTION':
                isTimeTraveling.current = true

                const atomAction = actions.current[message.payload.actionId - 1]!

                const mountedAtoms = Array.from(
                  store[DEV_GET_MOUNTED_ATOMS]?.() || []
                )
                const mountedAtom = mountedAtoms.find(
                  (atom) => atom.toString() === atomAction.atomKey
                )

                if (!mountedAtom) {
                  console.warn(
                    '[Warn] you cannot do devtools operations (Time-travelling, etc) on unmounted atoms\n',
                    mountedAtom
                  )
                  delete atomAction.value
                  return
                }
                if ('write' in mountedAtom) {
                  store[RESTORE_ATOMS]([[mountedAtom, atomAction.value]])
                } else {
                  console.warn(
                    '[Warn] you cannot do write operations (Time-travelling, etc) in read-only atoms\n',
                    mountedAtom
                  )
                }
                return
              case 'PAUSE_RECORDING':
                return (isRecording.current = !isRecording.current)
            }
        }
      })
    }

    const callback = (updatedAtom?: Atom<unknown>) => {
      if (!devtools.current) {
        return
      }
      if (updatedAtom === undefined) {
        devtools.current.init(undefined)
        devtools.current.shouldInit = false
        return
      }
      const atomName = updatedAtom.debugLabel || updatedAtom.toString()

      const atomState =
        store[DEV_GET_ATOM_STATE]?.(updatedAtom!) ?? ({} as AtomState)
      const value = atomState.v

      if (isTimeTraveling.current) {
        isTimeTraveling.current = false
      } else if (isRecording.current) {
        actions.current.push({ atomKey: updatedAtom.toString(), value })

        devtools.current.send(
          `${name}:${atomName} - ${new Date().toLocaleString()}`,
          value
        )
      }
    }
    const stateUnsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return () => {
      actions.current = []
      stateUnsubscribe?.()
      devtoolsUnsubscribe?.()
    }
  }, [store])
}
