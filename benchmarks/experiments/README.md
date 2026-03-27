# Discussion 3275 Experiments

This directory contains performance-only internals overrides for experiments.
The benchmark runner uses each experiment's top-level `<experiment-id>.ts` file as a replacement for the root `src/vanilla/internals.ts` during build, then restores the original file.
Each experiment keeps the public store interface used by `test:bench`, but intentionally does not optimize for test correctness.

## Experiments

- `inline-readwrite.ts`
  - Inline `atom.read`/`atom.write` in hot paths to reduce interceptor indirection.
- `no-store-hooks.ts`
  - Disable store hook notifications (`i/r/c/m/u/f`) to quantify hook overhead.
- `flush-fastpath.ts`
  - Add no-op fast return in `flushCallbacks` when no changed atoms/callbacks exist.
- `inline-store-api.ts`
  - Inline store API wrappers to call core store functions directly.
- `destructure-args.ts`
  - Destructure building blocks once per function in hot internals paths.
- `no-read-hook.ts`
  - Remove read-hook callback from `readAtomState` hot path.
- `direct-self-check.ts`
  - Add quick no-op guard in `recomputeInvalidatedAtoms`.
- `write-noop-shortcircuit.ts`
  - Skip setter work when primitive writes do not change value.
- `unmount-target-size-guard.ts`
  - Avoid dependent scan loop in unmount path when target set is empty.
- `read-deps-empty-fastpath.ts`
  - Short-circuit mounted reads for dependency-free atoms.

Each experiment file includes an experiment strategy comment at the top.
The swap build sets `JOTAI_BENCH_SWAP_INTERNALS=<id>` so the build invocation is explicit.
