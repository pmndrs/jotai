import { types } from '@babel/core'

export function isAtom(
  t: typeof types,
  callee: babel.types.Expression | babel.types.V8IntrinsicIdentifier
) {
  if (t.isIdentifier(callee) && callee.name === 'atom') {
    return true
  }

  if (t.isMemberExpression(callee)) {
    const { property } = callee
    if (t.isIdentifier(property) && property.name === 'atom') {
      return true
    }
  }
  return false
}
