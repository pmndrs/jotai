import { Atom, PrimitiveAtom, SetStateAction, atom } from 'jotai'

/**
 * @param targetAtom an atom or derived atom
 * @param limit the maximum number of history states to keep
 * @returns an atom with an array of history states
 */
export function atomWithHistory<T>(targetAtom: Atom<T>, limit: number) {
  const refAtom = atom(
    () => ({
      history: [] as T[],
    }),
    (get) => {
      get(refAtom).history = []
    },
  )
  refAtom.onMount = (unmount) => () => unmount()
  refAtom.debugPrivate = true
  return atom((get) => {
    const ref = get(refAtom)
    const value = get(targetAtom)
    ref.history = [value, ...ref.history].slice(0, limit)
    return ref.history
  })
}

type Undoable<T> = {
  value: T
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

/**
 * @param targetAtom a primitive atom or equivalent
 * @param limit the maximum number of history states to keep
 * @returns an atom with undo/redo functionality
 */
export function atomWithUndo<T>(targetAtom: PrimitiveAtom<T>, limit: number) {
  const historyAtom = atomWithHistory(targetAtom, limit)
  const refAtom = atom(
    () => ({ index: 0, stack: [] as T[][] }),
    (get) => {
      const ref = get(refAtom)
      ref.index = 0
      ref.stack = []
    },
  )
  refAtom.onMount = (unmount) => () => unmount()
  refAtom.debugPrivate = true
  const UNDO = Symbol('undo')
  const REDO = Symbol('redo')
  const baseAtom = atom<
    Undoable<T>,
    [SetStateAction<T> | typeof UNDO | typeof REDO],
    void
  >(
    (get, { setSelf }) => {
      get(historyAtom)
      const ref = get(refAtom)
      if (ref.stack.length === 0) {
        ref.stack.push([get(targetAtom)])
      }
      return {
        value: get(targetAtom),
        undo: () => setSelf(UNDO),
        redo: () => setSelf(REDO),
        get canUndo() {
          return get(refAtom).index > 0
        },
        get canRedo() {
          return get(refAtom).index < get(refAtom).stack.length - 1
        },
      }
    },
    (get, set, update) => {
      const ref = get(refAtom)
      const setCurrentState = () => {
        const currentSlice = ref.stack[ref.index]
        if (currentSlice?.[0] === undefined) return
        set(targetAtom, currentSlice[0])
      }
      if (update === UNDO) {
        if (ref.index > 0) {
          ref.index--
          setCurrentState()
        }
        return
      }
      if (update === REDO) {
        if (ref.index < ref.stack.length - 1) {
          ref.index++
          setCurrentState()
        }
        return
      }
      set(targetAtom, update)
      const history = get(historyAtom)
      // Remove future states if any
      ref.stack = ref.stack.slice(0, ref.index + 1)
      // Push the current state to the history
      ref.stack.push(history.slice())
      // Limit the history
      ref.stack = ref.stack.slice(-limit)
      // Move the current index to the end
      ref.index = ref.stack.length - 1
    },
  )
  baseAtom.debugPrivate = true
  return atom(
    (get) => get(baseAtom),
    (_get, set, update: SetStateAction<T>) => set(baseAtom, update),
  )
}
