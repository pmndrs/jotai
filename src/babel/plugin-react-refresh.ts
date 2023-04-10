import babel, { PluginObj } from '@babel/core'
import _templateBuilder from '@babel/template'
import { isAtom } from './utils.ts'
import type { PluginOptions } from './utils.ts'

const templateBuilder = (_templateBuilder as any).default || _templateBuilder

export default function reactRefreshPlugin(
  { types: t }: typeof babel,
  options?: PluginOptions
): PluginObj {
  return {
    pre({ opts }) {
      if (!opts.filename) {
        throw new Error('Filename must be available')
      }
    },
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
          isAtom(t, node.declaration.callee, options?.customAtomNames)
        ) {
          const filename = state.filename || 'unknown'
          const atomKey = `${filename}/defaultExport`

          const buildExport = templateBuilder(
            `export default globalThis.jotaiAtomCache.get(%%atomKey%%, %%atom%%)`
          )
          const ast = buildExport({
            atomKey: t.stringLiteral(atomKey),
            atom: node.declaration,
          })
          nodePath.replaceWith(ast as babel.Node)
        }
      },
      VariableDeclarator(nodePath, state) {
        if (
          t.isIdentifier(nodePath.node.id) &&
          t.isCallExpression(nodePath.node.init) &&
          isAtom(t, nodePath.node.init.callee, options?.customAtomNames) &&
          // Make sure atom declaration is in module scope
          (nodePath.parentPath.parentPath?.isProgram() ||
            nodePath.parentPath.parentPath?.isExportNamedDeclaration())
        ) {
          const filename = state.filename || 'unknown'
          const atomKey = `${filename}/${nodePath.node.id.name}`

          const buildAtomDeclaration = templateBuilder(
            `const %%atomIdentifier%% = globalThis.jotaiAtomCache.get(%%atomKey%%, %%atom%%)`
          )
          const ast = buildAtomDeclaration({
            atomIdentifier: t.identifier(nodePath.node.id.name),
            atomKey: t.stringLiteral(atomKey),
            atom: nodePath.node.init,
          })
          nodePath.parentPath.replaceWith(ast as babel.Node)
        }
      },
    },
  }
}
