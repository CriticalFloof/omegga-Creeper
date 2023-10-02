import { Brick, Vector } from "omegga";
import { vec3Add, vec3Div, vec3Floor, vec3Mul, vec3Sub, vec3TrueMod } from "../vector_operation";

export type Chunk = { [relative_position: string]: number };

export enum OccupancyType {
    Wall,
    Creeper,
    Air,
}

export type AbsoluteSpatial = { [absolutePosition: string]: OccupancyType };

export default class Spatial {
    public brick_size: Vector;
    public brick_offset: Vector;

    public chunks: { [chunk_position: string]: Chunk } = {};

    public chunkSize: Vector = [16, 16, 16];

    constructor(brick_size: Vector, brick_offset: Vector) {
        this.brick_size = brick_size;
        this.brick_offset = brick_offset;
    }

    public static getVectorFromKey(position_key: string): Vector {
        if (typeof position_key !== "string") throw new Error(`getVectorFromKey Input isn't a string! Input Type: ${typeof position_key}`);
        const keyStrArr = position_key.split(",");
        return keyStrArr.map((v) => {
            return parseInt(v);
        }) as Vector;
    }

    public static fromSpatial(brick_size: Vector, brick_offset: Vector, chunks: { [chunk_position: string]: Chunk }): Spatial {
        let spatial = new Spatial(brick_size, brick_offset);
        spatial.chunks = chunks;
        return spatial;
    }

    public static fromAbsoluteSpatial(brick_size: Vector, brick_offset: Vector, absolute_spatial: AbsoluteSpatial): Spatial {
        let spatial = new Spatial(brick_size, brick_offset);

        const absoluteSpatialKeys = Object.keys(absolute_spatial);

        for (let i = 0; i < absoluteSpatialKeys.length; i++) {
            const absolutePosition = absoluteSpatialKeys[i];
            const absoluteVector = Spatial.getVectorFromKey(absolutePosition);

            const ChunkPos = spatial.absoluteToChunkPosition(absoluteVector);
            const RelativePos = spatial.absoluteToRelPosition(absoluteVector);

            if (!(`${ChunkPos}` in spatial.chunks)) spatial.chunks[`${ChunkPos}`] = {};
            spatial.chunks[`${ChunkPos}`][`${RelativePos}`] = absolute_spatial[absolutePosition];
        }

        return spatial;
    }

    public getAllPositions(): AbsoluteSpatial {
        let results: AbsoluteSpatial = {};

        const chunkKeys = Object.keys(this.chunks);
        for (let i = 0; i < chunkKeys.length; i++) {
            const chunkPosition = chunkKeys[i];
            const chunk = this.chunks[chunkKeys[i]];
            const positionKeys = Object.keys(chunk);

            const chunkVector = Spatial.getVectorFromKey(chunkPosition);

            for (let j = 0; j < positionKeys.length; j++) {
                const relPosition = positionKeys[j];
                const lookupType = chunk[positionKeys[j]];
                const positionVector = Spatial.getVectorFromKey(relPosition);

                const absolutePositionVector = this.RelativeAndChunkToAbsolutePosition(positionVector, chunkVector);

                results[`${absolutePositionVector}`] = lookupType;
            }
        }

        return results;
    }

    public getAllPositionsOfType(type: OccupancyType): AbsoluteSpatial {
        let results: AbsoluteSpatial = {};

        const chunkKeys = Object.keys(this.chunks);
        for (let i = 0; i < chunkKeys.length; i++) {
            const chunkPosition = chunkKeys[i];
            const chunk = this.chunks[chunkKeys[i]];
            const positionKeys = Object.keys(chunk);

            const chunkVector = Spatial.getVectorFromKey(chunkPosition);

            for (let j = 0; j < positionKeys.length; j++) {
                const relPosition = positionKeys[j];
                const lookupType = chunk[positionKeys[j]];
                if (lookupType !== type) continue;
                const positionVector = Spatial.getVectorFromKey(relPosition);
                const absolutePositionVector = this.RelativeAndChunkToAbsolutePosition(positionVector, chunkVector);

                results[`${absolutePositionVector}`] = type;
            }
        }

        return results;
    }

