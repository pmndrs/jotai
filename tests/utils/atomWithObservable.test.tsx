import { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Observable, Subject } from 'rxjs'
import { useAtom } from 'jotai'
import { atomWithObservable } from 'jotai/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('count state', async () => {
  const observableAtom = atomWithObservable(
    () =>
      new Observable<number>((subscriber) => {
        subscriber.next(1)
      })
  )

  const Counter = () => {
    const [state] = useAtom(observableAtom)

    return <>count: {state}</>
  }

  const { findByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('count: 1')
})

it('writable count state', async () => {
  const observableAtom = atomWithObservable(() => {
    const observable = new Observable<number>((subscriber) => {
      subscriber.next(1)
    })
    const subject = new Subject<number>()
    // is this usual to delay the subscription?
    setTimeout(() => {
      observable.subscribe(subject)
    }, 100)
    return subject
  })

  const Counter = () => {
    const [state, dispatch] = useAtom(observableAtom)

    return (
      <>
        count: {state}
        <button onClick={() => dispatch(9)}>button</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 9')
})

it('count state from initial', async () => {
  const observableAtom = atomWithObservable(
    () =>
      new Observable<number>((subscriber) => {
        subscriber.next(1)
      }),
    { initialData: 5 }
  )

  const Counter = () => {
    const [state] = useAtom(observableAtom)

    return <>count: {state}</>
  }

  const { findByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('count: 5')
})

it('writable count state with initialData', async () => {
  const observableAtom = atomWithObservable(
    () => {
      const observable = new Observable<number>((subscriber) => {
        subscriber.next(1)
      })
      const subject = new Subject<number>()
      // is this usual to delay the subscription?
      setTimeout(() => {
        observable.subscribe(subject)
      }, 100)
      return subject
    },
    { initialData: 5 }
  )

  const Counter = () => {
    const [state, dispatch] = useAtom(observableAtom)

    return (
      <>
        count: {state}
        <button onClick={() => dispatch(9)}>button</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('count: 5')

  fireEvent.click(getByText('button'))
  await findByText('count: 9')
})
