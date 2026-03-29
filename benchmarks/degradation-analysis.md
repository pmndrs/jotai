# Discussion 3275 Degradation Analysis

This document analyzes the top performance degradations extracted from the latest benchmark output (`pnpm run test:bench --iterations=100 --warmup=3 --versions=ALL --concurrency=1 --threshold=disabled`), focusing on adjacent-version regressions.

## Top regressions analyzed

From the top-10 adjacent regressions, the dominant version pairs are:

1. `v2.13.1 -> v2.14.0` (multiple scenarios)
2. `v2.10.1 -> v2.10.2` (read-heavy scenarios)
3. `v2.12.0 -> v2.12.1` (atomCreation spike)
4. `v2.14.0 -> v2.15.0` (atomCreation spike)
5. `v2.12.4 -> v2.12.5` (atomCreation spike)

---

## 1) v2.13.1 -> v2.14.0 (largest multi-scenario inflection)

### Regressions linked to this jump

- `computedReadNoMutation`: +201.5%
- `primitiveReadWrite`: +147.7%
- `selectAtomPerf`: +110.1%
- `subscriptionChurn`: +105.2%
- `diamondPattern`: +70.5%

### Key code changes

Main commit: `543f064c` (`refactor: buildingBlocks to storeState (#3105)`).

Files changed:

- `src/vanilla/internals.ts` (large rewrite)
- `src/vanilla/store.ts`
- `src/vanilla/utils/atomWithDefault.ts`

Notable internals changes:

- Store internals were restructured into a store-state/building-block model with indirection through `getBuildingBlocks(store)` and `WeakMap`-based storage.
- Hot-path functions (`readAtomState`, `writeAtomState`, `storeGet`, `storeSet`, `storeSub`, `mountAtom`, `unmountAtom`, `flushCallbacks`, `recomputeInvalidatedAtoms`) were refactored to repeatedly fetch/store through building-block accessors.
- Callback flushing and invalidation recomputation flow was reworked, increasing work and control-flow in write/subscription-heavy paths.
- Hook fan-out points (`storeHooks.c/m/u/f`) are touched more frequently through the new layering.

### Why this likely caused the regressions

For these scenarios, the cost is dominated by repeated store operations (`get`, `set`, `sub`) and graph propagation:

- More indirection and repeated `WeakMap`/tuple index access in hot paths adds constant overhead per operation.
- Refactored invalidation + callback flush loops increase per-write lifecycle cost.
- Subscription/mount paths now perform more bookkeeping transitions per churn cycle.

That explains why `primitiveReadWrite`, `subscriptionChurn`, `selectAtomPerf`, and `computedReadNoMutation` all jumped together at the same version boundary.

### Potential fixes

- Reintroduce a fast path for core operations that caches internal building blocks once per top-level operation and avoids repeated accessor hops.
- Split dev/experimental hook machinery from production hot path more aggressively (single branch guard, zero-cost no-hook path).
- Reduce recomputation churn in `flushCallbacks`/`recomputeInvalidatedAtoms` by tightening changed-set propagation and avoiding extra cycles when no effective state transition occurred.

Confidence: **High** (large regression magnitude + directly relevant internals rewrite).

---

## 2) v2.10.1 -> v2.10.2 (early read-path regression)

### Regressions linked to this jump

- `derivedChain`: +95.1%
- `computedReadNoMutation`: +89.3%

### Key code changes

Main commit: `984c8bdd` (`fix(unstable_derive): trap atom methods (#2741)`).

File changed:

- `src/vanilla/store.ts`

Notable changes:

- `buildStore` started threading `atomRead`, `atomWrite`, `atomOnMount` interceptor/trap functions.
- Direct `atom.read`/`atom.write` calls were replaced by indirection (`atomRead`/`atomWrite`).
- Several recursive calls dropped direct atom-state threading and shifted toward repeated `getAtomState(...)` retrieval during recursion.

### Why this likely caused the regressions

`derivedChain` and `computedReadNoMutation` are read-heavy and recursion-heavy. Additional indirection + extra state lookups can amplify quickly across deep dependency traversal and repeated reads, causing the observed jump.

### Potential fixes

- Add a monomorphic fast path when interceptors are identity functions.
- Reduce repeated `getAtomState` lookups by threading already-read state through recursion when safe.
- Hoist invariant function references outside hot loops.

Confidence: **High** (code changes are directly in read recursion and method dispatch paths).

---

## 3) v2.12.0 -> v2.12.1 (atomCreation spike)

### Regression linked to this jump

- `atomCreation`: +117.2%

### Key code changes

Main commit: `f5d843c8` (`fix: remove extra onChange store hook in recomputeInvalidatedAtoms (#2982)`).

File changed:

- `src/vanilla/internals.ts`

This diff only touches invalidation/recompute logic and removes extra onChange hook invocation in recomputation.

### Why this likely caused the regression

