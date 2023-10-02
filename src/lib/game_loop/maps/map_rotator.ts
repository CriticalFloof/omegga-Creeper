import { Runtime } from "src/runtime/main";
import { VotingHandler } from "../voting";
import MapManager from "src/lib/map/map_manager";
import MapLoader from "./map_loader";

export default class MapRotator {
    // A map rotator changes maps when prompted to
    // A map change occurs when a timer runs out (after round end) or the players rock the vote.

    public static currentMap: string = "";
    public static mapStartTime: number;
    public static mapEndTime: number;

    private static enabled: boolean = false;

    public static isEnabled(): boolean {
        return this.enabled;
    }

    public static start() {
        this.stop();
        this.currentMap = "";
        this.enabled = true;

        this.startPoll(false);
    }

    public static stop() {
        this.enabled = false;
        VotingHandler.endVote();
        MapLoader.clear();
    }

    public static async startPoll(include_extend: boolean = true) {
        Runtime.events.off("minigame_round_end", this.checkRoundTime);

        if (!this.isEnabled()) {
            return;
        }

        let chosenMaps: string[] = [];

        let availibleMaps = await MapManager.listPlayableMapsInBrickadia();
        availibleMaps = availibleMaps.filter((mapName) => {
            return mapName !== this.currentMap;
        });
        const samples = Math.min(availibleMaps.length, 5);

        for (let i = 0; i < samples; i++) {
            const chosenIndex = Math.trunc(Math.random() * availibleMaps.length);
            chosenMaps.push(availibleMaps[chosenIndex]);
            availibleMaps = availibleMaps.filter((v, i) => {
                return i !== chosenIndex;
            });
        }

        if (include_extend == true) {
            chosenMaps.push("extend_map");
        }

        Runtime.omegga.broadcast(`<color="CC2222"><size="28">Vote for the next map!</></>`);
        VotingHandler.initiateVote(chosenMaps, 15000)
            .then((winners) => {
                if (!MapRotator.isEnabled()) {
                    return;
                }

                // Nobody votes
                if (winners.length === 0) {
                    Runtime.omegga.broadcast(`<size="10"><color="00FFFF">\></></> No maps were voted for. Choosing random...`);
                    MapRotator.switchMap(chosenMaps[Math.trunc(Math.random() * chosenMaps.length)]);
                    return;
                }

                // A clear winner was chosen
                if (winners.length === 1) {
                    MapRotator.switchMap(winners[0]);
                    return;
                }

                // A tie occured, force a random pick.
                if (winners.length > 1) {
                    Runtime.omegga.broadcast(`<size="10"><color="00FFFF">\></></> ${winners.length} maps tied! Choosing random...`);
                    MapRotator.switchMap(chosenMaps[Math.trunc(Math.random() * chosenMaps.length)]);
                    return;
                }
            })
            .catch((err) => {
                if (err.message == "vote_is_active") {
                    console.info("Failed to create vote.");
                }
            });
    }

    private static switchMap(map_name: string) {
        if (!this.isEnabled()) {
            return;
        }

        if (map_name === "extend_map") {
            this.mapEndTime += Runtime.config["Map Time Length"] * 60000;
            this.enableRoundListenerNearMapEnd();
            Runtime.omegga.broadcast(
                `<size="10"><color="00FFFF">\></></> Extending map time for another ${Runtime.config["Map Time Length"]} minutes.`
            );
            return;
        }

        Runtime.omegga.broadcast(`<size="10"><color="00FFFF">\></></> Switching map to: "${map_name}"`);
        MapLoader.load(map_name);

        this.currentMap = map_name;
        this.mapStartTime = Date.now();
        this.mapEndTime = Date.now() + Runtime.config["Map Time Length"] * 60000;
        this.enableRoundListenerNearMapEnd();
    }

    private static enableRoundListenerNearMapEnd() {
        if (!this.enabled) {
            return;
        }
        setTimeout(() => {
            Runtime.events.on("minigame_round_end", this.checkRoundTime);
        }, (this.mapEndTime - Date.now()) * 0.99);
    }

    private static checkRoundTime() {
        if (Date.now() > MapRotator.mapEndTime) {
            MapRotator.startPoll(true);
        }
    }
}
