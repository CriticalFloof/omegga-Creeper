import StateMachine from "src/lib/state_machine/finite_state_machine";

export default class MainMachine {
    public static create() {
        const main = new StateMachine({
            id: "main",
            entry: "inactive",
            states: {
                inactive: {
                    on: {
                        EDIT: "map_edit",
                        PLAY: "map_play",
                    },
                },
                map_edit: {
                    on: {
                        STOP_EDIT: "inactive",
                    },
                },
                map_play: {
                    on: {
                        STOP_PLAY: "inactive",
                    },
                },
            },
        });

        const listeners = require("./listeners");
        for (let i = 0; i < listeners.length; i++) {
            const listener = listeners[i];
            main.on(listener.name, listener.callback);
        }

        return main;
    }
}
