import React, { Suspense } from 'react'
import { fireEvent, render, act } from '@testing-library/react'
import { getTestProvider } from '../testUtils'
import { useAtom } from '../../src/index'
import { atomWithObservable } from '../../src/rxjs'
import { Observable } from 'rxjs'

const Provider = getTestProvider()

it('count state', async () => {
  const observableAtom = atomWithObservable(
    () =>
      new Observable<number>((subscriber) => {
        subscriber.next(1)
        subscriber.next(2)
        subscriber.next(3)
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
