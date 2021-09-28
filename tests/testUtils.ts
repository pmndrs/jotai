import { Provider } from 'jotai'

export function getTestProvider() {
  if (process.env.PROVIDER_LESS_MODE === 'true') {
    console.log('[[[[[[[[[[[Without Provider]]]]]]]]]]]')
  } else {
    console.log('[[[[[[[[[[[With Provider]]]]]]]]]]]')
  }
  return process.env.PROVIDER_LESS_MODE === 'true'
    ? (props: any) => props.children
    : Provider
}