It likely **did not** cause `atomCreation` regression directly. `atomCreation` does not exercise store invalidation/recompute lifecycle. The absolute times here are very small, and large percentages can occur from tiny baseline deltas and runtime noise.

### Potential fixes

- Treat `atomCreation` micro-delta as low-confidence unless repeated across many independent runs.
- Increase workload for this scenario (e.g., 100k-1M atoms) to reduce timing quantization/noise.

Confidence: **Low** (path mismatch between changed code and measured scenario).

---

## 4) v2.14.0 -> v2.15.0 (atomCreation spike)

### Regression linked to this jump

- `atomCreation`: +84.3%

### Key code changes

Main commit: `74c1c2e7` (`feat(internals): External building blocks surface (#3149)`), plus atom API cleanup (`drop atom.unstable_is`).

Files changed:

- `src/vanilla/internals.ts`
- `src/vanilla/atom.ts`

Notable internals changes:

- Introduced external building-block enhancement surface.
- Added `storeHooks.r` and read-hook call site in read path.
- Introduced `getInternalBuildingBlocks` vs external wrapper flow.

### Why this likely caused the regression

Again, direct causal link to `atomCreation` is weak: this scenario primarily allocates atom configs and should not heavily exercise store read/write internals. Most likely this is statistical noise amplified by small absolute times.

### Potential fixes

- Same as above: increase atomCreation scale and run repeated independent process batches.
- Keep atomCreation as informational, not gatekeeping, unless stabilized with larger workload.

Confidence: **Low-to-medium** (real internals changes, but weak scenario-path coupling).

---

## 5) v2.12.4 -> v2.12.5 (atomCreation spike)

### Regression linked to this jump

- `atomCreation`: +75.2%

### Key code changes

Main commit: `e7cdebf7` (`fix: support non-native promises (#3068)`).

Files changed:

- `src/vanilla/utils/unwrap.ts`
- `src/vanilla/utils/loadable.ts`
- `src/vanilla/utils/atomWithObservable.ts`
- `src/vanilla/utils/atomWithStorage.ts`

Notable change pattern:

- `instanceof Promise` checks replaced with `isPromiseLike(...)` and related cache typing updates.

### Why this likely caused the regression

Very unlikely to affect bare `atom()` creation throughput directly. This appears to be another low-signal atomCreation fluctuation.

### Potential fixes

- Same atomCreation stabilization strategy (larger operation count, repeated process-level reruns, tighter CPU isolation).

Confidence: **Low** (changed utilities are outside atomCreation hot path).

---

## Cross-cutting conclusion

The strongest and most actionable degradations are those around:

- `v2.10.1 -> v2.10.2` (read-path indirection/trapping changes)
- `v2.13.1 -> v2.14.0` (major internals architecture refactor)

The atomCreation-only spikes in other pairs are likely measurement noise or tiny constant-factor effects with low practical significance.

## Suggested remediation plan

1. Prioritize profiling around `v2.13.1 -> v2.14.0`:
   - `store.set/get/sub` hot paths
   - `flushCallbacks`
   - `recomputeInvalidatedAtoms`
   - `mountAtom`/`unmountAtom`
2. Add a production fast path that bypasses hook/extensibility layers when unused.
3. Reduce recursion-time lookups and indirection where state/function references are invariant.
4. Stabilize atomCreation benchmark to avoid false positives:
   - increase scale,
   - run multiple independent process batches,
   - optionally exclude from strict regression gating.

---

## Section 2: Function-level fix mapping with patch sketches

This section maps the suggested remediations to concrete functions in `src/vanilla/internals.ts`.
Patch sketches are intentionally high-level and are meant as implementation guides.

### A) `flushCallbacks` (`src/vanilla/internals.ts`)

**Observed issue pattern**

- Called frequently after writes/sub changes.
- Current loop can revisit callback aggregation multiple times.
- Hook invocation and callback set construction add fixed overhead in hot paths.

**Fix goal**

- Make no-op/low-change cases very cheap.
- Avoid repeated recompute/flush cycles when state did not materially change.

**Patch sketch**

```ts
function flushCallbacks(store: Store) {
  const bb = getInternalBuildingBlocks(store)
  const changedAtoms = bb[3]
  const mountCallbacks = bb[4]
  const unmountCallbacks = bb[5]
  const storeHooks = bb[6]

  // Fast exit: nothing to flush.
  if (
    changedAtoms.size === 0 &&
    mountCallbacks.size === 0 &&
    unmountCallbacks.size === 0 &&
    !storeHooks.f
  ) {
    return
  }

  // Existing body, but keep callback set reuse and avoid re-allocation where possible.
}
```

**Why this helps**

- Avoids entering expensive callback plumbing when there are no changes.
- Reduces constant overhead in write-heavy scenarios (`primitiveReadWrite`, `selectAtomPerf`).

---

