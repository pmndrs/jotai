import babel from '@babel/core'
import type { PluginObj } from '@babel/core'
import _templateBuilder from '@babel/template'
import { isAtom } from './utils.ts'
import type { PluginOptions } from './utils.ts'

const templateBuilder = (_templateBuilder as any).default || _templateBuilder

/** @deprecated Use `jotai-babel/plugin-debug-label` instead. */
export default function debugLabelPlugin(
  { types: t }: typeof babel,
  options?: PluginOptions,
): PluginObj {
  console.warn(
    '[DEPRECATED] jotai/babel/plugin-debug-label is deprecated and will be removed in v3.\n' +
      'Please use the `jotai-babel` package instead: https://github.com/jotaijs/jotai-babel',
  )
  return {
    visitor: {
      ExportDefaultDeclaration(nodePath, state) {
        const { node } = nodePath
        if (
          t.isCallExpression(node.declaration) &&
          isAtom(t, node.declaration.callee, options?.customAtomNames)
        ) {
          const filename = (state.filename || 'unknown').replace(/\.\w+$/, '')

          let displayName = filename.split('/').pop()!

          // ./{module name}/index.js
          if (displayName === 'index') {
            displayName =
              filename.slice(0, -'/index'.length).split('/').pop() || 'unknown'
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
