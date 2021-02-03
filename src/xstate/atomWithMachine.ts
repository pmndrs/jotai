import {
  interpret,
  EventObject,
  StateMachine,
  InterpreterOptions,
  MachineOptions,
  Typestate,
} from 'xstate'
import { atom } from 'jotai'

export function atomWithMachine<
  TContext,
  TEvent extends EventObject,
  TTypestate extends Typestate<TContext> = { value: any; context: TContext }
>(
  machine: StateMachine<TContext, any, TEvent, TTypestate>,
  options: Partial<InterpreterOptions> &
    Partial<MachineOptions<TContext, TEvent>> = {}
) {
  const {
    guards,
    actions,
    activities,
    services,
    delays,
    ...interpreterOptions
  } = options
  const machineConfig = {
    guards,
    actions,
    activities,
    services,
    delays,
  }
  const machineWithConfig = machine.withConfig(machineConfig, machine.context)
  const service = interpret(machineWithConfig, interpreterOptions)
  const machineStateAtom = atom(machineWithConfig.initialState)
  machineStateAtom.onMount = (setState) => {
    service.onTransition(setState)
    service.init()
    return () => {
      service.stop()
    }
  }
  const machineStateWithServiceAtom = atom(
    (get) => get(machineStateAtom),
    (_get, _set, event: Parameters<typeof service.send>[0]) => {
      service.send(event)
    }
  )
  return machineStateWithServiceAtom
}
