import { useLayoutEffect, useEffect } from 'react'

const isClient =
  typeof window !== 'undefined' &&
  !/ServerSideRendering/.test(window.navigator && window.navigator.userAgent)

export const useIsoLayoutEffect = isClient ? useLayoutEffect : useEffect
