import { Brick, Vector } from "omegga";
import BrickLoader from "src/lib/bricks/brick_loader";
import { vec3Add } from "src/lib/vector_operation";
import Spatial, { OccupancyType, AbsoluteSpatial } from "src/lib/world/spatial";
import { Runtime } from "src/runtime/main";
import GamemodeRuntime from "../minigame/gamemode_runtime";

export default class CreeperSwarm {
    protected currentTick: number = 0;
    protected isEnabled: boolean = false;
    private creeperTickIntervalId: NodeJS.Timer = null;

    protected mapSpatial: Spatial;
    protected startingPositions: AbsoluteSpatial;
    protected currentPositions: AbsoluteSpatial;

    public currentSurfacePositions: AbsoluteSpatial;

    //For Rendering Optimization
    private changedPositions: AbsoluteSpatial;

    public eatCreeperChangedSpatial(): Spatial {
        const spatial = Spatial.fromAbsoluteSpatial(this.mapSpatial.brick_size, this.mapSpatial.brick_offset, this.changedPositions);
        this.changedPositions = {};
        return spatial;
    }

    public getMapspatial(): Spatial {
        return this.mapSpatial;
    }

    public getCreeperBrick(): Omit<Brick, "position"> {
        const brick: Omit<Brick, "position"> = {
            owner_index: 2,
            size: this.mapSpatial.brick_size,
            material_index: 0,
            material_intensity: 1,
            color: [160, 50, 220, 0],
            collision: false,
        };

        return brick;
    }

    public start(map_spatial: Spatial) {
        this.stop();
        this.isEnabled = true;

        const totalPositionData = map_spatial.getAllPositions();
        this.mapSpatial = Spatial.fromAbsoluteSpatial(map_spatial.brick_size, map_spatial.brick_offset, totalPositionData);

        this.startingPositions = map_spatial.getAllPositionsOfType(OccupancyType.Creeper);

        this.currentPositions = JSON.parse(JSON.stringify(this.startingPositions));
        this.currentSurfacePositions = JSON.parse(JSON.stringify(this.startingPositions));
        this.changedPositions = JSON.parse(JSON.stringify(this.startingPositions));

        this.creeperTickIntervalId = setInterval(() => {
            this.tick();
        }, 200);
    }

    public stop() {
        this.isEnabled = false;
        clearInterval(this.creeperTickIntervalId);
        this.creeperTickIntervalId = null;
    }

    public pause() {
        if (!this.isEnabled) return;
        clearInterval(this.creeperTickIntervalId);
        this.creeperTickIntervalId = null;
    }

    public unpause() {
        this.pause();
        if (!this.isEnabled) return;
        this.creeperTickIntervalId = setInterval(() => {
            this.tick();
        }, 200);
    }

    public reset() {
        if (!this.isEnabled) return;
        const wallPositionData = this.mapSpatial.getAllPositionsOfType(OccupancyType.Wall);
        this.mapSpatial = Spatial.fromAbsoluteSpatial(this.mapSpatial.brick_size, this.mapSpatial.brick_offset, {
            ...wallPositionData,
            ...this.startingPositions,
        });

        this.currentPositions = JSON.parse(JSON.stringify(this.startingPositions));
        this.currentSurfacePositions = JSON.parse(JSON.stringify(this.startingPositions));
        this.changedPositions = JSON.parse(JSON.stringify(this.startingPositions));

        Runtime.omegga.clearBricks({ id: BrickLoader.writeSaveObjectStandard.brick_owners[1].id }, true);
    }

    public tick() {
        // do nothing.
    }

    public hit() {
        // do nothing.
    }

    public setPositionToCreeper(absolute_position: Vector) {
        this.currentPositions[`${absolute_position}`] = OccupancyType.Creeper;
        this.changedPositions[`${absolute_position}`] = OccupancyType.Creeper;
        this.mapSpatial.setTypeAtAbsolutePosition(absolute_position, OccupancyType.Creeper);
    }

    public setPositionToAir(absolute_position: Vector) {
        delete this.currentPositions[`${absolute_position}`];
        this.changedPositions[`${absolute_position}`] = OccupancyType.Air;
        this.mapSpatial.setTypeAtAbsolutePosition(absolute_position, OccupancyType.Air);
        delete this.currentSurfacePositions[`${absolute_position}`];

        let neighbours = [
            vec3Add(absolute_position, [1, 0, 0]),
            vec3Add(absolute_position, [-1, 0, 0]),
            vec3Add(absolute_position, [0, 1, 0]),
            vec3Add(absolute_position, [0, -1, 0]),
            vec3Add(absolute_position, [0, 0, 1]),
            vec3Add(absolute_position, [0, 0, -1]),
        ];

        for (let i = 0; i < neighbours.length; i++) {
            const neighbourPosition = neighbours[i];
            const occupancy = this.mapSpatial.getTypeAtAbsolutePosition(neighbourPosition);
            if (occupancy == OccupancyType.Creeper) {
                this.currentSurfacePositions[`${neighbourPosition}`] = OccupancyType.Creeper;
            }
        }
    }

    protected respondToArtifialEndConditions() {
        // Creeper can no longer grow, players win if there's no creeper left, otherwise self-destruct all remaining players.
        const currentPositionKeys = Object.keys(this.currentSurfacePositions);
        if (currentPositionKeys.length !== 0) return false;
        const currentTotalPositionKeys = Object.keys(this.currentPositions);
        if (currentTotalPositionKeys.length !== 0) {
            GamemodeRuntime.forceLoss();
            return true;
        }
        GamemodeRuntime.forceWin("All creeper has been eradicated, congratulations!");
        // GamemodeRuntime.forceLoss();
        return true;
    }
}