### B) `recomputeInvalidatedAtoms` (`src/vanilla/internals.ts`)

**Observed issue pattern**

- Central to propagation cost after `set`.
- Current traversal and invalidation bookkeeping can do extra work when dependent epochs did not effectively change.

**Fix goal**

- Minimize re-traversal and avoid touching unchanged subgraphs.

**Patch sketch**

```ts
function recomputeInvalidatedAtoms(store: Store) {
  const bb = getInternalBuildingBlocks(store)
  const invalidatedAtoms = bb[2]
  const changedAtoms = bb[3]

  if (invalidatedAtoms.size === 0) return // fast path

  // Existing topo walk...
  // Add early skip:
  // - if atom not mounted and has no pending dependents, skip immediately
  // - if read recompute does not change epoch, avoid changedAtoms/storeHooks.c work
}
```

**Why this helps**

- Reduces overhead in large fan-out graphs (`wideFanOut`, `diamondPattern`).
- Cuts repeated bookkeeping that does not alter observable outputs.

---

### C) `readAtomState` (`src/vanilla/internals.ts`)

**Observed issue pattern**

- Very hot for `get`-heavy scenarios (`computedReadNoMutation`, `derivedChain`).
- Indirection and repeated building-block access can add non-trivial fixed costs.

**Fix goal**

- Keep hot read path monomorphic with fewer repeated lookups.

**Patch sketch**

```ts
function readAtomState(store: Store, atom: AnyAtom) {
  const bb = getInternalBuildingBlocks(store) // internal fast path only
  // Hoist frequently used slots into locals once:
  const mountedMap = bb[1]
  const invalidatedAtoms = bb[2]
  const changedAtoms = bb[3]
  const storeHooks = bb[6]
  const ensureAtomState = bb[11]
  // ...

  // Optional: only trigger read-hook if present.
  if (storeHooks.r) storeHooks.r(atom)
}
```

**Why this helps**

- Fewer accessor hops in recursive/iterative read paths.
- Particularly beneficial in repeated-read microbenchmarks.

---

### D) `writeAtomState` (`src/vanilla/internals.ts`)

**Observed issue pattern**

- Recursively coordinates write propagation, changed atom marking, and dependent invalidation.
- Can over-pay in paths where values/epochs do not change.

**Fix goal**

- Short-circuit unchanged writes and reduce cascading work.

**Patch sketch**

```ts
function writeAtomState(
  store: Store,
  atom: WritableAtom<any, any, any>,
  ...args: any[]
) {
  // existing setup...
  // In self-write branch:
  // 1) setAtomStateValueOrPromise(...)
  // 2) if epoch unchanged, return early without invalidateDependents/storeHooks.c
}
```

**Why this helps**

- Lowers overhead for repeated writes where effective value does not change.
- Helps `selectAtomPerf` and write-heavy portions of `primitiveReadWrite`.

---

### E) `mountAtom` / `unmountAtom` (`src/vanilla/internals.ts`)

**Observed issue pattern**

- `subscriptionChurn` is sensitive to mount/unmount lifecycle costs.
- Repeated dependency scans and callback enqueues can dominate churn loops.

**Fix goal**

- Reduce per-mount fixed work and redundant dependency transitions.

**Patch sketch**

```ts
function mountAtom(store: Store, atom: AnyAtom) {
  // Fast return if already mounted and no dep shape changes.
  // Defer heavy recompute to only when needed.
}

function unmountAtom(store: Store, atom: AnyAtom) {
  // Avoid deep unmount traversal when listeners remain or transient refs exist.
}
```

**Why this helps**

- Directly targets mount/unmount lifecycle costs in `subscriptionChurn`.

---

### F) `storeGet` / `storeSet` / `storeSub` wrappers (`src/vanilla/internals.ts`)

**Observed issue pattern**

- Public API wrappers are called frequently and currently route through internal dispatch each time.

**Fix goal**

- Keep wrappers as thin as possible and avoid repeated function indirection.

**Patch sketch**

```ts
const storeGet = (store, atom) => returnAtomValue(readAtomState(store, atom))

const storeSet = (store, atom, ...args) => {
  // minimal scaffolding; early return when no invalidated/changed work
}

const storeSub = (store, atom, listener) => {
  // keep subscription path minimal; avoid extra flush when no state transitions
}
```

**Why this helps**

- Reduces constant overhead across all core operations.

---

## Suggested rollout order

1. `flushCallbacks` fast-path + `recomputeInvalidatedAtoms` no-op guards.
2. `readAtomState` local-hoist cleanup in hot path.
3. `writeAtomState` unchanged-write short-circuit.
4. `mountAtom`/`unmountAtom` churn-focused reductions.

After each step, rerun benchmark with:

- `iterations >= 10`
- `warmup = 3`
- `versions = ALL`
- `concurrency = 1`

and validate scenario-level impact before stacking more changes.
