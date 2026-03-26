# exp-inline-readwrite

Strategy: inline `atom.read` and `atom.write` calls directly in hot internals (`BUILDING_BLOCK_readAtomState`, `BUILDING_BLOCK_writeAtomState`) to reduce interceptor indirection and call overhead.

Expected effect:

- Improve read/write-heavy scenarios (`primitiveReadWrite`, `computedReadNoMutation`, `derivedChain`).
