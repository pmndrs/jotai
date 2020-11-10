import React, { Suspense, useEffect } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { Provider, atom, useAtom } from '../src/index'
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
    const m2 = mSet(m, 1, 'a')
    expect(m).not.toEqual(m2)
  })

  it('returns copy on delete item', () => {
    const m = mCreate()
    const m2 = mSet(m, 1, 'a')
    const m3 = mDel(m, 1)
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
    const m2 = mSet(m, 1, 'a')
    const v = mGet(m, 1)
    const v2 = mGet(m2, 1)
    expect(v).toBeUndefined()
    expect(v2).toBe('a')
  })

  it('does not mutate on delete', () => {
    const m = mCreate()
    const m2 = mSet(m, 1, 'a')
    const m3 = mDel(m, 1)
    const v = mGet(m2, 1)
    const v2 = mGet(m3, 1)
    expect(v).toBe('a')
    expect(v2).toBeUndefined()
  })

  it('can immutably update existing item', () => {
    const m = mCreate()
    const m2 = mSet(m, 1, 'a')
    const m3 = mSet(m2, 1, 'b')
    const v = mGet(m2, 1)
    const v2 = mGet(m3, 1)
    expect(v).toBe('a')
    expect(v2).toBe('b')
  })
})

describe('getting values', () => {
  it('can get existing values by key', () => {
    const m = mCreate()
    const m2 = mSet(m, 1, 'a')
    const v = mGet(m2, 1)
    expect(v).toBe('a')
  })

  it('returns undefined on get if item not found', () => {
    const m = mCreate()
    const m2 = mSet(m, 2, 'a')
    const v = mGet(m2, 1)
    expect(v).toBeUndefined()
  })
})
