import { Provider } from 'jotai'

export function getTestProvider() {
  if (process.env.PROVIDER_LESS_MODE === 'true') {
    console.log('TESTING WITH PROVIDER_LESS_MODE')
    return (props: any) => props.children
  }
  return Provider
}
