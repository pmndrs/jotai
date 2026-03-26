# exp-inline-store-api

Strategy: inline store API wrappers in `buildStore` so `store.get/set/sub` call core functions directly rather than reading function slots via building-block lookup on each call.

Expected effect:

- Reduce wrapper overhead for high-frequency API calls.
