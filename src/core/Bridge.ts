import React, { createElement } from 'react'
import { BridgeProvider, useBridgeValue } from 'use-context-selector'

import { getStoreContext } from './contexts'
import { Scope } from './types'

export const useBridge = (scope?: Scope) => {
  const StoreContext = getStoreContext(scope)
  return useBridgeValue(StoreContext)
}

export const Bridge: React.FC<{
  value: ReturnType<typeof useBridge>
  scope?: Scope
}> = ({ value, scope, children }) => {
  const StoreContext = getStoreContext(scope)
  return createElement(
    BridgeProvider,
    { context: StoreContext, value },
    children
  )
}
