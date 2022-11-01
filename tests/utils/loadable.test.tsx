import { StrictMode, Suspense, useEffect } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Atom, atom, useAtomValue, useSetAtom } from 'jotai'
import { loadable } from 'jotai/utils'
import { getTestProvider } from '../testUtils'

const Provider = getTestProvider()

it('loadable turns suspense into values', async () => {
  let resolveAsync!: (x: number) => void
  const asyncAtom = atom(() => {
    return new Promise<number>((resolve) => (resolveAsync = resolve))
  })

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <LoadableComponent asyncAtom={asyncAtom} />
      </Provider>
    </StrictMode>
  )

  await findByText('Loading...')
  resolveAsync(5)
  await findByText('Data: 5')
})

it('loadable turns errors into values', async () => {
  let rejectAsync!: (error: unknown) => void
  const asyncAtom = atom(() => {
    return new Promise<number>((_resolve, reject) => (rejectAsync = reject))
  })

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <LoadableComponent asyncAtom={asyncAtom} />
      </Provider>
    </StrictMode>
  )

  await findByText('Loading...')
  rejectAsync(new Error('An error occurred'))
  await findByText('Error: An error occurred')
})

it('loadable turns primitive throws into values', async () => {
  let rejectAsync!: (error: unknown) => void
  const asyncAtom = atom(() => {
    return new Promise<number>((_resolve, reject) => (rejectAsync = reject))
  })

  const { findByText } = render(
    <StrictMode>
      <Provider>
        <LoadableComponent asyncAtom={asyncAtom} />
      </Provider>
    </StrictMode>
  )

  await findByText('Loading...')
  rejectAsync('An error occurred')
  await findByText('An error occurred')
})

it('loadable goes back to loading after re-fetch', async () => {
  let resolveAsync!: (x: number) => void
  const refreshAtom = atom(0)
  const asyncAtom = atom((get) => {
    get(refreshAtom)
    return new Promise<number>((resolve) => (resolveAsync = resolve))
  })

  const Refresh = () => {
    const setRefresh = useSetAtom(refreshAtom)
    return (
      <>
        <button onClick={() => setRefresh((value) => value + 1)}>
          refresh
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <Refresh />
        <LoadableComponent asyncAtom={asyncAtom} />
      </Provider>
    </StrictMode>
  )

  getByText('Loading...')
  resolveAsync(5)
  await findByText('Data: 5')
  fireEvent.click(getByText('refresh'))
  await findByText('Loading...')
  resolveAsync(6)
  await findByText('Data: 6')
})

it('loadable can recover from error', async () => {
  let resolveAsync!: (x: number) => void
  let rejectAsync!: (error: unknown) => void
  const refreshAtom = atom(0)
  const asyncAtom = atom((get) => {
    get(refreshAtom)
    return new Promise<number>((resolve, reject) => {
      resolveAsync = resolve
      rejectAsync = reject
    })
  })

  const Refresh = () => {
    const setRefresh = useSetAtom(refreshAtom)
    return (
      <>
        <button onClick={() => setRefresh((value) => value + 1)}>
          refresh
        </button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <Refresh />
        <LoadableComponent asyncAtom={asyncAtom} />
      </Provider>
    </StrictMode>
  )

  getByText('Loading...')
  rejectAsync(new Error('An error occurred'))
  await findByText('Error: An error occurred')
  fireEvent.click(getByText('refresh'))
  await findByText('Loading...')
  resolveAsync(6)
  await findByText('Data: 6')
})

it('loadable immediately resolves sync values', async () => {
  const syncAtom = atom(5)
  const effectCallback = jest.fn()

  const { getByText } = render(
    <StrictMode>
      <Provider>
        <LoadableComponent
          effectCallback={effectCallback}
          asyncAtom={syncAtom}
        />
      </Provider>
    </StrictMode>
  )

  getByText('Data: 5')
  expect(effectCallback.mock.calls).not.toContain(
    expect.objectContaining({ state: 'loading' })
  )
  expect(effectCallback).toHaveBeenLastCalledWith({ state: 'hasData', data: 5 })
})

it('loadable can use resolved promises syncronously', async () => {
  const asyncAtom = atom(Promise.resolve(5))
  const effectCallback = jest.fn()

  const ResolveAtomComponent = () => {
    useAtomValue(asyncAtom)

    return <div>Ready</div>
  }

  const { getByText, findByText, rerender } = render(
    <StrictMode>
      <Provider>
        <Suspense fallback={null}>
          <ResolveAtomComponent />
        </Suspense>
      </Provider>
    </StrictMode>
  )

  await findByText('Ready')

  rerender(
    <StrictMode>
      <Provider>
        <LoadableComponent
          effectCallback={effectCallback}
          asyncAtom={asyncAtom}
        />
      </Provider>
    </StrictMode>
  )
  getByText('Data: 5')

  expect(effectCallback.mock.calls).not.toContain(
    expect.objectContaining({ state: 'loading' })
  )
  expect(effectCallback).toHaveBeenLastCalledWith({ state: 'hasData', data: 5 })
})

it('loadable of a derived async atom does not trigger infinite loop (#1114)', async () => {
  let resolveAsync!: (x: number) => void
  const baseAtom = atom(0)
  const asyncAtom = atom((get) => {
    get(baseAtom)
    return new Promise<number>((resolve) => (resolveAsync = resolve))
  })

  const Trigger = () => {
    const trigger = useSetAtom(baseAtom)
    return (
      <>
        <button onClick={() => trigger((value) => value)}>trigger</button>
      </>
    )
  }

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <Trigger />
        <LoadableComponent asyncAtom={asyncAtom} />
      </Provider>
    </StrictMode>
  )

  getByText('Loading...')
  fireEvent.click(getByText('trigger'))
  resolveAsync(5)
  await findByText('Data: 5')
})

it('loadable of a derived async atom with error does not trigger infinite loop (#1330)', async () => {
  const baseAtom = atom(() => {
    throw new Error('thrown in baseAtom')
  })
  const asyncAtom = atom(async (get) => {
    get(baseAtom)
    return ''
  })

  const { findByText, getByText } = render(
    <StrictMode>
      <Provider>
        <LoadableComponent asyncAtom={asyncAtom} />
      </Provider>
    </StrictMode>
  )

  getByText('Loading...')
  await findByText('Error: thrown in baseAtom')
})

type LoadableComponentProps = {
  asyncAtom: Atom<Promise<number> | Promise<string> | string | number>
  effectCallback?: (loadableValue: any) => void
}

const LoadableComponent = ({
  asyncAtom,
  effectCallback,
}: LoadableComponentProps) => {
  const value = useAtomValue(loadable(asyncAtom))

  useEffect(() => {
    if (effectCallback) {
      effectCallback(value)
    }
  }, [value, effectCallback])

  if (value.state === 'loading') {
    return <>Loading...</>
  }

  if (value.state === 'hasError') {
    return <>{String(value.error)}</>
  }

  // this is to ensure correct typing
  const data: number | string = value.data

  return <>Data: {data}</>
}
