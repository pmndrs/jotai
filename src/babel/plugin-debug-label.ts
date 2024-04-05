import { basename, dirname, extname } from 'path'
import babel, { PluginObj } from '@babel/core'
import _templateBuilder from '@babel/template'
import { isAtom } from './utils.ts'
import type { PluginOptions } from './utils.ts'

const templateBuilder = (_templateBuilder as any).default || _templateBuilder

export default function debugLabelPlugin(
  { types: t }: typeof babel,
  options?: PluginOptions,
): PluginObj {
  return {
    visitor: {
      ExportDefaultDeclaration(nodePath, state) {
        const { node } = nodePath
        if (
          t.isCallExpression(node.declaration) &&
          isAtom(t, node.declaration.callee, options?.customAtomNames)
        ) {
          const filename = state.filename || 'unknown'

          let displayName = basename(filename, extname(filename))

          // ./{module name}/index.js
          if (displayName === 'index') {
            displayName = basename(dirname(filename))
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
          isAtom(t, path.node.init.callee, options?.customAtomNames)
        ) {
          path.parentPath.insertAfter(
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.identifier(path.node.id.name),
                  t.identifier('debugLabel'),
                ),
                t.stringLiteral(path.node.id.name),
              ),
            ),
          )
        }
      },
    },
  }
}
