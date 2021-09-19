'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var templateBuilder = require('@babel/template');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var templateBuilder__default = /*#__PURE__*/_interopDefaultLegacy(templateBuilder);

function debugLabelPlugin(_ref) {
  var t = _ref.types;
  return {
    visitor: {
      ExportDefaultDeclaration: function ExportDefaultDeclaration(nodePath, state) {
        var node = nodePath.node;

        if (t.isCallExpression(node.declaration) && isAtom(t, node.declaration.callee)) {
          var filename = state.filename || 'unknown';
          var displayName = path__default['default'].basename(filename, path__default['default'].extname(filename));

          if (displayName === 'index') {
            displayName = path__default['default'].basename(path__default['default'].dirname(filename));
          }

          var buildExport = templateBuilder__default['default']("\n          const %%atomIdentifier%% = %%atom%%;\n          export default %%atomIdentifier%%\n          ");
          var ast = buildExport({
            atomIdentifier: t.identifier(displayName),
            atom: node.declaration
          });
          nodePath.replaceWithMultiple(ast);
        }
      },
      VariableDeclarator: function VariableDeclarator(path) {
        if (t.isIdentifier(path.node.id) && t.isCallExpression(path.node.init) && isAtom(t, path.node.init.callee)) {
          path.parentPath.insertAfter(t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.identifier(path.node.id.name), t.identifier('debugLabel')), t.stringLiteral(path.node.id.name))));
        }
      }
    }
  };
}

function isAtom(t, callee) {
  if (t.isIdentifier(callee) && callee.name === 'atom') {
    return true;
  }

  if (t.isMemberExpression(callee)) {
    var property = callee.property;

    if (t.isIdentifier(property) && property.name === 'atom') {
      return true;
    }
  }

  return false;
}

function jotaiPreset() {
  return {
    plugins: [debugLabelPlugin]
  };
}

exports['default'] = jotaiPreset;
