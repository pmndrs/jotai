#!/usr/bin/env node
'use strict';

const { execFileSync, execFile } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { promisify } = require('node:util');
const esbuild = require('esbuild');
const execFileAsync = promisify(execFile);

const root = path.resolve(__dirname, '..');
const DEFAULTS = {
  iterations: 10,
  warmup: 3,
  versions: 'ALL',
  concurrency: 1,
  threshold: null,
};
const SUPPORTED_VERSIONS = [
  'v2.10.0',
  'v2.10.1',
  'v2.10.2',
  'v2.10.3',
  'v2.10.4',
  'v2.11.0',
  'v2.11.1',
  'v2.11.2',
  'v2.11.3',
  'v2.12.0',
  'v2.12.1',
  'v2.12.2',
  'v2.12.3',
  'v2.12.4',
  'v2.12.5',
  'v2.13.0',
  'v2.13.1',
  'v2.14.0',
  'v2.15.0',
  'v2.15.1',
  'v2.15.2',
  'v2.16.0',
  'v2.16.1',
  'v2.16.2',
  'v2.17.0',
  'v2.17.1',
  'v2.18.0',
  'v2.18.1',
  'v2.19.0',
];
const EXPERIMENTS_DIR = path.join(root, 'benchmarks', 'experiments');
const discoverExperiments = () => {
  if (!fs.existsSync(EXPERIMENTS_DIR)) return [];
  const seenIds = new Set();
  const experiments = [];
  const entries = fs
    .readdirSync(EXPERIMENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'));
  for (const entry of entries) {
    const id = path.basename(entry.name, '.ts');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      continue;
    }
    const internalsPath = path.join(EXPERIMENTS_DIR, entry.name);
    if (seenIds.has(id)) {
      throw new Error(`Duplicate experiment id discovered: ${id}`);
    }
    seenIds.add(id);
    experiments.push({
      id,
      label: id,
      internalsPath,
    });
  }
  experiments.sort((a, b) => a.id.localeCompare(b.id));
  return experiments;
};
const EXPERIMENTS = discoverExperiments();
const EXPERIMENT_BY_ID = Object.fromEntries(EXPERIMENTS.map((e) => [e.id, e]));
const ROOT_INTERNALS_PATH = path.join(root, 'src', 'vanilla', 'internals.ts');
const DIST_ROOT_PATH = path.join(root, 'dist');
const EXPERIMENT_DIST_ROOT_PATH = path.join(DIST_ROOT_PATH, 'bench-experiments');

const getArg = (name, short) => {
  const longEq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (longEq) return longEq.slice(name.length + 3);
  if (short) {
    const shortEq = process.argv.find((a) => a.startsWith(`-${short}=`));
    if (shortEq) return shortEq.slice(short.length + 2);
  }
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1) return process.argv[idx + 1];
  if (short) {
    const shortIdx = process.argv.indexOf(`-${short}`);
    if (shortIdx !== -1) return process.argv[shortIdx + 1];
  }
  return undefined;
};
const hasFlag = (name, short) =>
  process.argv.includes(`--${name}`) || (short ? process.argv.includes(`-${short}`) : false);

const readArg = (name, short, fallback) => getArg(name, short) ?? fallback;

const iterations = Number(readArg('iterations', 'i', String(DEFAULTS.iterations)));
const warmup = Number(readArg('warmup', 'w', String(DEFAULTS.warmup)));
const versionsArg = readArg('versions', 'v', DEFAULTS.versions);
const concurrency = Number(readArg('concurrency', 'c', String(DEFAULTS.concurrency)));
const thresholdArg = readArg('threshold', 't', DEFAULTS.threshold);
const workerJsonMode = hasFlag('_worker-json', null);
const thresholdRaw =
  thresholdArg == null ? null : String(thresholdArg).trim();
const threshold =
  thresholdRaw == null ||
  thresholdRaw === '' ||
  thresholdRaw.toLowerCase() === 'disabled'
    ? null
    : Number(thresholdRaw);
