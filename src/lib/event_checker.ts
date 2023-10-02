import { Runtime } from "src/runtime/main";

export default class EventChecker {
    public eventName: string;
    public interval: number;

    private intervalId: NodeJS.Timer = null;
    private callback: (state: { [index: string]: any }) => Promise<any[]>;
    private state: { [index: string]: any } = {};

    constructor(event_name: string, interval: number, emitter: (state: { [index: string]: any }) => Promise<any[]>) {
        this.eventName = event_name;
        this.interval = interval;
        this.callback = emitter;
    }

    public start() {
        this.intervalId = setInterval(() => {
            if (Runtime.events.listenerCount(this.eventName) <= 0) {
                return;
            }

            this.callback(this.state)
                .then((data) => {
                    if (data != undefined) {
                        Runtime.events.emit(this.eventName, ...data);
                    } else {
                        Runtime.events.emit(this.eventName);
                    }
                })
                .catch(() => {});
        }, this.interval);
    }

    public stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }
}
