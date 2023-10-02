import { IPlayerPositions, OmeggaLike, PC, PS } from "omegga";
import { Config, Storage } from "omegga.plugin";
import path from "path";
import EventEmitter from "events";

import Command from "src/lib/commands";
import MapManager from "src/lib/map/map_manager";

import CommandInitalizer from "./commands";
import PluginEventEmitInitalizer from "./event_emitters";
import GamemodeManager from "src/lib/game_loop/minigame/gamemode_manager";
import StateMachine from "src/lib/state_machine/finite_state_machine";
import MainMachine from "./state_machines/main_machine/main_machine";

export class Runtime {
    public static omegga: OmeggaLike;
    public static config: PC<Config>;
    public static store: PS<Storage>;

    public static events: EventEmitter;
    public static stateMachine: StateMachine;
    public static pluginPath: string = `${path.dirname(path.dirname(__filename))}`;

    public static async main(omegga: OmeggaLike, config: PC<Config>, store: PS<Storage>): Promise<{ registeredCommands: string[] }> {
        this.omegga = omegga;
        this.config = config;
        this.store = store;
        this.events = new EventEmitter();
        this.stateMachine = MainMachine.create();

        await GamemodeManager.automaticGamemodeTransfer();
        await MapManager.automaticMapRestore();

        PluginEventEmitInitalizer.run();
        CommandInitalizer.run();

        if (this.config["Edit Mode"]) {
            Runtime.stateMachine.transition("EDIT");
        } else {
            Runtime.stateMachine.transition("PLAY");
        }

        return { registeredCommands: Command.getList() };
    }
}
