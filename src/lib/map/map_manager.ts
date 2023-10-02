import path from "path";
import { Runtime } from "src/runtime/main";
import * as fs from "fs";
import * as fsp from "fs/promises";
import { Brick, WriteSaveObject } from "omegga";
import BrickLoader from "../bricks/brick_loader";

export default class MapManager {
    public static getMapPath() {
        return path.join(Runtime.pluginPath, "/data/maps");
    }

    public static getPlaceholderBuildPath() {
        return path.join(Runtime.pluginPath, "/data/static/placeholder.brs");
    }

    public static getPlaceholderEnvironmentPath() {
        return path.join(Runtime.pluginPath, "/data/static/placeholder_environment.bp");
    }

    public static getPluginFolderPath(map_name: string): string {
        return path.join(this.getMapPath(), `/${map_name}`);
    }

    public static getPluginEnvironmentPath(map_name: string): string {
        return path.join(this.getMapPath(), `/${map_name}/${map_name}_environment.bp`);
    }

    public static getPluginSourceBuildPath(map_name: string): string {
        return path.join(this.getMapPath(), `/${map_name}/source/${map_name}_source.brs`);
    }

    public static getPluginCompiledBuildPath(map_name: string): string {
        return path.join(this.getMapPath(), `/${map_name}/${map_name}.brs`);
    }

    public static getBrickadiaEnvironmentPath(map_name: string): string {
        return path.join(Runtime.omegga.presetPath, `/Environment/CR_${map_name}_environment.bp`);
    }

    public static getBrickadiaSourceBuildPath(map_name: string): string {
        return path.join(Runtime.omegga.savePath, `/Creeper/Source/${map_name}_source.brs`);
    }

    public static getBrickadiaCompiledBuildPath(map_name: string): string {
        return path.join(Runtime.omegga.savePath, `/Creeper/Compiled/${map_name}.brs`);
    }

    public static async listMapsInPlugin() {
        let result = await fsp.readdir(this.getMapPath()).catch((err) => {
            console.warn(err);
        });
        return result == undefined ? [] : (result as string[]);
    }

    public static async listEditableMapsInPlugin() {
        let possibleMaps = await this.listMapsInPlugin();
        let editableMaps = [];
        for (let i = 0; i < possibleMaps.length; i++) {
            const possibleMap = possibleMaps[i];

            if (fs.existsSync(this.getPluginSourceBuildPath(possibleMap)) && fs.existsSync(this.getPluginEnvironmentPath(possibleMap))) {
                editableMaps.push(possibleMap);
            }
        }
        return editableMaps;
    }

    public static async listPlayableMapsInPlugin() {
        let possibleMaps = await this.listMapsInPlugin();
        let playableMaps = [];
        for (let i = 0; i < possibleMaps.length; i++) {
            const possibleMap = possibleMaps[i];

            if (fs.existsSync(this.getPluginCompiledBuildPath(possibleMap)) && fs.existsSync(this.getPluginEnvironmentPath(possibleMap))) {
                playableMaps.push(possibleMap);
            }
        }
        return playableMaps;
    }

    public static async listMapsInBrickadia() {
        let resultCompiled = (await fsp.readdir(path.join(Runtime.omegga.savePath, `/Creeper/Compiled`)).catch((err) => {
            console.warn(err);
        })) as string[];
        if (resultCompiled == undefined) resultCompiled = [];

        for (let i = 0; i < resultCompiled.length; i++) {
            const res = resultCompiled[i];
            const parsed = path.parse(res);
            resultCompiled[i] = path.join(parsed.dir, parsed.name);
        }

        let resultSource = (await fsp.readdir(path.join(Runtime.omegga.savePath, `/Creeper/Source`)).catch((err) => {
            console.warn(err);
        })) as string[];
        if (resultSource == undefined) resultSource = [];

        for (let i = 0; i < resultSource.length; i++) {
            const res = resultSource[i];
            const parsed = path.parse(res);
            resultSource[i] = path.join(parsed.dir, parsed.name.replace("_source", ""));
        }

        let result = [...new Set([...resultCompiled, ...resultSource])];
        return result;
    }

    public static async listEditableMapsInBrickadia() {
        let possibleMaps = await this.listMapsInBrickadia();
        let editableMaps = [];
        for (let i = 0; i < possibleMaps.length; i++) {
            const possibleMap = possibleMaps[i];

            if (fs.existsSync(this.getBrickadiaSourceBuildPath(possibleMap)) && fs.existsSync(this.getBrickadiaEnvironmentPath(possibleMap))) {
                editableMaps.push(possibleMap);
            }
        }
        return editableMaps;
    }

