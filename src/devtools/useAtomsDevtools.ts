import { useContext, useEffect, useRef } from 'react'
import { useAtomsSnapshot, useGotoAtomsSnapshot } from 'jotai/devtools'
import { Atom, Scope } from '../core/atom'
import { getScopeContext } from '../core/contexts'
import { DEV_GET_ATOM_STATE, DEV_SUBSCRIBE_STATE, Store } from '../core/store'

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
  send: (action: any, state: any) => void
  init: (state: any) => void
  error: (payload: any) => void
}

type Extension = {
  connect: (options?: Config) => ConnectionResult
}

type AtomsSnapshot = Map<Atom<unknown>, unknown>

const serializeSnapshot = (snapshot: AtomsSnapshot) => {
  const result: Record<string, unknown> = {}

  snapshot.forEach((v, atom) => {
    result[atomToPrintable(atom)] = v
  })

  return result
}

const atomToPrintable = (atom: Atom<unknown>) =>
  atom.debugLabel ? `${atom}:${atom.debugLabel}` : `${atom}`

const getDependencies = (store: Store, snapshot: AtomsSnapshot) => {
  const result: Record<string, string[]> = {}

  snapshot.forEach((_, atom) => {
    const atomState = store[DEV_GET_ATOM_STATE]?.(atom)

    if (!atomState) {
      return
    }
    result[atomToPrintable(atom)] = [...atomState.d.keys()].map(atomToPrintable)
  })

  return result
}

export function useAtomsDevtools(name: string, scope?: Scope) {
  const snapshot = useAtomsSnapshot()
  const goToSnapshot = useGotoAtomsSnapshot()
  let extension: Extension | undefined
  try {
    extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__ as Extension
  } catch {
    // ignored
  }
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

  const snapshots = useRef<AtomsSnapshot[]>([])

  useEffect(() => {
    let devtoolsUnsubscribe: (() => void) | undefined
    if (extension) {
      devtools.current = extension.connect({ name })

      devtoolsUnsubscribe = devtools.current.subscribe((message: Message) => {
        switch (message.type) {
          case 'DISPATCH':
            switch (message.payload?.type) {
              case 'RESET':
                // Todo
                return
              case 'COMMIT': {
                const lastSnapshot = snapshots.current[
                  snapshots.current.length - 1
                ] as AtomsSnapshot

                const serializedSnapshot = serializeSnapshot(lastSnapshot)

                devtools.current?.init({
                  values: serializedSnapshot,
                  dependencies: getDependencies(store, lastSnapshot),
                })
                return
              }

              case 'JUMP_TO_ACTION': {
                isTimeTraveling.current = true

                const currentSnapshot = snapshots.current[
                  message.payload.actionId - 1
                ] as AtomsSnapshot

                goToSnapshot(currentSnapshot)
                return
              }

              case 'PAUSE_RECORDING':
                isRecording.current = !isRecording.current
                return
            }
        }
      })

      devtools.current.shouldInit = true
    }
    return devtoolsUnsubscribe
  }, [store, extension, goToSnapshot, name])

  useEffect(() => {
    if (!devtools.current) {
      return
    }
    if (devtools.current.shouldInit) {
      devtools.current.init(undefined)
      devtools.current.shouldInit = false
      return
    }

    if (!snapshot.size) {
      return
    }

    if (isTimeTraveling.current) {
      Promise.resolve().then(() => {
        isTimeTraveling.current = false
      })
    } else if (isRecording.current) {
      snapshots.current.push(snapshot)

      const serializedSnapshot = serializeSnapshot(snapshot)

      devtools.current.send(
        {
          type: `${snapshots.current.length}`,
          updatedAt: new Date().toLocaleString(),
        },
        {
          values: serializedSnapshot,
          dependencies: getDependencies(store, snapshot),
        }
      )
    }
  }, [snapshot, store])
}
