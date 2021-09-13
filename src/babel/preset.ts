import babel from '@babel/core'

export function jotaiPreset(): { plugins: babel.PluginItem[] } {
  return {
    plugins: [require.resolve('jotai/babel/plugin-debug-label')],
  }
}
