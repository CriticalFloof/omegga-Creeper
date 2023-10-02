import { vec3Abs, vec3Add, vec3IsEquals, vec3IsGreaterThan, vec3IsLessThan, vec3Mul, vec3Sub } from "src/lib/vector_operation";
import Spatial, { AbsoluteSpatial, OccupancyType } from "src/lib/world/spatial";
import CreeperSwarm from "./creeper_swarm_base";
import { Vector } from "omegga";

export function growRandom(amount: number, creeper_swarm: CreeperSwarm): void {
    const currentPositionKeys = Object.keys(creeper_swarm.currentSurfacePositions);
    let checkedIndices = [];
    // Every tick up to n creeper cells should attempt to occupy a random neighbour.
    for (let i = 0; i < amount; i++) {
        const index = Math.floor(Math.random() * currentPositionKeys.length);

        if (currentPositionKeys[index] == undefined) continue;

        const position = Spatial.getVectorFromKey(currentPositionKeys[index]);

        if (checkedIndices.includes(index)) continue;
        checkedIndices.push(index);

        let neighbours = [
            vec3Add(position, [1, 0, 0]),
            vec3Add(position, [-1, 0, 0]),
            vec3Add(position, [0, 1, 0]),
            vec3Add(position, [0, -1, 0]),
            vec3Add(position, [0, 0, 1]),
            vec3Add(position, [0, 0, -1]),
        ];

        let chosenGrowthPosition = null;

        for (let j = 0; j < 6; j++) {
            const neighbourIndex = Math.floor(Math.random() * neighbours.length);

            const occupancy = creeper_swarm.getMapspatial().getTypeAtAbsolutePosition(neighbours[neighbourIndex]);
            if (occupancy !== OccupancyType.Air) {
                neighbours = neighbours.filter((v, i) => {
                    return i != neighbourIndex;
                });
            } else {
                // Prevents creeper from spreading onto air without wall support.
                let neighbourNeighbours = [
                    vec3Add(neighbours[neighbourIndex], [1, 0, 0]),
                    vec3Add(neighbours[neighbourIndex], [-1, 0, 0]),
                    vec3Add(neighbours[neighbourIndex], [0, 1, 0]),
                    vec3Add(neighbours[neighbourIndex], [0, -1, 0]),
                    vec3Add(neighbours[neighbourIndex], [0, 0, 1]),
                    vec3Add(neighbours[neighbourIndex], [0, 0, -1]),
                    vec3Add(neighbours[neighbourIndex], [1, 1, 0]),
                    vec3Add(neighbours[neighbourIndex], [-1, -1, 0]),
                    vec3Add(neighbours[neighbourIndex], [0, 1, -1]),
                    vec3Add(neighbours[neighbourIndex], [0, -1, 1]),
                    vec3Add(neighbours[neighbourIndex], [0, 1, 1]),
                    vec3Add(neighbours[neighbourIndex], [0, -1, -1]),
                    vec3Add(neighbours[neighbourIndex], [1, -1, 0]),
                    vec3Add(neighbours[neighbourIndex], [-1, 1, 0]),
                    vec3Add(neighbours[neighbourIndex], [1, 0, 1]),
                    vec3Add(neighbours[neighbourIndex], [-1, 0, -1]),
                    vec3Add(neighbours[neighbourIndex], [1, 0, -1]),
                    vec3Add(neighbours[neighbourIndex], [-1, 0, 1]),
                ];

                let hasWall = false;
                for (let k = 0; k < neighbourNeighbours.length; k++) {
                    const neighbourNeighbour = neighbourNeighbours[k];
                    const occupancy = creeper_swarm.getMapspatial().getTypeAtAbsolutePosition(neighbourNeighbour);
                    if (occupancy === OccupancyType.Wall) {
                        hasWall = true;
                        break;
                    }
                }
                if (hasWall === false) {
                    neighbours = neighbours.filter((v, i) => {
                        return i != neighbourIndex;
                    });
                } else {
                    chosenGrowthPosition = neighbours[neighbourIndex];
                }
            }
        }

        if (chosenGrowthPosition == null) {
            delete creeper_swarm.currentSurfacePositions[`${position}`];
            continue;
        }
        creeper_swarm.currentSurfacePositions[`${chosenGrowthPosition}`] = OccupancyType.Creeper;

        creeper_swarm.setPositionToCreeper(chosenGrowthPosition);
    }
}

