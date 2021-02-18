import React, { createElement, useContext } from 'react'

import { getStoreContext } from './contexts'
import { Scope } from './types'

export const useBridge = (scope?: Scope) => {
  const StoreContext = getStoreContext(scope)
  return useContext(StoreContext)
}

export const Bridge: React.FC<{
  value: ReturnType<typeof useBridge>
  scope?: Scope
}> = ({ value, scope, children }) => {
  const StoreContext = getStoreContext(scope)
  return createElement(StoreContext.Provider, { value }, children)
}
