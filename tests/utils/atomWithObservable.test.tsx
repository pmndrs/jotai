import { ReactElement, Suspense, useState } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { BehaviorSubject, Observable, Subject } from 'rxjs'
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

it('resubscribe on remount', async () => {
  const subject = new Subject<number>()
  const observableAtom = atomWithObservable(() => subject)

  const Counter = () => {
    const [state] = useAtom(observableAtom)

    return <>count: {state}</>
  }

  const Toggle = ({ children }: { children: ReactElement }) => {
    const [visible, setVisible] = useState(true)
    return (
      <>
        {visible && children}
        <button onClick={() => setVisible(!visible)}>Toggle</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading">
        <Toggle>
          <Counter />
        </Toggle>
      </Suspense>
    </Provider>
  )

  await findByText('loading')
  act(() => subject.next(1))
  await findByText('count: 1')

  fireEvent.click(getByText('Toggle'))
  fireEvent.click(getByText('Toggle'))

  act(() => subject.next(2))
  await findByText('count: 2')
})

it("count state with initialValue doesn't suspend", async () => {
  const subject = new Subject<number>()
  const observableAtom = atomWithObservable(() => subject, { initialValue: 5 })

  const Counter = () => {
    const [state] = useAtom(observableAtom)

    return <>count: {state}</>
  }

  const { findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 5')

  act(() => subject.next(10))

  await findByText('count: 10')
})

it('writable count state with initialValue', async () => {
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
    { initialValue: 5 }
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

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 9')
})

it('with initial value and synchronous subscription', async () => {
  const observableAtom = atomWithObservable(
    () =>
      new Observable<number>((subscriber) => {
        subscriber.next(1)
      }),
    { initialValue: 5 }
  )

  const Counter = () => {
    const [state] = useAtom(observableAtom)

    return <>count: {state}</>
  }

  const { findByText } = render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 1')
})

it('behaviour subject', async () => {
  const subject$ = new BehaviorSubject(1)
  const observableAtom = atomWithObservable(() => subject$)

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
