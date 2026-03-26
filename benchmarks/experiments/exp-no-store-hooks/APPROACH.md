# exp-no-store-hooks

Strategy: disable all store hook notifications (`i`, `r`, `c`, `m`, `u`, `f`) to estimate hook bookkeeping overhead in production-like hot paths.

Expected effect:

- Improve write/subscription churn scenarios (`primitiveReadWrite`, `subscriptionChurn`, `selectAtomPerf`).
