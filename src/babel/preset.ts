import babel from '@babel/core'
import pluginDebugLabel from './plugin-debug-label.ts'
import pluginReactRefresh from './plugin-react-refresh.ts'
import { PluginOptions } from './utils.ts'

export default function jotaiPreset(
  _: typeof babel,
  options?: PluginOptions
): { plugins: babel.PluginItem[] } {
  return {
    plugins: [
      [pluginDebugLabel, options],
      [pluginReactRefresh, options],
    ],
  }
}
