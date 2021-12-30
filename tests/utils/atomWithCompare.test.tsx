import { useEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { atom, useAtom, WritableAtom } from 'jotai'
import type { Atom, PrimitiveAtom } from 'jotai'
import { splitAtom } from 'jotai/utils'
import { getTestProvider } from '../testUtils'
import { atomWithCompare } from 'jotai/utils/atomWithCompare'

const Provider = getTestProvider()

const consoleWarn = console.warn
beforeEach(() => {
  console.warn = jest.fn()
})
afterEach(() => {
  console.warn = consoleWarn
})

type Styles = {
  color: string
  fontSize: number
  border: string
}

function stylesAreEqual(a: Styles, b: Styles): boolean {
  return (
    a.color === b.color && a.fontSize === b.fontSize && a.border === b.border
  )
}

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

const Parent = ({ atom }: { atom: WritableAtom<Styles, Styles> }) => {
  const commitCount = useCommitCount()
  const [styles, setStyles] = useAtom(atom)

  return (
    <div>
      <h1>Preview</h1>
      <div style={styles}>commits: {commitCount}</div>
      <button onClick={() => setStyles(styles)}>Set same object</button>
      <button
        onClick={() =>
          setStyles({ ...styles, setOnCommit: commitCount } as any)
        }>
        Duplicate object
      </button>
      <button
        onClick={() =>
          setStyles({ ...styles, fontSize: Math.random() * styles.fontSize })
        }>
        Randomize font size
      </button>
    </div>
  )
}

it('behaves like a normal atom with Object.is comparison', async () => {
  const stylesAtom = atomWithCompare<Styles>(
    { color: 'red', fontSize: 12, border: 'none' },
    Object.is
  )

  const { findByText, getByText } = render(
    <Provider>
      <Parent atom={stylesAtom} />
    </Provider>
  )

  await findByText('commits: 1')

  fireEvent.click(getByText('Duplicate object'))
  await findByText('commits: 2')

  fireEvent.click(getByText('Set same object'))
  await findByText('commits: 2')

  fireEvent.click(getByText('Randomize font size'))
  await findByText('commits: 3')

  fireEvent.click(getByText('Duplicate object'))
  await findByText('commits: 4')

  expect(console.warn).toHaveBeenCalledTimes(0)
})

it('no unnecessary updates when updating atoms', async () => {
  const stylesAtom = atomWithCompare<Styles>(
    { color: 'red', fontSize: 12, border: 'none' },
    stylesAreEqual
  )

  const { findByText, getByText } = render(
    <Provider>
      <Parent atom={stylesAtom} />
    </Provider>
  )

  await findByText('commits: 1')

  fireEvent.click(getByText('Duplicate object'))
  fireEvent.click(getByText('Set same object'))
  await findByText('commits: 1')

  fireEvent.click(getByText('Randomize font size'))
  await findByText('commits: 2')

  fireEvent.click(getByText('Duplicate object'))
  await findByText('commits: 2')

  expect(console.warn).toHaveBeenCalledTimes(0)
})

it('Warns if Object.is disagrees with equality', async () => {
  const stylesAtom = atomWithCompare<Styles>(
    { color: 'red', fontSize: 12, border: 'none' },
    () => false
  )

  const { findByText, getByText } = render(
    <Provider>
      <Parent atom={stylesAtom} />
    </Provider>
  )

  await findByText('commits: 1')
  fireEvent.click(getByText('Set same object'))
  await findByText('commits: 1')

  expect(console.warn).toHaveBeenCalledTimes(1)
})
