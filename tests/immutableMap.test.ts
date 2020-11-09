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
})

describe('getting values', () => {
  it('can get existing values by key', () => {
    const m = mCreate()
    const m2 = mSet(m, 1, 'a')
    const v = mGet(m2, 1)
    expect(v).toBe('a')
  })

  it('returns undefined if item not found on get', () => {
    const m = mCreate()
    const m2 = mSet(m, 2, 'a')
    const v = mGet(m2, 1)
    expect(v).toBeUndefined()
  })

  it('returns undefined if item not found on get', () => {
    const m = mCreate()
    const m2 = mSet(m, 2, 'a')
    const v = mGet(m2, 1)
    expect(v).toBeUndefined()
  })
})
