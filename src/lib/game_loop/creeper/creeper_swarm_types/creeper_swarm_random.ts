import CreeperSwarm from "../creeper_swarm_base";
import { growRandom } from "../creeper_swarm_functions";

export default class CreeperSwarmRandom extends CreeperSwarm {
    public override tick() {
        if (!this.isEnabled) return;
        if (super.respondToArtifialEndConditions()) return;
        this.currentTick += 1;

        growRandom(4, this);
    }
}
