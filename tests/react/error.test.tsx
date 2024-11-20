import {
  Component,
  StrictMode,
  Suspense,
  version as reactVersion,
  useEffect,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEventOrig from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

const userEvent = {
  // eslint-disable-next-line testing-library/no-unnecessary-act
  click: (element: Element) => act(() => userEventOrig.click(element)),
}

const consoleError = console.error
const errorMessages: string[] = []
beforeEach(() => {
  errorMessages.splice(0)
  console.error = vi.fn((err: string) => {
    const match = /^(.*?)(\n|$)/.exec(err)
    if (match?.[1]) {
      errorMessages.push(match[1])
    }
  })
})
afterEach(() => {
  console.error = consoleError
})

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: false } | { hasError: true; error: Error }
> {
  constructor(props: { message?: string; children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    return this.state.hasError ? (
      <div>
        Errored: {this.state.error.message}
        <button onClick={() => this.setState({ hasError: false })}>
          retry
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}

it('can throw an initial error in read function', async () => {
  const errorAtom = atom(() => {
    throw new Error()
  })

  const Counter = () => {
    useAtom(errorAtom)
    return (
      <>
        <div>no error</div>
      </>
    )
  }

  render(
    <StrictMode>
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>
    </StrictMode>,
  )

  await screen.findByText('Errored:')
})

it('can throw an error in read function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom((get) => {
    if (get(countAtom) === 0) {
      return 0
    }
    throw new Error()
  })

  const Counter = () => {
    const [, setCount] = useAtom(countAtom)
    const [count] = useAtom(errorAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>
    </StrictMode>,
  )

  await screen.findByText('no error')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('Errored:')
})

it('can throw an initial chained error in read function', async () => {
  const errorAtom = atom(() => {
    throw new Error()
  })
  const derivedAtom = atom((get) => get(errorAtom))

  const Counter = () => {
    useAtom(derivedAtom)
    return (
      <>
        <div>no error</div>
      </>
    )
  }

  render(
    <StrictMode>
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>
    </StrictMode>,
  )

  await screen.findByText('Errored:')
})

it('can throw a chained error in read function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom((get) => {
    if (get(countAtom) === 0) {
      return 0
    }
    throw new Error()
  })
  const derivedAtom = atom((get) => get(errorAtom))

  const Counter = () => {
    const [, setCount] = useAtom(countAtom)
    const [count] = useAtom(derivedAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>
    </StrictMode>,
  )

  await screen.findByText('no error')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('Errored:')
})

it('can throw an initial error in async read function', async () => {
  const errorAtom = atom(async () => {
    throw new Error()
  })

  const Counter = () => {
    useAtom(errorAtom)
    return (
      <>
        <div>no error</div>
      </>
    )
  }

  render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Counter />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>,
  )

  await screen.findByText('Errored:')
})

it('can throw an error in async read function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom(async (get) => {
    if (get(countAtom) === 0) {
      return 0
    }
    throw new Error()
  })

  const Counter = () => {
    const [, setCount] = useAtom(countAtom)
    const [count] = useAtom(errorAtom)
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={() => setCount((c) => c + 1)}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Counter />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>,
  )

  await screen.findByText('no error')

  await userEvent.click(screen.getByText('button'))
  await screen.findByText('Errored:')
})

it('can throw an error in write function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom(
    (get) => get(countAtom),
    () => {
      throw new Error('error_in_write_function')
    },
  )

  const Counter = () => {
    const [count, dispatch] = useAtom(errorAtom)
    const onClick = () => {
      try {
        dispatch()
      } catch (e) {
        console.error(e)
      }
    }
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={onClick}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('no error')
  expect(errorMessages).not.toContain('Error: error_in_write_function')

  await userEvent.click(screen.getByText('button'))
  expect(errorMessages).toContain('Error: error_in_write_function')
})

it('can throw an error in async write function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom(
    (get) => get(countAtom),
    async () => {
      throw new Error('error_in_async_write_function')
    },
  )

  const Counter = () => {
    const [count, dispatch] = useAtom(errorAtom)
    const onClick = async () => {
      try {
        await dispatch()
      } catch (e) {
        console.error(e)
      }
    }
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={onClick}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Suspense fallback={null}>
        <Counter />
      </Suspense>
    </StrictMode>,
  )

  await screen.findByText('no error')
  expect(errorMessages).not.toContain('Error: error_in_async_write_function')

  await userEvent.click(screen.getByText('button'))
  await waitFor(() => {
    expect(errorMessages).toContain('Error: error_in_async_write_function')
  })
})

