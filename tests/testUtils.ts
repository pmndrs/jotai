import { Provider } from 'jotai'

export function getTestProvider() {
  return process.env.PROVIDER_LESS_MODE
    ? (props: any) => props.children
    : Provider
}
