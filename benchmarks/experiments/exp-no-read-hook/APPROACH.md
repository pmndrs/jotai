# exp-no-read-hook

Strategy: remove `storeHooks.r` notification from the `readAtomState` hot path.

Expected effect:

- Improve read-heavy scenarios by removing per-read hook callback overhead.
