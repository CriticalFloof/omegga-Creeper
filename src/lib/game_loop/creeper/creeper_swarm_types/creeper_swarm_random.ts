import { vec3Add } from "src/lib/vector_operation";
import CreeperSwarm from "../creeper_swarm_base";
import Spatial, { OccupancyType } from "src/lib/world/spatial";
import { growRandom } from "../creeper_swarm_functions";

export default class CreeperSwarmRandom extends CreeperSwarm {
    public override tick() {
        if (!this.isEnabled) return;
        if (super.respondToArtifialEndConditions()) return;
        this.currentTick += 1;

        growRandom(4, this);
    }
}
