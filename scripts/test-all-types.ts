/* Run type checking across multiple TypeScript versions by reading and following
   the exact steps from .github/workflows/test-old-typescript.yml
   Each version runs in parallel in its own temporary directory sandbox.

   Usage:
   - tsx scripts/test-all-types.ts                  # Run all TypeScript version tests
   - tsx scripts/test-all-types.ts --sync           # Run TypeScript version tests synchronously
   - tsx scripts/test-all-types.ts --cleanup-only   # Clean up temp directories only
   - tsx scripts/test-all-types.ts --versions 5.0.4,4.9.5  # Run specific TypeScript versions
   - tsx scripts/test-all-types.ts --debug          # Show child process console logs for debugging
   - tsx scripts/test-all-types.ts --help           # Show help message
*/
import { execSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { exit, kill } from 'node:process'

const workflowPath = resolve('.github/workflows/test-old-typescript.yml')
const timeString = new Date().toISOString().replace(/[:.]/g, '-')
const sandboxes: Record<string, string> = {}
const childProcesses = new Set<number>()
let isDebugMode = false

main()

/**
 * Main entry point for the script. Handles command line arguments, runs the tests,
 * and performs cleanup. Also registers signal handlers for graceful termination.
 */
async function main() {
  // Handle command line arguments
  const args = process.argv.slice(2)
  const isCleanupOnly = args.includes('--cleanup-only')
  const isSync = args.includes('--sync')
  const isHelp = args.includes('--help') || args.includes('-h')
  isDebugMode = args.includes('--debug')
  const versionsArgIndex = args.findIndex((arg) => arg === '--versions')
  const specificVersions =
    versionsArgIndex !== -1 && args[versionsArgIndex + 1]
      ? args[versionsArgIndex + 1].split(',').map((v) => v.trim())
      : null

  if (isHelp) {
    console.log(`
Usage: tsx scripts/test-all-types.ts [options]

Options:
  --sync                       Run TypeScript version tests synchronously (one at a time)
  --cleanup-only               Clean up temporary directories only (don't run tests)
  --versions <versions>        Run specific TypeScript versions (comma-separated)
  --debug                      Show child process console logs for debugging
  --help, -h                   Show this help message

Examples:
  tsx scripts/test-all-types.ts                  # Run all TypeScript version tests in parallel
  tsx scripts/test-all-types.ts --sync           # Run TypeScript version tests synchronously
  tsx scripts/test-all-types.ts --cleanup-only   # Clean up temp directories only
  tsx scripts/test-all-types.ts --versions 5.0.4,4.9.5  # Run specific TypeScript versions
  tsx scripts/test-all-types.ts --debug          # Show child process console logs for debugging
`)
    exit(0)
  } else if (isCleanupOnly) {
    console.log('Running cleanup-only mode...')
    try {
      cleanup(true)
    } catch (error) {
      console.error('Cleanup failed:', error)
      exit(1)
    }
  } else {
    registerSignalHandlers()
    const { versions: allVersions, steps } = parseWorkflowFile()

    const versions = specificVersions ?? allVersions
    if (specificVersions) {
      const invalidVersions = specificVersions.filter(
        (v) => !allVersions.includes(v),
      )
      if (invalidVersions.length > 0) {
        console.error(
          `Error: The following TypeScript versions are not found in the workflow file:`,
        )
        console.error(`  ${invalidVersions.join(', ')}`)
        console.error(`\nAvailable versions:`)
        console.error(`  ${allVersions.join(', ')}`)
        exit(1)
      }
    }

    try {
      if (isSync) {
        for (const version of versions) {
          await testTypes({ versions: [version], steps })
        }
      } else {
        await testTypes({ versions, steps })
      }
    } catch (error) {
      console.error('Unhandled error in main function:', error)
      cleanup()
      exit(1)
    }
  }
}

/**
 * Tests all TypeScript versions by following the GitHub Actions workflow.
 * Parses the workflow file, creates sandboxes for each TypeScript version,
 * executes all workflow steps in parallel across versions, and reports results.
 * Includes cleanup and error handling.
 */
async function testTypes({ versions, steps }: ParsedWorkflow): Promise<void> {
  if (versions.length === 1) {
    console.log(
      `======== Processing TypeScript version: ${versions[0]} ========\n`,
    )
  } else {
    console.log(`Processing ${versions.length} TypeScript versions:`)
    console.log(versions.map((v) => `  - ${v}`).join('\n'))
  }
  console.log(`\nFound ${steps.length} workflow steps`)
  console.log(
    steps
      .map(getStepName)
      .filter(Boolean)
      .map((name, i) => `  ${i + 1}. ${name}`)
      .join('\n'),
  )

  console.log('\n\n==== Creating sandboxes for all TypeScript versions ====')
  try {
    // Create all sandboxes in parallel
    const sandboxProgress = createProgressTracker(
      versions.length,
      'Creating sandboxes',
    )
    await Promise.all(
      versions.map(async (version) => {
        try {
          const tempDir = await createTempSandbox(version)
          sandboxes[version] = tempDir
          sandboxProgress.increment(version, true)
        } catch (error) {
          sandboxProgress.increment(version, false)
          throw error
        }
      }),
    )
    sandboxProgress.finish('✅ sandboxes created')

    // Install dependencies in all sandboxes in parallel
    console.log('\n\n==== Installing dependencies in all sandboxes ====')
    const installProgress = createProgressTracker(
      versions.length,
      'Installing dependencies',
    )
    await Promise.all(
      versions.map(async (version) => {
        try {
          await installDependencies(version)
          installProgress.increment(version, true)
        } catch (error) {
          installProgress.increment(version, false)
          throw error
        }
      }),
    )
    installProgress.finish('✅ dependencies installed')

    // Build projects in all sandboxes in parallel
    console.log('\n\n==== Building projects in all sandboxes ====')
    const buildProgress = createProgressTracker(
      versions.length,
      'Building projects',
    )
    await Promise.all(
      versions.map(async (version) => {
        try {
          await buildProject(version)
          buildProgress.increment(version, true)
        } catch (error) {
          buildProgress.increment(version, false)
          throw error
        }
      }),
    )
    buildProgress.finish('✅ projects built')
  } catch (error) {
    console.error('Error during sandbox setup:', error)
    // Clean up any sandboxes that were created
    cleanup()
    throw error
  }

  const failedVersions = new Set<string>()

  try {
    // Execute each step across all versions in parallel
    for (const [i, step] of steps.entries()) {
      const stepName = getStepName(step, i)

      console.log(`\n\n==== ${stepName} ====`)

      const stepProgress = createProgressTracker(versions.length, stepName)

      const stepPromises = versions
        .filter((version) => !failedVersions.has(version))
        .map(async (version) => {
          try {
            const result = await executeStepForVersion(
              step,
              version,
              sandboxes[version],
            )
            stepProgress.increment(version, true)
            return result
          } catch (error) {
            stepProgress.increment(version, false)
            throw error
          }
        })

      const stepResults = await Promise.all(stepPromises)

      // Check results and mark failed versions
      const {
        passed: stepPassed,
        skipped: stepSkipped,
        failed: stepFailed,
      } = processStepResults(stepResults, failedVersions)

      // Use finish method to replace progress bar with result message
      if (versions.length === 1) {
        stepProgress.finish(
          (stepPassed && '✅ step passed') ||
            (stepSkipped && '⏭️  step skipped') ||
            (stepFailed && '❌ step failed') ||
            '❓ unknown result',
        )
      } else {
        stepProgress.finish(
          `✅ ${stepPassed} passed, ⏭️  ${stepSkipped} skipped, ❌ ${stepFailed} failed`,
        )
      }

      // If all versions failed, stop early
      if (failedVersions.size === versions.length) {
        console.log('All versions failed, stopping early')
        break
      }
    }

    // Final step: Run type checking for remaining versions
    if (failedVersions.size < versions.length) {
      console.log('\n\n==== Running type checking ====')

      const typeCheckProgress = createProgressTracker(
        versions.length - failedVersions.size,
        'Running type checking',
      )
      const typeCheckPromises = versions
        .filter((version) => !failedVersions.has(version))
        .map(async (version): Promise<StepResult> => {
          try {
            await execWithLogs(
              'pnpm',
              ['run', 'test:types'],
              { cwd: sandboxes[version] },
              version,
            )
            typeCheckProgress.increment(version, true)
            return { version, success: true }
          } catch (e) {
            typeCheckProgress.increment(version, false)
            return { version, success: false, error: (e as Error).message }
          }
        })

      const typeCheckResults = await Promise.all(typeCheckPromises)

      for (const result of typeCheckResults) {
        if (!result.success) {
          failedVersions.add(result.version)
          console.log(
            `❌ [${result.version}] Type check failed: ${result.error}`,
          )
        } else {
          console.log(`✅ [${result.version}] Type check passed`)
        }
      }
    }
  } finally {
    // Clean up all sandboxes
    console.log('\n\n==== Cleaning up sandboxes ====')
    cleanup()
  }

  // Report final results
  const passed = versions.filter((v) => !failedVersions.has(v))
  const failed = Array.from(failedVersions)

  console.log(`\n==== Final Results ====`)
  console.log(`✅ Passed (${passed.length}): ${passed.join(', ')}`)
  if (failed.length > 0) {
    console.log(`❌ Failed (${failed.length}): ${failed.join(', ')}`)
  }

  if (failed.length) {
    console.error(
      `\nType checking failed for TS versions: ${failed.join(', ')}`,
    )
    exit(1)
  }
  console.log('\nAll TypeScript versions passed type checking.')
}

// ======================== Helper Functions ========================

/**
 * Parses the GitHub Actions workflow file to extract TypeScript versions and build steps.
 * Reads the test-old-typescript.yml file and extracts the matrix of TypeScript versions
 * and the sequence of steps to execute for each version.
 * @returns Object containing TypeScript versions, workflow steps, and the full workflow
 */
function parseWorkflowFile(): ParsedWorkflow {
  const workflowContent = readFileSync(workflowPath, 'utf8')
  const workflow = parseYaml(workflowContent) as Workflow

  // Extract versions and steps from the parsed object
  const versions =
    workflow.jobs?.test_old_typescript?.strategy?.matrix?.typescript ?? []
  const steps = workflow.jobs?.test_old_typescript?.steps ?? []

  return { versions, steps }

  /**
   * Simple YAML parser that converts YAML content to a JavaScript object.
   * Handles basic YAML structures including nested objects, arrays, and key-value pairs.
   * @param yamlContent - The YAML content as a string
   * @returns Parsed JavaScript object representation of the YAML
   */
  function parseYaml(yamlContent: string): any {
    // Simple YAML parser that converts to object
    const lines = yamlContent.split('\n')
    const result: any = {}
    const stack: Array<{ obj: any; indent: number; lastKey?: string }> = [
      { obj: result, indent: -1 },
    ]

    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue

      const indent = line.length - line.trimStart().length
      const trimmed = line.trim()

      // Pop stack until we find the right parent level
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop()
      }

      const parent = stack[stack.length - 1].obj

      if (trimmed.startsWith('- ')) {
        // Array item
        const value = trimmed.substring(2).trim()

        // Ensure parent is an array
        if (!Array.isArray(parent)) {
          const keys = Object.keys(parent)
          const lastKey = stack[stack.length - 1].lastKey
          if (lastKey && keys.length === 0) {
            // Replace the empty object with an array
            const grandParent = stack[stack.length - 2]?.obj
            if (grandParent) {
              grandParent[lastKey] = []
              stack[stack.length - 1].obj = grandParent[lastKey]
            }
          }
        }

        const currentParent = stack[stack.length - 1].obj
        if (Array.isArray(currentParent)) {
          if (value.includes(':')) {
            // Object in array
            const obj: any = {}
            const [key, val] = value.split(':', 2)
            if (val.trim()) {
              obj[key.trim()] = parseValue(val.trim())
            }
            currentParent.push(obj)
            stack.push({ obj, indent })
          } else {
            // Simple array item
            currentParent.push(parseValue(value))
          }
        }
      } else if (trimmed.includes(':')) {
        // Key-value pair
        const colonIndex = trimmed.indexOf(':')
        const key = trimmed.substring(0, colonIndex).trim()
        const value = trimmed.substring(colonIndex + 1).trim()

        if (value === '') {
          // Empty value, expect nested content
          parent[key] = {}
          stack.push({ obj: parent[key], indent, lastKey: key })
        } else if (value.startsWith('|') || value.startsWith('>')) {
          // Multi-line string
          parent[key] = value.substring(1).trim()
        } else {
          parent[key] = parseValue(value)
        }
      }
    }

    return result

    /**
     * Parses a YAML value string into the appropriate JavaScript type.
     * Handles booleans, numbers, quoted strings, and null values.
     * @param value - The string value to parse
     * @returns The parsed value in the appropriate JavaScript type
     */
    function parseValue(value: string): any {
      if (value === 'true') return true
      if (value === 'false') return false
      if (value === 'null') return null
      if (/^-?\d+$/.test(value)) return parseInt(value, 10)
      if (/^-?\d*\.\d+$/.test(value)) return parseFloat(value)
      if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1)
      }
      if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1)
      }
      return value
    }
  }
}

