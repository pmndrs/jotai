import { StrictMode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import { freezeAtom, freezeAtomCreator } from 'jotai/vanilla/utils'

it('freezeAtom basic test', () => {
  const objAtom = atom({ deep: { count: 0 } })

  const Component = () => {
    const [obj, setObj] = useAtom(freezeAtom(objAtom))
    return (
      <>
        <button onClick={() => setObj({ deep: { count: 1 } })}>change</button>
        <div>
          count: {obj.deep.count}, isFrozen:{' '}
          {`${Object.isFrozen(obj) && Object.isFrozen(obj.deep)}`}
        </div>
      </>
    )
  }

  render(
    <StrictMode>
      <Component />
    </StrictMode>,
  )

  expect(screen.getByText('count: 0, isFrozen: true')).toBeInTheDocument()

  fireEvent.click(screen.getByText('change'))
  expect(screen.getByText('count: 1, isFrozen: true')).toBeInTheDocument()
})

it('freezeAtom handles null correctly', () => {
  const nullAtom = atom(null)

  const Component = () => {
    const [value, setValue] = useAtom(freezeAtom(nullAtom))
    return (
      <>
        <button onClick={() => setValue(null)}>set null</button>
        <div>value is null: {`${value === null}`}</div>
      </>
    )
  }

  render(
    <StrictMode>
      <Component />
    </StrictMode>,
  )

  expect(screen.getByText('value is null: true')).toBeInTheDocument()
})

it('freezeAtom handles primitive correctly', () => {
  const numberAtom = atom(123)

  const Component = () => {
    const [value, setValue] = useAtom(freezeAtom(numberAtom))
    return (
      <>
        <button onClick={() => setValue(456)}>set number</button>
        <div>value: {value}</div>
      </>
    )
  }

  render(
    <StrictMode>
      <Component />
    </StrictMode>,
  )

  expect(screen.getByText('value: 123')).toBeInTheDocument()

  fireEvent.click(screen.getByText('set number'))
  expect(screen.getByText('value: 456')).toBeInTheDocument()
})

describe('freezeAtomCreator', () => {
  let savedConsoleWarn: any
  beforeEach(() => {
    savedConsoleWarn = console.warn
    console.warn = vi.fn()
  })
  afterEach(() => {
    console.warn = savedConsoleWarn
  })

  it('freezeAtomCreator basic test', () => {
    const createFrozenAtom = freezeAtomCreator(atom)
    const objAtom = createFrozenAtom({ deep: {} }, (_get, set, _ignored?) => {
      set(objAtom, { deep: {} })
    })

    const Component = () => {
      const [obj, setObj] = useAtom(objAtom)
      return (
        <>
          <button onClick={setObj}>change</button>
          <div>
            isFrozen: {`${Object.isFrozen(obj) && Object.isFrozen(obj.deep)}`}
          </div>
        </>
      )
    }

    render(
      <StrictMode>
        <Component />
      </StrictMode>,
    )

    expect(screen.getByText('isFrozen: true')).toBeInTheDocument()

    fireEvent.click(screen.getByText('change'))
    expect(screen.getByText('isFrozen: true')).toBeInTheDocument()
  })
})
