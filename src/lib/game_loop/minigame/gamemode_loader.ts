import { Runtime } from "src/runtime/main";
import GamemodeRuntime from "./gamemode_runtime";
import Spatial, { OccupancyType } from "src/lib/world/spatial";

export default class GamemodeLoader {
    public static async clear() {
        GamemodeRuntime.stop();
        let minigames = await Runtime.omegga.getMinigames();
        for (let i = 0; i < minigames.length; i++) {
            const minigame = minigames[i];
            if (minigame.index === -1) continue;
            Runtime.omegga.deleteMinigame(minigame.index);
        }
    }
    public static async load(gamemode_name: string, map_spatial: Spatial) {
        await this.clear();
        setImmediate(async () => {
            Runtime.omegga.loadMinigame(`CR_${gamemode_name}`);
            let minigames = await Runtime.omegga.getMinigames();
            setTimeout(() => {
                GamemodeRuntime.start(minigames[minigames.length - 1], map_spatial);
            }, 1000);
        });
    }
}
