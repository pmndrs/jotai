import { createElement } from 'react'
import { Provider } from 'jotai'

export function getTestProvider(requireProvider?: boolean) {
  if (!requireProvider && process.env.PROVIDER_MODE === 'PROVIDER_LESS') {
    if (process.env.CI) {
      console.log('TESTING WITH PROVIDER_LESS_MODE')
    }
    return ({ children }: any) => children
  }
  if (process.env.PROVIDER_MODE === 'VERSIONED_WRITE') {
    if (process.env.CI) {
      console.log('TESTING WITH PROVIDER_LESS_MODE')
    }
    return ({ children, ...props }: any) =>
      createElement(
        Provider,
        {
          ...props,
          unstable_enableVersionedWrite: true,
        },
        children
      )
  }
  return Provider
}

export const itSkipIfVersionedWrite =
  process.env.PROVIDER_MODE === 'VERSIONED_WRITE' ? it.skip : it
