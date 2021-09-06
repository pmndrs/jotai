import { types as t } from '@babel/core'
import type { NodePath, PluginObj } from '@babel/core'
import { CallExpression, Expression, LVal, PrivateName } from '@babel/types'

export default function declare(): PluginObj {
  return {
    visitor: {
      CallExpression(path) {
        const { node } = path
        if ((node.callee as any).name !== 'atom') return

        let id = getId(path)

        if (!id) return

        if (t.isMemberExpression(id)) {
          id = id.property
        }

        // identifiers are the only thing we can reliably get a name from
        if (t.isIdentifier(id)) {
          addAtomDebugLabel(id.name, node)
        }
      },
    },
  }
}

function getId(
  path: NodePath<CallExpression>
): LVal | Expression | PrivateName | undefined {
  let id: LVal | Expression | undefined

  path.find((path) => {
    if (path.isAssignmentExpression()) {
      id = path.node.left
    } else if (path.isObjectProperty()) {
      id = path.node.key
    } else if (path.isVariableDeclarator()) {
      id = path.node.id
    } else if (path.isStatement()) {
      // we've hit a statement, we should stop crawling up
      return true
    }

    // we've got an id! no need to continue
    if (id) return true
    return false
  })
  return id
}

function addAtomDebugLabel(name: string, node: CallExpression) {
  let objectAssignExpression = t.memberExpression(
    t.identifier('Object'),
    t.identifier('assign')
  )
  let callExpression = t.callExpression(
    objectAssignExpression, // We're calling 'Object.assign'.
    [
      t.objectExpression([]),
      node,
      t.objectExpression([
        t.objectProperty(t.identifier('debugLabel'), t.stringLiteral(name)),
      ]),
    ] // Call 'Object.assign'.
  )

  return callExpression
}
