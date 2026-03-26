# exp-destructure-args

Strategy: destructure building-block tuple entries once at function entry and use locals in hot functions (`flushCallbacks`, `readAtomState`, `writeAtomState`) instead of repeated indexed access.

Expected effect:

- Improve monomorphic access and reduce repeated tuple-index lookup overhead.
