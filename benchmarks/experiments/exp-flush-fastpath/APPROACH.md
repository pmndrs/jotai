# exp-flush-fastpath

Strategy: add an early return in `BUILDING_BLOCK_flushCallbacks` when there are no changed atoms and no pending mount/unmount callbacks.

Expected effect:

- Reduce fixed overhead for lightweight updates and repeated operations.
