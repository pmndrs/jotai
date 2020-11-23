import * as O from 'optics-ts'
import React, { SetStateAction } from 'react'
import type { PrimitiveAtom, WritableAtom } from '../core/types'
import { FocusAtom, focusAtom } from './focusAtom'

export const useFocus: FocusAtom = <S, A>(
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
  return React.useMemo(() => {
    return focusAtom(
      baseAtom,
      callback as any /* we're just copying the type signature from focusAtom, so this should be fine. */
    )
  }, [baseAtom, callback])
}
