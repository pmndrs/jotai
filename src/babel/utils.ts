import { types } from '@babel/core'

export function isAtom(
  t: typeof types,
  callee: babel.types.Expression | babel.types.V8IntrinsicIdentifier
) {
  if (t.isIdentifier(callee) && atomFunctionNames.includes(callee.name)) {
    return true
  }

  if (t.isMemberExpression(callee)) {
    const { property } = callee
    if (t.isIdentifier(property) && atomFunctionNames.includes(property.name)) {
      return true
    }
  }
  return false
}

const atomFunctionNames = [
  'atom',
  'atomFamily',
  'atomWithDefault',
  'atomWithObservable',
  'atomWithReducer',
  'atomWithReset',
  'atomWithStorage',
  'atomWithSuspense',
  'freezeAtom',
  'loadable',
  'selectAtom',
  'splitAtom',
]
