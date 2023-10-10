import Spatial, { OccupancyType } from "src/lib/world/spatial";
import { Runtime } from "src/runtime/main";
import CreeperSwarm from "../creeper/creeper_swarm_base";
import BrickLoader from "src/lib/bricks/brick_loader";
import PlayerHandler from "../players/player_handler";
import { ILogMinigame } from "omegga";
import CreeperSwarmTracker from "../creeper/creeper_swarm_types/creeper_swarm_tracker";

export default class GamemodeRuntime {
    public static creeper: CreeperSwarm = null;
    public static runningMinigame: ILogMinigame = null;

    private static renderIntervalId = null;
    private static roundEnded = false;

    public static isPlaying(): boolean {
        return !this.roundEnded;
    }

    public static start(minigame_instance: ILogMinigame, map_spatial: Spatial) {
        this.stop();

        this.runningMinigame = minigame_instance;
        this.creeper = this.createCreeper(map_spatial);

        PlayerHandler.start();
        this.creeper.start();

        Runtime.events.on("minigame_round_end", this.roundEnd);

        this.renderCreeperSwarm();
        this.renderIntervalId = setInterval(() => {
            this.renderCreeperSwarm();
        }, 200);
    }

    public static stop() {
        clearInterval(this.renderIntervalId);
        this.renderIntervalId = null;

        Runtime.events.off("minigame_round_end", this.roundEnd);

        PlayerHandler.stop();
        if (this.creeper != null) {
            this.creeper.stop();
        }

        this.runningMinigame = null;
    }

    public static forceWin(win_message: string) {
        Runtime.omegga.broadcast(`<size="10"><color="00FFFF">\></></> ${win_message}`);
        Runtime.omegga.getMinigames().then((minigames) => {
            for (let i = 0; i < minigames.length; i++) {
                const minigame = minigames[i];
                if (minigame.ruleset === GamemodeRuntime.runningMinigame.ruleset) {
                    Runtime.omegga.nextRoundMinigame(minigame.index);
                }
            }
            this.roundEnd();
        }).catch((err)=>{
            console.warn(err)
        });
    }

    public static forceLoss() {
        Runtime.omegga.getMinigames().then((minigames) => {
            for (let i = 0; i < minigames.length; i++) {
                const minigame = minigames[i];
                if (minigame.ruleset === GamemodeRuntime.runningMinigame.ruleset) {
                    for (let j = 0; j < minigame.members.length; j++) {
                        const player = minigame.members[j];
                        player.kill();
                    }
                }
            }
            this.roundEnd();
        }).catch((err)=>{
            console.warn(err)
        });
    }

    private static async roundEnd(): Promise<void> {
        function attemptAwakeFromSleep(result: { player: { name: string; id: string }; minigameName: string }) {
            if (GamemodeRuntime.runningMinigame === undefined || result.minigameName === GamemodeRuntime.runningMinigame.name) {
                Runtime.omegga.off("minigamejoin", attemptAwakeFromSleep);
                GamemodeRuntime.roundChange();
            }
        }

        if (GamemodeRuntime.roundEnded === true) return;
        GamemodeRuntime.roundEnded = true;

        const minigames = await Runtime.omegga.getMinigames();
        for (let i = 0; i < minigames.length; i++) {
            const minigame = minigames[i];

            if (minigame.ruleset === GamemodeRuntime.runningMinigame.ruleset && minigame.members.length === 0) {
                Runtime.omegga.on("minigamejoin", attemptAwakeFromSleep);
            }
        }

        Runtime.events.on("minigame_round_change", GamemodeRuntime.roundChange);

        GamemodeRuntime.creeper.pause();
        GamemodeRuntime.creeper.reset();
    }

    private static roundChange(): void {
        GamemodeRuntime.roundEnded = false;
        Runtime.omegga.broadcast(`<size="10"><color="00FFFF">\></></>The creeper will grow in 3 seconds!`);
        Runtime.events.off("minigame_round_change", GamemodeRuntime.roundChange);
        setTimeout(() => {
            GamemodeRuntime.creeper.unpause();
        }, 3000);
    }

    private static renderCreeperSwarm() {
        const creeperAndAirSpatial = this.creeper.eatCreeperChangedSpatial();

        const creeperSpatial = Spatial.fromAbsoluteSpatial(
            creeperAndAirSpatial.brick_size,
            creeperAndAirSpatial.brick_offset,
            creeperAndAirSpatial.getAllPositionsOfType(OccupancyType.Creeper)
        );

        BrickLoader.loadSpatial(creeperSpatial, this.creeper.getCreeperBrick());
    }

    private static createCreeper(map_spatial: Spatial): CreeperSwarm {
        return new CreeperSwarmTracker(map_spatial);
    }
}