/**
 * Creates a temporary sandbox directory for testing a specific TypeScript version.
 * Copies the project files (excluding node_modules, dist, .git, coverage) to a temp directory.
 * Dependencies will be installed fresh in each sandbox to avoid conflicts.
 * @param version - The TypeScript version this sandbox is for
 * @returns Path to the created temporary directory
 */
async function createTempSandbox(version: string): Promise<string> {
  console.log(`📁 Creating sandbox for TypeScript ${version}`)
  const parentDir = join(tmpdir(), timeString)
  await mkdir(parentDir, { recursive: true })
  const tempDir = await mkdtemp(join(parentDir, `jotai-ts-${version}-`))
  console.log(`📁 Sandbox directory: ${tempDir}`)

  // Copy only essential files, excluding node_modules entirely to save space
  // We'll install dependencies fresh in each sandbox
  const excludes = [
    '.codesandbox',
    '.git',
    '.livecodes',
    'benchmarks',
    'coverage',
    'dist',
    'docs',
    'examples',
    'node_modules',
    'website',
  ]

  const rsyncArgs = [
    '-aL',
    ...excludes.map((dir) => `--exclude=${dir}`),
    '.',
    `${tempDir}/`,
  ]
  await execWithLogs('rsync', rsyncArgs, {}, version)

  return tempDir
}

