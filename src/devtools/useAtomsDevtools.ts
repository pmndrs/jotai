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
  send: (action: string, state: any) => void
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
    result[atomToDebuggingString(atom)] = v
  })

  return result
}

const atomToDebuggingString = (atom: Atom<unknown>) =>
  `${atom}:${atom.debugLabel ? atom.debugLabel : atom}`

const getDependencies = (store: Store, snapshot: AtomsSnapshot) => {
  const result: Record<string, string[]> = {}

  snapshot.forEach((_, atom) => {
    const atomState = store[DEV_GET_ATOM_STATE]?.(atom)

    if (!atomState) {
      return
    }
    result[atomToDebuggingString(atom)] = [...atomState.d.keys()].map(
      atomToDebuggingString
    )
  })

  return result
}

export function useAtomsDevtools(name: string, scope?: Scope) {
  const snapshot = useAtomsSnapshot()
  const goToSnapshot = useGotoAtomsSnapshot()
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
  const snapshots = useRef<AtomsSnapshot[]>([])

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
                const lastSnapshot =
                  snapshots.current[snapshots.current.length - 1]!

                if ([...lastSnapshot.keys()].length === 0) {
                  return
                }
                const parsedSnapshot = serializeSnapshot(lastSnapshot)

                devtools.current!.init({
                  values: parsedSnapshot,
                  dependencies: getDependencies(store, lastSnapshot),
                })
                return
              case 'JUMP_TO_STATE':
              case 'JUMP_TO_ACTION':
                isTimeTraveling.current = true

                const currentSnapshot =
                  snapshots.current[message.payload.actionId - 1]!

                goToSnapshot(currentSnapshot)
                return
              case 'PAUSE_RECORDING':
                isRecording.current = !isRecording.current
                return
            }
        }
      })

      devtools.current.shouldInit = true
    }
    return () => {
      devtoolsUnsubscribe?.()
    }
  }, [store])

  useEffect(() => {
    if (!devtools.current) {
      return
    }
    if (devtools.current.shouldInit) {
      devtools.current.init(undefined)
      devtools.current.shouldInit = false
      return
    }

    if ([...snapshot.keys()].length === 0) {
      return
    }

    if (isTimeTraveling.current) {
      // better solution to stop logging on JUMP_TO_ACTION & JUMP_TO_STATE ?
      setTimeout(() => {
        isTimeTraveling.current = false
      }, 0)
    } else if (isRecording.current) {
      snapshots.current.push(snapshot)

      const parsedSnapshot = serializeSnapshot(snapshot)

      devtools.current.send(
        `action:${snapshots.current.length} - ${new Date().toLocaleString()}`,
        {
          values: parsedSnapshot,
          dependencies: getDependencies(store, snapshot),
        }
      )
    }
  }, [snapshot])
}
