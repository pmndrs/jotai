import babel, { PluginObj, types } from '@babel/core'

export function debugLabelPlugin({ types: t }: typeof babel): PluginObj {
  return {
    visitor: {
      VariableDeclaration(path) {
        const declarators = path.get('declarations')
        for (const declarator of declarators) {
          if (
            t.isIdentifier(declarator.node.id) &&
            t.isCallExpression(declarator.node.init) &&
            isAtom(t, declarator.node.init.callee)
          ) {
            declarator.parentPath.insertAfter(
              t.expressionStatement(
                t.assignmentExpression(
                  '=',
                  t.memberExpression(
                    t.identifier(declarator.node.id.name),
                    t.identifier('debugLabel')
                  ),
                  t.stringLiteral(declarator.node.id.name)
                )
              )
            )
          }
        }
      },
    },
  }
}

function isAtom(
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
