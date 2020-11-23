import { atom } from 'jotai'
import * as O from 'optics-ts'
import type { PrimitiveAtom, SetStateAction, WritableAtom } from '../core/types'

export type FocusAtom = {
  <S, A>(
    atom: PrimitiveAtom<S>,
    callback: (optic: O.OpticFor<S>) => O.Prism<S, any, A>
  ): WritableAtom<A | undefined, SetStateAction<A>>

  <S, A>(
    atom: PrimitiveAtom<S>,
    callback: (optic: O.OpticFor<S>) => O.Traversal<S, any, A>
  ): WritableAtom<Array<A>, SetStateAction<A>>

  <S, A>(
    atom: PrimitiveAtom<S>,
    callback: (
      optic: O.OpticFor<S>
    ) => O.Lens<S, any, A> | O.Equivalence<S, any, A> | O.Iso<S, any, A>
  ): PrimitiveAtom<A>
}

export const focusAtom: FocusAtom = <S, A>(
  baseAtom: PrimitiveAtom<S>,
  callback: (
    optic: O.OpticFor<S>
  ) =>
    | O.Lens<S, any, A>
    | O.Equivalence<S, any, A>
    | O.Iso<S, any, A>
    | O.Prism<S, any, A>
    | O.Traversal<S, any, A>
):
  | WritableAtom<A | undefined, SetStateAction<A>>
  | WritableAtom<Array<A>, SetStateAction<A>>
  | PrimitiveAtom<A> => {
  const focus = callback(O.optic<S>())
  return atom<A, SetStateAction<A>>(
    (get) => {
      const newValue = getValueUsingOptic(focus, get(baseAtom))
      return newValue
    },
    (_, set, update) => {
      const newValueProducer =
        update instanceof Function
          ? O.modify(focus)(update)
          : O.set(focus)(update)

      set(baseAtom, (oldBaseValue) => {
        const newBaseValue = newValueProducer(oldBaseValue)
        return newBaseValue
      })
    }
  )
}

const getValueUsingOptic = <S, A>(
  focus:
    | O.Lens<S, any, A>
    | O.Equivalence<S, any, A>
    | O.Iso<S, any, A>
    | O.Prism<S, any, A>
    | O.Traversal<S, any, A>,
  bigValue: S
) => {
  if (focus._tag === 'Traversal') {
    const values = O.collect(focus)(bigValue)
    return values
  } else if (focus._tag === 'Prism') {
    const value = O.preview(focus)(bigValue)
    return value
  } else {
    const value = O.get(focus)(bigValue)
    return value
  }
}
