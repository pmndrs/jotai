import { atom, Provider, useAtom, PrimitiveAtom } from 'jotai'
import React, { useMemo, useEffect, useRef } from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'

import { splitAtom } from '../../src/utils/splitAtom'

type TodoItem = { task: string; checked?: boolean }

it('no unneccesary updates when updating atoms', async () => {
  const useCommitCount = () => {
    const rerenderCountRef = useRef(0)
    useEffect(() => {
      rerenderCountRef.current += 1
    })
    return rerenderCountRef.current
  }
  const todosAtom = atom<TodoItem[]>([
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
  ])

  const TaskList = ({ listAtom }: { listAtom: typeof todosAtom }) => {
    const [atoms, remove] = useAtom(
      useMemo(() => splitAtom(listAtom), [listAtom])
    )
    const updates = useCommitCount()
    return (
      <>
        TaskListUpdates: {updates}
        {atoms.map((anAtom, index) => (
          <TaskItem
            key={index}
            onRemove={() => remove(anAtom)}
            itemAtom={anAtom}
          />
        ))}
      </>
    )
  }

  const TaskItem = ({
    itemAtom,
  }: {
    itemAtom: PrimitiveAtom<TodoItem>
    onRemove: () => void
  }) => {
    const [value, onChange] = useAtom(itemAtom)
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
      <TaskList listAtom={todosAtom} />
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
  const todosAtom = atom<TodoItem[]>([
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
    { task: 'help nana', checked: false },
  ])

  const TaskList = ({ listAtom }: { listAtom: typeof todosAtom }) => {
    const [atoms, remove] = useAtom(
      useMemo(() => splitAtom(listAtom), [listAtom])
    )
    return (
      <>
        {atoms.map((anAtom, index) => (
          <TaskItem
            key={index}
            onRemove={() => remove(anAtom)}
            itemAtom={anAtom}
          />
        ))}
      </>
    )
  }

  const TaskItem = ({
    itemAtom,
    onRemove,
  }: {
    itemAtom: PrimitiveAtom<TodoItem>
    onRemove: () => void
  }) => {
    const [value] = useAtom(itemAtom)
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
      <TaskList listAtom={todosAtom} />
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
