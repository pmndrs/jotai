import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Provider, atom, useAtom, PrimitiveAtom } from '../src/index'

it('remove an item, then add another', async () => {
  type Item = {
    text: string
    checked: boolean
  }
  let itemIndex = 0
  const itemsAtom = atom<PrimitiveAtom<Item>[]>([])

  const ListItem: React.FC<{
    itemAtom: PrimitiveAtom<Item>
    remove: () => void
  }> = ({ itemAtom, remove }) => {
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

  const List: React.FC = () => {
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
            key={itemAtom.key}
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

  const { getByText, findByText } = render(
    <Provider>
      <List />
    </Provider>
  )

  fireEvent.click(getByText('Add'))
  await findByText('item1 checked: no')

  fireEvent.click(getByText('Add'))
  await waitFor(() => {
    getByText('item1 checked: no')
    getByText('item2 checked: no')
  })

  fireEvent.click(getByText('Check item2'))
  await waitFor(() => {
    getByText('item1 checked: no')
    getByText('item2 checked: yes')
  })

  fireEvent.click(getByText('Remove item1'))
  await findByText('item2 checked: yes')

  fireEvent.click(getByText('Add'))
  await waitFor(() => {
    getByText('item2 checked: yes')
    getByText('item3 checked: no')
  })
})

it('add an item with filtered list', async () => {
  type Item = {
    text: string
    checked: boolean
  }

  let itemIndex = 0
  const itemsAtom = atom<PrimitiveAtom<Item>[]>([])
  const filterAtom = atom<'all' | 'checked' | 'not-checked'>('all')
  const filteredAtom = atom((get) => {
    const filter = get(filterAtom)
    const items = get(itemsAtom)
    if (filter === 'all') return items
    else if (filter === 'checked')
      return items.filter((atom) => get(atom).checked)
    else return items.filter((atom) => !get(atom).checked)
  })

  const ListItem: React.FC<{
    itemAtom: PrimitiveAtom<Item>
    remove: () => void
  }> = ({ itemAtom, remove }) => {
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

  const Filter: React.FC = () => {
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

  const FilteredList: React.FC<{
    removeItem: (itemAtom: PrimitiveAtom<Item>) => void
  }> = ({ removeItem }) => {
    const [items] = useAtom(filteredAtom)
    return (
      <ul>
        {items.map((itemAtom) => (
          <ListItem
            key={itemAtom.key}
            itemAtom={itemAtom}
            remove={() => removeItem(itemAtom)}
          />
        ))}
      </ul>
    )
  }

  const List: React.FC = () => {
    const [, setItems] = useAtom(itemsAtom)
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

  const { getByText, findByText } = render(
    <Provider>
      <List />
    </Provider>
  )

  fireEvent.click(getByText('Checked'))
  fireEvent.click(getByText('Add'))
  fireEvent.click(getByText('All'))
  await findByText('item1 checked: no')
})