    public static async listPlayableMapsInBrickadia() {
        let possibleMaps = await this.listMapsInBrickadia();
        let playableMaps = [];
        for (let i = 0; i < possibleMaps.length; i++) {
            const possibleMap = possibleMaps[i];

            if (fs.existsSync(this.getBrickadiaCompiledBuildPath(possibleMap)) && fs.existsSync(this.getBrickadiaEnvironmentPath(possibleMap))) {
                playableMaps.push(possibleMap);
            }
        }
        return playableMaps;
    }

    private static copyFromPluginToBrickadia(map_names: string[]) {
        // When called, transfer given maps from plugin to brickadia
        for (let i = 0; i < map_names.length; i++) {
            const mapName = map_names[i];
            if (!fs.existsSync(this.getPluginSourceBuildPath(mapName))) {
                console.warn(`${mapName}: No such file at plugin. (Source Build)`);
            } else {
                fsp.copyFile(this.getPluginSourceBuildPath(mapName), this.getBrickadiaSourceBuildPath(mapName)).catch((err) => {
                    console.error(err);
                });
            }

            if (!fs.existsSync(this.getPluginCompiledBuildPath(mapName))) {
                console.warn(`${mapName}: No such file at plugin. (Compiled Build)`);
            } else {
                fsp.copyFile(this.getPluginCompiledBuildPath(mapName), this.getBrickadiaCompiledBuildPath(mapName)).catch((err) => {
                    console.error(err);
                });
            }

            if (!fs.existsSync(this.getPluginEnvironmentPath(mapName))) {
                console.warn(`${mapName}: No such file at plugin. (Environment)`);
            } else {
                fsp.copyFile(this.getPluginEnvironmentPath(mapName), this.getBrickadiaEnvironmentPath(mapName)).catch((err) => {
                    console.error(err);
                });
            }
        }
    }

    private static copyFromBrickadiaToPlugin(map_names: string[]) {
        // When called, transfer given maps from brickadia to plugin
        for (let i = 0; i < map_names.length; i++) {
            const mapName = map_names[i];
            if (!fs.existsSync(this.getBrickadiaSourceBuildPath(mapName))) {
                console.warn(`${mapName}: No such file at brickadia. (Source Build)`);
            } else {
                fsp.copyFile(this.getBrickadiaSourceBuildPath(mapName), this.getPluginSourceBuildPath(mapName)).catch((err) => {
                    console.error(err);
                });
            }

            if (!fs.existsSync(this.getBrickadiaCompiledBuildPath(mapName))) {
                console.warn(`${mapName}: No such file at brickadia. (Compiled Build)`);
            } else {
                fsp.copyFile(this.getBrickadiaCompiledBuildPath(mapName), this.getPluginCompiledBuildPath(mapName)).catch((err) => {
                    console.error(err);
                });
            }

            if (!fs.existsSync(this.getBrickadiaEnvironmentPath(mapName))) {
                console.warn(`${mapName}: No such file at brickadia. (Environment)`);
            } else {
                fsp.copyFile(this.getBrickadiaEnvironmentPath(mapName), this.getPluginEnvironmentPath(mapName)).catch((err) => {
                    console.error(err);
                });
            }
        }
    }

    private static async crossCheckMapAvailibility(): Promise<{ missingFromBrickadia: string[]; missingFromPlugin: string[] }> {
        const brickadiaMaps = await this.listMapsInBrickadia();
        const pluginMaps = await this.listMapsInPlugin();

        const missingFromBrickadia = pluginMaps.filter((v) => !brickadiaMaps.includes(v));
        const missingFromPlugin = brickadiaMaps.filter((v) => !pluginMaps.includes(v));

        return { missingFromBrickadia, missingFromPlugin };
    }

    public static async automaticMapRestore() {
        if (!fs.existsSync(path.join(Runtime.omegga.savePath, `/Creeper/Source`))) {
            await fsp.mkdir(path.join(Runtime.omegga.savePath, `/Creeper/Source`), { recursive: true });
        }

        if (!fs.existsSync(path.join(Runtime.omegga.savePath, `/Creeper/Compiled`))) {
            await fsp.mkdir(path.join(Runtime.omegga.savePath, `/Creeper/Compiled`), { recursive: true });
        }

        const results = await this.crossCheckMapAvailibility();

        this.copyFromBrickadiaToPlugin(results.missingFromPlugin);
        this.copyFromPluginToBrickadia(results.missingFromBrickadia);
    }

