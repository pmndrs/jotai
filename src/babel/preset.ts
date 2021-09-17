import babel from '@babel/core'
import pluginDebugLabel from './plugin-debug-label'

export default function jotaiPreset(): { plugins: babel.PluginItem[] } {
  return {
    plugins: [pluginDebugLabel],
  }
}
