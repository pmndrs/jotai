import {
  mCreate,
  mDel,
  mForEach,
  mGet,
  mSet,
  mMerge,
  mToPrintable,
} from '../src/core/immutableMap'

describe('Immutable writes', () => {
  it('returns copy on set item', () => {
    const m = mCreate()
    const key = {}
    const m2 = mSet(m, key, 'a')
    expect(m).not.toEqual(m2)
  })

  it('returns copy on delete item', () => {
    const m = mCreate()
    const key = {}
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
    const key = {}
    const m2 = mSet(m, key, 'a')
    const v = mGet(m, key)
    const v2 = mGet(m2, key)
    expect(v).toBeUndefined()
    expect(v2).toBe('a')
  })

  it('does not mutate on delete', () => {
    const m = mCreate()
    const key = {}
    const m2 = mSet(m, key, 'a')
    const m3 = mDel(m, key)
    const v = mGet(m2, key)
    const v2 = mGet(m3, key)
    expect(v).toBe('a')
    expect(v2).toBeUndefined()
  })

  it('can immutably update existing item', () => {
    const m = mCreate()
    const key = {}
    const m2 = mSet(m, key, 'a')
    const m3 = mSet(m2, key, 'b')
    const v = mGet(m2, key)
    const v2 = mGet(m3, key)
    expect(v).toBe('a')
    expect(v2).toBe('b')
  })
})

describe('Retrieving values', () => {
  it('can get existing values by key', () => {
    const m = mCreate()
    const key = {}
    const key2 = {}

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

describe('Iteration', () => {
  it('can iterate through items with insertion order', () => {
    let m = mCreate<object, unknown>()
    const items = [
      { key: { id: 1 }, value: 'a' },
      { key: { id: 2 }, value: 'b' },
      { key: { id: 3 }, value: 'c' },
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

describe('Printable', () => {
  it('can convert items to printable formats', () => {
    let m = mCreate<object, unknown>()
    m = mSet(m, { id: 1, meta: 234 }, { v: 'c', otherStuff: 'notNeeded' })

    const printableM: any = mToPrintable(
      m,
      (k: any) => `${k.id}-debug-label`,
      (val: any) => val.v
    )

    expect(printableM.get('1-debug-label')).toBe('c')
  })
})