    public static async createMap(map_name: string) {
        //Copy from the blank placeholder templates over to brickadia
        if (!fs.existsSync(this.getPlaceholderBuildPath())) {
            console.warn(`${map_name}: No such file at plugin. (Placeholder Build)`);
        } else {
            await fsp.copyFile(this.getPlaceholderBuildPath(), this.getBrickadiaSourceBuildPath(map_name)).catch((err) => {
                console.error(err);
            });
        }

        if (!fs.existsSync(this.getPlaceholderEnvironmentPath())) {
            console.warn(`${map_name}: No such file at plugin. (Placeholder Environment)`);
        } else {
            await fsp.copyFile(this.getPlaceholderEnvironmentPath(), this.getBrickadiaEnvironmentPath(map_name)).catch((err) => {
                console.error(err);
            });
        }

        //Once copied, load the map saveData and set all bricks owner to Map

        const sourcePath = path.relative(Runtime.omegga.savePath, MapManager.getBrickadiaSourceBuildPath(map_name));
        const parseSource = path.parse(sourcePath);

        let sourceBuildData = Runtime.omegga.readSaveData(path.join(parseSource.dir, parseSource.name));

        let bricks: Brick[] = [];
        for (let i = 0; i < sourceBuildData.bricks.length; i++) {
            let brick: Brick = sourceBuildData.bricks[i];
            brick.owner_index = 1;
            bricks.push(brick);
        }

        let save: WriteSaveObject = {
            ...sourceBuildData,
            brick_owners: BrickLoader.writeSaveObjectStandard.brick_owners,
            bricks: bricks,
        };

        Runtime.omegga.writeSaveData(path.join(parseSource.dir, parseSource.name), save);

        //Create the plugin map folder

        await fsp.mkdir(path.join(this.getMapPath(), `/${map_name}`)).catch((err) => {
            console.error(err);
        });

        await fsp.mkdir(path.join(this.getMapPath(), `/${map_name}/source`)).catch((err) => {
            console.error(err);
        });

        //Copy brickadia over to the plugin's side

        if (!fs.existsSync(this.getBrickadiaSourceBuildPath(map_name))) {
            console.warn(`${map_name}: No such file at brickadia. (Source Build)`);
        } else {
            await fsp.copyFile(this.getBrickadiaSourceBuildPath(map_name), this.getPluginSourceBuildPath(map_name)).catch((err) => {
                console.error(err);
            });
        }

        if (!fs.existsSync(this.getBrickadiaEnvironmentPath(map_name))) {
            console.warn(`${map_name}: No such file at brickadia. (Environment)`);
        } else {
            await fsp.copyFile(this.getBrickadiaEnvironmentPath(map_name), this.getPluginEnvironmentPath(map_name)).catch((err) => {
                console.error(err);
            });
        }
    }

    public static async saveMap(map_name: string) {
        // Save the source build and environment.
        const sourcePath = path.relative(Runtime.omegga.savePath, this.getBrickadiaSourceBuildPath(map_name));
        Runtime.omegga.saveBricks(sourcePath);
        await Runtime.omegga.saveEnvironment(`CR_${map_name}_environment`);

        // Copy it over to the plugin's side
        if (!fs.existsSync(this.getBrickadiaSourceBuildPath(map_name))) {
            console.warn(`${map_name}: No such file at brickadia. (Source Build)`);
        } else {
            await fsp.copyFile(this.getBrickadiaSourceBuildPath(map_name), this.getPluginSourceBuildPath(map_name)).catch((err) => {
                console.error(err);
            });
        }

        if (!fs.existsSync(this.getBrickadiaEnvironmentPath(map_name))) {
            console.warn(`${map_name}: No such file at brickadia. (Environment)`);
        } else {
            await fsp.copyFile(this.getBrickadiaEnvironmentPath(map_name), this.getPluginEnvironmentPath(map_name)).catch((err) => {
                console.error(err);
            });
        }
    }

    public static async compileMap(map_name: string) {
        // Copies over the brickadia's compiled map over to the plugin's side

        if (!fs.existsSync(this.getBrickadiaCompiledBuildPath(map_name))) {
            console.warn(`${map_name}: No such file at brickadia. (Source Build)`);
        } else {
            await fsp.copyFile(this.getBrickadiaCompiledBuildPath(map_name), this.getPluginCompiledBuildPath(map_name)).catch((err) => {
                console.error(err);
            });
        }
    }

