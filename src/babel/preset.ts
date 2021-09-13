import babel from '@babel/core'
import pluginDebugLabel from './plugin-debug-label'

export function jotaiPreset(): { plugins: babel.PluginItem[] } {
  return {
    plugins: [pluginDebugLabel],
  }
}
