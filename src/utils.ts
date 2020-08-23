import { useLayoutEffect, useEffect } from 'react'

const isClient =
  typeof window !== 'undefined' &&
  !/ServerSideRendering/.test(window.navigator && window.navigator.userAgent)

export const useIsoLayoutEffect = isClient ? useLayoutEffect : useEffect

export const appendMap = <K, V>(dst: Map<K, V>, src: Map<K, V>) => {
  src.forEach((v, k) => {
    dst.set(k, v)
  })
  return dst
}

export const concatMap = <K, V>(src1: Map<K, V>, src2: Map<K, V>) => {
  const dst = new Map<K, V>()
  src1.forEach((v, k) => {
    dst.set(k, v)
  })
  src2.forEach((v, k) => {
    dst.set(k, v)
  })
  return dst
}