/**
 * Installs dependencies in a sandbox.
 * Changes to the sandbox directory, installs packages, and restores the original working directory.
 * Cleans up if installation fails.
 * @param version - The TypeScript version this sandbox is for
 * @throws Error if dependency installation fails
 */
async function installDependencies(version: string): Promise<void> {
  const tempDir = sandboxes[version]
  await execWithLogs('pnpm', ['install'], { cwd: tempDir }, version)
}

/**
 * Builds the project in a sandbox.
 * Changes to the sandbox directory, builds the project to ensure dist directory exists,
 * and restores the original working directory. Cleans up if build fails.
 * @param version - The TypeScript version this sandbox is for
 * @throws Error if build fails
 */
async function buildProject(version: string): Promise<void> {
  const tempDir = sandboxes[version]
  await execWithLogs('pnpm', ['run', 'build'], { cwd: tempDir }, version)
}

/**
 * Executes a single workflow step for a specific TypeScript version in its sandbox.
 * Handles step conditions, skips GitHub Actions setup steps, and runs shell commands.
 * Tracks child processes for cleanup and handles template variable substitution.
 * @param step - The workflow step to execute
 * @param version - The TypeScript version being tested
 * @param tempDir - Path to the sandbox directory for this version
 * @returns Result object indicating success/failure and any error messages
 */
