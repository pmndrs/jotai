import path from 'path'
import babel, { PluginObj } from '@babel/core'
import templateBuilder from '@babel/template'
import { isAtom } from './utils'

export default function debugLabelPlugin({
  types: t,
}: typeof babel): PluginObj {
  return {
    visitor: {
      ExportDefaultDeclaration(nodePath, state) {
        const { node } = nodePath
        if (
          t.isCallExpression(node.declaration) &&
          isAtom(t, node.declaration.callee)
        ) {
          const filename = state.filename || 'unknown'

          let displayName = path.basename(filename, path.extname(filename))

          // ./{module name}/index.js
          if (displayName === 'index') {
            displayName = path.basename(path.dirname(filename))
          }
          // Relies on visiting the variable declaration to add the debugLabel
          const buildExport = templateBuilder(`
          const %%atomIdentifier%% = %%atom%%;
          export default %%atomIdentifier%%
          `)
          const ast = buildExport({
            atomIdentifier: t.identifier(displayName),
            atom: node.declaration,
          })
          nodePath.replaceWithMultiple(ast as babel.Node[])
        }
      },
      VariableDeclarator(path) {
        if (
          t.isIdentifier(path.node.id) &&
          t.isCallExpression(path.node.init) &&
          isAtom(t, path.node.init.callee)
        ) {
          path.parentPath.insertAfter(
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.identifier(path.node.id.name),
                  t.identifier('debugLabel')
                ),
                t.stringLiteral(path.node.id.name)
              )
            )
          )
        }
      },
    },
  }
}