    public setTypeAtBrickVolume(brick: Brick, type: OccupancyType): void {
        //brick.size assumes the brick is always facing towards Z positive with no rotation.
        const brickSize = JSON.parse(JSON.stringify(brick.size));

        if (brick.direction === 0 || brick.direction === 1) {
            //Z <-> X
            [brickSize[0], brickSize[2]] = [brickSize[2], brickSize[0]];
            if (brick.rotation === 1 || brick.rotation === 3) {
                [brickSize[1], brickSize[2]] = [brickSize[2], brickSize[1]];
            }
        } else if (brick.direction === 2 || brick.direction === 3) {
            //Z <-> Y
            [brickSize[1], brickSize[2]] = [brickSize[2], brickSize[1]];
            if (brick.rotation === 0 || brick.rotation === 2) {
                [brickSize[0], brickSize[2]] = [brickSize[2], brickSize[0]];
            }
        } else if (brick.direction === 4 || brick.direction === 5) {
            //Z
            if (brick.rotation === 1 || brick.rotation === 3) {
                [brickSize[0], brickSize[1]] = [brickSize[1], brickSize[0]];
            }
        }

        const brickCornerMax = vec3Add(brick.position, vec3Sub(brickSize, 0.1));
        const brickCornerMin = vec3Sub(brick.position, brickSize);

        const positionMax = vec3Floor(vec3Div(brickCornerMax, vec3Mul(this.brick_size, 2)));
        const positionMin = vec3Floor(vec3Div(brickCornerMin, vec3Mul(this.brick_size, 2)));

        const positionIterations = vec3Sub(positionMax, positionMin);

        for (let x = 0; x <= positionIterations[0]; x++) {
            for (let y = 0; y <= positionIterations[1]; y++) {
                for (let z = 0; z <= positionIterations[2]; z++) {
                    this.setTypeAtAbsolutePosition(vec3Add(positionMin, [x, y, z]), type);
                }
            }
        }
    }

    public getTypeAtWorldPosition(world_position: Vector): OccupancyType {
        const absolute_position = this.worldToAbsolutePosition(world_position);
        const chunk_position = this.absoluteToChunkPosition(absolute_position);
        const rel_position = this.absoluteToRelPosition(absolute_position);

        if (!(`${chunk_position}` in this.chunks) || !(`${rel_position}` in this.chunks[`${chunk_position}`])) {
            return OccupancyType.Air;
        }

        return this.chunks[`${chunk_position}`][`${rel_position}`];
    }

    public setTypeAtWorldPosition(world_position: Vector, type: OccupancyType): void {
        const absolute_position = this.worldToAbsolutePosition(world_position);
        const chunk_position = this.absoluteToChunkPosition(absolute_position);
        const rel_position = this.absoluteToRelPosition(absolute_position);

        if (!(`${chunk_position}` in this.chunks)) {
            this.chunks[`${chunk_position}`] = {};
        }
        this.chunks[`${chunk_position}`][`${rel_position}`] = type;
    }

    public getTypeAtAbsolutePosition(absolute_position: Vector): OccupancyType {
        const chunk_position = this.absoluteToChunkPosition(absolute_position);
        const rel_position = this.absoluteToRelPosition(absolute_position);

        if (!(`${chunk_position}` in this.chunks) || !(`${rel_position}` in this.chunks[`${chunk_position}`])) {
            return OccupancyType.Air;
        }

        return this.chunks[`${chunk_position}`][`${rel_position}`];
    }

    public setTypeAtAbsolutePosition(absolute_position: Vector, type: OccupancyType): void {
        const chunk_position = this.absoluteToChunkPosition(absolute_position);
        const rel_position = this.absoluteToRelPosition(absolute_position);

        if (!(`${chunk_position}` in this.chunks)) {
            this.chunks[`${chunk_position}`] = {};
        }
        this.chunks[`${chunk_position}`][`${rel_position}`] = type;
    }

    public absoluteToWorldPosition(absolute_position: Vector): Vector {
        return vec3Add(vec3Mul(absolute_position, vec3Mul(this.brick_size, 2)), this.brick_offset);
    }

    public worldToAbsolutePosition(world_position: Vector): Vector {
        return vec3Floor(vec3Div(vec3Sub(world_position, this.brick_offset), vec3Mul(this.brick_size, 2)));
    }

    public absoluteToChunkPosition(absolute_position: Vector): Vector {
        return vec3Floor(vec3Div(absolute_position, this.chunkSize));
    }

    public absoluteToRelPosition(absolute_position: Vector): Vector {
        return vec3TrueMod(absolute_position, this.chunkSize);
    }

    public RelativeAndChunkToAbsolutePosition(relative_position: Vector, chunk_position: Vector): Vector {
        return vec3Add(relative_position, vec3Mul(chunk_position, this.chunkSize));
    }
}