async function executeStepForVersion(
  step: WorkflowStep,
  version: string,
  tempDir: string,
): Promise<StepResult> {
  if (!shouldRunStep(step, version)) {
    return { version, success: true, skipped: true }
  }

  // Skip GitHub Actions setup steps since we're running locally
  if (step.uses) {
    return { version, success: true, skipped: true }
  }

  if (!step.run) {
    return { version, success: true, skipped: true }
  }

  try {
    let command = step.run

    // Replace template variables
    command = command.replace(/\$\{\{ matrix\.typescript \}\}/g, version)

    // Handle multi-line commands
    if (command.includes('\n')) {
      const commands = command.split('\n').filter((cmd) => cmd.trim())
      for (const cmd of commands) {
        if (cmd.trim()) {
          await execWithLogs(
            'sh',
            ['-c', cmd.trim()],
            {
              cwd: tempDir,
              env: { NODE_ENV: 'test' },
            },
            version,
          )
        }
      }
    } else {
      await execWithLogs(
        'sh',
        ['-c', command],
        {
          cwd: tempDir,
          env: { NODE_ENV: 'test' },
        },
        version,
      )
    }

    return { version, success: true }
  } catch (e) {
    return { version, success: false, error: (e as Error).message }
  }

  /**
   * Determines whether a workflow step should run for a specific TypeScript version.
   * Evaluates the step's 'if' condition against the current TypeScript version.
   * Supports conditions like exact version matches and version prefix matching.
   * @param step - The workflow step to evaluate
   * @param version - The TypeScript version to check against
   * @returns True if the step should run for this version, false otherwise
   */
  function shouldRunStep(step: WorkflowStep, version: string): boolean {
    if (!step.if) return true

    // Parse the if condition and evaluate it for the current version
    const condition = step.if
    const [_major, _minor] = version.split('.').map(Number)

    // Handle common conditions from the workflow
    if (condition.includes("matrix.typescript == '")) {
      const targetVersion = condition.match(
        /matrix\.typescript == '([^']+)'/,
      )?.[1]
      return targetVersion === version
    }

    if (condition.includes('startsWith(matrix.typescript,')) {
      const prefix = condition.match(
        /startsWith\(matrix\.typescript,\s*'([^']+)'\)/,
      )?.[1]
      return prefix ? version.startsWith(prefix) : false
    }

    // Add more condition parsing as needed
    return true
  }
}

