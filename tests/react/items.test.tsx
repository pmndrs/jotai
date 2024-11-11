import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { it } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { PrimitiveAtom } from 'jotai/vanilla'

it('remove an item, then add another', async () => {
  type Item = {
    text: string
    checked: boolean
  }
  let itemIndex = 0
  const itemsAtom = atom<PrimitiveAtom<Item>[]>([])

  const ListItem = ({
    itemAtom,
    remove,
  }: {
    itemAtom: PrimitiveAtom<Item>
    remove: () => void
  }) => {
    const [item, setItem] = useAtom(itemAtom)
    const toggle = () =>
      setItem((prev) => ({ ...prev, checked: !prev.checked }))
    return (
      <>
        <div>
          {item.text} checked: {item.checked ? 'yes' : 'no'}
        </div>
        <button onClick={toggle}>Check {item.text}</button>
        <button onClick={remove}>Remove {item.text}</button>
      </>
    )
  }

  const List = () => {
    const [items, setItems] = useAtom(itemsAtom)
    const addItem = () => {
      setItems((prev) => [
        ...prev,
        atom<Item>({ text: `item${++itemIndex}`, checked: false }),
      ])
    }
    const removeItem = (itemAtom: PrimitiveAtom<Item>) => {
      setItems((prev) => prev.filter((x) => x !== itemAtom))
    }
    return (
      <ul>
        {items.map((itemAtom) => (
          <ListItem
            key={`${itemAtom}`}
            itemAtom={itemAtom}
            remove={() => removeItem(itemAtom)}
          />
        ))}
        <li>
          <button onClick={addItem}>Add</button>
        </li>
      </ul>
    )
  }

  render(
    <StrictMode>
      <List />
    </StrictMode>,
  )

  await userEvent.click(screen.getByText('Add'))
  await screen.findByText('item1 checked: no')

  await userEvent.click(screen.getByText('Add'))
  await waitFor(() => {
    screen.getByText('item1 checked: no')
    screen.getByText('item2 checked: no')
  })

  await userEvent.click(screen.getByText('Check item2'))
  await waitFor(() => {
    screen.getByText('item1 checked: no')
    screen.getByText('item2 checked: yes')
  })

  await userEvent.click(screen.getByText('Remove item1'))
  await screen.findByText('item2 checked: yes')

  await userEvent.click(screen.getByText('Add'))
  await waitFor(() => {
    screen.getByText('item2 checked: yes')
    screen.getByText('item3 checked: no')
  })
})

it('add an item with filtered list', async () => {
  type Item = {
    text: string
    checked: boolean
  }
  type ItemAtoms = PrimitiveAtom<Item>[]
  type Update = (prev: ItemAtoms) => ItemAtoms

  let itemIndex = 0
  const itemAtomsAtom = atom<ItemAtoms>([])
  const setItemsAtom = atom(null, (_get, set, update: Update) =>
    set(itemAtomsAtom, update),
  )
  const filterAtom = atom<'all' | 'checked' | 'not-checked'>('all')
  const filteredAtom = atom((get) => {
    const filter = get(filterAtom)
    const items = get(itemAtomsAtom)
    if (filter === 'all') {
      return items
    }
    if (filter === 'checked') {
      return items.filter((atom) => get(atom).checked)
    }
    return items.filter((atom) => !get(atom).checked)
  })

  const ListItem = ({
    itemAtom,
    remove,
  }: {
    itemAtom: PrimitiveAtom<Item>
    remove: () => void
  }) => {
    const [item, setItem] = useAtom(itemAtom)
    const toggle = () =>
      setItem((prev) => ({ ...prev, checked: !prev.checked }))
    return (
      <>
        <div>
          {item.text} checked: {item.checked ? 'yes' : 'no'}
        </div>
        <button onClick={toggle}>Check {item.text}</button>
        <button onClick={remove}>Remove {item.text}</button>
      </>
    )
  }

  const Filter = () => {
    const [filter, setFilter] = useAtom(filterAtom)
    return (
      <>
        <div>{filter}</div>
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('checked')}>Checked</button>
        <button onClick={() => setFilter('not-checked')}>Not Checked</button>
      </>
    )
  }

  const FilteredList = ({
    removeItem,
  }: {
    removeItem: (itemAtom: PrimitiveAtom<Item>) => void
  }) => {
    const [items] = useAtom(filteredAtom)
    return (
      <ul>
        {items.map((itemAtom) => (
          <ListItem
            key={`${itemAtom}`}
            itemAtom={itemAtom}
            remove={() => removeItem(itemAtom)}
          />
        ))}
      </ul>
    )
  }

  const List = () => {
    const [, setItems] = useAtom(setItemsAtom)
    const addItem = () => {
      setItems((prev) => [
        ...prev,
        atom<Item>({ text: `item${++itemIndex}`, checked: false }),
      ])
    }
    const removeItem = (itemAtom: PrimitiveAtom<Item>) => {
      setItems((prev) => prev.filter((x) => x !== itemAtom))
    }
    return (
      <>
        <Filter />
        <button onClick={addItem}>Add</button>
        <FilteredList removeItem={removeItem} />
      </>
    )
  }

  render(
    <StrictMode>
      <List />
    </StrictMode>,
  )

  await userEvent.click(screen.getByText('Checked'))
  await userEvent.click(screen.getByText('Add'))
  await userEvent.click(screen.getByText('All'))
  await screen.findByText('item1 checked: no')
})
