import { Component, FC, Suspense } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Observable, Subject } from 'rxjs'
import { useAtom } from '../../src/index'
import { atomWithObservable } from '../../src/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

class ErrorBoundary extends Component<
  { message?: string },
  { hasError: boolean }
> {
  constructor(props: { message?: string }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    return this.state.hasError ? (
      <div>
        <div>{this.props.message || 'errored'}</div>
        <button onClick={() => this.setState({ hasError: false })}>
          retry
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}

it('count state', async () => {
  const observableAtom = atomWithObservable(
    () =>
      new Observable<number>((subscriber) => {
        subscriber.next(1)
      })
  )

  const Counter: FC = () => {
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

  const Counter: FC = () => {
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

// FIXME we would like to support retry
it.skip('count state with error', async () => {
  const myObservable = new Observable<number>((subscriber) => {
    subscriber.error('err1')
    subscriber.next(1)
  })
  const observableAtom = atomWithObservable(() => myObservable)

  const Counter: React.FC = () => {
    const [state] = useAtom(observableAtom)

    return <div>count: {state}</div>
  }

  const { findByText, getByText } = render(
    <Provider>
      <ErrorBoundary>
        <Suspense fallback="loading">
          <Counter />
        </Suspense>
      </ErrorBoundary>
    </Provider>
  )

  await findByText('errored')
  fireEvent.click(getByText('retry'))
  await findByText('count: 1')
})
