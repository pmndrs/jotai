import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import type { Store } from '../core/store'
import {
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
  RESTORE_ATOMS,
} from '../core/store'

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

const atomToPrintable = (atom: Atom<unknown>) =>
  atom.debugLabel ? `${atom}:${atom.debugLabel}` : `${atom}`

const createAtomsSnapshot = (store: Store): AtomsSnapshot => {
  const atomsSnapshot: AtomsSnapshot = new Map()
  for (const atom of store[DEV_GET_MOUNTED_ATOMS]?.() || []) {
    const atomState = store[DEV_GET_ATOM_STATE]?.(atom)
    if (atomState && 'v' in atomState) {
      atomsSnapshot.set(atom, atomState.v)
    }
  }
  return atomsSnapshot
}

const serializeValues = (atomsSnapshot: AtomsSnapshot) => {
  const result: Record<string, unknown> = {}
  atomsSnapshot.forEach((v, atom) => {
    result[atomToPrintable(atom)] = v
  })
  return result
}

const serializeDependencies = (store: Store, atomsSnapshot: AtomsSnapshot) => {
  const result: Record<string, string[]> = {}
  atomsSnapshot.forEach((_, atom) => {
    const atomState = store[DEV_GET_ATOM_STATE]?.(atom)
    if (atomState) {
      result[atomToPrintable(atom)] = Array.from(atomState.d.keys()).map(
        atomToPrintable
      )
    }
  })
  return result
}

const getDevtoolsState = (store: Store, atomsSnapshot: AtomsSnapshot) => ({
  values: serializeValues(atomsSnapshot),
  dependencies: serializeDependencies(store, atomsSnapshot),
})

export function useAtomsDevtools(name: string, scope?: Scope) {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)
  const { s: store } = scopeContainer

  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const [version, setVersion] = useState(0)

  useEffect(() => {
    const callback = () => {
      for (const atom of store[DEV_GET_MOUNTED_ATOMS]?.() || []) {
        const atomState = store[DEV_GET_ATOM_STATE]?.(atom)
        if (atomState && atomState.r === atomState.i) {
          // ignore if there are any invalidated atoms
          return
        }
      }
      setVersion((v) => v + 1)
    }
    const unsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return unsubscribe
  }, [store])

  const goToSnapshot = useCallback(
    (values: Iterable<readonly [Atom<unknown>, unknown]>) => {
      store[RESTORE_ATOMS](values)
    },
    [store]
  )

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

  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const isTimeTraveling = useRef(false)
  const isRecording = useRef(true)
  const devtools = useRef<ConnectionResult & { shouldInit?: boolean }>()

  const snapshots = useRef<AtomsSnapshot[]>([])

  useEffect(() => {
    if (extension) {
      const getSnapshotAt = (index = snapshots.current.length - 1) => {
        // index 0 is @@INIT, so we need to return the next action (0)
        const snapshot = snapshots.current[index >= 0 ? index : 0]
        if (!snapshot) {
          throw new Error('snaphost index out of bounds')
        }
        return snapshot
      }
      const connection = extension.connect({ name })
      const devtoolsUnsubscribe = connection.subscribe((message: Message) => {
        switch (message.type) {
          case 'DISPATCH':
            switch (message.payload?.type) {
              case 'RESET':
                // TODO
                break

              case 'COMMIT':
                connection.init(getDevtoolsState(store, getSnapshotAt()))
                snapshots.current = []
                break

              case 'JUMP_TO_ACTION':
              case 'JUMP_TO_STATE':
                isTimeTraveling.current = true
                goToSnapshot(getSnapshotAt(message.payload.actionId - 1))
                break

              case 'PAUSE_RECORDING':
                isRecording.current = !isRecording.current
                break
            }
        }
      })

      devtools.current = connection
      devtools.current.shouldInit = true
      return devtoolsUnsubscribe
    }
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
    const atomsSnapshot = createAtomsSnapshot(store)
    if (isTimeTraveling.current) {
      isTimeTraveling.current = false
    } else if (isRecording.current) {
      snapshots.current.push(atomsSnapshot)
      devtools.current.send(
        {
          type: `${snapshots.current.length}`,
          updatedAt: new Date().toLocaleString(),
        },
        getDevtoolsState(store, atomsSnapshot)
      )
    }
  }, [store, version])
}
