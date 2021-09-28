import { Provider } from 'jotai'

export function getTestProvider() {
  console.log(
    '==================PROVIDER_LESS_MODE',
    process.env.PROVIDER_LESS_MODE,
    process.env.PROVIDER_LESS_MODE === 'true'
  )
  return process.env.PROVIDER_LESS_MODE === 'true'
    ? (props: any) => props.children
    : Provider
}
