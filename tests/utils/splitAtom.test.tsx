import React, { useEffect, useRef } from 'react'
import { atom, Provider, useAtom, Atom, PrimitiveAtom } from 'jotai'
import { render, fireEvent, waitFor } from '@testing-library/react'

import { splitAtom } from '../../src/utils/splitAtom'

type TodoItem = { task: string; checked?: boolean }

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  return commitCountRef.current
}

it('no unneccesary updates when updating atoms', async () => {
  const todosAtom = atom<TodoItem[]>([
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
  ])

  const TaskList: React.FC<{ listAtom: typeof todosAtom }> = ({ listAtom }) => {
    const [atoms, remove] = useAtom(splitAtom(listAtom))
    return (
      <>
        TaskListUpdates: {useCommitCount()}
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

  const TaskItem: React.FC<{
    itemAtom: PrimitiveAtom<TodoItem>
    onRemove: () => void
  }> = ({ itemAtom }) => {
    const [value, onChange] = useAtom(itemAtom)
    const toggle = () =>
      onChange((value) => ({ ...value, checked: !value.checked }))
    return (
      <li>
        {value.task} commits: {useCommitCount()}
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
    getByText('get cat food commits: 1')
    getByText('get dragon food commits: 1')
    getByText('TaskListUpdates: 1')
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
    getByText('get cat food commits: 2')
    getByText('get dragon food commits: 1')
    getByText('TaskListUpdates: 1')
  })

  expect(catBox.checked).toBe(true)
  expect(dragonBox.checked).toBe(false)

  fireEvent.click(dragonBox)

  await waitFor(() => {
    getByText('get cat food commits: 2')
    getByText('get dragon food commits: 2')
    getByText('TaskListUpdates: 1')
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

  const TaskList: React.FC<{ listAtom: typeof todosAtom }> = ({ listAtom }) => {
    const [atoms, remove] = useAtom(splitAtom(listAtom))
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

  const TaskItem: React.FC<{
    itemAtom: PrimitiveAtom<TodoItem>
    onRemove: () => void
  }> = ({ itemAtom, onRemove }) => {
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

it('read-only array atom', async () => {
  const todosAtom = atom<TodoItem[]>(() => [
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
  ])

  const TaskList: React.FC<{ listAtom: typeof todosAtom }> = ({ listAtom }) => {
    const [atoms] = useAtom(splitAtom(listAtom))
    return (
      <>
        {atoms.map((anAtom, index) => (
          <TaskItem key={index} itemAtom={anAtom} />
        ))}
      </>
    )
  }

  const TaskItem: React.FC<{ itemAtom: Atom<TodoItem> }> = ({ itemAtom }) => {
    const [value] = useAtom(itemAtom)
    return (
      <li>
        <input
          data-testid={`${value.task}-checkbox`}
          type="checkbox"
          checked={value.checked || false}
          readOnly
        />
      </li>
    )
  }

  const { findByTestId } = render(
    <Provider>
      <TaskList listAtom={todosAtom} />
    </Provider>
  )

  const catBox = (await findByTestId(
    'get cat food-checkbox'
  )) as HTMLInputElement
  const dragonBox = (await findByTestId(
    'get dragon food-checkbox'
  )) as HTMLInputElement

  expect(catBox.checked).toBe(false)
  expect(dragonBox.checked).toBe(false)
})

it('handles scope', async () => {
  const scope = Symbol()
  const todosAtom = atom<TodoItem[]>([
    { task: 'get cat food', checked: false },
    { task: 'get dragon food', checked: false },
  ])
  todosAtom.scope = scope

  const TaskList: React.FC<{ listAtom: typeof todosAtom }> = ({ listAtom }) => {
    const [atoms] = useAtom(splitAtom(listAtom))
    return (
      <>
        {atoms.map((anAtom, index) => (
          <TaskItem key={index} itemAtom={anAtom} />
        ))}
      </>
    )
  }

  const TaskItem: React.FC<{
    itemAtom: PrimitiveAtom<TodoItem>
  }> = ({ itemAtom }) => {
    const [value, onChange] = useAtom(itemAtom)
    itemAtom.scope = scope
    const toggle = () =>
      onChange((value) => ({ ...value, checked: !value.checked }))
    return (
      <li>
        <input
          data-testid={`${value.task}-checkbox`}
          type="checkbox"
          checked={value.checked ?? false}
          onChange={toggle}
        />
      </li>
    )
  }

  const { findByTestId } = render(
    <Provider scope={scope}>
      <TaskList listAtom={todosAtom} />
    </Provider>
  )

  const catBox = (await findByTestId(
    'get cat food-checkbox'
  )) as HTMLInputElement
  const dragonBox = (await findByTestId(
    'get dragon food-checkbox'
  )) as HTMLInputElement

  expect(catBox.checked).toBe(false)
  expect(dragonBox.checked).toBe(false)

  fireEvent.click(catBox)

  expect(catBox.checked).toBe(true)
  expect(dragonBox.checked).toBe(false)
})
