import { IPlayerPositions, OmeggaPlayer, Vector } from "omegga";
import Raycast from "src/lib/hit_registration/raycast";
import { Runtime } from "src/runtime/main";
import { OccupancyType } from "src/lib/world/spatial";
import GamemodeRuntime from "../minigame/gamemode_runtime";
import { vec3Add, vec3Sub } from "src/lib/vector_operation";

export default class PlayerHandler {
    public static readonly playerSize: Vector = [12, 12, 24];

    private static playerPositionIntervalId: NodeJS.Timer;
    private static playerPositions: IPlayerPositions = [];

    private static swingIntervalId: NodeJS.Timer;
    private static playerSwingActive: { [name: string]: NodeJS.Timeout } = {};

    public static getPlayerpositions() {
        return this.playerPositions;
    }

    public static start() {
        Runtime.events.on("player_swing", this.activateSwing);
        Runtime.events.on("player_touch_creeper", this.touchedCreeper);

        this.playerPositionIntervalId = setInterval(() => {
            Runtime.omegga.getAllPlayerPositions().then((v) => {
                PlayerHandler.playerPositions = v;
            });
        }, 300);

        this.swingIntervalId = setInterval(() => {
            let playerPositions: IPlayerPositions = [];

            let playerSwingActiveKeys = Object.keys(this.playerSwingActive);

            for (let i = 0; i < playerSwingActiveKeys.length; i++) {
                const playerName = playerSwingActiveKeys[i];
                const result = this.playerPositions.find((v) => {
                    return v.player.name === playerName;
                });
                if (result === undefined) continue;

                playerPositions.push(result);
            }

            this.swing(playerPositions);
        }, 150);
    }

    public static stop() {
        Runtime.events.off("player_swing", this.activateSwing);
        Runtime.events.off("player_touch_creeper", this.touchedCreeper);

        clearInterval(this.playerPositionIntervalId);
        this.playerPositionIntervalId = null;

        clearInterval(this.swingIntervalId);
        this.swingIntervalId = null;
    }

    public static touchedCreeper(players: OmeggaPlayer[]) {
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            player.damage(2000); //lol! you died!
        }
    }

    public static activateSwing(player_positions: IPlayerPositions) {
        for (let i = 0; i < player_positions.length; i++) {
            const user = player_positions[i];
            if (user.player.name in PlayerHandler.playerSwingActive) {
                clearTimeout(PlayerHandler.playerSwingActive[user.player.name]);
            }
            PlayerHandler.playerSwingActive[user.player.name] = setTimeout(() => {
                delete PlayerHandler.playerSwingActive[user.player.name];
            }, 1000);
        }
    }

    public static async swing(player_positions: IPlayerPositions) {
        if (!GamemodeRuntime.isPlaying()) return;

        for (let i = 0; i < player_positions.length; i++) {
            const player = player_positions[i];
            if (player.isDead) continue;

            const spatial = GamemodeRuntime.creeper.getMapspatial();

            let isCrouched = await player.player.isCrouched().catch((r) => {
                console.info(r);
            });

            const rotationRegExp = new RegExp(
                `${player.player.controller}\\.TransformComponent0.RelativeRotation = \\(Pitch=(?<x>[\\d\\.-]+),Yaw=(?<y>[\\d\\.-]+),Roll=(?<z>[\\d\\.-]+)\\)`
            );
            const [
                {
                    groups: { x, y, z },
                },
            ] = await Omegga.addWatcher(rotationRegExp, {
                exec: () => Omegga.writeln(`GetAll SceneComponent RelativeRotation Outer=${player.player.controller}`),
                timeoutDelay: 100,
            });

            let cameraPosition: Vector = isCrouched
                ? [player.pos[0], player.pos[1], player.pos[2] + 11]
                : [player.pos[0], player.pos[1], player.pos[2] + 17];
            const gridOffset = vec3Sub(spatial.brick_offset, spatial.brick_size);

            const positions = Raycast.spatialDDARaycast(
                vec3Sub(cameraPosition as Vector, gridOffset),
                [parseFloat(x), parseFloat(y), parseFloat(z)],
                12,
                spatial
            );

            for (let j = 0; j < positions.length; j++) {
                const position = vec3Add(positions[j], gridOffset);
                const occupancy = spatial.getTypeAtWorldPosition(position);

                if (occupancy === OccupancyType.Wall) break;
                if (occupancy === OccupancyType.Creeper) {
                    GamemodeRuntime.creeper.setPositionToAir(spatial.worldToAbsolutePosition(position));
                    GamemodeRuntime.creeper.hit();
                    Runtime.omegga.clearRegion({
                        center: position,
                        extent: spatial.brick_size,
                    });
                    break;
                }
            }
        }
    }
}
