# Discussion 3275 Experiments

This directory contains performance-only internals overrides for experiments.
The benchmark runner uses each experiment's `src/vanilla/internals.ts` as a replacement for the root `src/vanilla/internals.ts` during build, then restores the original file.
Each experiment keeps the public store interface used by `test:bench`, but intentionally does not optimize for test correctness.

## Experiments

- `exp-inline-readwrite`
  - Inline `atom.read`/`atom.write` in hot paths to reduce interceptor indirection.
- `exp-no-store-hooks`
  - Disable store hook notifications (`i/r/c/m/u/f`) to quantify hook overhead.
- `exp-flush-fastpath`
  - Add no-op fast return in `flushCallbacks` when no changed atoms/callbacks exist.
- `exp-inline-store-api`
  - Inline store API wrappers to call core store functions directly.
- `exp-destructure-args`
  - Destructure building blocks once per function in hot internals paths.
- `exp-no-read-hook`
  - Remove read-hook callback from `readAtomState` hot path.
- `exp-direct-self-check`
  - Add quick no-op guard in `recomputeInvalidatedAtoms`.

Each experiment folder includes an `APPROACH.md` with strategy details.
The swap build sets `JOTAI_BENCH_SWAP_INTERNALS=<id>` so the build invocation is explicit.
