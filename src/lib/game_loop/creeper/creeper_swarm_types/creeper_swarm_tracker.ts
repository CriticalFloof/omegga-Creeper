import CreeperSwarm from "../creeper_swarm_base";
import { growRandom, positionGrowTowardsOtherPosition } from "../creeper_swarm_functions";
import PlayerHandler from "../../players/player_handler";
import { Vector } from "omegga";
import { Runtime } from "src/runtime/main";
import Spatial from "src/lib/world/spatial";

export default class CreeperSwarmTracker extends CreeperSwarm {
    private energy: number = 0;
    private rage: number = 1;
    private mode: "chase" | "spread" | "cower" | "rest" | "strike" = "spread";
    private startTime: number = Date.now();
    private size: number = 0;

    private isResting: boolean = false;
    private lastDeathTime: number = Date.now();
    private destroyedCreeper: number = 0;

    public override start(map_spatial: Spatial) {
        super.start(map_spatial);
        Runtime.events.on("player_touch_creeper", this.playerDeath);
    }

    public override stop() {
        Runtime.events.off("player_touch_creeper", this.playerDeath);
    }

    public override reset(): void {
        super.reset();

        this.energy = 0;
        this.rage = 1;
        this.mode = "spread";
        this.startTime = Date.now();
        this.size = 0;

        this.isResting = false;
        this.lastDeathTime = Date.now();
        this.destroyedCreeper = 0;
    }

    public override tick() {
        if (!this.isEnabled) return;
        if (super.respondToArtifialEndConditions()) return;
        this.currentTick += 1;

        if (this.energy < 0) this.energy = 0;
        if (this.destroyedCreeper > 0) this.destroyedCreeper -= 0.5;
        this.size = Object.keys(this.currentPositions).length;

        if (this.currentTick % 10 === 0) {
            if (Date.now() < this.startTime + 1000 * 15) {
                this.energy += 100 * Runtime.omegga.players.length * Math.min(this.rage, 1) + 150;
            } else {
                this.energy += 15 * Runtime.omegga.players.length * Math.min(this.rage, 1) + 15;
            }
        }

        if (this.energy < 50 * Runtime.omegga.players.length) {
            this.mode = "rest";
            this.isResting = true;
        } else if (this.energy > 150 * Runtime.omegga.players.length * Math.max(this.size / 1000, 1)) {
            this.isResting = false;
        }

        if (!this.isResting) {
            if (this.rage >= 1 + Runtime.omegga.players.length / 2) {
                if (this.size > 500) {
                    if (Math.random() > 0.4) {
                        this.mode = "chase";
                    } else {
                        this.mode = "strike";
                    }
                } else {
                    this.mode = "spread";
                    //this.mode = "cower";
                }
            } else {
                this.mode = "spread";
            }
        }

        this.updateRage();

        switch (this.mode) {
            case "chase":
                this.chase();
                break;
            case "spread":
                this.spread();
                break;
            case "rest":
                this.rest();
                break;
            case "strike":
                this.strike();
                break;
        }
    }

    public override hit() {
        this.destroyedCreeper += 1;
    }

    private playerDeath() {
        this.lastDeathTime = Date.now();
    }

    private getGrowthRate() {
        //Growth rate is based on players in the game and rage
        return Runtime.omegga.players.length * this.rage;
    }

    private updateRage() {
        //Rage is based on how much time has passed without a player death, how much creeper has been destroyed, how much creeper is on the map, and stick grenade stuns
        //Players death time scales from 0 to (playercount / 2) //done
        //Creeper destruction by spray scales from 0 to playercount //done
        //Creeper scarcity scales from 0 to 1 //done
        //Stick grenade stuns reduce by 0.02 per creeper destroyed and has no limit, but continuously diminishes. // planned
        let rage = 1;

        let timeSinceLastDeathInfluence = Math.min(
            (Date.now() - this.lastDeathTime) / (180000 / Runtime.omegga.players.length),
            Runtime.omegga.players.length
        );
        rage += timeSinceLastDeathInfluence;
        let scarcityInfluence = 1 - Math.min(this.size / 200, 1);
        rage += scarcityInfluence;
        let destructionInfluence = Math.min((this.destroyedCreeper / 25) * Runtime.omegga.players.length, Runtime.omegga.players.length) / 2;
        rage += destructionInfluence;

        this.rage = parseFloat(rage.toFixed(2));
    }

    private chase() {
        const playerPositions: Vector[] = PlayerHandler.getPlayerpositions()
            .filter((v) => !v.isDead)
            .map((v) => this.getMapspatial().worldToAbsolutePosition(v.pos as Vector));

        for (let i = 0; i < playerPositions.length; i++) {
            const playerPosition = playerPositions[i];

            let chargeGrowthRate = this.getGrowthRate() * 1;
            if (chargeGrowthRate > this.energy * 2) chargeGrowthRate = this.energy / 2;
            positionGrowTowardsOtherPosition(chargeGrowthRate, playerPosition, this);
            this.energy -= chargeGrowthRate * 2;
        }

        let randomGrowthRate = this.getGrowthRate() * 1;
        if (randomGrowthRate > this.energy) randomGrowthRate = this.energy;
        growRandom(randomGrowthRate, this);
        this.energy -= randomGrowthRate;
    }

    private strike() {
        const playerPositions: Vector[] = PlayerHandler.getPlayerpositions()
            .filter((v) => !v.isDead)
            .map((v) => this.getMapspatial().worldToAbsolutePosition(v.pos as Vector));

        for (let i = 0; i < playerPositions.length; i++) {
            const playerPosition = playerPositions[i];

            let chargeGrowthRate = this.getGrowthRate() * 2;
            if (chargeGrowthRate > this.energy * 2) chargeGrowthRate = this.energy / 2;
            positionGrowTowardsOtherPosition(chargeGrowthRate, playerPosition, this);
            this.energy -= chargeGrowthRate * 2;
        }
    }

    private spread() {
        // Spread randomly.
        let randomGrowthRate = this.getGrowthRate() * 10;
        if (randomGrowthRate > this.energy) randomGrowthRate = this.energy;
        growRandom(randomGrowthRate, this);
        this.energy -= randomGrowthRate;
    }

    //private cower() {
    //    growRandom(this.getGrowthRate(0.5), this);

    //    const playerPositions: Vector[] = PlayerHandler.getPlayerpositions()
    //        .filter((v) => !v.isDead)
    //        .map((v) => this.getMapspatial().worldToAbsolutePosition(v.pos as Vector));

    //    for (let i = 0; i < playerPositions.length; i++) {
    //        const playerPosition = playerPositions[i];

    //        positionGrowAwayFromOtherPosition(this.getGrowthRate(2), playerPosition, this);
    //    }
    //}

    private rest() {
        // Spread randomly, but slower, recovering bonus energy
        this.energy += 2 * Runtime.omegga.players.length * Math.min((this.rage + 1) / 2, 1);

        let randomGrowthRate = this.getGrowthRate() * 1;
        if (randomGrowthRate > this.energy) randomGrowthRate = this.energy;
        growRandom(randomGrowthRate, this);
        this.energy -= randomGrowthRate;
    }
}
