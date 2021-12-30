import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import {
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
  RESTORE_ATOMS,
} from '../core/store'
import type { VersionObject } from '../core/store'

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

type AnyAtomValue = unknown
type AnyAtom = Atom<AnyAtomValue>
type AtomsValues = Map<AnyAtom, AnyAtomValue> // immutable
type AtomsDependents = Map<AnyAtom, Set<AnyAtom>> // immutable
type AtomsSnapshot = readonly [AtomsValues, AtomsDependents]

const atomToPrintable = (atom: AnyAtom) =>
  atom.debugLabel ? `${atom}:${atom.debugLabel}` : `${atom}`

const getDevtoolsState = (atomsSnapshot: AtomsSnapshot) => {
  const values: Record<string, AnyAtomValue> = {}
  atomsSnapshot[0].forEach((v, atom) => {
    values[atomToPrintable(atom)] = v
  })
  const dependents: Record<string, string[]> = {}
  atomsSnapshot[1].forEach((d, atom) => {
    dependents[atomToPrintable(atom)] = Array.from(d).map(atomToPrintable)
  })
  return {
    values,
    dependents,
  }
}

export function useAtomsDevtools(name: string, scope?: Scope) {
  const ScopeContext = getScopeContext(scope)
  const { s: store, w: versionedWrite } = useContext(ScopeContext)

  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const [atomsSnapshot, setAtomsSnapshot] = useState<AtomsSnapshot>(() => [
    new Map(),
    new Map(),
  ])

  useEffect(() => {
    const callback = () => {
      const values: AtomsValues = new Map()
      const dependents: AtomsDependents = new Map()
      for (const atom of store[DEV_GET_MOUNTED_ATOMS]?.() || []) {
        const atomState = store[DEV_GET_ATOM_STATE]?.(atom)
        if (atomState) {
          if (atomState.r === atomState.i) {
            // ignore if there are any invalidated atoms
            return
          }
          if ('v' in atomState) {
            values.set(atom, atomState.v)
          }
        }
        const mounted = store[DEV_GET_MOUNTED]?.(atom)
        if (mounted) {
          dependents.set(atom, mounted.d)
        }
      }
      setAtomsSnapshot((prev) => {
        if (
          prev[0].size === values.size &&
          Array.from(prev[0]).every(([a, v]) => Object.is(values.get(a), v))
        ) {
          // bail out
          return prev
        }
        return [values, dependents]
      })
    }
    const unsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return unsubscribe
  }, [store])

  const goToSnapshot = useCallback(
    (values: Iterable<readonly [AnyAtom, AnyAtomValue]>) => {
      const restore = (version?: VersionObject) =>
        store[RESTORE_ATOMS](values, version)
      return versionedWrite ? versionedWrite(restore) : restore()
    },
    [store, versionedWrite]
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
                connection.init(getDevtoolsState(getSnapshotAt()))
                snapshots.current = []
                break

              case 'JUMP_TO_ACTION':
              case 'JUMP_TO_STATE':
                isTimeTraveling.current = true
                goToSnapshot(getSnapshotAt(message.payload.actionId - 1)[0])
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
  }, [extension, goToSnapshot, name])

  useEffect(() => {
    if (!devtools.current) {
      return
    }
    if (devtools.current.shouldInit) {
      devtools.current.init(undefined)
      devtools.current.shouldInit = false
      return
    }
    if (isTimeTraveling.current) {
      isTimeTraveling.current = false
    } else if (isRecording.current) {
      snapshots.current.push(atomsSnapshot)
      devtools.current.send(
        {
          type: `${snapshots.current.length}`,
          updatedAt: new Date().toLocaleString(),
        },
        getDevtoolsState(atomsSnapshot)
      )
    }
  }, [atomsSnapshot])
}