it('can throw a chained error in write function', async () => {
  const countAtom = atom(0)
  const errorAtom = atom(
    (get) => get(countAtom),
    () => {
      throw new Error('chained_err_in_write')
    },
  )
  const chainedAtom = atom(
    (get) => get(errorAtom),
    (_get, set) => {
      set(errorAtom)
    },
  )

  const Counter = () => {
    const [count, dispatch] = useAtom(chainedAtom)
    const onClick = () => {
      try {
        dispatch()
      } catch (e) {
        console.error(e)
      }
    }
    return (
      <>
        <div>count: {count}</div>
        <div>no error</div>
        <button onClick={onClick}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('no error')
  expect(errorMessages).not.toContain('Error: chained_err_in_write')

  await userEvent.click(screen.getByText('button'))
  expect(errorMessages).toContain('Error: chained_err_in_write')
})

it('throws an error while updating in effect', async () => {
  const countAtom = atom(0)

  const Counter = () => {
    const [, setCount] = useAtom(countAtom)
    useEffect(() => {
      try {
        setCount(() => {
          throw new Error('err_updating_in_effect')
        })
      } catch (e) {
        console.error(e)
      }
    }, [setCount])
    return (
      <>
        <div>no error</div>
      </>
    )
  }

  render(
    <StrictMode>
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>
    </StrictMode>,
  )

  await screen.findByText('no error')
  expect(errorMessages).toContain('Error: err_updating_in_effect')
})

describe('throws an error while updating in effect cleanup', () => {
  const countAtom = atom(0)

  let doubleSetCount = false

  const Counter = () => {
    const [, setCount] = useAtom(countAtom)
    useEffect(() => {
      return () => {
        if (doubleSetCount) {
          setCount((x) => x + 1)
        }
        setCount(() => {
          throw new Error('err_in_effect_cleanup')
        })
      }
    }, [setCount])
    return (
      <>
        <div>no error</div>
      </>
    )
  }

  const Main = () => {
    const [hide, setHide] = useState(false)
    return (
      <>
        <button onClick={() => setHide(true)}>close</button>
        {!hide && <Counter />}
      </>
    )
  }

  it('[DEV-ONLY] single setCount', async () => {
    render(
      <>
        <ErrorBoundary>
          <Main />
        </ErrorBoundary>
      </>,
    )

    await screen.findByText('no error')
    expect(errorMessages).not.toContain(
      'Error: Uncaught [Error: err_in_effect_cleanup]',
    )

    await userEvent.click(screen.getByText('close'))
    if (reactVersion.startsWith('17.')) {
      expect(errorMessages).toContain(
        'Error: Uncaught [Error: err_in_effect_cleanup]',
      )
    } else {
      await screen.findByText('Errored: err_in_effect_cleanup')
    }
  })

  it('[DEV-ONLY] dobule setCount', async () => {
    doubleSetCount = true

    render(
      <>
        <ErrorBoundary>
          <Main />
        </ErrorBoundary>
      </>,
    )

    await screen.findByText('no error')
    expect(errorMessages).not.toContain(
      'Error: Uncaught [Error: err_in_effect_cleanup]',
    )

    await userEvent.click(screen.getByText('close'))
    if (reactVersion.startsWith('17.')) {
      expect(errorMessages).toContain(
        'Error: Uncaught [Error: err_in_effect_cleanup]',
      )
    } else {
      await screen.findByText('Errored: err_in_effect_cleanup')
    }
  })
})

describe('error recovery', () => {
  const createCounter = () => {
    const counterAtom = atom(0)

    const Counter = () => {
      const [count, setCount] = useAtom(counterAtom)
      return <button onClick={() => setCount(count + 1)}>increment</button>
    }

    return { Counter, counterAtom }
  }

  it('recovers from sync errors', async () => {
    const { counterAtom, Counter } = createCounter()

    const syncAtom = atom((get) => {
      const value = get(counterAtom)

      if (value === 0) {
        throw new Error('An error occurred')
      }

      return value
    })

    const Display = () => {
      return <div>Value: {useAtom(syncAtom)[0]}</div>
    }

    render(
      <StrictMode>
        <Counter />
        <ErrorBoundary>
          <Display />
        </ErrorBoundary>
      </StrictMode>,
    )

    await screen.findByText('Errored: An error occurred')

    await userEvent.click(screen.getByText('increment'))
    await userEvent.click(screen.getByText('retry'))
    await screen.findByText('Value: 1')
  })

  it('recovers from async errors', async () => {
    const { counterAtom, Counter } = createCounter()
    let resolve = () => {}
    const asyncAtom = atom(async (get) => {
      const value = get(counterAtom)
      await new Promise<void>((r) => (resolve = r))
      if (value === 0) {
        throw new Error('An error occurred')
      }
      return value
    })

    const Display = () => {
      return <div>Value: {useAtom(asyncAtom)[0]}</div>
    }

    render(
      <StrictMode>
        <Counter />
        <ErrorBoundary>
          <Suspense fallback={null}>
            <Display />
          </Suspense>
        </ErrorBoundary>
      </StrictMode>,
    )

    resolve()
    await screen.findByText('Errored: An error occurred')

    await userEvent.click(screen.getByText('increment'))
    await userEvent.click(screen.getByText('retry'))
    resolve()
    await screen.findByText('Value: 1')
  })
})
