import Command, { TrustLevel } from "src/lib/commands";
import { Runtime } from "../main";
import GameController from "src/lib/game_loop/game_initialization/game_control";
import MapEditor from "src/lib/edit_mode/map_editor";

new Command("toggle_game", TrustLevel.Trusted, () => {
    if (MapEditor.isEnabled()) {
        Runtime.omegga.broadcast("Map Editor is currently running. Disable it to play the game.");
        return;
    }
    if (GameController.isEnabled()) {
        //disable
        Runtime.omegga.broadcast("Stopping Game.");
        Runtime.stateMachine.transition("STOP_PLAY");
    } else {
        //play
        Runtime.omegga.broadcast("Starting Game!");
        Runtime.stateMachine.transition("PLAY");
    }
});
