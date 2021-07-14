import { Observable, Subject } from 'rxjs'
import { first } from 'rxjs/operators'
import { atom } from 'jotai'
import type { Atom, WritableAtom, Getter } from 'jotai'

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => Subject<TData>
): WritableAtom<TData, TData>

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => Observable<TData>
): Atom<TData>

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => Observable<TData> | Subject<TData>
) {
  type Result = { data: TData } | { error: unknown }
  const observableResultAtom = atom((get) => {
    const observable = createObservable(get)
    let resolve: ((result: Result) => void) | null = null
    const resultAtom = atom<Result | Promise<Result>>(
      new Promise<Result>((r) => {
        resolve = r
      })
    )
    resultAtom.scope = observableAtom.scope
    let setResult: (result: Result) => void = () => {
      throw new Error('setting data without mount')
    }
    const dataListener = (data: TData) => {
      if (resolve) {
        resolve({ data })
        resolve = null
      } else {
        setResult({ data })
      }
    }
    const errorListener = (error: unknown) => {
      if (resolve) {
        resolve({ error })
        resolve = null
      } else {
        setResult({ error })
      }
    }
    observable.pipe(first()).toPromise().then(dataListener).catch(errorListener)
    resultAtom.onMount = (update) => {
      setResult = update
      const subscription = observable.subscribe(dataListener, errorListener)
      return () => subscription.unsubscribe()
    }
    return { resultAtom, observable }
  })
  const observableAtom = atom(
    (get) => {
      observableResultAtom.scope = observableAtom.scope
      const { resultAtom } = get(observableResultAtom)
      const result = get(resultAtom)
      if ('error' in result) {
        throw result.error
      }
      return result.data
    },
    (get, _set, data: TData) => {
      observableResultAtom.scope = observableAtom.scope
      const { observable } = get(observableResultAtom)
      if ('next' in observable) {
        observable.next(data)
      } else {
        throw new Error('observable is not subject')
      }
    }
  )
  return observableAtom
}