const showHelp = hasFlag('help', 'h');

const scenarios = [
  'atomCreation',
  'primitiveReadWrite',
  'derivedChain',
  'wideFanOut',
  'diamondPattern',
  'subscriptionChurn',
  'computedReadNoMutation',
  'selectAtomPerf',
];
const scenarioDescriptions = {
  atomCreation: 'Time to create 10,000 primitive atoms.',
  primitiveReadWrite:
    'Time for 10,000 store.set + 10,000 store.get on one mounted primitive atom.',
  derivedChain:
    'Propagation time through dependency chain depth=100 after base update.',
  wideFanOut:
    'Propagation time from one base atom to 1,000 derived dependents.',
  diamondPattern:
    'Update propagation in diamond graph: base -> 100 mids -> 1 leaf.',
  subscriptionChurn:
    'Time for 1,000 subscribe/unsubscribe mount+unmount cycles.',
  computedReadNoMutation:
    'Time for 10,000 repeated store.get on a derived atom with no base mutation.',
  selectAtomPerf:
    'Time for 10,000 selectAtom read/update iterations with partial selection.',
};
const outputLabelWidth = Math.max(
  'Version'.length,
  ...scenarios.map((s) => s.length),
);

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
};

const useColor =
  !process.env.NO_COLOR &&
  (process.stdout.isTTY || process.env.CI === 'true' || process.env.FORCE_COLOR);
const color = (text, ...codes) =>
  useColor ? `${codes.join('')}${text}${ANSI.reset}` : String(text);
