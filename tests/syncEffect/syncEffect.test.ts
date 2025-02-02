import type { ReactNode } from 'react'
import { createElement } from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Provider, useAtomValue } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import {
  INTERNAL_buildStoreRev1 as INTERNAL_buildStore,
  INTERNAL_getBuildingBlocksRev1 as INTERNAL_getBuildingBlocks,
  INTERNAL_initializeStoreHooks,
} from 'jotai/vanilla/internals'
import { syncEffect } from './syncEffect'
import { assert, createDebugStore, delay, incrementLetter } from './test-utils'

it('should run the effect on vanilla store', function test() {
  const countAtom = atom(0)
  countAtom.debugLabel = 'count'

  const effectAtom = syncEffect((_, set) => {
    set(countAtom, (v) => v + 1)
    return () => {
      set(countAtom, 0)
    }
  })
  effectAtom.debugLabel = 'effect'
  const store = createDebugStore()
  const unsub = store.sub(effectAtom, () => {})
  let result = store.get(countAtom)
  expect(result).toBe(1)
  unsub()
  result = store.get(countAtom)
  expect(result).toBe(0)
})

it('should run the effect on mount and cleanup on unmount and whenever countAtom changes', function test() {
  let runCount = 0
  let cleanupCount = 0
  let mounted = 0

  const countAtom = atom(0)
  countAtom.debugLabel = 'count'

  const effectAtom = syncEffect((get) => {
    get(countAtom)
    ++mounted
    ++runCount
    return () => {
      --mounted
      ++cleanupCount
    }
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  const unsub = store.sub(effectAtom, () => {})
  waitFor(() => assert(!!mounted))

  // initial render should run the effect but not the cleanup
  expect(mounted).toBe(1)
  expect(runCount).toBe(1)
  expect(cleanupCount).toBe(0)

  store.set(countAtom, (v) => v + 1)

  // changing the value should run the effect again and the previous cleanup
  expect(mounted).toBe(1)
  expect(runCount).toBe(2)
  expect(cleanupCount).toBe(1)

  store.set(countAtom, (v) => v + 1)

  // changing the value should run the effect again and the previous cleanup
  expect(mounted).toBe(1)
  expect(runCount).toBe(3)
  expect(cleanupCount).toBe(2)

  unsub()

  // unmount should run the cleanup but not the effect again
  expect(mounted).toBe(0)
  expect(runCount).toBe(3)
  expect(cleanupCount).toBe(3)

  // a second unmount should not run the cleanup again
  unsub()
  expect(mounted).toBe(0)
  expect(runCount).toBe(3)
  expect(cleanupCount).toBe(3)
})

it('should not cause infinite loops when effect updates the watched atom', function test() {
  const watchedAtom = atom(0)
  watchedAtom.debugLabel = 'watchedAtom'

  let runCount = 0
  const effectAtom = syncEffect((get, set) => {
    ++runCount
    get(watchedAtom)
    set(watchedAtom, (v) => v + 1)
  })
  effectAtom.debugLabel = 'effect'
  const store = createDebugStore()
  store.sub(effectAtom, () => {})

  // initial render should run the effect once
  expect(runCount).toBe(1)
  // changing the value should run the effect again one time
  store.set(watchedAtom, (v) => v + 1)
  expect(runCount).toBe(2)
})

it('should not cause infinite loops when effect updates the watched atom asynchronous', function test() {
  const watchedAtom = atom(0)
  watchedAtom.debugLabel = 'watchedAtom'

  let runCount = 0
  const effectAtom = syncEffect((get, set) => {
    get(watchedAtom)
    ++runCount
    setTimeout(() => {
      set(watchedAtom, (v) => v + 1)
    }, 0)
  })
  effectAtom.debugLabel = 'effect'
  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  // changing the value should run the effect again one time
  store.set(watchedAtom, (v) => v + 1)
  expect(runCount).toBe(2)
})

it('should allow synchronous recursion with set.recurse for first run', function test() {
  const watchedAtom = atom(0)
  watchedAtom.debugLabel = 'watchedAtom'

  let runCount = 0
  const effectAtom = syncEffect((get, { recurse }) => {
    const value = get(watchedAtom)
    ++runCount
    if (value >= 3) {
      return
    }
    recurse(watchedAtom, (v) => v + 1)
  })
  effectAtom.debugLabel = 'effect'
  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  expect({ runCount, watched: store.get(watchedAtom) }).toEqual({
    runCount: 4, // 2
    watched: 3, // 2
  })
})

it('should allow synchronous recursion with set.recurse', function test() {
  const watchedAtom = atom(0)
  watchedAtom.debugLabel = 'watchedAtom'

  let runCount = 0
  const effectAtom = syncEffect((get, { recurse }) => {
    const value = get(watchedAtom)
    ++runCount
    if (value === 0) {
      return
    }
    if (value >= 5) {
      return
    }
    recurse(watchedAtom, (v) => v + 1)
  })
  effectAtom.debugLabel = 'effect'
  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  store.set(watchedAtom, (v) => v + 1)
  expect(store.get(watchedAtom)).toBe(5)
  expect(runCount).toBe(6)
})

it('should allow multiple synchronous recursion with set.recurse', function test() {
  const watchedAtom = atom(0)
  watchedAtom.debugLabel = 'watchedAtom'

  let runCount = 0
  const effectAtom = syncEffect((get, { recurse }) => {
    const value = get(watchedAtom)
    ++runCount
    if (value === 0) {
      return
    }
    if (value >= 3) {
      return
    }
    recurse(watchedAtom, (v) => v + 1)
    recurse(watchedAtom, (v) => v + 1)
  })
  effectAtom.debugLabel = 'effect'
  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  store.set(watchedAtom, (v) => v + 1)
  expect(runCount).toBe(6)
  expect(store.get(watchedAtom)).toBe(5)
})

it('should batch updates during synchronous recursion with set.recurse', function test() {
  let runCount = 0
  const lettersAtom = atom('a')
  lettersAtom.debugLabel = 'letters'

  const numbersAtom = atom(0)
  numbersAtom.debugLabel = 'numbers'

  const watchedAtom = atom(0)
  watchedAtom.debugLabel = 'watched'

  const lettersAndNumbersAtom = atom([] as string[])
  lettersAndNumbersAtom.debugLabel = 'lettersAndNumbersAtom'

  const updateAtom = atom(0, (_get, set) => {
    set(lettersAtom, incrementLetter)
    set(numbersAtom, (v) => v + 1)
  })
  updateAtom.debugLabel = 'update'

  const effectAtom = syncEffect((get, set) => {
    const letters = get(lettersAtom)
    const numbers = get(numbersAtom)
    get(watchedAtom)
    const currentRun = runCount++
    if (currentRun === 0) {
      return
    }
    if (currentRun >= 3) {
      return
    }
    set(lettersAndNumbersAtom, (lettersAndNumbers: string[]) => [
      ...lettersAndNumbers,
      letters + String(numbers),
    ])
    set.recurse(updateAtom)
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  store.set(watchedAtom, (v) => v + 1)
  expect(store.get(lettersAndNumbersAtom)).toEqual(['a0', 'b1'])
  expect(runCount).toBe(4)
})

it('should allow asynchronous recursion with task delay with set.recurse', async function test() {
  let runCount = 0

  const watchedAtom = atom(0)
  watchedAtom.debugLabel = 'watchedAtom'

  let done = false

  const effectAtom = syncEffect((get, { recurse }) => {
    const value = get(watchedAtom)
    ++runCount
    if (value >= 3) {
      done = true
      return
    }
    delay(0).then(() => {
      recurse(watchedAtom, (v) => v + 1)
    })
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  await waitFor(() => assert(done))
  expect(store.get(watchedAtom)).toBe(3)
  expect(runCount).toBe(4)
})

it('should allow asynchronous recursion with microtask delay with set.recurse', async function test() {
  let runCount = 0

  const watchedAtom = atom(0)
  watchedAtom.debugLabel = 'watchedAtom'

  const effectAtom = syncEffect((get, { recurse }) => {
    const value = get(watchedAtom)
    ++runCount
    if (value >= 3) {
      return
    }
    Promise.resolve().then(() => {
      recurse(watchedAtom, (v) => v + 1)
    })
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  await waitFor(() => assert(store.get(watchedAtom) >= 3))
  expect(store.get(watchedAtom)).toBe(3)
  expect(runCount).toBe(4)
})

it('should work with both set.recurse and set', function test() {
  let runCount = 0

  const valueAtom = atom(0)
  valueAtom.debugLabel = 'valueAtom'

  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'

  const effectAtom = syncEffect((get, set) => {
    const value = get(valueAtom)
    if (value >= 5) {
      throw new Error()
    }
    get(countAtom)
    ++runCount
    if (value === 0 || value % 3) {
      set.recurse(valueAtom, (v) => v + 1)
      set(countAtom, (v) => v + 1)
      return
    }
    set(valueAtom, (v) => v + 1)
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  expect(store.get(countAtom)).toBe(3)
  expect(store.get(valueAtom)).toBe(4)
  expect(runCount).toBe(4)
})

it('should disallow synchronous set.recurse in cleanup', function test() {
  const watchedAtom = atom(0)
  watchedAtom.debugLabel = 'watchedAtom'

  const anotherAtom = atom(0)
  anotherAtom.debugLabel = 'anotherAtom'

  let cleanup
  const effectAtom = syncEffect((get, { recurse }) => {
    get(watchedAtom)
    get(anotherAtom)
    cleanup = vi.fn(() => {
      recurse(watchedAtom, (v) => v + 1)
    })
    return cleanup
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  let error: Error | undefined
  try {
    store.set(anotherAtom, (v) => v + 1)
  } catch (e) {
    error = e as Error
  }
  expect(error?.message).toBe('set.recurse is not allowed in cleanup')
})

// FIXME: is there a way to disallow asynchronous infinite loops in cleanup?

it('should return value from set.recurse', function test() {
  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'

  const incrementCountAtom = atom(null, (get, set) => {
    set(countAtom, (v) => v + 1)
    return get(countAtom)
  })
  incrementCountAtom.debugLabel = 'incrementCountAtom'

  const results = [] as number[]
  const effectAtom = syncEffect((get, { recurse }) => {
    const value = get(countAtom)
    if (value < 5) {
      const result = recurse(incrementCountAtom)
      results.unshift(result)
      return
    }
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  expect(results).toEqual([1, 2, 3, 4, 5])
})

it('should conditionally run the effect and cleanup when effectAtom is unmounted', function test() {
  expect.assertions(6)

  const booleanAtom = atom(false)
  booleanAtom.debugLabel = 'booleanAtom'

  let effectRunCount = 0
  let cleanupRunCount = 0

  const effectAtom = syncEffect(() => {
    ++effectRunCount
    return () => {
      ++cleanupRunCount
    }
  })
  effectAtom.debugLabel = 'effect'

  const conditionalEffectAtom = atom((get) => {
    if (get(booleanAtom)) get(effectAtom)
  })

  const store = createDebugStore()
  store.sub(conditionalEffectAtom, () => {})

  // Initially the effectAtom should not run as booleanAtom is false
  expect(effectRunCount).toBe(0)
  expect(cleanupRunCount).toBe(0)

  // Set booleanAtom to true, so effectAtom should run
  store.set(booleanAtom, (v) => !v)
  expect(effectRunCount).toBe(1)
  expect(cleanupRunCount).toBe(0)

  // Set booleanAtom to false, so effectAtom should cleanup
  store.set(booleanAtom, (v) => !v)
  expect(effectRunCount).toBe(1)
  expect(cleanupRunCount).toBe(1)
})

describe('synchronous updates to the same atom', () => {
  let effectIncrementCountBy = 0
  let incrementCountBy = 0
  let runCount = 0

  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'

  const effectAtom = syncEffect((get, set) => {
    ++runCount
    get(countAtom)
    for (const _ of Array(effectIncrementCountBy)) {
      set(countAtom, (v) => v + 1)
    }
  })
  effectAtom.debugLabel = 'effect'

  it.each(getTestCases())(
    'when effectIncrementCountBy is $effectIncrementCountBy and incrementCountBy is $incrementCountBy',
    async function testEach(testCase: TestCase) {
      runCount = 0
      effectIncrementCountBy = testCase.effectIncrementCountBy
      incrementCountBy = testCase.incrementCountBy
      const [before, after] = testCase.runs

      const store = createDebugStore()
      store.sub(effectAtom, () => {})
      store.sub(countAtom, () => {})

      const incrementCount = () => {
        for (const _ of Array(incrementCountBy)) {
          store.set(countAtom, (v) => v + 1)
        }
      }

      // initial render should run the effect once
      expect(runCount).toBe(before.runCount)

      // perform $incrementCountBy synchronous updates
      incrementCount()

      // final value after synchronous updates and rerun of the effect
      expect(store.get(countAtom)).toBe(after.resultCount)

      expect(runCount).toBe(after.runCount)
    },
  )

  type Run = {
    runCount: number
    resultCount: number
  }

  type TestCase = {
    effectIncrementCountBy: number
    incrementCountBy: number
    runs: [Run, Run]
  }

  function getTestCases() {
    const testCases: TestCase[] = [
      {
        // 1. initial render causes effect to run: run = 1
        effectIncrementCountBy: 0,
        incrementCountBy: 0,
        runs: [
          { runCount: 1, resultCount: 0 },
          { runCount: 1, resultCount: 0 },
        ],
      },
      {
        // 1. initial render causes effect to run: run = 1
        // 2. incrementing count: count = 1
        // 3. incrementing count reruns the effect: run = 2
        effectIncrementCountBy: 0,
        incrementCountBy: 1,
        runs: [
          { runCount: 1, resultCount: 0 },
          { runCount: 2, resultCount: 1 },
        ],
      },
      {
        // 1. initial render causes effect to run: run = 1
        // 2. incrementing count: count = 1
        // 3. incrementing count: count = 2
        // 4. incrementing count reruns the effect: run = 3
        effectIncrementCountBy: 0,
        incrementCountBy: 2,
        runs: [
          { runCount: 1, resultCount: 0 },
          { runCount: 3, resultCount: 2 },
        ],
      },
      {
        // effect should not rerun when it changes a value it is watching
        // 1. initial render causes effect to run: run = 1
        // 2. effect increments count: count = 1
        effectIncrementCountBy: 1,
        incrementCountBy: 0,
        runs: [
          { runCount: 1, resultCount: 1 },
          { runCount: 1, resultCount: 1 },
        ],
      },
      {
        // 1. initial render causes effect to run: run = 1
        // 2. effect increments count: count = 1
        // 3. incrementing count: count = 2
        // 4. incrementing count reruns the effect: run = 2
        // 5. effect increments count: count = 3
        effectIncrementCountBy: 1,
        incrementCountBy: 1,
        runs: [
          { runCount: 1, resultCount: 1 },
          { runCount: 2, resultCount: 3 },
        ],
      },
      {
        // 1. initial render causes effect to run: run = 1
        // 2. effect increments count: count = 1
        // 3. incrementing count: count = 2
        // 4 effect increments count: count = 3
        // 5. incrementing count: count = 4
        // 6. effect increments count: count = 5
        effectIncrementCountBy: 1,
        incrementCountBy: 2,
        runs: [
          { runCount: 1, resultCount: 1 },
          { runCount: 3, resultCount: 5 },
        ],
      },
      {
        // 1. initial render causes effect to run: run = 1
        // 2. effect increments count by two: count = 2
        effectIncrementCountBy: 2,
        incrementCountBy: 0,
        runs: [
          { runCount: 1, resultCount: 2 },
          { runCount: 1, resultCount: 2 },
        ],
      },
      {
        // 1. initial render causes effect to run: run = 1
        // 2. effect increments count by two: count = 2
        // 3. incrementing count: count = 3
        // 4. incrementing count reruns the effect: run = 2
        // 5. effect increments count by two: count = 5
        effectIncrementCountBy: 2,
        incrementCountBy: 1,
        runs: [
          { runCount: 1, resultCount: 2 },
          { runCount: 2, resultCount: 5 },
        ],
      },
      {
        // 1. initial render causes effect to run: run = 1
        // 2. effect increments count by two: count = 2
        // 3. incrementing count: count = 3
        // 4. effect increments count by two: count = 5
        // 5. incrementing count: count = 6
        // 6. effect increments count by two: count = 8
        effectIncrementCountBy: 2,
        incrementCountBy: 2,
        runs: [
          { runCount: 1, resultCount: 2 },
          { runCount: 3, resultCount: 8 },
        ],
      },
    ]
    return testCases
  }
})

it('should batch effect setStates', async function test() {
  const valueAtom = atom(0)
  valueAtom.debugLabel = 'valueAtom'

  let runCount = 0
  const derivedAtom = atom((get) => {
    ++runCount
    return get(valueAtom)
  })
  derivedAtom.debugLabel = 'derivedAtom'

  const triggerAtom = atom(false)
  triggerAtom.debugLabel = 'triggerAtom'

  const effectAtom = syncEffect((get, set) => {
    if (get(triggerAtom)) {
      set(valueAtom, (v) => v + 1)
      set(valueAtom, (v) => v + 1)
    }
  })
  effectAtom.debugLabel = 'effectAtom'

  const store = createDebugStore()
  store.sub(derivedAtom, () => {})
  store.sub(effectAtom, () => {})

  expect(store.get(valueAtom)).toBe(0)
  expect(runCount).toBe(1)

  store.set(triggerAtom, (v) => !v)
  expect(store.get(valueAtom)).toBe(2)
  expect(runCount).toBe(2) // <--- batched (we would expect runCount to be 3 if not batched)
})

it('should batch synchronous updates as a single transaction', function test() {
  const lettersAtom = atom('a')
  lettersAtom.debugLabel = 'lettersAtom'

  const numbersAtom = atom(0)
  numbersAtom.debugLabel = 'numbersAtom'

  const lettersAndNumbersAtom = atom([] as string[])
  lettersAndNumbersAtom.debugLabel = 'lettersAndNumbersAtom'

  let runCount = 0
  const effectAtom = syncEffect((get, set) => {
    ++runCount
    const letters = get(lettersAtom)
    const numbers = get(numbersAtom)
    set(lettersAndNumbersAtom, (lettersAndNumbers) => [
      ...lettersAndNumbers,
      letters + String(numbers),
    ])
  })
  effectAtom.debugLabel = 'effectAtom'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})

  expect(runCount).toBe(1)
  expect(store.get(lettersAndNumbersAtom)).toEqual(['a0'])
  const w = atom(null, (_get, set) => {
    set(lettersAtom, incrementLetter)
    set(numbersAtom, (v) => v + 1)
  })
  store.set(w)
  expect(runCount).toBe(2)
  expect(store.get(lettersAndNumbersAtom)).toEqual(['a0', 'b1'])
})

it('should run the effect once even if the effect is mounted multiple times', function test() {
  const lettersAtom = atom('a')
  lettersAtom.debugLabel = 'lettersAtom'

  const numbersAtom = atom(0)
  numbersAtom.debugLabel = 'numbersAtom'

  const lettersAndNumbersAtom = atom(null, (_get, set) => {
    set(lettersAtom, incrementLetter)
    set(numbersAtom, (v) => v + 1)
  })
  lettersAndNumbersAtom.debugLabel = 'lettersAndNumbersAtom'

  let runCount = 0
  const effectAtom = syncEffect((get) => {
    ++runCount
    get(lettersAtom)
    get(lettersAtom)
    get(numbersAtom)
    get(numbersAtom)
  })
  effectAtom.debugLabel = 'effectAtom'

  const derivedAtom = atom((get) => {
    get(effectAtom)
    get(effectAtom)
  })
  derivedAtom.debugLabel = 'derivedAtom'

  const derivedAtom2 = atom((get) => {
    get(effectAtom)
  })
  derivedAtom2.debugLabel = 'derivedAtom2'

  const derivedAtom3 = atom((get) => {
    get(derivedAtom2)
  })
  derivedAtom3.debugLabel = 'derivedAtom3'

  const derivedAtom4 = atom((get) => {
    get(derivedAtom2)
  })
  derivedAtom4.debugLabel = 'derivedAtom4'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  store.sub(effectAtom, () => {})
  store.sub(derivedAtom, () => {})
  store.sub(derivedAtom, () => {})
  store.sub(derivedAtom2, () => {})
  store.sub(derivedAtom3, () => {})
  store.sub(derivedAtom4, () => {})

  expect(runCount).toBe(1)
  store.set(lettersAndNumbersAtom)
  expect(runCount).toBe(2)
  store.set(lettersAndNumbersAtom)
  expect(runCount).toBe(3)
})

it('should abort the previous promise', async function test() {
  let runCount = 0
  const abortedRuns: number[] = []
  const completedRuns: number[] = []
  const resolves: (() => void)[] = []
  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'

  const abortControllerAtom = atom<{ abortController: AbortController | null }>(
    {
      abortController: null,
    },
  )
  abortControllerAtom.debugLabel = 'abortControllerAtom'

  const effectAtom = syncEffect((get) => {
    const currentRun = runCount++
    get(countAtom)
    const abortControllerRef = get(abortControllerAtom)
    const abortController = new AbortController()
    const { signal } = abortController
    let aborted = false
    const abortCallback = () => {
      abortedRuns.push(currentRun)
      aborted = true
    }
    signal.addEventListener('abort', abortCallback)

    abortControllerRef.abortController = abortController
    new Promise<void>((resolve) => resolves.push(resolve)).then(() => {
      if (aborted) return
      abortControllerRef.abortController = null
      completedRuns.push(currentRun)
    })
    return () => {
      abortControllerRef.abortController?.abort()
      abortControllerRef.abortController = null
      signal.removeEventListener('abort', abortCallback)
    }
  })
  effectAtom.debugLabel = 'effectAtom'

  async function resolveAll() {
    resolves.forEach((resolve) => resolve())
    resolves.length = 0
  }

  const store = createDebugStore()
  store.sub(effectAtom, () => {})

  await resolveAll()
  expect(runCount).toBe(1)
  expect(abortedRuns).toEqual([])
  expect(completedRuns).toEqual([0])

  store.set(countAtom, (v) => v + 1)
  expect(runCount).toBe(2)
  expect(abortedRuns).toEqual([])
  expect(completedRuns).toEqual([0])

  // aborted run
  store.set(countAtom, (v) => v + 1)
  expect(runCount).toBe(3)
  expect(abortedRuns).toEqual([1])
  expect(completedRuns).toEqual([0])

  await resolveAll()
  expect(runCount).toBe(3)
  expect(abortedRuns).toEqual([1])
  expect(completedRuns).toEqual([0, 2])
})

it('should not infinite loop with nested atomEffects', async function test() {
  const metrics = {
    mounted: 0,
    runCount1: 0,
    runCount2: 0,
    unmounted: 0,
  }
  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'
  countAtom.onMount = () => {
    ++metrics.mounted
    return () => {
      ++metrics.unmounted
    }
  }

  let resolve: () => Promise<void>
  const effect1Atom = syncEffect((_get, set) => {
    ++metrics.runCount1
    if (metrics.runCount1 > 1) {
      throw new Error('infinite loop')
    }
    const promise: Promise<void> = new Promise<void>(
      (r) =>
        (resolve = () => {
          r()
          return promise
        }),
    ).then(() => {
      set(countAtom, (v) => v + 1)
    })
  })
  effect1Atom.debugLabel = 'effect1Atom'

  const readOnlyAtom = atom((get) => {
    get(effect1Atom)
    return get(countAtom)
  })
  readOnlyAtom.debugLabel = 'readOnlyAtom'

  const effect2Atom = syncEffect((get, _set) => {
    ++metrics.runCount2
    get(readOnlyAtom)
  })
  effect2Atom.debugLabel = 'effect2Atom'

  const store = createDebugStore()
  store.sub(effect2Atom, () => {})
  expect(metrics).toEqual({
    mounted: 1,
    runCount1: 1,
    runCount2: 1,
    unmounted: 0,
  })

  await resolve!()

  expect(metrics).toEqual({
    mounted: 1,
    runCount1: 1,
    runCount2: 2,
    unmounted: 0,
  })
})

it('should not rerun with get.peek', function test() {
  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'

  let runCount = 0
  const effectAtom = syncEffect((get) => {
    get.peek(countAtom)
    ++runCount
  })
  effectAtom.debugLabel = 'effectAtom'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  store.set(countAtom, (v) => v + 1)
  expect(runCount).toBe(1)
})

it('should throw on set when an error is thrown in effect', async function test() {
  const refreshAtom = atom(0)
  refreshAtom.debugLabel = 'refresh'

  const effectAtom = syncEffect((get) => {
    if (get(refreshAtom) === 1) {
      throw new Error('effect error')
    }
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})

  expect(() => {
    store.set(refreshAtom, (v) => v + 1)
  }).toThrowError('effect error')
})

it('should throw on set when an error is thrown in cleanup', async function test() {
  const refreshAtom = atom(0)
  refreshAtom.debugLabel = 'refresh'

  const effectAtom = syncEffect((get, _set) => {
    get(refreshAtom)
    return () => {
      throw new Error('effect cleanup error')
    }
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})

  expect(() => store.set(refreshAtom, (v) => v + 1)).toThrowError(
    'effect cleanup error',
  )
})

it('should not suspend the component', function test() {
  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'

  const watchCounterEffect = syncEffect((get) => {
    get(countAtom)
  })
  watchCounterEffect.debugLabel = 'watchCounterEffect'

  let didSuspend = false
  function App() {
    try {
      // eslint-disable-next-line react-compiler/react-compiler
      useAtomValue(watchCounterEffect)
    } catch (error) {
      didSuspend = didSuspend || error instanceof Promise
    }
    return null
  }
  const store = createDebugStore()
  render(createElement(App), {
    wrapper: ({ children }: { children?: ReactNode }) =>
      createElement(Provider, { store }, children),
  })
  act(() => {
    store.set(countAtom, (v) => v + 1)
  })
  expect(didSuspend).toBe(false)
})

it('should allow calling recurse asynchronously in effect', async function test() {
  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'
  const refreshAtom = atom(0)
  refreshAtom.debugLabel = 'refreshAtom'

  const resolves: (() => void)[] = []
  const effectAtom = syncEffect((get, { recurse }) => {
    get(refreshAtom)
    const promise: Promise<void> = new Promise<void>((r) =>
      resolves.push(() => {
        r()
        return promise
      }),
    ).then(() => {
      recurse(countAtom, (v) => v + 1)
    })
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  store.set(refreshAtom, (v) => v + 1)
  await expect(resolves[1]!()).resolves.not.toThrow()
  await expect(resolves[0]!()).resolves.not.toThrow()
})

it('should not add dependencies added asynchronously', async function test() {
  const countAtom = atom(0)
  countAtom.debugLabel = 'countAtom'
  const refreshAtom = atom(0)
  refreshAtom.debugLabel = 'refreshAtom'

  let runCount = 0
  let resolve: () => Promise<void>
  const effectAtom = syncEffect((get) => {
    ++runCount
    get(refreshAtom)
    const promise: Promise<void> = new Promise<void>(
      (r) =>
        (resolve = () => {
          r()
          return promise
        }),
    ).then(() => {
      get(countAtom)
    })
  })
  effectAtom.debugLabel = 'effect'

  const store = createDebugStore()
  store.sub(effectAtom, () => {})
  await resolve!()
  store.set(refreshAtom, (v) => v + 1)
  store.set(countAtom, (v) => v + 1)
  expect(runCount).toBe(2)
})

it('gets the right internals from the store', function test() {
  const store = INTERNAL_buildStore()
  const buildingBlocks = INTERNAL_getBuildingBlocks(store)
  INTERNAL_initializeStoreHooks(buildingBlocks[6])
  expect(buildingBlocks.length).toBe(20)
  expect(buildingBlocks[1]).toBeInstanceOf(WeakMap) // mountedAtoms
  expect(buildingBlocks[3]).toBeInstanceOf(Set) // changedAtoms
  expect(buildingBlocks[6]).toSatisfy(
    (storeHooks: any) =>
      typeof storeHooks === 'object' &&
      storeHooks !== null &&
      'm' in storeHooks &&
      typeof storeHooks.m === 'function' &&
      'u' in storeHooks &&
      typeof storeHooks.u === 'function' &&
      'c' in storeHooks &&
      typeof storeHooks.c === 'function' &&
      'f' in storeHooks &&
      typeof storeHooks.f === 'function',
  ) // storeHooks
  expect(buildingBlocks[11]).toBeInstanceOf(Function) // ensureAtomState
  expect(buildingBlocks[11]).toHaveLength(1)
  expect(buildingBlocks[14]).toBeInstanceOf(Function) // readAtomState
  expect(buildingBlocks[14]).toHaveLength(1)
  expect(buildingBlocks[16]).toBeInstanceOf(Function) // writeAtomState
  expect(buildingBlocks[16]).toHaveLength(1)
  expect(buildingBlocks[17]).toBeInstanceOf(Function) // mountDependencies
  expect(buildingBlocks[17]).toHaveLength(1)
  expect(buildingBlocks[15]).toBeInstanceOf(Function) // invalidateDependents
  expect(buildingBlocks[15]).toHaveLength(1)
  expect(buildingBlocks[13]).toBeInstanceOf(Function) // recomputeInvalidatedAtoms
  expect(buildingBlocks[13]).toHaveLength(0)
  expect(buildingBlocks[12]).toBeInstanceOf(Function) // flushCallbacks
  expect(buildingBlocks[12]).toHaveLength(0)
})
