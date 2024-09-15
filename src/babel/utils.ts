import { types } from '@babel/core'

export interface PluginOptions {
  customAtomNames?: string[]
}

export function isAtom(
  t: typeof types,
  callee: babel.types.Expression | babel.types.V8IntrinsicIdentifier,
  customAtomNames: PluginOptions['customAtomNames'] = [],
): boolean {
  const atomNames = [...atomFunctionNames, ...customAtomNames]
  if (t.isIdentifier(callee) && atomNames.includes(callee.name)) {
    return true
  }

  if (t.isMemberExpression(callee)) {
    const { property } = callee
    if (t.isIdentifier(property) && atomNames.includes(property.name)) {
      return true
    }
  }
  return false
}

const atomFunctionNames = [
  // Core
  'atom',
  'atomFamily',
  'atomWithDefault',
  'atomWithObservable',
  'atomWithReducer',
  'atomWithReset',
  'atomWithStorage',
  'freezeAtom',
  'loadable',
  'selectAtom',
  'splitAtom',
  'unwrap',
  // jotai-xstate
  'atomWithMachine',
  // jotai-immer
  'atomWithImmer',
  // jotai-valtio
  'atomWithProxy',
  // jotai-trpc + jotai-relay
  'atomWithQuery',
  'atomWithMutation',
  'atomWithSubscription',
  // jotai-redux + jotai-zustand
  'atomWithStore',
  // jotai-location
  'atomWithHash',
  'atomWithLocation',
  // jotai-optics
  'focusAtom',
  // jotai-form
  'atomWithValidate',
  'validateAtoms',
  // jotai-cache
  'atomWithCache',
  // jotai-recoil
  'atomWithRecoilValue',
]