const stripAnsi = (text) => String(text).replace(/\x1b\[[0-9;]*m/g, '');
const useInlineProgress = process.stderr.isTTY && process.env.CI !== 'true';
let progressLineWidth = 0;
const reportProgress = (text) => {
  if (!useInlineProgress) {
    process.stderr.write(`${text}\n`);
    return;
  }
  const plain = stripAnsi(text);
  progressLineWidth = Math.max(progressLineWidth, plain.length);
  const padded = `${plain}${' '.repeat(progressLineWidth - plain.length)}`;
  process.stderr.write(`\r${padded}`);
};
const clearProgress = () => {
  if (!useInlineProgress || progressLineWidth === 0) return;
  process.stderr.write(`\r${' '.repeat(progressLineWidth)}\r`);
  progressLineWidth = 0;
};
const renderProgressBar = (completed, total, width = 24) => {
  if (total <= 0) return `[${'-'.repeat(width)}]`;
  const ratio = Math.max(0, Math.min(1, completed / total));
  const filled = Math.round(ratio * width);
  return `[${'='.repeat(filled)}${'-'.repeat(width - filled)}]`;
};
const renderBenchProgress = ({ completed, total, currentLabel }) => {
  const label = currentLabel ? ` | ${currentLabel}` : '';
  return `bench ${renderProgressBar(completed, total)} ${completed}/${total}${label}`;
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const measure = (fn, warmupCount = 3) => {
  for (let i = 0; i < warmupCount; i++) fn();
  if (global.gc) global.gc();
  const start = performance.now();
  fn();
  return performance.now() - start;
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const createScenarios = ({ atom, createStore, selectAtom }) => ({
  atomCreation(warmupCount) {
    return measure(() => {
      for (let i = 0; i < 10000; i++) atom(i);
    }, warmupCount);
  },
  primitiveReadWrite(warmupCount) {
    const store = createStore();
    const a = atom(0);
    const unsub = store.sub(a, () => {});
    const writeTime = measure(() => {
      for (let i = 0; i < 10000; i++) store.set(a, i);
    }, warmupCount);
    const readTime = measure(() => {
      for (let i = 0; i < 10000; i++) store.get(a);
    }, warmupCount);
    unsub();
    return { total: writeTime + readTime };
  },
  derivedChain(warmupCount) {
    return measure(() => {
      const store = createStore();
      const base = atom(0);
      let prev = base;
      for (let i = 0; i < 100; i++) {
        const p = prev;
        prev = atom((get) => get(p) + 1);
      }
      const leaf = prev;
      const unsub = store.sub(leaf, () => {});
      store.set(base, 1);
      unsub();
    }, warmupCount);
  },
  wideFanOut(warmupCount) {
    return measure(() => {
      const store = createStore();
      const base = atom(0);
      const derived = [];
      for (let i = 0; i < 1000; i++) derived.push(atom((get) => get(base) + i));
      const unsubs = derived.map((d) => store.sub(d, () => {}));
      store.set(base, 1);
      unsubs.forEach((u) => u());
    }, warmupCount);
  },
  diamondPattern(warmupCount) {
    return measure(() => {
      const store = createStore();
      const base = atom(0);
      const mid = [];
      for (let i = 0; i < 100; i++) mid.push(atom((get) => get(base) + i));
      const leaf = atom((get) => {
        let sum = 0;
        for (const m of mid) sum += get(m);
        return sum;
      });
      const unsub = store.sub(leaf, () => {});
      store.set(base, 1);
      unsub();
    }, warmupCount);
  },
  subscriptionChurn(warmupCount) {
    return measure(() => {
      const store = createStore();
      const atoms = [];
      for (let i = 0; i < 1000; i++) atoms.push(atom(i));
      for (const a of atoms) {
        const unsub = store.sub(a, () => {});
        unsub();
      }
    }, warmupCount);
  },
  computedReadNoMutation(warmupCount) {
    const store = createStore();
    const base = atom(0);
    const derived = atom((get) => get(base) * 2);
    const unsub = store.sub(derived, () => {});
    store.get(derived);
    const time = measure(() => {
      for (let i = 0; i < 10000; i++) store.get(derived);
    }, warmupCount);
    unsub();
    return time;
  },
  selectAtomPerf(warmupCount) {
    if (typeof selectAtom !== 'function') return null;
    const store = createStore();
    const base = atom({ count: 0, name: 'test' });
    const countAtom = selectAtom(base, (v) => v.count);
    const unsub = store.sub(countAtom, () => {});
    store.get(countAtom);
    const time = measure(() => {
      for (let i = 0; i < 10000; i++) {
        store.set(base, { count: i, name: 'test' });
        store.get(countAtom);
      }
    }, warmupCount);
    unsub();
    return time;
  },
});

const formatDeltaFromReference = (value, reference) => {
  if (value == null) return '';
  if (reference == null) return `${value.toFixed(3)}`;
  if (reference === 0) return `${value.toFixed(3)} (n/a)`;
  const delta = ((value - reference) / reference) * 100;
  const sign = delta > 0 ? '+' : '';
  return `${value.toFixed(3)} (${sign}${delta.toFixed(1)}%)`;
};

const withDownloadedVersion = (version, fn) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `jotai-${version}-`));
  try {
    const tarball = execFileSync(
      'npm',
      ['pack', `jotai@${version.slice(1)}`, '--silent'],
      { cwd: tempRoot, encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .pop();
    if (!tarball) {
      throw new Error(`Failed to download package tarball for ${version}`);
    }
    const tarballPath = path.join(tempRoot, tarball);
    execFileSync('tar', ['-xzf', tarballPath], { cwd: tempRoot });
    const packagePath = path.join(tempRoot, 'package');
    if (!fs.existsSync(path.join(packagePath, 'package.json'))) {
      throw new Error(`Downloaded package for ${version} is invalid.`);
    }
    return fn(packagePath);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
};

const withSwappedInternals = (experimentId, fn) => {
  if (!experimentId) return fn();
  const experiment = EXPERIMENT_BY_ID[experimentId];
  if (!experiment) {
    throw new Error(`Unknown experiment id for build: ${experimentId}`);
  }
  if (!fs.existsSync(experiment.internalsPath)) {
    throw new Error(`Experiment internals file not found: ${experiment.internalsPath}`);
  }
  const originalInternals = fs.readFileSync(ROOT_INTERNALS_PATH, 'utf8');
  const experimentInternals = fs.readFileSync(experiment.internalsPath, 'utf8');
  fs.writeFileSync(ROOT_INTERNALS_PATH, experimentInternals, 'utf8');
  // Hard guard: ensure the build will read experiment internals, not stale source.
  const activeInternals = fs.readFileSync(ROOT_INTERNALS_PATH, 'utf8');
  if (activeInternals !== experimentInternals) {
    throw new Error(
      `Failed to swap internals.ts for experiment ${experimentId}: ${experiment.internalsPath}`,
    );
  }
  try {
    return fn();
  } finally {
    fs.writeFileSync(ROOT_INTERNALS_PATH, originalInternals, 'utf8');
    const restoredInternals = fs.readFileSync(ROOT_INTERNALS_PATH, 'utf8');
    if (restoredInternals !== originalInternals) {
      throw new Error(`Failed to restore root internals.ts after experiment ${experimentId}`);
    }
  }
};

const copyDirRecursive = (srcDir, destDir, excludeTopLevelNames = []) => {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeTopLevelNames.includes(entry.name)) continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

const snapshotExperimentDist = (experimentId) => {
  if (!fs.existsSync(DIST_ROOT_PATH)) {
    throw new Error(`Build output directory not found: ${DIST_ROOT_PATH}`);
  }
  const experimentDistPath = path.join(EXPERIMENT_DIST_ROOT_PATH, experimentId);
  fs.rmSync(experimentDistPath, { recursive: true, force: true });
  copyDirRecursive(DIST_ROOT_PATH, experimentDistPath, ['bench-experiments']);
  if (!fs.existsSync(path.join(experimentDistPath, 'vanilla.js'))) {
    throw new Error(`Experiment dist snapshot missing vanilla.js: ${experimentDistPath}`);
  }
  return experimentDistPath;
};

const ensureLocalBuild = ({ repoPath, experimentId = null }) =>
  withSwappedInternals(experimentId, () => {
    execFileSync('pnpm', ['run', 'build'], {
      cwd: repoPath,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        JOTAI_BENCH_SWAP_INTERNALS: experimentId || '',
      },
    });
    if (experimentId) {
      return snapshotExperimentDist(experimentId);
    }
    return null;
  });

const runOne = (label, repoPath, forceDist = false, distPathOverride = null) => {
  const req = createRequire(path.join(repoPath, 'package.json'));
  let vanilla;
  let selectAtom;
  const sourceVanilla = path.join(repoPath, 'src', 'vanilla.ts');
  const sourceUtils = path.join(repoPath, 'src', 'vanilla', 'utils.ts');
  const distBasePath = distPathOverride || path.join(repoPath, 'dist');
  const loadFromDist = () => {
    vanilla = req(path.join(distBasePath, 'vanilla.js'));
    try {
      ({ selectAtom } = req(path.join(distBasePath, 'vanilla', 'utils.js')));
    } catch {
      selectAtom = undefined;
    }
  };
  const loadFromSource = () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jotai-bench-'));
    const vanillaOut = path.join(tempDir, 'vanilla.cjs');
    esbuild.buildSync({
      entryPoints: [sourceVanilla],
      outfile: vanillaOut,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node18',
      sourcemap: false,
      logLevel: 'silent',
      absWorkingDir: repoPath,
    });
    vanilla = require(vanillaOut);
    if (fs.existsSync(sourceUtils)) {
      const utilsOut = path.join(tempDir, 'utils.cjs');
      esbuild.buildSync({
        entryPoints: [sourceUtils],
        outfile: utilsOut,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: 'node18',
        sourcemap: false,
        logLevel: 'silent',
        absWorkingDir: repoPath,
      });
      ({ selectAtom } = require(utilsOut));
    }
  };
  try {
    if (forceDist || label === 'HEAD(dist)' || EXPERIMENT_BY_ID[label]) {
      loadFromDist();
    } else {
      vanilla = req('jotai/vanilla');
      try {
        ({ selectAtom } = req('jotai/vanilla/utils'));
      } catch {
        selectAtom = undefined;
      }
    }
  } catch {
    if (fs.existsSync(sourceVanilla)) {
      loadFromSource();
    } else {
      vanilla = req(path.join(distBasePath, 'vanilla.js'));
      try {
        ({ selectAtom } = req(path.join(distBasePath, 'vanilla', 'utils.js')));
      } catch {
        selectAtom = undefined;
      }
    }
  }
  const scenarioImpl = createScenarios({ ...vanilla, selectAtom });
  const scenarioNames = Object.keys(scenarioImpl);
  const runsByScenario = Object.fromEntries(scenarioNames.map((n) => [n, []]));
  for (let i = 0; i < iterations; i++) {
    const order = shuffle(scenarioNames);
    for (const name of order) {
      const res = scenarioImpl[name](warmup);
      if (res == null) continue;
      if (typeof res === 'number') {
        runsByScenario[name].push(res);
      } else {
        runsByScenario[name].push(res.total);
      }
    }
  }
  const results = {};
  for (const name of scenarioNames) {
    const runs = runsByScenario[name];
    if (runs.length) results[name] = { medianMs: median(runs), runsMs: runs };
  }
  return { label, repoPath, results };
};

const entryFromToken = (versionToken) => {
  const normalized = String(versionToken).trim();
  if (normalized.toUpperCase() === 'HEAD') {
    return { label: 'HEAD(dist)', source: 'local', repoPath: root };
  }
  const normalizedUpper = normalized.toUpperCase();
  const idCandidate = normalizedUpper.startsWith('EXP:')
    ? normalized.slice(4).toLowerCase()
    : normalized.toLowerCase();
  if (EXPERIMENT_BY_ID[idCandidate]) {
    const id = idCandidate;
    const exp = EXPERIMENT_BY_ID[id];
    if (!fs.existsSync(exp.internalsPath)) {
      throw new Error(`Experiment internals file not found: ${exp.internalsPath}`);
    }
    return {
      label: exp.label,
      source: 'experiment',
      repoPath: root,
      id,
      internalsPath: exp.internalsPath,
    };
  }
  const lower = normalized.toLowerCase();
  if (!/^v2\.(1[0-9])\.\d+$/.test(lower)) {
    throw new Error(`Unsupported version token: ${normalized}`);
  }
  return { label: lower, source: 'npm', repoPath: null };
};

const resolveEntries = () => {
  const token = String(versionsArg).trim();
  const allEntries = () => [
    ...SUPPORTED_VERSIONS.map(entryFromToken),
    { label: 'HEAD(dist)', source: 'local', repoPath: root },
    ...EXPERIMENTS.map((e) => ({
      label: e.label,
      source: 'experiment',
      repoPath: root,
      id: e.id,
      internalsPath: e.internalsPath,
    })),
  ];
  const tagsEntries = () => [...SUPPORTED_VERSIONS.map(entryFromToken)];
  const experimentsEntries = () => [
    { label: 'HEAD(dist)', source: 'local', repoPath: root },
    ...EXPERIMENTS.map((e) => ({
      label: e.label,
      source: 'experiment',
      repoPath: root,
      id: e.id,
      internalsPath: e.internalsPath,
    })),
  ];
  if (token.toUpperCase() === 'ALL') {
    return allEntries();
  }
  if (token.toUpperCase() === 'TAGS') {
    return tagsEntries();
  }
  if (token.toUpperCase() === 'EXPERIMENTS') {
    return experimentsEntries();
  }
  return token
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((t) => {
      const upper = t.toUpperCase();
      if (upper === 'ALL') return allEntries();
      if (upper === 'TAGS') return tagsEntries();
      if (upper === 'EXPERIMENTS') return experimentsEntries();
      return [entryFromToken(t)];
    });
};

const main = async () => {
  if (showHelp) {
    console.log('Benchmark runner');
    console.log('');
    console.log('Usage:');
    console.log(
      '  pnpm run test:bench --iterations=7 --warmup=5',
    );
    console.log(
      '  pnpm run test:bench --iterations 7 --warmup 5 --versions ALL --concurrency 2 --threshold 50',
    );
    console.log(
      '  pnpm run test:bench -- -i 7 -w 5 -v v2.13.1,v2.14.0,v2.19.0,HEAD -c 2 -t 50',
    );
    console.log('');
    console.log('Options:');
    console.log(
      `  --iterations, -i <n>     Number of measured runs per scenario (median reported). Default: ${DEFAULTS.iterations}`,
    );
    console.log(
      `  --warmup, -w <n>         Unmeasured pre-runs before each timed run to stabilize JIT/GC/cache effects. Default: ${DEFAULTS.warmup}`,
    );
    console.log(
      `  --concurrency, -c <n>    Max versions to run in parallel. Default: ${DEFAULTS.concurrency}`,
    );
    console.log(
      `  --versions, -v <list>    Comma-separated version tokens (HEAD, <experiment-id>, or v2.x.y). Default: ${DEFAULTS.versions}`,
    );
    console.log(
      '                           Row order only affects display order.',
    );
    console.log(
      '                           Cell percentages are always computed against the scenario base (fastest value).',
    );
    console.log(
      '                           Special sets: TAGS (all released tags), EXPERIMENTS (HEAD(dist) + all experiments), ALL (TAGS + HEAD(dist) + all experiments).',
    );
    console.log(
      `                           ALL includes ${EXPERIMENTS.length} experiments as <experiment-id> tokens (internals.ts swap build).`,
    );
    console.log(
      '  --threshold, -t <pct>    Max allowed HEAD slowdown (%) vs last selected version per scenario. Exits non-zero on breach.',
    );
    console.log('  --help, -h               Show this help and exit.');
    console.log('');
    console.log(
      `Default version set (ALL): ${SUPPORTED_VERSIONS[0]}..${SUPPORTED_VERSIONS[SUPPORTED_VERSIONS.length - 1]} plus HEAD(dist).`,
    );
    console.log('HEAD(dist) and experiments are built first and benchmarked from local dist artifacts.');
    console.log('Experiment builds pass JOTAI_BENCH_SWAP_INTERNALS=<id>, swap src/vanilla/internals.ts, and snapshot to dist/bench-experiments/<id>.');
    console.log('');
    console.log('Output columns:');
    console.log(
      `  ${'Version'.padEnd(outputLabelWidth)}  HEAD(dist) or selected tag version (e.g. v2.14.0).`,
    );
    for (const scenario of scenarios) {
      console.log(
        `  ${scenario.padEnd(outputLabelWidth)}  ${scenarioDescriptions[scenario]}`,
      );
    }
    console.log('');
    console.log('Cell format:');
    console.log('  <median_ms> (<delta_vs_base%>)');
    console.log('  Fastest value in each scenario is marked as (base) and omits percentage.');
    console.log('  Rows without a scenario base show only <median_ms>.');
    console.log('  Cell colors are based on predecessor performance deltas (positive=faster): <= -30% red, >= +30% green.');
    console.log('');
    console.log('Color legend:');
    const legendLabelWidth = 25;
    const legendLine = (label, style, description) =>
      console.log(`  ${color(label.padEnd(legendLabelWidth), ...style)}  ${description}`);
    legendLine('column fastest', [ANSI.bold, ANSI.yellow], 'Fastest value in that scenario column (base).');
    legendLine('<= -30% vs predecessor', [ANSI.bold, ANSI.red], 'Performance delta vs predecessor is -30% or lower (slower).');
    legendLine('>= +30% vs predecessor', [ANSI.bold, ANSI.green], 'Performance delta vs predecessor is +30% or higher (faster).');
    return;
  }
  if (!Number.isFinite(iterations) || iterations <= 0) {
    throw new Error(`Invalid --iterations value: ${iterations}`);
  }
  if (!Number.isFinite(warmup) || warmup < 0) {
    throw new Error(`Invalid --warmup value: ${warmup}`);
  }
  if (!Number.isFinite(concurrency) || concurrency <= 0) {
    throw new Error(`Invalid --concurrency value: ${concurrency}`);
  }
  if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0)) {
    throw new Error(`Invalid --threshold value: ${thresholdRaw}`);
  }
  if (workerJsonMode) {
    const workerEntries = resolveEntries();
    if (workerEntries.length !== 1) {
      throw new Error(`Worker mode expects exactly one version token, got ${workerEntries.length}.`);
    }
    const entry = workerEntries[0];
    let one;
    if (entry.source === 'local') {
      ensureLocalBuild({ repoPath: entry.repoPath, experimentId: null });
      one = runOne(entry.label, entry.repoPath, true);
    } else if (entry.source === 'experiment') {
      const experimentDistPath = ensureLocalBuild({ repoPath: entry.repoPath, experimentId: entry.id });
      one = runOne(entry.label, entry.repoPath, true, experimentDistPath);
    } else {
      one = withDownloadedVersion(entry.label, (pkgPath) => runOne(entry.label, pkgPath));
    }
    process.stdout.write(`${JSON.stringify(one)}\n`);
    return;
  }
  const entries = resolveEntries();
  const progressState = {
    completed: 0,
    total: entries.length,
  };

  const updateBenchProgress = (currentLabel) => {
    reportProgress(
      renderBenchProgress({
        completed: progressState.completed,
        total: progressState.total,
        currentLabel,
      }),
    );
  };

  const runEntryInChild = async (e) => {
    updateBenchProgress(`running ${e.label}`);
    const token =
      e.source === 'local'
        ? 'HEAD'
        : e.source === 'experiment'
          ? e.id
          : e.label;
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        '--expose-gc',
        __filename,
        '--_worker-json',
        `--versions=${token}`,
        `--iterations=${iterations}`,
        `--warmup=${warmup}`,
      ],
      {
        cwd: root,
        maxBuffer: 1024 * 1024 * 20,
        env: { ...process.env, NODE_ENV: 'production' },
      },
    );
    const parsed = JSON.parse(stdout.trim());
    progressState.completed += 1;
    updateBenchProgress(`finished ${e.label}`);
    return parsed;
  };

  const all = new Array(entries.length);
  const npmIndexes = [];
  const localIndexes = [];
  entries.forEach((entry, idx) => {
    if (entry.source === 'npm') {
      npmIndexes.push(idx);
    } else {
      // Local and experiment entries touch the same workspace source tree.
      // Keep them serialized to avoid concurrent internals.ts swaps.
      localIndexes.push(idx);
    }
  });

  if (npmIndexes.length) {
    let nextNpm = 0;
    const workerCount = Math.min(Math.floor(concurrency), npmIndexes.length);
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextNpm < npmIndexes.length) {
          const listIndex = nextNpm++;
          const idx = npmIndexes[listIndex];
          all[idx] = await runEntryInChild(entries[idx]);
        }
      }),
    );
  }
  for (const idx of localIndexes) {
    all[idx] = await runEntryInChild(entries[idx]);
  }

  const head = all.find((r) => r.label === 'HEAD(dist)');
  const allByLabel = Object.fromEntries(all.map((r) => [r.label, r]));
  const orderedLabels = all.map((r) => r.label);
  const predecessorByLabel = Object.fromEntries(
    orderedLabels.map((label, idx) => [label, idx > 0 ? orderedLabels[idx - 1] : null]),
  );
  const fastestByScenario = Object.fromEntries(
    scenarios.map((s) => {
      const values = all
        .map((r) => r.results?.[s]?.medianMs)
        .filter((v) => typeof v === 'number');
      return [s, values.length ? Math.min(...values) : undefined];
    }),
  );
  const rawRows = [];
  const legend =
    `Legend: ${color('<= -30% vs predecessor', ANSI.bold, ANSI.red)} | ` +
    `${color('>= +30% vs predecessor', ANSI.bold, ANSI.green)} | ` +
    `${color('column fastest', ANSI.bold, ANSI.yellow)}`;
  const displayedCommand = [
    'pnpm run test:bench',
    `--iterations=${iterations}`,
    `--warmup=${warmup}`,
    `--versions=${versionsArg}`,
    `--concurrency=${concurrency}`,
    `--threshold=${threshold == null ? 'disabled' : threshold}`,
  ].join(' ');
  clearProgress();
  console.log(`Command: ${displayedCommand}`);
  console.log(legend);
  for (const r of all) {
    const displayLabel = EXPERIMENT_BY_ID[r.label] ? `  ${r.label}` : r.label;
    const cells = [displayLabel];
    const predecessorLabel = predecessorByLabel[r.label];
    for (const s of scenarios) {
      const value = r.results?.[s]?.medianMs;
      const fastest = fastestByScenario[s];
      let text = formatDeltaFromReference(value, fastest);
      if (value != null && fastest != null && value === fastest) {
        text = `${value.toFixed(3)} (base)`;
      }
      if (value != null && fastest != null && value === fastest) {
        text = color(stripAnsi(text), ANSI.bold, ANSI.yellow);
      } else if (value != null) {
        const predecessorValue =
          predecessorLabel == null ? null : allByLabel[predecessorLabel]?.results?.[s]?.medianMs;
        if (predecessorValue != null && predecessorValue !== 0) {
          // Latency is measured in ms, so lower is better.
          // Positive delta means faster than predecessor.
          const predecessorDeltaPct = ((predecessorValue - value) / predecessorValue) * 100;
          if (predecessorDeltaPct <= -30) text = color(text, ANSI.bold, ANSI.red);
          else if (predecessorDeltaPct >= 30) text = color(text, ANSI.bold, ANSI.green);
        }
      }
      cells.push(text);
    }
    rawRows.push(cells);
  }

  const header = ['Version', ...scenarios];
  const widths = header.map((h, i) =>
    Math.max(
      h.length,
      ...rawRows.map((r) => stripAnsi(String(r[i] ?? '')).length),
    ),
  );
  const pad = (text, width) => {
    const visible = stripAnsi(String(text));
    return `${text}${' '.repeat(Math.max(0, width - visible.length))}`;
  };
  const divider = `+-${widths.map((w) => '-'.repeat(w)).join('-+-')}-+`;
  const renderRow = (cells) =>
    `| ${cells.map((c, i) => pad(String(c ?? ''), widths[i])).join(' | ')} |`;
  console.log(divider);
  console.log(renderRow(header));
  console.log(divider);
  for (const row of rawRows) console.log(renderRow(row));
  console.log(divider);

  if (threshold != null && head) {
    const thresholdBaselineLabel = entries[entries.length - 1]?.label ?? null;
    const thresholdBaselineRow =
      thresholdBaselineLabel == null ? null : allByLabel[thresholdBaselineLabel];
    if (!thresholdBaselineRow) {
      throw new Error('Threshold check requires the last selected version result.');
    }
    const breaches = [];
    for (const s of scenarios) {
      const headValue = head.results?.[s]?.medianMs;
      const baselineValue = thresholdBaselineRow.results?.[s]?.medianMs;
      if (headValue == null || baselineValue == null || baselineValue === 0) continue;
      const deltaPct = ((headValue - baselineValue) / baselineValue) * 100;
      if (deltaPct > threshold) {
        breaches.push(
          `${s}: +${deltaPct.toFixed(1)}% vs ${thresholdBaselineLabel} > ${threshold}%`,
        );
      }
    }
    if (breaches.length) {
      console.error(
        color(
          `Threshold check FAILED for HEAD(dist) vs ${thresholdBaselineLabel}:`,
          ANSI.bold,
          ANSI.red,
        ),
      );
      for (const b of breaches) console.error(`- ${b}`);
      process.exitCode = 1;
    } else {
      console.log(
        color(
          `Threshold check PASSED for HEAD(dist) vs ${thresholdBaselineLabel}.`,
          ANSI.bold,
          ANSI.green,
        ),
      );
    }
  }
};

void main();
