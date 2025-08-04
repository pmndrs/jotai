import { StrictMode, useCallback, useEffect, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { useAtom } from 'jotai/react'
import { useAtomCallback } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

it('useAtomCallback with get', async () => {
  const countAtom = atom(0)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>atom count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  const Monitor = () => {
    const [count, setCount] = useState(0)
    const readCount = useAtomCallback(
      useCallback((get) => {
        const currentCount = get(countAtom)
        setCount(currentCount)
        return currentCount
      }, []),
    )
    useEffect(() => {
      const timer = setInterval(() => {
        readCount()
      }, 10)
      return () => {
        clearInterval(timer)
      }
    }, [readCount])
    return (
      <>
        <div>state count: {count}</div>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
      <Monitor />
    </StrictMode>,
  )

  expect(await screen.findByText('atom count: 0')).toBeInTheDocument()
  await userEvent.click(screen.getByText('dispatch'))
  await waitFor(() => {
    expect(screen.getByText('atom count: 1')).toBeInTheDocument()
    expect(screen.getByText('state count: 1')).toBeInTheDocument()
  })
})

it('useAtomCallback with set and update', async () => {
  const countAtom = atom(0)
  const changeableAtom = atom(0)
  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  const Monitor = () => {
    const [changeableCount] = useAtom(changeableAtom)
    const changeCount = useAtomCallback(
      useCallback((get, set) => {
        const currentCount = get(countAtom)
        set(changeableAtom, currentCount)
        return currentCount
      }, []),
    )
    useEffect(() => {
      const timer = setInterval(() => {
        changeCount()
      }, 10)
      return () => {
        clearInterval(timer)
      }
    }, [changeCount])
    return (
      <>
        <div>changeable count: {changeableCount}</div>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
      <Monitor />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 0')).toBeInTheDocument()
  await userEvent.click(screen.getByText('dispatch'))
  await waitFor(() => {
    expect(screen.getByText('count: 1')).toBeInTheDocument()
    expect(screen.getByText('changeable count: 1')).toBeInTheDocument()
  })
})

it('useAtomCallback with set and update and arg', async () => {
  const countAtom = atom(0)

  const App = () => {
    const [count] = useAtom(countAtom)
    const setCount = useAtomCallback(
      useCallback((_get, set, arg: number) => {
        set(countAtom, arg)
        return arg
      }, []),
    )

    return (
      <div>
        <p>count: {count}</p>
        <button onClick={() => setCount(42)}>dispatch</button>
      </div>
    )
  }

  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  expect(await screen.findByText('count: 0')).toBeInTheDocument()
  await userEvent.click(screen.getByText('dispatch'))
  await waitFor(() => {
    expect(screen.getByText('count: 42')).toBeInTheDocument()
  })
})

it('useAtomCallback with sync atom (#1100)', async () => {
  const countAtom = atom(0)

  const Counter = () => {
    const [count, setCount] = useAtom(countAtom)
    const readCount = useAtomCallback(useCallback((get) => get(countAtom), []))
    useEffect(() => {
      const promiseOrValue = readCount()
      if (typeof promiseOrValue !== 'number') {
        throw new Error('should return number')
      }
    }, [readCount])
    return (
      <>
        <div>atom count: {count}</div>
        <button onClick={() => setCount((c) => c + 1)}>dispatch</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  expect(await screen.findByText('atom count: 0')).toBeInTheDocument()

  await userEvent.click(screen.getByText('dispatch'))
  expect(await screen.findByText('atom count: 1')).toBeInTheDocument()
})
