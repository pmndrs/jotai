import babel from '@babel/core'
import pluginDebugLabel from './plugin-debug-label.ts'
import pluginReactRefresh from './plugin-react-refresh.ts'
import type { PluginOptions } from './utils.ts'

/** @deprecated Use `jotai-babel/preset` instead. */
export default function jotaiPreset(
  _: typeof babel,
  options?: PluginOptions,
): { plugins: babel.PluginItem[] } {
  console.warn(
    '[DEPRECATED] jotai/babel/preset is deprecated and will be removed in v3.\n' +
      'Please use the `jotai-babel` package instead: https://github.com/jotaijs/jotai-babel',
  )
  return {
    plugins: [
      [pluginDebugLabel, options],
      [pluginReactRefresh, options],
    ],
  }
}
