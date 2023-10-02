import { Runtime } from "src/runtime/main";
import GamemodeLoader from "../minigame/gamemode_loader";
import MapManager from "src/lib/map/map_manager";
import path from "path";
import SpatialManager from "src/lib/world/spatial_manager";
import Spatial from "src/lib/world/spatial";
import { Vector } from "omegga";

export default class MapLoader {
    public static clear() {
        Runtime.omegga.clearAllBricks(true);
        Runtime.omegga.resetEnvironment();
        GamemodeLoader.clear();
    }
    public static async load(map_name: string): Promise<void> {
        this.clear();

        const compiledPath = path.relative(Runtime.omegga.savePath, MapManager.getBrickadiaCompiledBuildPath(map_name));
        Runtime.omegga.loadBricks(compiledPath, { quiet: true });

        Runtime.omegga.loadEnvironment(`CR_${map_name}_environment`);

        const gamemodeName = map_name.match(/.+?(?=_)/);

        GamemodeLoader.load(gamemodeName[0], await SpatialManager.read(map_name));
    }
}
