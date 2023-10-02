import { Runtime } from "src/runtime/main";
import MapRotator from "../maps/map_rotator";

export default class GameController {
    public static isEnabled(): boolean {
        return Runtime.stateMachine.getCurrentState() == "map_play";
    }

    public static start() {
        MapRotator.start();
    }

    public static stop() {
        MapRotator.stop();
    }
}
