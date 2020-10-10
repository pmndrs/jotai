import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../../src/index'
import { atomFamily } from '../../src/utils'
import { SetStateAction, PrimitiveAtom } from '../../src/core/types'

it('atomFamily returns same reference for same parameters', async () => {
  const arrayAtom = atom([0])
  const myFamily = atomFamily<number, number>((num) => (get) =>
    get(arrayAtom)[num]
  )
  expect(myFamily(0)).toEqual(myFamily(0))
  expect(myFamily(0)).not.toEqual(myFamily(1))
  expect(myFamily(1)).not.toEqual(myFamily(0))
})

it('removed atom creates a new reference', async () => {
  const bigAtom = atom([0])
  const myFamily = atomFamily<number, number>((num) => (get) =>
    get(bigAtom)[num]
  )

  const savedReference = myFamily(0)

  expect(savedReference).toEqual(myFamily(0))

  myFamily.remove(0)

  const newReference = myFamily(0)

  expect(savedReference).not.toEqual(newReference)

  myFamily.remove(1337)

  expect(myFamily(0)).toEqual(newReference)
})

it('atomFamily functionality as usual', async () => {
  const arrayAtom = atom([0, 0, 0])

  const myFamily = atomFamily<number, number, SetStateAction<number>>(
    (param) => (get) => get(arrayAtom)[param],
    (param) => (_, set, update) => {
      set(arrayAtom, (oldArray) => {
        if (typeof oldArray[param] === 'undefined') return oldArray

        const newValue =
          typeof update === 'function' ? update(oldArray[param]) : update

        const newArray = [
          ...oldArray.slice(0, param),
          newValue,
          ...oldArray.slice(param + 1),
        ]

        return newArray
      })
    }
  )

  const Displayer = ({
    index,
    countAtom,
  }: {
    index: number
    countAtom: PrimitiveAtom<number>
  }) => {
    const [count, setCount] = useAtom(countAtom)
    return (
      <div>
        index: {index}, count: {count}
        <button onClick={() => setCount((oldValue) => oldValue + 1)}>
          increment #{index}
        </button>
      </div>
    )
  }

  const indicesAtom = atom((get) => [...new Array(get(arrayAtom).length)])

  const Parent: React.FC = () => {
    const [indices] = useAtom(indicesAtom)

    return (
      <div>
        {indices.map((_, index) => (
          <Displayer key={index} index={index} countAtom={myFamily(index)} />
        ))}
      </div>
    )
  }

  const { findByText, getByText } = render(
    <Provider>
      <Parent />
    </Provider>
  )

  await findByText('index: 0, count: 0')
  await findByText('index: 1, count: 0')
  await findByText('index: 2, count: 0')

  fireEvent.click(getByText('increment #1'))
  await findByText('index: 0, count: 0')
  await findByText('index: 1, count: 1')
  await findByText('index: 2, count: 0')

  fireEvent.click(getByText('increment #0'))
  await findByText('index: 0, count: 1')
  await findByText('index: 1, count: 1')
  await findByText('index: 2, count: 0')

  fireEvent.click(getByText('increment #2'))
  await findByText('index: 0, count: 1')
  await findByText('index: 1, count: 1')
  await findByText('index: 2, count: 1')
})

it('custom equality function work', async () => {
  const bigAtom = atom([0])

  const badFamily = atomFamily<{ index: number }, number>((num) => (get) =>
    get(bigAtom)[num.index]
  )

  const goodFamily = atomFamily<{ index: number }, number>(
    (num) => (get) => get(bigAtom)[num.index],
    null,
    (l, r) => l.index === r.index
  )

  expect(badFamily({ index: 0 })).not.toEqual(badFamily({ index: 0 }))
  expect(badFamily({ index: 0 })).not.toEqual(badFamily({ index: 0 }))

  expect(goodFamily({ index: 0 })).toEqual(goodFamily({ index: 0 }))
  expect(goodFamily({ index: 0 })).not.toEqual(goodFamily({ index: 1 }))
})
