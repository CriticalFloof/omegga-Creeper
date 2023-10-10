import { Runtime } from "src/runtime/main";
import MapManager from "../map/map_manager";
import path from "path";
import MapCompiler from "./map_compiler/map_compiler";
import SpatialManager from "../world/spatial_manager";
import MapLoader from "../game_loop/maps/map_loader";

export default class MapEditor {
    public static isEnabled(): boolean {
        return Runtime.stateMachine.getCurrentState() == "map_edit";
    }

    public static start() {
        MapLoader.clear();
    }

    public static stop() {
        MapLoader.clear();
    }

    public static loadMap(map_name: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!MapEditor.isEnabled()) reject();
            Runtime.omegga.clearAllBricks(true);
            const sourcePath = path.relative(Runtime.omegga.savePath, MapManager.getBrickadiaSourceBuildPath(map_name));
            Runtime.omegga.loadBricks(sourcePath, { quiet: true });

            Runtime.omegga.loadEnvironment(`CR_${map_name}_environment`);

            resolve();
        });
    }

    public static saveMap(map_name: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!MapEditor.isEnabled()) reject();
            MapManager.saveMap(map_name).then(() => {
                resolve();
            });
        });
    }

    public static compileMap(map_name: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!MapEditor.isEnabled()) reject();

            const sourcePath = path.relative(Runtime.omegga.savePath, MapManager.getBrickadiaSourceBuildPath(map_name));
            const parseSource = path.parse(sourcePath);
            const compiledPath = path.relative(Runtime.omegga.savePath, MapManager.getBrickadiaCompiledBuildPath(map_name));
            const parseCompiled = path.parse(compiledPath);

            let sourceBuildData = Runtime.omegga.readSaveData(path.join(parseSource.dir, parseSource.name));

            MapCompiler.run(sourceBuildData)
                .then((result) => {
                    SpatialManager.write(map_name, result.spatial);
                    Runtime.omegga.writeSaveData(path.join(parseCompiled.dir, parseCompiled.name), result.save);
                    MapManager.compileMap(map_name);
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    public static createMap(map_name: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!MapEditor.isEnabled()) reject();
            MapManager.createMap(map_name);
            resolve();
        });
    }

    public static deleteMap(map_name: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!MapEditor.isEnabled()) reject();
            MapManager.deleteMap(map_name);
            resolve();
        });
    }

    public static renameMap(old_name: string, new_name: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!MapEditor.isEnabled()) reject();
            MapManager.renameMap(old_name, new_name);
            resolve();
        });
    }
}