/**
 * Registers signal handlers for cleanup.
 * SIGINT (Ctrl+C), SIGTERM, SIGHUP, uncaughtException, unhandledRejection, beforeExit, and exit.
 */
function registerSignalHandlers(): void {
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT (Ctrl+C), cleaning up...')
    cleanup()
    console.log('Cleanup completed, exiting...')
    exit(130)
  })

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, cleaning up...')
    cleanup()
    console.log('Cleanup completed, exiting...')
    exit(143)
  })

  process.on('SIGHUP', () => {
    console.log('\nReceived SIGHUP, cleaning up...')
    cleanup()
    console.log('Cleanup completed, exiting...')
    exit(129)
  })

  process.on('uncaughtException', (error) => {
    console.error('\nUncaught exception:', error)
    cleanup()
    exit(1)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('\nUnhandled rejection at:', promise, 'reason:', reason)
    cleanup()
    exit(1)
  })

  process.on('beforeExit', () => {
    console.log('\nProcess is about to exit, running cleanup...')
    cleanup()
  })
}

/** Logs step results and updates counters and failed versions set. */
function processStepResults(
  results: StepResult[],
  failedVersions: Set<string>,
): { passed: number; skipped: number; failed: number } {
  let passed = 0
  let skipped = 0
  let failed = 0

  for (const result of results) {
    if (!result.success) {
      failedVersions.add(result.version)
      failed++
      console.log(`❌ [${result.version}] Failed: ${result.error}`)
    } else if (result.skipped) {
      skipped++
    } else {
      passed++
    }
  }

  return { passed, skipped, failed }
}

/**
 * Performs cleanup of all resources when the process is terminating.
 * Uses tracked resources during normal execution for faster cleanup.
 * Only queries the system/filesystem when in --cleanup-only mode.
 * Called by signal handlers and error handlers.
 */
function cleanup(isCleanupOnly: boolean = false): void {
  console.log('\n==== Cleanup ====')

  let jotaiProcesses: number[] = []
  let sandboxDirs: string[] = []

  if (isCleanupOnly) {
    // Query system for cleanup-only mode (catches previous runs)
    console.log('Querying for test-all-types child processes...')
    try {
      jotaiProcesses = execSync('pgrep -f "jotai-ts-"', { encoding: 'utf8' })
        .split('\n')
        .map(Number)
        .filter((pid) => !Number.isNaN(pid))
    } catch {
      // No processes found or pgrep failed
    }

    console.log('Querying for test-all-types temp directories...')
    try {
      sandboxDirs = execSync(
        'find /tmp /var/folders -name "jotai-ts-*" -type d 2>/dev/null',
        { encoding: 'utf8' },
      )
        .trim()
        .split('\n')
        .filter((dir) => dir.length > 0)
    } catch {
      // No directories found or find failed
    }
  } else {
    // Use tracked resources for faster cleanup during normal execution
    jotaiProcesses = Array.from(childProcesses)
    sandboxDirs = Object.values(sandboxes)
  }

  console.log(`Found ${sandboxDirs.length} sandboxes to clean up`)
  console.log(`Found ${jotaiProcesses.length} child processes to kill`)

  // Kill all jotai-ts processes
  for (const pid of jotaiProcesses) {
    try {
      kill(pid, 'SIGTERM')
    } catch {
      // Ignore errors
    }
  }

  // Clean up all sandbox directories
  for (const dir of sandboxDirs) {
    try {
      execSync(`rm -rf "${dir}"`, { stdio: 'pipe' })
    } catch {
      // Ignore errors
    }
  }
  if (!isCleanupOnly) {
    childProcesses.clear()
  }

  console.log('Cleanup completed')
}

