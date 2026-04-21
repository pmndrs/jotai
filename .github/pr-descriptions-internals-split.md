# PR descriptions: internals Rev3 (sibling PRs)

Both branches are **siblings**: each is **one commit** on top of **`upstream/breaking/building-blocks-in-params`**. Neither PR depends on the other. Git merges them **without conflicts** in either order.

Together they reproduce the single reference commit **`6fb3c48f`** on `archive/pr-buildingblocks-first-combined` (same runtime behavior and the same `ensureAtomState` guard). The only textual difference after both land is that **`hasOnInit` is declared just above `// Main functions`** instead of among the util predicates next to `hasOnMount`, so PR 1 can reshape that helper section without overlapping edits.

---

## PR 1 — `internals/bb-rev3-type-guards` → `upstream/breaking/building-blocks-in-params`

**Title:** `refactor(internals): Rev3 type narrowing for onMount hooks`

**Description:**

### Summary

Type-only / helper improvements for Rev3 building blocks. **`hasOnInit` is not in this PR.** `BUILDING_BLOCK_ensureAtomState` still calls `atomOnInit?.(buildingBlocks, store, atom)` on every new atom state (same as the upstream base).

### Changes

- `import type` for `Atom` / `WritableAtom`; add `ExtractAtomArgs` / `ExtractAtomResult` from `./typeUtils.ts`.
- Replace `WritableAtomWithOnMount` with `WithOnMount` and use `WritableAtom<…> & WithOnMount<…>` on `AtomOnMount`.
- Add `ActuallyWritableAtom` and narrow `isActuallyWritableAtom` via `typeof write === 'function'`.
- Generic `hasOnMount` using `ExtractAtomArgs` / `ExtractAtomResult`.
- Small `hasInitialValue` / `isAtomStateInitialized` tweaks.

### Base

**`upstream/breaking/building-blocks-in-params`**

---

## PR 2 — `internals/bb-rev3-on-init` → `upstream/breaking/building-blocks-in-params`

**Title:** `fix(internals): guard atomOnInit hook with hasOnInit`

**Description:**

### Summary

Adds **`type WithOnInit`**, the **`hasOnInit`** predicate, and the **`ensureAtomState`** guard so `atomOnInit` runs only when the atom defines `INTERNAL_onInit` (matching **`6fb3c48f`**). **All `hasOnInit` / `WithOnInit` / guard logic lives in this PR.**

### Changes

- `type WithOnInit` after the writable `onMount` type alias (upstream shape).
- `hasOnInit` helper (placed above `// Main functions` so this PR merges cleanly with PR 1).
- In `BUILDING_BLOCK_ensureAtomState`, call `atomOnInit?.(…)` only inside `if (hasOnInit(atom)) { … }`.

### Base

**`upstream/breaking/building-blocks-in-params`**

### Merge order

Either PR can land first; the second merges cleanly.

---

## Local branch tips

Branches: `internals/bb-rev3-type-guards`, `internals/bb-rev3-on-init` (each one commit on top of `upstream/breaking/building-blocks-in-params`).

Archived combined history: `archive/pr-buildingblocks-first-combined` @ `6fb3c48f`.

---

## Automation

From the repo root. The agent (or CI) needs a **GitHub PAT** because this sandbox has no stored `git` / `gh` credentials.

**Recommended (one shot):**

```bash
export PATH="$PWD/.tools/gh-official:$PATH"   # optional: official gh before any wrapper
export JOTAI_PR_SYNC_TOKEN=ghp_xxxxxxxx        # classic PAT: repo; or fine-grained with fork write + PR to pmndrs/jotai
bash scripts/internals-pr-sync.sh
```

**Or** use interactive auth for `gh` and normal `git` push to `origin`:

```bash
gh auth login -h github.com
bash scripts/internals-pr-sync.sh
```

The script **pushes** both branches to your fork, then **creates** a PR on `pmndrs/jotai` for each branch if missing (base **`breaking/building-blocks-in-params`**), or **updates** title/body. Use `SKIP_PUSH=1` if you already pushed the branches.

To let **Cursor** run this for you: add `JOTAI_PR_SYNC_TOKEN` under **Settings → Cursor Settings → General → Environment Variables** (or your team’s secret mechanism), then ask the agent to run `bash scripts/internals-pr-sync.sh` again.
