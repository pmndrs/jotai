import { Fragment, PropsWithChildren } from 'react'
import { AtomMap, AtomTuple, InferAtoms, Options } from './typeUtils.ts'
import { useHydrateAtoms } from './useHydrateAtoms.ts'

type Props<T extends Iterable<AtomTuple>> = PropsWithChildren<{
  values: InferAtoms<T>
  options?: Options
}>
type MapProp<T extends AtomMap> = PropsWithChildren<{
  values: T
  options?: Options
}>

export function HydrateAtoms<T extends Array<AtomTuple>>(
  props: Props<T>
): JSX.Element
export function HydrateAtoms<T extends AtomMap>(props: MapProp<T>): JSX.Element
export function HydrateAtoms<T extends Iterable<AtomTuple>>(
  props: Props<T>
): JSX.Element
export function HydrateAtoms<T extends Iterable<AtomTuple>>({
  children,
  values,
  options,
}: Props<T>): JSX.Element {
  useHydrateAtoms(values, options)
  return <Fragment>{children}</Fragment>
}
