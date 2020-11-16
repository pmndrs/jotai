import React, { createElement, useMemo } from 'react'
import { BridgeProvider, useBridgeValue } from 'use-context-selector'

import { getContexts } from './contexts'
import { Scope } from './types'

export const useBridge = (scope?: Scope) => {
  const [ActionsContext, StateContext] = getContexts(scope)
  const actions = useBridgeValue(ActionsContext)
  const state = useBridgeValue(StateContext)
  return useMemo(() => [actions, state], [actions, state]) as [
    typeof actions,
    typeof state
  ]
}

export const Bridge: React.FC<{
  value: ReturnType<typeof useBridge>
  scope?: Scope
}> = ({ value, scope, children }) => {
  const [actions, state] = value
  const [ActionsContext, StateContext] = getContexts(scope)
  return createElement(
    BridgeProvider,
    { context: ActionsContext, value: actions },
    createElement(
      BridgeProvider,
      { context: StateContext, value: state },
      children
    )
  )
}
