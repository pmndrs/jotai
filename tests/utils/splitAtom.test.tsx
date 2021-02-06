import { atom, Provider, useAtom, WritableAtom, PrimitiveAtom } from 'jotai'
import React, { useMemo, useEffect, useRef } from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'

import { splitAtom } from '../../src/utils/splitAtom'

const useAtomSlice = <Item,>(arrAtom: WritableAtom<Item[], Item[]>) => {
  const [atoms, remove] = useAtom(useMemo(() => splitAtom(arrAtom), [arrAtom]))
  return useMemo(
    () => atoms.map((itemAtom) => [itemAtom, () => remove(itemAtom)] as const),
    [atoms, remove]
  )
}

type TodoItem = { task: string; checked?: boolean }

it('no unneccesary updates when updating atoms', async () => {
  const useCommitCount = () => {
    const rerenderCountRef = useRef(0)
    useEffect(() => {
      rerenderCountRef.current += 1
    })
    return rerenderCountRef.current
  }
  const todosAtom = atom<Array<TodoItem>>([
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
  ])

  const TaskList = ({ atom }: { atom: typeof todosAtom }) => {
    const atoms = useAtomSlice(atom)
    const updates = useCommitCount()
    return (
      <>
        TaskListUpdates: {updates}
        {atoms.map(([atom, remove], index) => (
          <TaskItem key={index} onRemove={remove} atom={atom} />
        ))}
      </>
    )
  }

  const TaskItem = ({
    atom,
  }: {
    atom: PrimitiveAtom<TodoItem>
    onRemove: () => void
  }) => {
    const [value, onChange] = useAtom(atom)
    const toggle = () =>
      onChange((value) => ({ ...value, checked: !value.checked }))
    const updates = useCommitCount()
    return (
      <li>
        {value.task} updates: {updates}
        <input
          data-testid={`${value.task}-checkbox`}
          type="checkbox"
          checked={value.checked || false}
          onChange={toggle}
        />
      </li>
    )
  }

  const { findByTestId, getByText } = render(
    <Provider>
      <TaskList atom={todosAtom} />
    </Provider>
  )

  await waitFor(() => {
    getByText('get cat food updates: 0')
    getByText('get dragon food updates: 0')
    getByText('TaskListUpdates: 0')
  })

  const catBox = (await findByTestId(
    'get cat food-checkbox'
  )) as HTMLInputElement
  const dragonBox = (await findByTestId(
    'get dragon food-checkbox'
  )) as HTMLInputElement

  expect(catBox.checked).toBe(false)
  expect(dragonBox.checked).toBe(false)

  fireEvent.click(catBox)

  await waitFor(() => {
    getByText('get cat food updates: 1')
    getByText('get dragon food updates: 0')
    getByText('TaskListUpdates: 0')
  })

  expect(catBox.checked).toBe(true)
  expect(dragonBox.checked).toBe(false)

  fireEvent.click(dragonBox)

  await waitFor(() => {
    getByText('get cat food updates: 1')
    getByText('get dragon food updates: 1')
    getByText('TaskListUpdates: 0')
  })

  expect(catBox.checked).toBe(true)
  expect(dragonBox.checked).toBe(true)
})

it('removing atoms', async () => {
  const todosAtom = atom<Array<TodoItem>>([
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
    { task: 'help nana', checked: false },
  ])

  const TaskList = ({ atom }: { atom: typeof todosAtom }) => {
    const atoms = useAtomSlice(atom)
    return (
      <>
        {atoms.map(([atom, remove], index) => (
          <TaskItem key={index} onRemove={remove} atom={atom} />
        ))}
      </>
    )
  }

  const TaskItem = ({
    atom,
    onRemove,
  }: {
    atom: PrimitiveAtom<TodoItem>
    onRemove: () => void
  }) => {
    const [value] = useAtom(atom)
    return (
      <li>
        <div>{value.task}</div>
        <button data-testid={`${value.task}-removebutton`} onClick={onRemove}>
          X
        </button>
      </li>
    )
  }

  const { findByTestId, queryByText } = render(
    <Provider>
      <TaskList atom={todosAtom} />
    </Provider>
  )

  await waitFor(() => {
    expect(queryByText('get cat food')).toBeTruthy()
    expect(queryByText('get dragon food')).toBeTruthy()
    expect(queryByText('help nana')).toBeTruthy()
  })

  const removeCatFood = (await findByTestId(
    'get cat food-removebutton'
  )) as HTMLButtonElement
  fireEvent.click(removeCatFood)

  await waitFor(() => {
    expect(queryByText('get cat food')).toBeFalsy()
    expect(queryByText('get dragon food')).toBeTruthy()
    expect(queryByText('help nana')).toBeTruthy()
  })

  const removeDragonFood = (await findByTestId(
    'get dragon food-removebutton'
  )) as HTMLButtonElement
  fireEvent.click(removeDragonFood)

  await waitFor(() => {
    expect(queryByText('get cat food')).toBeFalsy()
    expect(queryByText('get dragon food')).toBeFalsy()
    expect(queryByText('help nana')).toBeTruthy()
  })

  const removeHelpNana = (await findByTestId(
    'help nana-removebutton'
  )) as HTMLButtonElement
  fireEvent.click(removeHelpNana)

  await waitFor(() => {
    expect(queryByText('get cat food')).toBeFalsy()
    expect(queryByText('get dragon food')).toBeFalsy()
    expect(queryByText('help nana')).toBeFalsy()
  })
})
