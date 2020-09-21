import React, { createElement, useMemo } from 'react'
import { useContext, BridgeProvider } from 'use-context-selector'

import { StateContext, ActionsContext } from './Provider'

export const useBridge = () => {
  const actions = useContext(ActionsContext)
  const state = useContext(StateContext)
  return useMemo(() => [actions, state], [actions, state]) as [
    typeof actions,
    typeof state
  ]
}

export const Bridge: React.FC<{ value: ReturnType<typeof useBridge> }> = ({
  value,
  children,
}) => {
  const [actions, state] = value
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