/** Extracts the step name from a workflow step. */
function getStepName(step: WorkflowStep, stepNumber: number): string {
  if (step.name) {
    return step.name
  } else if (step.run) {
    return step.run.split('\n')[0]
  } else {
    return `Step ${stepNumber}`
  }
}

/**
 * Executes a command using spawn with optional console log forwarding and proper error handling.
 * Tracks child processes for cleanup and provides consistent error reporting.
 * @param command - The command to execute (e.g., 'pnpm', 'rsync')
 * @param args - Array of command arguments
 * @param options - Spawn options (cwd, env, etc.)
 * @param version - Optional TypeScript version for error reporting
 * @returns Promise that resolves when command completes successfully
 */
async function execWithLogs(
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> } = {},
  version?: string,
): Promise<void> {
  const versionPrefix = version ? `[${version}] ` : ''
  const fullCommand = `${command} ${args.join(' ')}`

  const child = spawn(command, args, {
    stdio: isDebugMode ? 'inherit' : 'pipe',
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
  })
  childProcesses.add(child.pid!)

  await new Promise<void>((resolve, reject) => {
    child.on('close', (code) => {
      childProcesses.delete(child.pid!)
      if (code === 0) {
        resolve()
      } else {
        const errorMsg = `${versionPrefix}Command failed with code ${code}: ${fullCommand}`
        console.error(`❌ ${errorMsg}`)
        reject(new Error(errorMsg))
      }
    })
    child.on('error', (err) => {
      childProcesses.delete(child.pid!)
      const errorMsg = `${versionPrefix}Command error: ${err.message}`
      console.error(`❌ ${errorMsg}`)
      reject(err)
    })
  })
}

/**
 * Creates a progress tracker with a visual progress bar that updates as tasks complete.
 * When all tasks are done, it shows the final results instead of the progress bar.
 * For single version runs, skips the progress bar entirely.
 * @param total - Total number of tasks
 * @param label - Label to display (e.g., "Creating sandboxes")
 * @returns Object with increment, finish
 */
function createProgressTracker(
  total: number,
  label: string,
): {
  increment: (version?: string, success?: boolean) => void
  finish: (message: string) => void
} {
  let completed = 0
  let failed = 0
  const results: string[] = []

  function update() {
    const percentage = Math.round((completed / total) * 100)
    const barLength = 30
    const filledLength = Math.floor((completed / total) * barLength)
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)

    const status = failed > 0 ? ` (${failed} failed)` : ''
    process.stdout.write(
      `\r[${bar}] ${completed}/${total} (${percentage}%) ${label}${status}`,
    )
  }

  function increment(version?: string, success: boolean = true) {
    completed++
    if (!success) {
      failed++
    }
    if (version) {
      const status = success ? '✅' : '❌'
      results.push(`${status} [${version}]`)
    }
    update()
  }

  function finish(message: string) {
    process.stdout.write(`\r${' '.repeat(80)}\r${message}\n`)
  }

  update()

  return { increment, finish }
}

// ======================== Types ========================

type WorkflowStep = {
  name?: string
  uses?: string
  run?: string
  if?: string
  with?: Record<string, string>
}

type WorkflowMatrix = {
  typescript: string[]
}

type WorkflowStrategy = {
  'fail-fast'?: boolean
  matrix: WorkflowMatrix
}

type WorkflowJob = {
  'runs-on': string
  strategy: WorkflowStrategy
  steps: WorkflowStep[]
}

type Workflow = {
  jobs: {
    test_old_typescript: WorkflowJob
  }
}

type StepResult = {
  version: string
  success: boolean
  skipped?: boolean
  error?: string
}

type ParsedWorkflow = {
  versions: string[]
  steps: WorkflowStep[]
}
