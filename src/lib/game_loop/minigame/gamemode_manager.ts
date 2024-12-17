import path from "path";
import { Runtime } from "src/runtime/main";
import * as fs from "fs";
import * as fsp from "fs/promises";

export default class GamemodeManager {
    public static getGamemodePath() {
        return path.join(Runtime.pluginPath, "/data/gamemode");
    }

    public static getPluginMinigamePath(gamemode_name: string): string {
        return path.join(this.getGamemodePath(), `/${gamemode_name}/${gamemode_name}.bp`);
    }

    public static getBrickadiaMinigamePath(gamemode_name: string): string {
        return path.join(Runtime.omegga.presetPath, `/Minigame/CR_${gamemode_name}.bp`);
    }

    public static async listGamemodeInPlugin() {

        if(!fs.existsSync(this.getGamemodePath())) {
            fs.mkdirSync(this.getGamemodePath(), {recursive: true})
        }

        let result = await fsp.readdir(this.getGamemodePath()).catch((err) => {
            console.warn(err);
        });
        return result == undefined ? [] : (result as string[]);
    }

    public static async listGamemodeInBrickadia() {

        const minigamePath = path.join(Runtime.omegga.presetPath, `/Minigame`)

        if(!fs.existsSync(minigamePath)) {
            fs.mkdirSync(minigamePath, {recursive: true})
        }

        let result = (await fsp.readdir(minigamePath).catch((err) => {
            console.warn(err);
        })) as string[];
        if (result == undefined) result = [];

        for (let i = 0; i < result.length; i++) {
            const res = result[i];
            const parsed = path.parse(res);
            result[i] = path.join(parsed.dir, parsed.name.replace("CR_", ""));
        }
        return result;
    }

    public static copyFromPluginToBrickadia(gamemode_names: string[]) {
        for (let i = 0; i < gamemode_names.length; i++) {
            const gamemodeName = gamemode_names[i];

            if (!fs.existsSync(this.getPluginMinigamePath(gamemodeName))) {
                console.warn(`${gamemodeName}: No such file at plugin. (Minigame)`);
            } else {
                fsp.copyFile(this.getPluginMinigamePath(gamemodeName), this.getBrickadiaMinigamePath(gamemodeName)).catch((err) => {
                    console.error(err);
                });
            }
        }
    }

    public static async automaticGamemodeTransfer() {
        const brickadiaGamemodes = await this.listGamemodeInBrickadia();
        const pluginGamemodes = await this.listGamemodeInPlugin();

        this.copyFromPluginToBrickadia(pluginGamemodes.filter((v) => !brickadiaGamemodes.includes(v)));
    }
}
