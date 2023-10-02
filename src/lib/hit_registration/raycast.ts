import { Vector } from "omegga";
import Spatial from "../world/spatial";
import { vec3Div, vec3Floor, vec3Mod } from "../vector_operation";

export default class Raycast {
    public static spatialDDARaycast(start_point_parameter: Vector, rotation_deg: Vector, max_distance: number, spatial: Spatial) {
        const maxBlockSize = Math.max(...spatial.brick_size);

        const brickSize: Vector = [spatial.brick_size[0] * 2, spatial.brick_size[1] * 2, spatial.brick_size[2] * 2];

        let start_point: Vector = vec3Div(vec3Mod(start_point_parameter, brickSize), brickSize);

        let mapCheck: Vector = vec3Floor(start_point);
        //DDA implementation
        const rotation_rad = [rotation_deg[0] * (Math.PI / 180), rotation_deg[1] * (Math.PI / 180), rotation_deg[2] * (Math.PI / 180)];

        const rayDirection = [
            (Math.cos(rotation_rad[1]) * Math.cos(rotation_rad[0])) / brickSize[0] / maxBlockSize,
            (Math.sin(rotation_rad[1]) * Math.cos(rotation_rad[0])) / brickSize[1] / maxBlockSize,
            Math.sin(rotation_rad[0]) / brickSize[2] / maxBlockSize,
        ];

        let RayLength1D: Vector = [0, 0, 0];
        const rayUnitStepSize = [
            Math.abs(Math.sqrt(1 + (rayDirection[1] / rayDirection[0]) ** 2 + (rayDirection[2] / rayDirection[0]) ** 2)),
            Math.abs(Math.sqrt((rayDirection[0] / rayDirection[1]) ** 2 + 1 + (rayDirection[2] / rayDirection[1]) ** 2)),
            Math.abs(Math.sqrt((rayDirection[0] / rayDirection[2]) ** 2 + (rayDirection[1] / rayDirection[2]) ** 2 + 1)),
        ];

        if (Number.isNaN(rayUnitStepSize[0])) rayUnitStepSize[0] = Infinity;
        if (Number.isNaN(rayUnitStepSize[1])) rayUnitStepSize[1] = Infinity;
        if (Number.isNaN(rayUnitStepSize[2])) rayUnitStepSize[2] = Infinity;

        let step: Vector = [0, 0, 0];

        if (rayDirection[0] < 0) {
            step[0] = -1;
            RayLength1D[0] = (start_point[0] - mapCheck[0]) * rayUnitStepSize[0];
        } else {
            step[0] = 1;
            RayLength1D[0] = (mapCheck[0] + 1 - start_point[0]) * rayUnitStepSize[0];
        }

        if (rayDirection[1] < 0) {
            step[1] = -1;
            RayLength1D[1] = (start_point[1] - mapCheck[1]) * rayUnitStepSize[1];
        } else {
            step[1] = 1;
            RayLength1D[1] = (mapCheck[1] + 1 - start_point[1]) * rayUnitStepSize[1];
        }

        if (rayDirection[2] < 0) {
            step[2] = -1;
            RayLength1D[2] = (start_point[2] - mapCheck[2]) * rayUnitStepSize[2];
        } else {
            step[2] = 1;
            RayLength1D[2] = (mapCheck[2] + 1 - start_point[2]) * rayUnitStepSize[2];
        }

        let distance = 0;
        let positionArray: Vector[] = [];

        while (distance < max_distance) {
            positionArray.push([
                mapCheck[0] * brickSize[0] + brickSize[0] / 2 + Math.trunc(start_point_parameter[0] / brickSize[0]) * brickSize[0],
                mapCheck[1] * brickSize[1] + brickSize[1] / 2 + Math.trunc(start_point_parameter[1] / brickSize[1]) * brickSize[1],
                mapCheck[2] * brickSize[2] + brickSize[2] / 2 + Math.trunc(start_point_parameter[2] / brickSize[2]) * brickSize[2],
            ]);

            let minLength = Math.min(RayLength1D[0], RayLength1D[1], RayLength1D[2]);
            if (minLength === RayLength1D[0]) {
                mapCheck[0] += step[0];
                distance = RayLength1D[0];
                RayLength1D[0] += rayUnitStepSize[0];
            } else if (minLength === RayLength1D[1]) {
                mapCheck[1] += step[1];
                distance = RayLength1D[1];
                RayLength1D[1] += rayUnitStepSize[1];
            } else {
                mapCheck[2] += step[2];
                distance = RayLength1D[2];
                RayLength1D[2] += rayUnitStepSize[2];
            }
        }
        return positionArray;
    }
}
