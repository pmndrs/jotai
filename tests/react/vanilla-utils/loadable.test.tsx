import { StrictMode, Suspense, useEffect } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAtomValue, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'
import { loadable } from 'jotai/vanilla/utils'

it('loadable turns suspense into values', async () => {
  let resolve: (x: number) => void = () => {}
  const asyncAtom = atom(() => {
    return new Promise<number>((r) => (resolve = r))
  })

  const { findByText } = render(
    <StrictMode>
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>
  )

  await findByText('Loading...')
  resolve(5)
  await findByText('Data: 5')
})

it('loadable turns errors into values', async () => {
  let reject: (error: unknown) => void = () => {}
  const asyncAtom = atom(() => {
    return new Promise<number>((_res, rej) => (reject = rej))
  })

  const { findByText } = render(
    <StrictMode>
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>
  )

  await findByText('Loading...')
  reject(new Error('An error occurred'))
  await findByText('Error: An error occurred')
})

it('loadable turns primitive throws into values', async () => {
  let reject: (error: unknown) => void = () => {}
  const asyncAtom = atom(() => {
    return new Promise<number>((_res, rej) => (reject = rej))
  })

  const { findByText } = render(
    <StrictMode>
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>
  )

  await findByText('Loading...')
  reject('An error occurred')
  await findByText('An error occurred')
})

it('loadable goes back to loading after re-fetch', async () => {
  let resolve: (x: number) => void = () => {}
  const refreshAtom = atom(0)
  const asyncAtom = atom((get) => {
    get(refreshAtom)
    return new Promise<number>((r) => (resolve = r))
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
      <Refresh />
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>
  )

  getByText('Loading...')
  resolve(5)
  await findByText('Data: 5')
  fireEvent.click(getByText('refresh'))
  await findByText('Loading...')
  resolve(6)
  await findByText('Data: 6')
})

it('loadable can recover from error', async () => {
  let resolve: (x: number) => void = () => {}
  let reject: (error: unknown) => void = () => {}
  const refreshAtom = atom(0)
  const asyncAtom = atom((get) => {
    get(refreshAtom)
    return new Promise<number>((res, rej) => {
      resolve = res
      reject = rej
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
      <Refresh />
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>
  )

  getByText('Loading...')
  reject(new Error('An error occurred'))
  await findByText('Error: An error occurred')
  fireEvent.click(getByText('refresh'))
  await findByText('Loading...')
  resolve(6)
  await findByText('Data: 6')
})

it('loadable immediately resolves sync values', async () => {
  const syncAtom = atom(5)
  const effectCallback = vi.fn()

  const { getByText } = render(
    <StrictMode>
      <LoadableComponent effectCallback={effectCallback} asyncAtom={syncAtom} />
    </StrictMode>
  )

  getByText('Data: 5')
  expect(effectCallback.mock.calls).not.toContain(
    expect.objectContaining({ state: 'loading' })
  )
  expect(effectCallback).toHaveBeenLastCalledWith({ state: 'hasData', data: 5 })
})

it('loadable can use resolved promises synchronously', async () => {
  const asyncAtom = atom(Promise.resolve(5))
  const effectCallback = vi.fn()

  const ResolveAtomComponent = () => {
    useAtomValue(asyncAtom)

    return <div>Ready</div>
  }

  const { findByText, rerender } = render(
    <StrictMode>
      <Suspense fallback={null}>
        <ResolveAtomComponent />
      </Suspense>
    </StrictMode>
  )

  await findByText('Ready')

  rerender(
    <StrictMode>
      <LoadableComponent
        effectCallback={effectCallback}
        asyncAtom={asyncAtom}
      />
    </StrictMode>
  )
  await findByText('Data: 5')

  expect(effectCallback.mock.calls).not.toContain(
    expect.objectContaining({ state: 'loading' })
  )
  expect(effectCallback).toHaveBeenLastCalledWith({ state: 'hasData', data: 5 })
})

it('loadable of a derived async atom does not trigger infinite loop (#1114)', async () => {
  let resolve: (x: number) => void = () => {}
  const baseAtom = atom(0)
  const asyncAtom = atom((get) => {
    get(baseAtom)
    return new Promise<number>((r) => (resolve = r))
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
      <Trigger />
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>
  )

  getByText('Loading...')
  fireEvent.click(getByText('trigger'))
  resolve(5)
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
      <LoadableComponent asyncAtom={asyncAtom} />
    </StrictMode>
  )

  getByText('Loading...')
  await findByText('Error: thrown in baseAtom')
})

it('does not repeatedly attempt to get the value of an unresolved promise atom wrapped in a loadable (#1481)', async () => {
  const baseAtom = atom(new Promise<number>(() => {}))

  let callsToGetBaseAtom = 0
  const derivedAtom = atom((get) => {
    callsToGetBaseAtom++
    return get(baseAtom)
  })

  render(
    <StrictMode>
      <LoadableComponent asyncAtom={derivedAtom} />
    </StrictMode>
  )

  // we need a small delay to reproduce the issue
  await new Promise((r) => setTimeout(r, 10))
  // depending on provider-less mode or versioned-write mode, there will be
  // either 2 or 3 calls.
  expect(callsToGetBaseAtom).toBeLessThanOrEqual(3)
})

it('should handle sync error (#1843)', async () => {
  const syncAtom = atom(() => {
    throw new Error('thrown in syncAtom')
  })

  const { findByText } = render(
    <StrictMode>
      <LoadableComponent asyncAtom={syncAtom} />
    </StrictMode>
  )

  await findByText('Error: thrown in syncAtom')
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
