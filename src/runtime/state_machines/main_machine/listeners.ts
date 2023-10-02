import MapEditor from "src/lib/edit_mode/map_editor";
import GameController from "src/lib/game_loop/game_initialization/game_control";

let listeners: { name: string; callback: (...args: any[]) => void }[] = [];

listeners.push({
    name: "PLAY",
    callback: () => {
        GameController.start();
    },
});

listeners.push({
    name: "STOP_PLAY",
    callback: () => {
        GameController.stop();
    },
});

listeners.push({
    name: "EDIT",
    callback: () => {
        MapEditor.start();
    },
});

listeners.push({
    name: "STOP_EDIT",
    callback: () => {
        MapEditor.stop();
    },
});

module.exports = listeners;
