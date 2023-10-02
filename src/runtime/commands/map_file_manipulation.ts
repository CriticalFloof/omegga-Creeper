import Command, { TrustLevel } from "src/lib/commands";
import { Runtime } from "../main";
import MapEditor from "src/lib/edit_mode/map_editor";
import { Deferred } from "src/lib/deferred";
import MapManager from "src/lib/map/map_manager";
import GameController from "src/lib/game_loop/game_initialization/game_control";
import GamemodeManager from "src/lib/game_loop/minigame/gamemode_manager";

new Command("toggle_map_edit", TrustLevel.Trusted, (speaker: string) => {
    if (GameController.isEnabled()) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Game is currently running. Disable it to use the map editor.`);
        return;
    }

    if (MapEditor.isEnabled()) {
        Runtime.stateMachine.transition("STOP_EDIT");
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Map Editor has been disabled`);
    } else {
        Runtime.stateMachine.transition("EDIT");
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Map Editor has been enabled`);
    }
});

new Command("create_map", TrustLevel.Trusted, async (speaker: string) => {
    async function query<T>(question: string[], single_return: boolean = true): Promise<T> {
        return new Promise((resolve, reject) => {
            Runtime.omegga.whisper(speaker, ...question);
            const defer = new Deferred<T>();
            Command.defer(speaker, defer);
            defer
                .then((responce) => {
                    if (responce == undefined) {
                        return reject();
                    }
                    if (single_return) {
                        resolve(responce[0]);
                    } else {
                        resolve(responce);
                    }
                })
                .catch(() => {
                    return reject();
                });
        });
    }

    async function validGamemodeEnforcer(gamemode_string: string): Promise<string> {
        if (gamemodes.includes(gamemode_string)) return gamemode_string;
        const responce = await query<string>([`${gamemode_string} is not a valid gamemode, use one from the list below:`, ...gamemodes]);
        return validGamemodeEnforcer(responce);
    }

    async function validMapNameEnforcer(map_name: string): Promise<string> {
        if (!gamemodeMaps.includes(map_name)) return map_name;
        const responce = await query<string>([`${map_name} is already taken, try another name.`]);
        return validMapNameEnforcer(responce);
    }

    if (!MapEditor.isEnabled()) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Map Editor is not enabled, to enable it, type: /toggle_map_edit`);
        return;
    }

    const gamemodes = await GamemodeManager.listGamemodeInPlugin();
    const fullMapNames = await MapManager.listMapsInBrickadia();
    let gamemodeMaps = [];

    let gamemodeResponse: string;
    let mapNameResponse: string;

    try {
        gamemodeResponse = await validGamemodeEnforcer(await query<string>([`What gamemode do you want the map to be?`, ...gamemodes]));
    } catch {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Cancelled map creation.`);
        return;
    }

    for (let i = 0; i < fullMapNames.length; i++) {
        const fullMapName = fullMapNames[i];
        const gamemodeRegexp = new RegExp(`${gamemodeResponse}_(?=.+)`);
        if (!gamemodeRegexp.test(fullMapName)) continue;
        gamemodeMaps.push(fullMapName.replace(gamemodeRegexp, ""));
    }

    try {
        mapNameResponse = await validMapNameEnforcer(await query<string>([`What name is your map?`]));
    } catch {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Cancelled map creation.`);
        return;
    }

    //Finished
    Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Created map ''${gamemodeResponse}_${mapNameResponse}''!`);

    await MapManager.createMap(`${gamemodeResponse}_${mapNameResponse}`);
    await MapManager.saveMap(`${gamemodeResponse}_${mapNameResponse}`);
});

new Command("save_map", TrustLevel.Trusted, async (speaker: string, map_name: string) => {
    if (!MapEditor.isEnabled()) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Map Editor is not enabled, to enable it, type: /toggle_map_edit`);
        return;
    }

    const existingMaps = await MapManager.listMapsInBrickadia();

    if (map_name == undefined) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter a map name!`, ...existingMaps);
        return;
    }
    if (!existingMaps.includes(map_name)) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter an existing map name!`, ...existingMaps);
        return;
    }

    let defer = new Deferred();

    Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Do you want to overwrite map ''${map_name}''?`);
    defer
        .then(async () => {
            await MapEditor.saveMap(map_name);
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Saved map ''${map_name}''.`);
        })
        .catch(() => {
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Cancelled map save.`);
        });

    Command.defer(speaker, defer);
});

new Command("compile_map", TrustLevel.Trusted, async (speaker: string, map_name: string) => {
    if (!MapEditor.isEnabled()) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Map Editor is not enabled, to enable it, type: /toggle_map_edit`);
        return;
    }

    const existingMaps = await MapManager.listMapsInBrickadia();

    if (map_name == undefined) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter a map name!`, ...existingMaps);
        return;
    }
    if (!existingMaps.includes(map_name)) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter an existing map name!`, ...existingMaps);
        return;
    }

    MapEditor.compileMap(map_name)
        .then(() => {
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Compiled map ''${map_name}''.`);
        })
        .catch((reason) => {
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Error Compiling map: ''${map_name}''.`, `reason: ${reason}`);
        });
});

