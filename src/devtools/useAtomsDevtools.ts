import {
  AtomState,
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
  RESTORE_ATOMS,
  Store,
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

type AtomsSnapshot = Map<Atom<unknown>, unknown>

const createAtomsSnapshot = (
  store: Store,
  atoms: Atom<unknown>[]
): AtomsSnapshot => {
  const tuples = atoms.map<[Atom<unknown>, unknown]>((atom) => {
    const atomState = store[DEV_GET_ATOM_STATE]?.(atom) ?? ({} as AtomState)
    return [atom, atomState.v]
  })
  return new Map(tuples)
}

const isEqualSnapshot = (
  aSnapshot: AtomsSnapshot | undefined,
  bSnapshot: AtomsSnapshot
) => {
  if (aSnapshot?.size !== bSnapshot.size) {
    return false
  }

  for (const [atom, aValue] of aSnapshot) {
    const bValue = bSnapshot.get(atom)
    if (aValue !== bValue) {
      return false
    }
  }

  return true
}

const serializeSnapshot = (snapshot: AtomsSnapshot): any => {
  const result: Record<string, unknown> = {}

  snapshot.forEach((v, atom) => {
    result[`${atom}:${atom.debugLabel}`] = v
  })

  return result
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
                devtools.current!.init(undefined)
                return
              case 'JUMP_TO_STATE':
              case 'JUMP_TO_ACTION':
                isTimeTraveling.current = true

                const snapshot =
                  snapshots.current[message.payload.actionId - 1]!

                const mountedAtoms = Array.from(
                  store[DEV_GET_MOUNTED_ATOMS]?.() || []
                )

                if (
                  ![...snapshot.keys()].every((atom) =>
                    mountedAtoms.includes(atom)
                  )
                ) {
                  console.warn(
                    '[Warn] you cannot do devtools operations (Time-travelling, etc) on unmounted atoms\n'
                  )
                  return
                }

                store[RESTORE_ATOMS](snapshot)
                return
              case 'PAUSE_RECORDING':
                return (isRecording.current = !isRecording.current)
            }
        }
      })
    }

    const callback = (updatedAtom?: Atom<unknown>, isNewAtom?: boolean) => {
      if (!devtools.current) {
        return
      }
      if (updatedAtom === undefined) {
        devtools.current.init(undefined)
        devtools.current.shouldInit = false
        return
      }

      if (isTimeTraveling.current) {
        // better solution to stop logging on JUMP_TO_ACTION & JUMP_TO_STATE ?
        Promise.resolve().then(() => {
          isTimeTraveling.current = false
        })
      } else if (isRecording.current) {
        const atoms = Array.from(store[DEV_GET_MOUNTED_ATOMS]?.() || [])
        if (updatedAtom && isNewAtom && !atoms.includes(updatedAtom)) {
          atoms.push(updatedAtom)
        }

        const prevSnapshot = snapshots.current[snapshots.current.length - 1]
        const snapshot = createAtomsSnapshot(store, atoms)
        if (isEqualSnapshot(prevSnapshot, snapshot)) {
          return
        }

        snapshots.current.push(snapshot)

        const parsedSnapshot = serializeSnapshot(snapshot)

        devtools.current.send(
          `action:${snapshots.current.length} - ${new Date().toLocaleString()}`,
          parsedSnapshot
        )
      }
    }
    const stateUnsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return () => {
      stateUnsubscribe?.()
      devtoolsUnsubscribe?.()
    }
  }, [store])
}
