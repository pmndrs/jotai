import React, { Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { getTestProvider } from '../testUtils'
import { useAtom } from '../../src/index'
import { atomWithObservable } from '../../src/utils'
import { Observable, Subject } from 'rxjs'

const Provider = getTestProvider()

it('count state', async () => {
  const observableAtom = atomWithObservable(
    () =>
      new Observable<number>((subscriber) => {
        subscriber.next(1)
      })
  )

  const Counter: React.FC = () => {
    const [state$] = useAtom(observableAtom)

    return <>count: {state$}</>
  }

  const { findByText } = render(
    <Provider>
      <Suspense fallback="loading...">
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

  const Counter: React.FC = () => {
    const [state$, dispatch] = useAtom(observableAtom)

    return (
      <>
        count: {state$}
        <button onClick={() => dispatch(9)}>button</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Suspense fallback="loading...">
        <Counter />
      </Suspense>
    </Provider>
  )

  await findByText('count: 1')

  fireEvent.click(getByText('button'))
  await findByText('count: 9')
})
