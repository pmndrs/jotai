import { useLayoutEffect } from 'react'

const isSSR =
  typeof window === 'undefined' ||
  /ServerSideRendering/.test(window.navigator && window.navigator.userAgent)

export const useIsoLayoutEffect = isSSR
  ? (fn: () => void) => fn()
  : useLayoutEffect
