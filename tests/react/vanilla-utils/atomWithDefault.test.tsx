import { StrictMode, Suspense } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { it } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import { RESET, atomWithDefault } from 'jotai/vanilla/utils'

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

  const { findByText, getByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await findByText('count1: 1, count2: 2')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 2, count2: 4')

  fireEvent.click(getByText('button2'))
  await findByText('count1: 2, count2: 5')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 3, count2: 5')
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

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>,
  )

  await findByText('loading')
  resolve()
  await findByText('count1: 1, count2: 2')

  fireEvent.click(getByText('button1'))
  await findByText('loading')
  resolve()
  await findByText('count1: 2, count2: 4')

  fireEvent.click(getByText('button2'))
  resolve()
  await findByText('count1: 2, count2: 5')

  fireEvent.click(getByText('button1'))
  resolve()
  await findByText('count1: 3, count2: 5')
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

  const { findByText, getByText } = render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await findByText('count1: 1, count2: 2')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 2, count2: 4')

  fireEvent.click(getByText('button2'))
  await findByText('count1: 2, count2: 5')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 3, count2: 5')

  fireEvent.click(getByText('Refresh count2'))
  await findByText('count1: 3, count2: 6')

  fireEvent.click(getByText('button1'))
  await findByText('count1: 4, count2: 8')
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

  const { findByText, getByText } = render(
    <StrictMode>
      <Suspense fallback="loading">
        <Counter />
      </Suspense>
    </StrictMode>,
  )

  await findByText('loading')
  await waitFor(() => {
    resolve()
    getByText('count1: 1, count2: 2')
  })

  fireEvent.click(getByText('button1'))
  await findByText('loading')
  await waitFor(() => {
    resolve()
    getByText('count1: 2, count2: 4')
  })

  fireEvent.click(getByText('button2'))
  await waitFor(() => {
    resolve()
    getByText('count1: 2, count2: 5')
  })

  fireEvent.click(getByText('button1'))
  await waitFor(() => {
    resolve()
    getByText('count1: 3, count2: 5')
  })

  fireEvent.click(getByText('Refresh count2'))
  await waitFor(() => {
    resolve()
    getByText('count1: 3, count2: 6')
  })

  fireEvent.click(getByText('button1'))
  await waitFor(() => {
    resolve()
    getByText('count1: 4, count2: 8')
  })
})
