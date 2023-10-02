import { IPlayerPositions, OmeggaPlayer, Vector } from "omegga";
import EventChecker from "src/lib/event_checker";
import CreeperSwarm from "src/lib/game_loop/creeper/creeper_swarm_base";
import GamemodeRuntime from "src/lib/game_loop/minigame/gamemode_runtime";
import PlayerHandler from "src/lib/game_loop/players/player_handler";
import { vec3Add, vec3Sub } from "src/lib/vector_operation";
import { OccupancyType } from "src/lib/world/spatial";

new EventChecker("player_swing", 100, async (state: { playerWeaponLink: { [weaponId: string]: string } }) => {
    if (state.playerWeaponLink == undefined) state.playerWeaponLink = {};

    async function registerAllHeldWeapons() {
        const reg = new RegExp(
            /BP_FigureV2_C .+?PersistentLevel\.(?<playerPawn>BP_FigureV2_C_\d+)\.WeaponSimState = .+(PersistentLevel.(Weapon|BP_Item)_|CurrentItemInstance=)(?<Weapon>.+)(_C_(?<weaponPawn>\w+)|,)/
        );
        const logResults = (await Omegga.watchLogChunk(`getAll BP_FigureV2_C WeaponSimState`, reg, {
            timeoutDelay: 500,
        }).catch()) as RegExpMatchArray[];
        if (!logResults) return [];
        for (let i = 0; i < logResults.length; i++) {
            const logResult = logResults[i];
            const { playerPawn, weaponPawn } = logResult.groups;

            state.playerWeaponLink[weaponPawn] = playerPawn;
        }
    }

    return new Promise(async (resolve, reject) => {
        let playerSwings: IPlayerPositions = [];
        const playerPositions = PlayerHandler.getPlayerpositions();
        const regexp = new RegExp(`Weapon_Knife_C_(?<weaponId>.*).SimState.*bMeleeActive=(?<meleeStatus>True|False)`);
        const logResults = (await Omegga.watchLogChunk(`getAll Weapon_Knife_C simState`, regexp, {
            timeoutDelay: 500,
        }).catch()) as RegExpMatchArray[];
        if (!logResults) return [];
        for (let i = 0; i < logResults.length; i++) {
            const logResult = logResults[i];
            const { weaponId, meleeStatus } = logResult.groups;
            if (meleeStatus.toLowerCase() != "true") continue;

            for (let j = 0; j < playerPositions.length; j++) {
                const player = playerPositions[j];

                if (!(`${weaponId}` in state.playerWeaponLink)) {
                    await registerAllHeldWeapons();
                    if (!(`${weaponId}` in state.playerWeaponLink)) {
                        continue;
                    }
                }

                if (player.pawn === state.playerWeaponLink[weaponId]) {
                    playerSwings.push(player);
                    break;
                }
            }
        }

        if (playerSwings.length === 0) {
            reject(null);
        }
        resolve([playerSwings]);
    });
}).start();

new EventChecker("player_touch_creeper", 300, () => {
    return new Promise((resolve, reject) => {
        const mapSpatial = GamemodeRuntime.creeper.getMapspatial();

        const playerPositions = PlayerHandler.getPlayerpositions();

        let doomedPlayers: OmeggaPlayer[] = [];

        playerLoop: for (let i = 0; i < playerPositions.length; i++) {
            const player = playerPositions[i];
            const playerPosition = player.pos as Vector;

            const playerCornerMin = mapSpatial.worldToAbsolutePosition(vec3Sub(playerPosition, PlayerHandler.playerSize));
            const playerCornerMax = mapSpatial.worldToAbsolutePosition(vec3Add(playerPosition, PlayerHandler.playerSize));

            const positionIterations = vec3Sub(playerCornerMax, playerCornerMin);

            if (player.isDead) {
                continue;
            }

            for (let x = 0; x <= positionIterations[0]; x++) {
                for (let y = 0; y <= positionIterations[1]; y++) {
                    for (let z = 0; z <= positionIterations[2]; z++) {
                        const occupancy = mapSpatial.getTypeAtAbsolutePosition(vec3Add(playerCornerMin, [x, y, z]));
                        if (occupancy == OccupancyType.Creeper) {
                            doomedPlayers.push(player.player);
                            continue playerLoop;
                        }
                    }
                }
            }
        }

        if (doomedPlayers.length === 0) {
            reject(null);
        }

        resolve([doomedPlayers]);
    });
}).start();
