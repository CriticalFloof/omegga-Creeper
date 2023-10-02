import { EventEmitter } from "events";

type Transitions = {
    [transitionName: string]: string;
};

type StateType = "end";

type State = {
    type?: StateType;
    on?: Transitions;
};

interface IStateMachineData {
    id: string;
    entry: string;
    states: { [name: string]: State };
}

export default class StateMachine {
    private id: string;
    private entry: string;
    private states: { [name: string]: State };
    private events: EventEmitter;
    private currentState: string;

    constructor(state_machine_data: IStateMachineData) {
        this.id = state_machine_data.id;
        this.entry = state_machine_data.entry;
        this.currentState = state_machine_data.entry;
        this.states = state_machine_data.states;
        this.events = new EventEmitter();
    }

    public getCurrentState(): string {
        return this.currentState;
    }

    public getAllStates(): { [name: string]: State } {
        return this.states;
    }

    public getTransitions(state: string): Transitions {
        return this.states[state].on == undefined ? this.states[state].on : {};
    }

    public on(transition_name: string, listener: (...args: any[]) => void) {
        this.events.on(transition_name, listener);
    }

    public off(transition_name: string, listener: (...args: any[]) => void) {
        this.events.off(transition_name, listener);
    }

    public transition(transition_name: string) {
        const nextState = this.states[this.currentState].on[transition_name];

        this.currentState = nextState;

        this.events.emit(transition_name);
    }
}
