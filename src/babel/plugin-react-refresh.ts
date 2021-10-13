import path from 'path'
import babel, { PluginObj, types } from '@babel/core'
import templateBuilder from '@babel/template'
import { isAtom } from './utils'

export default function reactRefreshPlugin({
  types: t,
}: typeof babel): PluginObj {
  return {
    visitor: {
      Program: {
        exit(path) {
          const jotaiAtomCache = templateBuilder(`
          globalThis.jotaiAtomCache = globalThis.jotaiAtomCache || {
            cache: new Map(),
            get(name, inst) { 
              if (this.cache.has(name)) {
                return this.cache.get(name)
              }
              this.cache.set(name, inst)
              return inst
            },
          }`)()
          path.unshiftContainer('body', jotaiAtomCache)
        },
      },
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
      VariableDeclarator(nodePath) {
        if (
          t.isIdentifier(nodePath.node.id) &&
          t.isCallExpression(nodePath.node.init) &&
          isAtom(t, nodePath.node.init.callee)
        ) {
          nodePath.parentPath.insertAfter(
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.identifier(nodePath.node.id.name),
                  t.identifier('debugLabel')
                ),
                t.stringLiteral(nodePath.node.id.name)
              )
            )
          )
        }
      },
    },
  }
}
