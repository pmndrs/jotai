import { StrictMode, Suspense } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEventOrig from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import { RESET, atomWithDefault } from 'jotai/vanilla/utils'

const userEvent = {
  // eslint-disable-next-line testing-library/no-unnecessary-act
  click: (element: Element) => act(() => userEventOrig.click(element)),
}

it('simple sync get default', async () => {
  const count1Atom = atom(1)
  const count2Atom = atomWithDefault((get) => get(count1Atom) * 2)

  const Counter = () => {
    const [count1, setCount1] = useAtom(count1Atom)
    const [count2, setCount2] = useAtom(count2Atom)
    return (
      <>
        <div>
          count1: {count1}, count2: {count2}
        </div>
        <button onClick={() => setCount1((c) => c + 1)}>button1</button>
        <button onClick={() => setCount2((c) => c + 1)}>button2</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('count1: 1, count2: 2')

  await userEvent.click(screen.getByText('button1'))
  await screen.findByText('count1: 2, count2: 4')

  await userEvent.click(screen.getByText('button2'))
  await screen.findByText('count1: 2, count2: 5')

  await userEvent.click(screen.getByText('button1'))
  await screen.findByText('count1: 3, count2: 5')
})

it('simple async get default', async () => {
  const count1Atom = atom(1)
  let resolve = () => {}
  const count2Atom = atomWithDefault(async (get) => {
    await new Promise<void>((r) => (resolve = r))
    return get(count1Atom) * 2
  })

  const Counter = () => {
    const [count1, setCount1] = useAtom(count1Atom)
    const [count2, setCount2] = useAtom(count2Atom)
    return (
      <>
        <div>
          count1: {count1}, count2: {count2}
        </div>
        <button onClick={() => setCount1((c) => c + 1)}>button1</button>
        <button onClick={() => setCount2((p) => p.then((c) => c + 1))}>
          button2
        </button>
      </>
    )
  }

  render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>,
  )

  await screen.findByText('loading')
  resolve()
  await screen.findByText('count1: 1, count2: 2')

  await userEvent.click(screen.getByText('button1'))
  await screen.findByText('loading')
  resolve()
  await screen.findByText('count1: 2, count2: 4')

  await userEvent.click(screen.getByText('button2'))
  resolve()
  await screen.findByText('count1: 2, count2: 5')

  await userEvent.click(screen.getByText('button1'))
  resolve()
  await screen.findByText('count1: 3, count2: 5')
})

it('refresh sync atoms to default values', async () => {
  const count1Atom = atom(1)
  const count2Atom = atomWithDefault((get) => get(count1Atom) * 2)

  const Counter = () => {
    const [count1, setCount1] = useAtom(count1Atom)
    const [count2, setCount2] = useAtom(count2Atom)
    return (
      <>
        <div>
          count1: {count1}, count2: {count2}
        </div>
        <button onClick={() => setCount1((c) => c + 1)}>button1</button>
        <button onClick={() => setCount2((c) => c + 1)}>button2</button>
        <button onClick={() => setCount2(RESET)}>Refresh count2</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('count1: 1, count2: 2')

  await userEvent.click(screen.getByText('button1'))
  await screen.findByText('count1: 2, count2: 4')

  await userEvent.click(screen.getByText('button2'))
  await screen.findByText('count1: 2, count2: 5')

  await userEvent.click(screen.getByText('button1'))
  await screen.findByText('count1: 3, count2: 5')

  await userEvent.click(screen.getByText('Refresh count2'))
  await screen.findByText('count1: 3, count2: 6')

  await userEvent.click(screen.getByText('button1'))
  await screen.findByText('count1: 4, count2: 8')
})

it('refresh async atoms to default values', async () => {
  const count1Atom = atom(1)
  let resolve = () => {}
  const count2Atom = atomWithDefault(async (get) => {
    await new Promise<void>((r) => (resolve = r))
    return get(count1Atom) * 2
  })

  const Counter = () => {
    const [count1, setCount1] = useAtom(count1Atom)
    const [count2, setCount2] = useAtom(count2Atom)
    return (
      <>
        <div>
          count1: {count1}, count2: {count2}
        </div>
        <button onClick={() => setCount1((c) => c + 1)}>button1</button>
        <button onClick={() => setCount2((p) => p.then((c) => c + 1))}>
          button2
        </button>
        <button onClick={() => setCount2(RESET)}>Refresh count2</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>,
  )

  await screen.findByText('loading')
  await waitFor(() => {
    resolve()
    screen.getByText('count1: 1, count2: 2')
  })

  await userEvent.click(screen.getByText('button1'))
  await screen.findByText('loading')
  await waitFor(() => {
    resolve()
    screen.getByText('count1: 2, count2: 4')
  })

  await userEvent.click(screen.getByText('button2'))
  await waitFor(() => {
    resolve()
    screen.getByText('count1: 2, count2: 5')
  })

  await userEvent.click(screen.getByText('button1'))
  await waitFor(() => {
    resolve()
    screen.getByText('count1: 3, count2: 5')
  })

  await userEvent.click(screen.getByText('Refresh count2'))
  await waitFor(() => {
    resolve()
    screen.getByText('count1: 3, count2: 6')
  })

  await userEvent.click(screen.getByText('button1'))
  await waitFor(() => {
    resolve()
    screen.getByText('count1: 4, count2: 8')
  })
})

it('can be set synchronously by passing value', async () => {
  const countAtom = atomWithDefault(() => 1)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)

    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount(10)}>Set to 10</button>
      </>
    )
  }

  render(<Counter />)

  expect(screen.getByText('count: 1')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Set to 10' }))

  expect(screen.getByText('count: 10')).toBeInTheDocument()
})
