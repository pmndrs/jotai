import { interpret } from 'xstate'
import type {
  EventObject,
  Interpreter,
  InterpreterOptions,
  MachineOptions,
  State,
  StateMachine,
  Typestate,
} from 'xstate'
import { atom } from 'jotai'
import type { Atom, Getter } from 'jotai'

export function atomWithMachine<
  TContext,
  TEvent extends EventObject,
  TTypestate extends Typestate<TContext> = { value: any; context: TContext }
>(
  getMachine:
    | StateMachine<TContext, any, TEvent, TTypestate>
    | ((get: Getter) => StateMachine<TContext, any, TEvent, TTypestate>),
  getOptions?:
    | (Partial<InterpreterOptions> & Partial<MachineOptions<TContext, TEvent>>)
    | ((
        get: Getter
      ) => Partial<InterpreterOptions> &
        Partial<MachineOptions<TContext, TEvent>>)
) {
  type Machine = StateMachine<TContext, any, TEvent, TTypestate>
  type Service = Interpreter<TContext, any, TEvent, TTypestate>
  type MachineState = State<TContext, TEvent, any, TTypestate>
  const cachedMachineAtom = atom<{ machine: Machine; service: Service } | null>(
    null
  )
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
      const machine =
        typeof getMachine === 'function' ? getMachine(safeGet) : getMachine
      const options =
        typeof getOptions === 'function' ? getOptions(safeGet) : getOptions
      initializing = false
      const {
        guards,
        actions,
        activities,
        services,
        delays,
        ...interpreterOptions
      } = options || {}
      const machineConfig = {
        guards,
        actions,
        activities,
        services,
        delays,
      }
      const machineWithConfig = machine.withConfig(
        machineConfig,
        machine.context
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
  const cachedMachineStateAtom = atom<MachineState | null>(null)
  const machineStateAtom = atom(
    (get) =>
      get(cachedMachineStateAtom) ?? get(machineAtom).machine.initialState,
    (get, set, registerCleanup: (cleanup: () => void) => void) => {
      const { service } = get(machineAtom)
      service.onTransition((nextState) => {
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
    (get, _set, event: Parameters<Service['send']>[0]) => {
      const { service } = get(machineAtom)
      service.send(event)
    }
  )
  return machineStateWithServiceAtom
}
