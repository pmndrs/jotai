import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import { freezeAtom, freezeAtomCreator } from 'jotai/vanilla/utils'

it('freezeAtom basic test', async () => {
  const objAtom = atom({ deep: {} }, (_get, set, _ignored?) => {
    set(objAtom, { deep: {} })
  })

  const Component = () => {
    const [obj, setObj] = useAtom(freezeAtom(objAtom))
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

  await screen.findByText('isFrozen: true')

  await userEvent.click(screen.getByText('change'))
  await screen.findByText('isFrozen: true')
})

it('freezeAtom handles null correctly', async () => {
  const nullAtom = atom(null, (_get, set, _arg: null) => {
    set(nullAtom, null)
  })

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

  await screen.findByText('value is null: true')

  await userEvent.click(screen.getByText('set null'))
  await screen.findByText('value is null: true')
})

it('freezeAtom handles primitive correctly', async () => {
  const numberAtom = atom(123, (_get, set, _arg: number) => {
    set(numberAtom, 456)
  })

  const Component = () => {
    const [value, setValue] = useAtom(freezeAtom(numberAtom))
    return (
      <>
        <button onClick={() => setValue(456)}>set number</button>
        <div>value is frozen: {`${Object.isFrozen(value)}`}</div>
        <div>value: {value}</div>
      </>
    )
  }

  render(
    <StrictMode>
      <Component />
    </StrictMode>,
  )

  await screen.findByText('value is frozen: true')
  await screen.findByText('value: 123')

  await userEvent.click(screen.getByText('set number'))

  await screen.findByText('value is frozen: true')
  await screen.findByText('value: 456')
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

  it('freezeAtomCreator basic test', async () => {
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

    await screen.findByText('isFrozen: true')

    await userEvent.click(screen.getByText('change'))
    await screen.findByText('isFrozen: true')
  })
})