new Command("build_map", TrustLevel.Trusted, async (speaker: string, map_name: string) => {
    if (!MapEditor.isEnabled()) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Map Editor is not enabled, to enable it, type: /toggle_map_edit`);
        return;
    }

    const existingMaps = await MapManager.listMapsInBrickadia();

    if (map_name == undefined) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter a map name!`, ...existingMaps);
        return;
    }
    if (!existingMaps.includes(map_name)) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter an existing map name!`, ...existingMaps);
        return;
    }

    let defer = new Deferred();

    Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Do you want to overwrite map ''${map_name}''?`);
    defer
        .then(async () => {
            await MapEditor.saveMap(map_name);
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Saved map ''${map_name}''.`);

            await new Promise<void>((r) => {
                setTimeout(r, 50);
            });

            MapEditor.compileMap(map_name)
                .then(() => {
                    Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Compiled map ''${map_name}''.`);
                })
                .catch((reason) => {
                    Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Error Compiling map: ''${map_name}''.`, `reason: ${reason}`);
                });
        })
        .catch(() => {
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Cancelled map build.`);
        });

    Command.defer(speaker, defer);
});

new Command("load_map", TrustLevel.Trusted, async (speaker: string, map_name: string) => {
    if (!MapEditor.isEnabled()) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Map Editor is not enabled, to enable it, type: /toggle_map_edit`);
        return;
    }

    const existingMaps = await MapManager.listMapsInBrickadia();

    if (map_name == undefined) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter a map name!`, ...existingMaps);
        return;
    }
    if (!existingMaps.includes(map_name)) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter an existing map name!`, ...existingMaps);
        return;
    }

    Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Loading map ''${map_name}''!`);
    MapEditor.loadMap(map_name);
});

new Command("rename_map", TrustLevel.Trusted, async (speaker: string, old_name: string) => {
    async function query<T>(question: string[], single_return: boolean = true): Promise<T> {
        return new Promise((resolve, reject) => {
            Runtime.omegga.whisper(speaker, ...question);
            const defer = new Deferred<T>();
            Command.defer(speaker, defer);
            defer
                .then((responce) => {
                    if (responce == undefined) {
                        return reject();
                    }
                    if (single_return) {
                        resolve(responce[0]);
                    } else {
                        resolve(responce);
                    }
                })
                .catch(() => {
                    return reject();
                });
        });
    }

    async function validGamemodeEnforcer(gamemode_string: string): Promise<string> {
        if (gamemodes.includes(gamemode_string)) return gamemode_string;
        const responce = await query<string>([`${gamemode_string} is not a valid gamemode, use one from the list below:`, ...gamemodes]);
        return validGamemodeEnforcer(responce);
    }

    async function validMapNameEnforcer(map_name: string): Promise<string> {
        if (!gamemodeMaps.includes(map_name)) return map_name;
        const responce = await query<string>([`${map_name} is already taken, try another name.`]);
        return validMapNameEnforcer(responce);
    }

    const gamemodes = await GamemodeManager.listGamemodeInPlugin();
    const existingMaps = await MapManager.listMapsInBrickadia();

    if (!MapEditor.isEnabled()) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Map Editor is not enabled, to enable it, type: /toggle_map_edit`);
        return;
    }

    if (old_name == undefined) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter the map name you want to change!`, ...existingMaps);
        return;
    }

    if (!existingMaps.includes(old_name)) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Can't rename ''${old_name}'' as it doesn't exist`, ...existingMaps);
        return;
    }

    let gamemodeMaps = [];
    let gamemodeResponse: string;
    let mapNameResponse: string;

    try {
        gamemodeResponse = await validGamemodeEnforcer(await query<string>([`What gamemode is the map?`, ...gamemodes]));
    } catch {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Cancelled map renaming.`);
        return;
    }

    for (let i = 0; i < existingMaps.length; i++) {
        const fullMapName = existingMaps[i];
        const gamemodeRegexp = new RegExp(`${gamemodeResponse}_(?=.+)`);
        if (!gamemodeRegexp.test(fullMapName)) continue;
        gamemodeMaps.push(fullMapName.replace(gamemodeRegexp, ""));
    }

    try {
        mapNameResponse = await validMapNameEnforcer(await query<string>([`What will you name the map?`]));
    } catch {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Cancelled map renaming.`);
        return;
    }

    //Finished
    Runtime.omegga.whisper(
        speaker,
        `<size="10"><color="00FFFF">\></></> Renamed map from ''${old_name}'' to ''${gamemodeResponse}_${mapNameResponse}''!`
    );
    MapEditor.renameMap(old_name, `${gamemodeResponse}_${mapNameResponse}`);
});

new Command("delete_map", TrustLevel.Trusted, async (speaker: string, map_name: string) => {
    if (!MapEditor.isEnabled()) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Map Editor is not enabled, to enable it, type: /toggle_map_edit`);
        return;
    }

    const existingMaps = await MapManager.listMapsInBrickadia();

    if (map_name == undefined) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter a map name!`, ...existingMaps);
        return;
    }
    if (!existingMaps.includes(map_name)) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Please enter an existing map name!`, ...existingMaps);
        return;
    }

    let defer = new Deferred();

    Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Do you want to permanently delete map ''${map_name}''?`);
    defer
        .then(async () => {
            await MapEditor.deleteMap(map_name);
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Deleted map ''${map_name}''.`);
        })
        .catch(() => {
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> Cancelled map deletion.`);
        });

    Command.defer(speaker, defer);
});