    public static async renameMap(old_name: string, new_name: string) {
        // Change the file names within brickadia.
        if (!fs.existsSync(this.getBrickadiaSourceBuildPath(old_name))) {
            console.warn(`${old_name}: No such file at brickadia. (Source Build)`);
        } else {
            await fsp.rename(this.getBrickadiaSourceBuildPath(old_name), this.getBrickadiaSourceBuildPath(new_name)).catch((err) => {
                console.error(err);
            });
        }

        if (!fs.existsSync(this.getBrickadiaCompiledBuildPath(old_name))) {
            console.warn(`${old_name}: No such file at brickadia. (Compiled Build)`);
        } else {
            await fsp.rename(this.getBrickadiaCompiledBuildPath(old_name), this.getBrickadiaCompiledBuildPath(new_name)).catch((err) => {
                console.error(err);
            });
        }

        if (!fs.existsSync(this.getBrickadiaEnvironmentPath(old_name))) {
            console.warn(`${old_name}: No such file at brickadia. (Environment)`);
        } else {
            await fsp.rename(this.getBrickadiaEnvironmentPath(old_name), this.getBrickadiaEnvironmentPath(new_name)).catch((err) => {
                console.error(err);
            });
        }

        // For ease of implementation, create the newly named map folder on the plugin's side.

        await fsp.mkdir(path.join(this.getMapPath(), `/${new_name}`)).catch((err) => {
            console.error(err);
        });

        await fsp.mkdir(path.join(this.getMapPath(), `/${new_name}/source`)).catch((err) => {
            console.error(err);
        });

        // Then, relocate the contents from their old location to their new location

        if (!fs.existsSync(this.getPluginSourceBuildPath(old_name))) {
            console.warn(`${old_name}: No such file at plugin. (Source Build)`);
        } else {
            await fsp.rename(this.getPluginSourceBuildPath(old_name), this.getPluginSourceBuildPath(new_name)).catch((err) => {
                console.error(err);
            });
        }

        if (!fs.existsSync(this.getPluginCompiledBuildPath(old_name))) {
            console.warn(`${old_name}: No such file at plugin. (Compiled Build)`);
        } else {
            await fsp.rename(this.getPluginCompiledBuildPath(old_name), this.getPluginCompiledBuildPath(new_name)).catch((err) => {
                console.error(err);
            });
        }

        if (!fs.existsSync(this.getPluginEnvironmentPath(old_name))) {
            console.warn(`${old_name}: No such file at plugin. (Environment)`);
        } else {
            await fsp.rename(this.getPluginEnvironmentPath(old_name), this.getPluginEnvironmentPath(new_name)).catch((err) => {
                console.error(err);
            });
        }

        // Finally, delete the plugin's old map folder.

        if (!fs.existsSync(path.join(this.getMapPath(), `/${old_name}`))) {
            console.warn(`${old_name}: No such directory at plugin.`);
        } else {
            await fsp.rm(path.join(this.getMapPath(), `/${old_name}`), { recursive: true, force: true }).catch((err) => {
                console.error(err);
            });
        }
    }

    public static async deleteMap(map_name: string) {
        // Delete source build, compiled build, and environment at brickadia

        if (!fs.existsSync(this.getBrickadiaSourceBuildPath(map_name))) {
            console.warn(`${map_name}: No such file at brickadia. (Source Build)`);
        } else {
            await fsp.unlink(this.getBrickadiaSourceBuildPath(map_name)).catch((err) => {
                console.error(err);
            });
        }

        if (!fs.existsSync(this.getBrickadiaCompiledBuildPath(map_name))) {
            console.warn(`${map_name}: No such file at brickadia. (Compiled Build)`);
        } else {
            await fsp.unlink(this.getBrickadiaCompiledBuildPath(map_name)).catch((err) => {
                console.error(err);
            });
        }

        if (!fs.existsSync(this.getBrickadiaEnvironmentPath(map_name))) {
            console.warn(`${map_name}: No such file at brickadia. (Environment)`);
        } else {
            await fsp.unlink(this.getBrickadiaEnvironmentPath(map_name)).catch((err) => {
                console.error(err);
            });
        }

        // Delete the entire named map folder for the plugin side

        await fsp.rm(path.join(this.getMapPath(), `/${map_name}`), { recursive: true, force: true }).catch((err) => {
            console.error(err);
        });
    }
}
