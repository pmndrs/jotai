import type { EventObject, InterpreterOptions, MachineOptions, State, StateMachine, Typestate } from 'xstate';
import type { Getter } from 'jotai';
export declare function atomWithMachine<TContext, TEvent extends EventObject, TTypestate extends Typestate<TContext> = {
    value: any;
    context: TContext;
}>(getMachine: StateMachine<TContext, any, TEvent, TTypestate> | ((get: Getter) => StateMachine<TContext, any, TEvent, TTypestate>), getOptions?: (Partial<InterpreterOptions> & Partial<MachineOptions<TContext, TEvent>>) | ((get: Getter) => Partial<InterpreterOptions> & Partial<MachineOptions<TContext, TEvent>>)): import("jotai").WritableAtom<State<TContext, TEvent, any, TTypestate>, import("xstate").SCXML.Event<TEvent> | import("xstate").SingleOrArray<import("xstate").Event<TEvent>>>;
