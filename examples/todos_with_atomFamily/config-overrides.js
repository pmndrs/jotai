const {
  addWebpackAlias,
  removeModuleScopePlugin,
  babelInclude,
  override,
} = require('customize-cra')
const { addReactRefresh } = require('customize-cra-react-refresh')
const path = require('path')

module.exports = (config, env) => {
  config.resolve.extensions = [...config.resolve.extensions, '.ts', '.tsx']
  return override(
    addReactRefresh(),
    removeModuleScopePlugin(),
    babelInclude([path.resolve('src'), path.resolve('../../src')]),
    process.env.ALIAS_PP &&
      addWebpackAlias({
        jotai: path.resolve('../../src/index'),
        react: path.resolve('node_modules/react'),
        'react-dom': path.resolve('node_modules/react-dom'),
      })
  )(config, env)
}
