import { interpret } from 'xstate'
import type {
  AnyInterpreter,
  AnyStateMachine,
  AreAllImplementationsAssumedToBeProvided,
  EventObject,
  InternalMachineOptions,
  InterpreterFrom,
  InterpreterOptions,
  Prop,
  StateConfig,
  StateFrom,
} from 'xstate'
import type { Atom, Getter, WritableAtom } from 'jotai'
import { atom } from 'jotai'

export interface MachineAtomOptions<TContext, TEvent extends EventObject> {
  /**
   * If provided, will be merged with machine's `context`.
   */
  context?: Partial<TContext>
  /**
   * The state to rehydrate the machine to. The machine will
   * start at this state instead of its `initialState`.
   */
  state?: StateConfig<TContext, TEvent>
}

type Options<TMachine extends AnyStateMachine> =
  AreAllImplementationsAssumedToBeProvided<
    TMachine['__TResolvedTypesMeta']
  > extends false
    ? InterpreterOptions &
        MachineAtomOptions<TMachine['__TContext'], TMachine['__TEvent']> &
        InternalMachineOptions<
          TMachine['__TContext'],
          TMachine['__TEvent'],
          TMachine['__TResolvedTypesMeta'],
          true
        >
    : InterpreterOptions &
        MachineAtomOptions<TMachine['__TContext'], TMachine['__TEvent']> &
        InternalMachineOptions<
          TMachine['__TContext'],
          TMachine['__TEvent'],
          TMachine['__TResolvedTypesMeta']
        >

type MaybeParam<T> = T extends (v: infer V) => unknown ? V : never

export function atomWithMachine<
  TMachine extends AnyStateMachine,
  TInterpreter = InterpreterFrom<TMachine>
>(
  getMachine: TMachine | ((get: Getter) => TMachine),
  getOptions?: Options<TMachine> | ((get: Getter) => Options<TMachine>)
): WritableAtom<
  StateFrom<TMachine>,
  MaybeParam<Prop<TInterpreter, 'send'>>,
  void
> {
  const cachedMachineAtom = atom<{
    machine: AnyStateMachine
    service: AnyInterpreter
  } | null>(null)
  const machineAtom = atom(
    (get) => {
      const cachedMachine = get(cachedMachineAtom)
      if (cachedMachine) {
        return cachedMachine
      }
      let initializing = true
      const safeGet = (a: Atom<unknown>) => {
        if (initializing) {
          return get(a)
        }
        throw new Error('get not allowed after initialization')
      }
      const machine = isGetter(getMachine) ? getMachine(safeGet) : getMachine
      const options = isGetter(getOptions) ? getOptions(safeGet) : getOptions
      initializing = false
      const {
        guards,
        actions,
        services,
        delays,
        context,
        ...interpreterOptions
      } = options || {}

      const machineConfig = {
        ...(guards && { guards }),
        ...(actions && { actions }),
        ...(services && { services }),
        ...(delays && { delays }),
      }

      const machineWithConfig = machine.withConfig(
        machineConfig as any,
        () => ({
          ...machine.context,
          ...context,
        })
      )

      const service = interpret(machineWithConfig, interpreterOptions)
      return { machine: machineWithConfig, service }
    },
    (get, set, _arg) => {
      set(cachedMachineAtom, get(machineAtom))
    }
  )

  machineAtom.onMount = (commit) => {
    commit()
  }

  const cachedMachineStateAtom = atom<StateFrom<TMachine> | null>(null)

  const machineStateAtom = atom(
    (get) =>
      get(cachedMachineStateAtom) ??
      (get(machineAtom).machine.initialState as StateFrom<TMachine>),
    (get, set, registerCleanup: (cleanup: () => void) => void) => {
      const { service } = get(machineAtom)
      service.onTransition((nextState: any) => {
        set(cachedMachineStateAtom, nextState)
      })
      service.start()
      registerCleanup(() => {
        service.stop()
      })
    }
  )

  machineStateAtom.onMount = (initialize) => {
    let unsub: (() => void) | undefined | false

    initialize((cleanup) => {
      if (unsub === false) {
        cleanup()
      } else {
        unsub = cleanup
      }
    })

    return () => {
      if (unsub) {
        unsub()
      }
      unsub = false
    }
  }

  const machineStateWithServiceAtom = atom(
    (get) => get(machineStateAtom),
    (get, _set, event: Parameters<AnyInterpreter['send']>[0]) => {
      const { service } = get(machineAtom)
      service.send(event)
    }
  )

  return machineStateWithServiceAtom
}

const isGetter = <T>(v: T | ((get: Getter) => T)): v is (get: Getter) => T =>
  typeof v === 'function'
