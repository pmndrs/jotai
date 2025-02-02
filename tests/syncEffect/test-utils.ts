import type { ErrorInfo, ReactNode } from 'react'
import { Component, createElement } from 'react'
import { createStore } from 'jotai/vanilla'
import {
  INTERNAL_buildStoreRev1 as INTERNAL_buildStore,
  INTERNAL_getBuildingBlocksRev1 as INTERNAL_getBuildingBlocks,
} from 'jotai/vanilla/internals'

type Store = ReturnType<typeof INTERNAL_buildStore>
type Mutable<T> = { -readonly [P in keyof T]: T[P] }
type BuildingBlocks = Mutable<Parameters<typeof INTERNAL_buildStore>>
type DebugStore = Store & {
  ensureAtomState: NonNullable<BuildingBlocks[11]>
  name: string
}

let storeId = 0
export function createDebugStore(): DebugStore {
  const buildingBlocks = INTERNAL_getBuildingBlocks(
    createStore(),
  ) as unknown as BuildingBlocks
  const ensureAtomState = buildingBlocks[11]!
  buildingBlocks[11] = (atom) =>
    Object.assign(ensureAtomState(atom), { label: atom.debugLabel })
  const debugStore = INTERNAL_buildStore(...buildingBlocks) as DebugStore
  const name = `debug${storeId++}`
  Object.assign(debugStore, { ensureAtomState, name })
  return debugStore
}

export function incrementLetter(str: string): string {
  return String.fromCharCode(str.charCodeAt(0) + 1)
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function assert(value: boolean, message?: string): asserts value {
  if (!value) {
    throw new Error(message ?? 'assertion failed')
  }
}

export function waitFor(
  condition: () => boolean,
  options?: { interval?: number; timeout?: number },
): Promise<void>
export function waitFor(
  condition: () => void,
  options?: { interval?: number; timeout?: number },
): Promise<void>
export function waitFor(
  condition: () => boolean | void,
  { interval = 10, timeout = 1000 } = {},
) {
  return new Promise<void>((resolve, reject) => {
    const intervalId = setInterval(() => {
      try {
        if (condition() !== false) {
          clearInterval(intervalId)
          clearTimeout(timeoutId)
          resolve()
        }
      } catch {
        // ignore
      }
    }, interval)
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId)
      reject(new Error('timeout'))
    }, timeout)
  })
}

type ErrorBoundaryState = {
  hasError: boolean
}
type ErrorBoundaryProps = {
  componentDidCatch?: (error: Error, errorInfo: ErrorInfo) => void
  children: ReactNode
}
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    this.props.componentDidCatch?.(error, _errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return createElement('div', {}, 'error')
    }
    return this.props.children
  }
}
