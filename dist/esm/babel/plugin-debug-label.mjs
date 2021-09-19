import path from 'path';
import templateBuilder from '@babel/template';

function debugLabelPlugin({
  types: t
}) {
  return {
    visitor: {
      ExportDefaultDeclaration(nodePath, state) {
        const { node } = nodePath;
        if (t.isCallExpression(node.declaration) && isAtom(t, node.declaration.callee)) {
          const filename = state.filename || "unknown";
          let displayName = path.basename(filename, path.extname(filename));
          if (displayName === "index") {
            displayName = path.basename(path.dirname(filename));
          }
          const buildExport = templateBuilder(`
          const %%atomIdentifier%% = %%atom%%;
          export default %%atomIdentifier%%
          `);
          const ast = buildExport({
            atomIdentifier: t.identifier(displayName),
            atom: node.declaration
          });
          nodePath.replaceWithMultiple(ast);
        }
      },
      VariableDeclarator(path2) {
        if (t.isIdentifier(path2.node.id) && t.isCallExpression(path2.node.init) && isAtom(t, path2.node.init.callee)) {
          path2.parentPath.insertAfter(t.expressionStatement(t.assignmentExpression("=", t.memberExpression(t.identifier(path2.node.id.name), t.identifier("debugLabel")), t.stringLiteral(path2.node.id.name))));
        }
      }
    }
  };
}
function isAtom(t, callee) {
  if (t.isIdentifier(callee) && callee.name === "atom") {
    return true;
  }
  if (t.isMemberExpression(callee)) {
    const { property } = callee;
    if (t.isIdentifier(property) && property.name === "atom") {
      return true;
    }
  }
  return false;
}

export { debugLabelPlugin as default };
