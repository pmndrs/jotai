import { Provider } from 'jotai'

export function getTestProvider() {
  return process.env.PROVIDER_LESS_MODE === 'true'
    ? (props: any) => props.children
    : Provider
}