export function positionGrowTowardsOtherPosition(amount: number, start_position: Vector, creeper_swarm: CreeperSwarm): void {
    const currentPositionKeys = Object.keys(creeper_swarm.currentSurfacePositions);

    const positionBoundsMin = vec3Sub(start_position, 60);
    const positionBoundsMax = vec3Add(start_position, 60);

    let selectedPositionsByDistance: {
        [distance: number]: Vector[];
    } = {};

    for (let i = 0; i < currentPositionKeys.length; i++) {
        if (currentPositionKeys[i] == undefined) continue;

        const position = Spatial.getVectorFromKey(currentPositionKeys[i]);

        if (!(vec3IsGreaterThan(position, positionBoundsMin) && vec3IsLessThan(position, positionBoundsMax))) continue;
        const positionDifference = vec3Sub(position, start_position);
        const positionAbsDifference = vec3Abs(positionDifference);
        const manhattanDistance = positionAbsDifference[0] + positionAbsDifference[1] + positionAbsDifference[2];
        if (!(manhattanDistance in selectedPositionsByDistance)) selectedPositionsByDistance[manhattanDistance] = [];
        selectedPositionsByDistance[manhattanDistance].push(position);
    }

    const selectedPositionKeys = Object.keys(selectedPositionsByDistance).map((v) => parseInt(v));

    if (selectedPositionKeys.length === 0) return;

    const smallestDistanceCreeperPositions = selectedPositionsByDistance[Math.min(...selectedPositionKeys)];
    const creeperPosition = smallestDistanceCreeperPositions[Math.trunc(Math.random() * smallestDistanceCreeperPositions.length)];

    const creeperDifference = vec3Sub(start_position, creeperPosition);
    const creeperAbsDifference: Vector = vec3Abs(creeperDifference);
    const largestDifferenceIndex = creeperAbsDifference.indexOf(Math.max(...creeperAbsDifference));

    let neighbourDirections: Vector[] = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
    ];
    const encouragedDirection: Vector = [0, 0, 0];
    creeperDifference[largestDifferenceIndex] > 0
        ? (encouragedDirection[largestDifferenceIndex] = 1)
        : (encouragedDirection[largestDifferenceIndex] = -1);
    const discouragedDirection: Vector = vec3Mul(encouragedDirection, -1);

    neighbourDirections = neighbourDirections.filter((v) => {
        return !vec3IsEquals(v, encouragedDirection) && !vec3IsEquals(v, discouragedDirection);
    });

    for (let i = 0; i < amount; i++) {
        const selectedPositionKeys1 = Object.keys(selectedPositionsByDistance).map((v) => parseInt(v));
        const positionIndex = Math.min(...selectedPositionKeys1);

        let smallestDistanceCreeperPositions = selectedPositionsByDistance[positionIndex];
        if (smallestDistanceCreeperPositions === undefined) break;

        const position = smallestDistanceCreeperPositions[smallestDistanceCreeperPositions.length - 1];

        smallestDistanceCreeperPositions.pop();
        if (smallestDistanceCreeperPositions.length === 0) {
            delete selectedPositionsByDistance[positionIndex];
        }

        let neighbours = [
            vec3Add(position, encouragedDirection),
            vec3Add(position, neighbourDirections[0]),
            vec3Add(position, neighbourDirections[1]),
            vec3Add(position, neighbourDirections[2]),
            vec3Add(position, neighbourDirections[3]),
            vec3Add(position, discouragedDirection),
        ];

        let chosenGrowthPosition = null;

        for (let j = 0; j < 6; j++) {
            const occupancy = creeper_swarm.getMapspatial().getTypeAtAbsolutePosition(neighbours[j]);
            if (occupancy !== OccupancyType.Air) {
                continue;
            } else {
                // Prevents creeper from spreading onto air without wall support.
                let neighbourNeighbours = [
                    vec3Add(neighbours[j], [1, 0, 0]),
                    vec3Add(neighbours[j], [-1, 0, 0]),
                    vec3Add(neighbours[j], [0, 1, 0]),
                    vec3Add(neighbours[j], [0, -1, 0]),
                    vec3Add(neighbours[j], [0, 0, 1]),
                    vec3Add(neighbours[j], [0, 0, -1]),
                    vec3Add(neighbours[j], [1, 1, 0]),
                    vec3Add(neighbours[j], [-1, -1, 0]),
                    vec3Add(neighbours[j], [0, 1, -1]),
                    vec3Add(neighbours[j], [0, -1, 1]),
                    vec3Add(neighbours[j], [0, 1, 1]),
                    vec3Add(neighbours[j], [0, -1, -1]),
                    vec3Add(neighbours[j], [1, -1, 0]),
                    vec3Add(neighbours[j], [-1, 1, 0]),
                    vec3Add(neighbours[j], [1, 0, 1]),
                    vec3Add(neighbours[j], [-1, 0, -1]),
                    vec3Add(neighbours[j], [1, 0, -1]),
                    vec3Add(neighbours[j], [-1, 0, 1]),
                ];

                let hasWall = false;
                for (let k = 0; k < neighbourNeighbours.length; k++) {
                    const neighbourNeighbour = neighbourNeighbours[k];
                    const occupancy = creeper_swarm.getMapspatial().getTypeAtAbsolutePosition(neighbourNeighbour);
                    if (occupancy === OccupancyType.Wall) {
                        hasWall = true;
                        break;
                    }
                }
                if (hasWall === false) {
                    continue;
                } else {
                    chosenGrowthPosition = neighbours[j];
                }
            }
        }

        if (chosenGrowthPosition == null) {
            delete creeper_swarm.currentSurfacePositions[`${position}`];
            continue;
        }
        creeper_swarm.currentSurfacePositions[`${chosenGrowthPosition}`] = OccupancyType.Creeper;

        creeper_swarm.setPositionToCreeper(chosenGrowthPosition);
    }
}
