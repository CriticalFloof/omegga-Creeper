import EventChecker from "src/lib/event_checker";
import { Runtime } from "../main";

new EventChecker(
    "minigame_round_change",
    500,
    (state: {
        previousMinigameRounds: {
            [ruleset: string]: number;
        };
    }) => {
        return new Promise(async (resolve, reject) => {
            if (state.previousMinigameRounds == undefined) state.previousMinigameRounds = {};
            const currentRoundRegexp =
                /^(?<index>\d+)\) BP_Ruleset_C (.+):PersistentLevel.(?<ruleset>BP_Ruleset_C_\d+)\.CurrentRound = (?<currentRound>\d+)$/;

            const currentRoundMatches = await Runtime.omegga.watchLogChunk<RegExpMatchArray>("GetAll BP_Ruleset_C CurrentRound", currentRoundRegexp, {
                first: "index",
                timeoutDelay: 5000,
                afterMatchDelay: 100,
            });

            let currentMinigameRounds = {};
            let changedMinigames = {};
            for (let i = 0; i < currentRoundMatches.length; i++) {
                const currentRoundMatch = currentRoundMatches[i];
                const ruleset = currentRoundMatch.groups["ruleset"];
                const round = parseInt(currentRoundMatch.groups["currentRound"]);
                currentMinigameRounds[ruleset] = round;

                if (state.previousMinigameRounds[ruleset] != undefined && state.previousMinigameRounds[ruleset] < round) {
                    changedMinigames[ruleset] = round;
                }
            }
            state.previousMinigameRounds = currentMinigameRounds;

            if (Object.keys(changedMinigames).length === 0) reject(null);
            resolve([changedMinigames]);
        });
    }
).start();

new EventChecker(
    "minigame_round_end",
    4000,
    (state: {
        alreadyEnded: {
            [ruleset: string]: boolean;
        };
    }) => {
        if (state.alreadyEnded == undefined) state.alreadyEnded = {};
        return new Promise(async (resolve, reject) => {
            const sessionRoundRegexp =
                /^(?<index>\d+)\) BP_Ruleset_C (.+):PersistentLevel.(?<ruleset>BP_Ruleset_C_\d+)\.bInSession = (?<inSession>(True|False))$/;

            const sessionRoundMatches = await Runtime.omegga.watchLogChunk<RegExpMatchArray>("GetAll BP_Ruleset_C bInSession", sessionRoundRegexp, {
                first: "index",
                timeoutDelay: 5000,
                afterMatchDelay: 100,
            });

            let newlyOutOfSessionMinigames = {};
            let outOfSessionMinigames = {};
            for (let i = 0; i < sessionRoundMatches.length; i++) {
                const sessionRoundMatch = sessionRoundMatches[i];
                const ruleset = sessionRoundMatch.groups["ruleset"];
                const sessionStatus = sessionRoundMatch.groups["inSession"] === "True";
                if (!sessionStatus && sessionRoundMatch.groups["index"] !== "0") {
                    outOfSessionMinigames[ruleset] = true;
                }
            }

            const outOfSessionMinigameKeys = Object.keys(outOfSessionMinigames);
            const alreadyEndedKeys = Object.keys(state.alreadyEnded);

            for (let key in outOfSessionMinigameKeys) {
                if (!alreadyEndedKeys.includes(key)) newlyOutOfSessionMinigames[key] = true;
            }

            state.alreadyEnded = outOfSessionMinigames;

            if (Object.keys(newlyOutOfSessionMinigames).length === 0) reject(null);
            resolve([newlyOutOfSessionMinigames]);
        });
    }
).start();
