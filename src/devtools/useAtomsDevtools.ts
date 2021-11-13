import {
  AtomState,
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
  Store,
} from '../core/store'
import { useContext, useEffect, useState } from 'react'
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

export function useAtomsDevtools(name: string, scope?: Scope) {
  // let extension: Extension | undefined
  // try {
  //   extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__ as Extension
  // } catch {}
  // if (!extension) {
  //   if (
  //     typeof process === 'object' &&
  //     process.env.NODE_ENV === 'development' &&
  //     typeof window !== 'undefined'
  //   ) {
  //     console.warn('Please install/enable Redux devtools extension')
  //   }
  // }

  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)
  const store = scopeContainer.s

  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const [atomsSnapshot, setAtomsSnapshot] = useState<AtomsSnapshot>(
    () => new Map()
  )

  useEffect(() => {
    const callback = (updatedAtom?: Atom<unknown>, isNewAtom?: boolean) => {
      const atoms = Array.from(store[DEV_GET_MOUNTED_ATOMS]?.() || [])
      if (updatedAtom && isNewAtom && !atoms.includes(updatedAtom)) {
        atoms.push(updatedAtom)
      }
      setAtomsSnapshot(createAtomsSnapshot(store, atoms))
    }
    const unsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return unsubscribe
  }, [store])

  return atomsSnapshot
}
