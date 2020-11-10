import {
  mCreate,
  mDel,
  mForEach,
  mGet,
  mSet,
  mMerge,
} from '../src/core/immutableMap'

describe('immutable writes', () => {
  it('returns copy on set item', () => {
    const m = mCreate()
    const key = new Map()
    const m2 = mSet(m, key, 'a')
    expect(m).not.toEqual(m2)
  })

  it('returns copy on delete item', () => {
    const m = mCreate()
    const key = new Map()
    const m2 = mSet(m, key, 'a')
    const m3 = mDel(m, key)
    expect(m2).not.toEqual(m3)
  })

  it('returns copy on merge', () => {
    const m = mCreate()
    const m2 = mCreate()
    const m3 = mMerge(m, m2)
    expect(m).not.toEqual(m3)
    expect(m2).not.toEqual(m3)
  })

  it('does not mutate on set', () => {
    const m = mCreate()
    const key = new Map()
    const m2 = mSet(m, key, 'a')
    const v = mGet(m, key)
    const v2 = mGet(m2, key)
    expect(v).toBeUndefined()
    expect(v2).toBe('a')
  })

  it('does not mutate on delete', () => {
    const m = mCreate()
    const key = new Map()
    const m2 = mSet(m, key, 'a')
    const m3 = mDel(m, key)
    const v = mGet(m2, key)
    const v2 = mGet(m3, key)
    expect(v).toBe('a')
    expect(v2).toBeUndefined()
  })

  it('can immutably update existing item', () => {
    const m = mCreate()
    const key = new Map()
    const m2 = mSet(m, key, 'a')
    const m3 = mSet(m2, key, 'b')
    const v = mGet(m2, key)
    const v2 = mGet(m3, key)
    expect(v).toBe('a')
    expect(v2).toBe('b')
  })
})

describe('getting values', () => {
  it('can get existing values by key', () => {
    const m = mCreate()
    const key = new Map()
    const key2 = new Map()

    const m2 = mSet(m, key, { something: 'nice' })
    const latestM = mSet(m2, key2, { something: 'else' })

    const v = mGet(latestM, key)
    const v2 = mGet(latestM, key2)

    expect(v).toEqual({ something: 'nice' })
    expect(v2).toEqual({ something: 'else' })
  })

  it('returns undefined on get if item not found', () => {
    const m = mCreate()
    const m2 = mSet(m, 2, 'a')
    const v = mGet(m2, 1)
    expect(v).toBeUndefined()
  })
})

describe('iteration', () => {
  it('can iterate through items with insertion order', () => {
    let m = mCreate<object, unknown>()
    const items = [
      { key: new Map([['id', 1]]), value: 'a' },
      { key: new Map([['id', 2]]), value: 'b' },
      { key: new Map([['id', 3]]), value: 'c' },
    ]

    for (const el of items) {
      m = mSet(m, el.key, el.value)
    }

    let pointer = 0
    mForEach(m, (v, k) => {
      expect(k).toBe(items[pointer].key)
      expect(v).toBe(items[pointer].value)
      pointer++
    })
  })
})
