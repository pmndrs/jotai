import babel from '@babel/core'
import pluginDebugLabel from './plugin-debug-label'
import pluginReactRefresh from './plugin-react-refresh'

export default function jotaiPreset(): { plugins: babel.PluginItem[] } {
  return {
    plugins: [pluginDebugLabel, pluginReactRefresh],
  }
}
