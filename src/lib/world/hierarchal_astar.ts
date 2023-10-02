import { Brick, Vector, WriteSaveObject } from "omegga";
import { vec3Add, vec3Div, vec3IsEquals, vec3Mul, vec3Sub } from "../vector_operation";
import Spatial, { OccupancyType } from "./spatial";
import { Runtime } from "src/runtime/main";
import BrickLoader from "../bricks/brick_loader";
import CreeperSwarm from "../game_loop/creeper/creeper_swarm_base";

type CellNode = {
    fScore: number;
    gScore: number;
    hScore: number;
    position: Vector;
    parent: CellNode;
};

type TraversalGraph = {
    [chunkPosition: string]: {
        [nodePosition: string]: {
            [linkedPosition: string]: number;
        };
    };
};

export default class HierarchalAstar {
    public static async generateGraph(spatial: Spatial): Promise<TraversalGraph> {
        const spatialChunkKeys = Object.keys(spatial.chunks);

        // First generate an object containing all bounds for chunk borders
        let sharedChunkBoundries: { chunksRelation: string[]; startPosition: Vector[]; boundsSize: Vector[] } = {
            startPosition: [],
            boundsSize: [],
            chunksRelation: [],
        };
        for (let i = 0; i < spatialChunkKeys.length; i++) {
            const chunkPosition = Spatial.getVectorFromKey(spatialChunkKeys[i]);

            const neighbours = [
                vec3Add(chunkPosition, [1, 0, 0]),
                vec3Add(chunkPosition, [-1, 0, 0]),
                vec3Add(chunkPosition, [0, 1, 0]),
                vec3Add(chunkPosition, [0, -1, 0]),
                vec3Add(chunkPosition, [0, 0, 1]),
                vec3Add(chunkPosition, [0, 0, -1]),
            ];

            for (let j = 0; j < neighbours.length; j++) {
                const neighbour = neighbours[j];
                if (
                    `${neighbour}` in spatial.chunks &&
                    !(
                        sharedChunkBoundries.chunksRelation.includes(`${chunkPosition}|${neighbour}`) ||
                        sharedChunkBoundries.chunksRelation.includes(`${neighbour}|${chunkPosition}`)
                    )
                ) {
                    //a hit!

                    const offset = vec3Sub(neighbour, chunkPosition);

                    const adjustedOffset: Vector = [
                        offset[0] === 0 ? 0 : offset[0] > 0 ? spatial.chunkSize[0] - 1 : -1,
                        offset[1] === 0 ? 0 : offset[1] > 0 ? spatial.chunkSize[1] - 1 : -1,
                        offset[2] === 0 ? 0 : offset[2] > 0 ? spatial.chunkSize[2] - 1 : -1,
                    ];

                    const chunkAbsolutePosition = vec3Mul(chunkPosition, spatial.chunkSize);

                    const startPosition = vec3Add(chunkAbsolutePosition, adjustedOffset);

                    const boundsSize: Vector = [
                        offset[0] === 0 ? spatial.chunkSize[0] : 2,
                        offset[1] === 0 ? spatial.chunkSize[1] : 2,
                        offset[2] === 0 ? spatial.chunkSize[2] : 2,
                    ];

                    sharedChunkBoundries.chunksRelation.push(`${chunkPosition}|${neighbour}`);
                    sharedChunkBoundries.startPosition.push(startPosition);
                    sharedChunkBoundries.boundsSize.push(boundsSize);
                }
            }
        }

        // Using the bounds information, scan the selection and keep track of the inter-chunk pairs, these are the chunks entry/exit points.
        // Additionally, join together neighbouring pairs to reduce the amount of nodes in a chunk. Get all the related joined nodes center and that will become the node's new position.

        let nodePositions: Vector[] = [];
        for (let i = 0; i < sharedChunkBoundries.chunksRelation.length; i++) {
            const startPosition = sharedChunkBoundries.startPosition[i];
            const boundSize = sharedChunkBoundries.boundsSize[i];

            const boundryAxis = boundSize.indexOf(Math.min(...boundSize));

            const otherAxises = [];
            for (let j = 0; j < boundSize.length; j++) {
                if (j === boundryAxis) continue;
                otherAxises.push(j);
            }

            // Creating the ports.
            let ports: { start: [number, number]; size: [number, number] }[] = [];

            let tempPositions: Vector[] = [];
            let takenPositions: { [positions: string]: true } = {};
            for (let b = 0; b < boundSize[otherAxises[1]]; b++) {
                for (let a = 0; a < boundSize[otherAxises[0]]; a++) {
                    let offset: Vector = [0, 0, 0];
                    offset[otherAxises[0]] = a;
                    offset[otherAxises[1]] = b;

                    offset[boundryAxis] = 0;
                    const positionA = vec3Add(startPosition, offset);
                    offset[boundryAxis] = 1;
                    const positionB = vec3Add(startPosition, offset);

                    tempPositions.push(positionA);
                    tempPositions.push(positionB);

                    const occupancyA = spatial.getTypeAtAbsolutePosition(positionA);
                    const occupancyB = spatial.getTypeAtAbsolutePosition(positionB);

                    if (!(occupancyA === OccupancyType.Air && occupancyA === occupancyB) || `${[a, b]}` in takenPositions) {
                        continue;
                    }

                    // The space is open!

                    // Scan the row until blocked or the end is hit
                    let size: [number, number] = [0, 0];
                    for (let x = a; x < boundSize[otherAxises[0]]; x++) {
                        let offset: Vector = [0, 0, 0];
                        offset[otherAxises[0]] = x;
                        offset[otherAxises[1]] = b;

                        offset[boundryAxis] = 0;
                        const positionA = vec3Add(startPosition, offset);
                        offset[boundryAxis] = 1;
                        const positionB = vec3Add(startPosition, offset);

                        const occupancyA = spatial.getTypeAtAbsolutePosition(positionA);
                        const occupancyB = spatial.getTypeAtAbsolutePosition(positionB);

                        if (!(occupancyA === OccupancyType.Air && occupancyA === occupancyB) || `${[x, b]}` in takenPositions) break;

                        size[0] += 1;
                    }

                    // Scan the column in rows until blocked or the end is hit
                    base: for (let y = b; y < boundSize[otherAxises[1]]; y++) {
                        for (let x = a; x < size[0]; x++) {
                            let offset: Vector = [0, 0, 0];
                            offset[otherAxises[0]] = x;
                            offset[otherAxises[1]] = y;

                            offset[boundryAxis] = 0;
                            const positionA = vec3Add(startPosition, offset);
                            offset[boundryAxis] = 1;
                            const positionB = vec3Add(startPosition, offset);

                            const occupancyA = spatial.getTypeAtAbsolutePosition(positionA);
                            const occupancyB = spatial.getTypeAtAbsolutePosition(positionB);

                            if (!(occupancyA === OccupancyType.Air && occupancyA === occupancyB) || `${[x, y]}` in takenPositions) break base;
                        }
                        size[1] += 1;
                    }

                    // Marking scanned area as taken.
                    for (let y = 0; y < size[1]; y++) {
                        for (let x = 0; x < size[0]; x++) {
                            takenPositions[`${[a + x, b + y]}`] = true;
                        }
                    }

                    ports.push({ start: [a, b], size: size });
                }
            }

            for (let j = 0; j < ports.length; j++) {
                const port = ports[j];
                let portPositionA: Vector = [0, 0, 0];
                portPositionA[otherAxises[0]] = port.start[0] + Math.trunc((port.size[0] - 1) / 2);
                portPositionA[otherAxises[1]] = port.start[1] + Math.trunc((port.size[1] - 1) / 2);
                portPositionA[boundryAxis] = 0;
                portPositionA = vec3Add(portPositionA, startPosition);
                let portPositionB: Vector = [0, 0, 0];
                portPositionB[otherAxises[0]] = port.start[0] + Math.trunc((port.size[0] - 1) / 2);
                portPositionB[otherAxises[1]] = port.start[1] + Math.trunc((port.size[1] - 1) / 2);
                portPositionB[boundryAxis] = 1;
                portPositionB = vec3Add(portPositionB, startPosition);

                nodePositions.push(portPositionA);
                nodePositions.push(portPositionB);
            }
        }
        // Take the array of node positions and assign them to their respective chunk

        let chunkedNodePositions: { [position: string]: Vector[] } = {};
        for (let i = 0; i < nodePositions.length; i++) {
            const nodePosition = nodePositions[i];
            const chunkPosition = spatial.absoluteToChunkPosition(nodePosition);
            if (!(`${chunkPosition}` in chunkedNodePositions)) chunkedNodePositions[`${chunkPosition}`] = [];
            chunkedNodePositions[`${chunkPosition}`].push(nodePosition);
        }

        // Once all the nodes have been indexed, compute the path between each node in a chunk using A* and save it's distance.
        // TODO: Getting all the creeper spawns, scan which nodes can be accessed by the creeper and remove any that can't be reached.

        async function recursiveConnectiveSearch(
            root_node_position: Vector,
            spatial: Spatial,
            traversal_graph: TraversalGraph
        ): Promise<TraversalGraph> {
            if (traversal_graph === undefined) traversal_graph = {};

            if (root_node_position === null) return traversal_graph;

            const rootNodeChunkPosition = spatial.absoluteToChunkPosition(root_node_position);

            await new Promise((res) => {
                console.info(`Compiling HPA Node Chunk: ${rootNodeChunkPosition}`);
                setImmediate(res);
            });

            const allowRecursion = !(
                `${rootNodeChunkPosition}` in traversal_graph && `${root_node_position}` in traversal_graph[`${rootNodeChunkPosition}`]
            );

            const nodesInChunk = chunkedNodePositions[`${rootNodeChunkPosition}`];

            for (let i = 0; i < nodesInChunk.length; i++) {
                await new Promise((res) => {
                    setImmediate(res);
                });

                const goalPosition = nodesInChunk[i];

                if (vec3IsEquals(root_node_position, goalPosition)) continue;

                let path = HierarchalAstar.aStarGridSearch(root_node_position, goalPosition, spatial);

                if (path === null) continue;

                if (!(`${rootNodeChunkPosition}` in traversal_graph)) traversal_graph[`${rootNodeChunkPosition}`] = {};
                if (!(`${root_node_position}` in traversal_graph[`${rootNodeChunkPosition}`]))
                    traversal_graph[`${rootNodeChunkPosition}`][`${root_node_position}`] = {};
                traversal_graph[`${rootNodeChunkPosition}`][`${root_node_position}`][`${goalPosition}`] = path.gScore;

                if (!(`${goalPosition}` in traversal_graph[`${rootNodeChunkPosition}`]))
                    traversal_graph[`${rootNodeChunkPosition}`][`${goalPosition}`] = {};
                traversal_graph[`${rootNodeChunkPosition}`][`${goalPosition}`][`${root_node_position}`] = path.gScore;

                let crossChunkNeighbours = [
                    vec3Add(goalPosition, [1, 0, 0]),
                    vec3Add(goalPosition, [-1, 0, 0]),
                    vec3Add(goalPosition, [0, 1, 0]),
                    vec3Add(goalPosition, [0, -1, 0]),
                    vec3Add(goalPosition, [0, 0, 1]),
                    vec3Add(goalPosition, [0, 0, -1]),
                ];

                for (let j = 0; j < crossChunkNeighbours.length; j++) {
                    const neighbourPosition = crossChunkNeighbours[j];
                    const neighbourChunkPosition = spatial.absoluteToChunkPosition(neighbourPosition);

                    if (
                        vec3IsEquals(neighbourChunkPosition, rootNodeChunkPosition) ||
                        chunkedNodePositions[`${neighbourChunkPosition}`] === undefined ||
                        !chunkedNodePositions[`${neighbourChunkPosition}`].every((position) => neighbourPosition !== position)
                    )
                        continue;

                    if (!(`${neighbourChunkPosition}` in traversal_graph)) traversal_graph[`${neighbourChunkPosition}`] = {};
                    if (!(`${neighbourPosition}` in traversal_graph[`${neighbourChunkPosition}`]))
                        traversal_graph[`${neighbourChunkPosition}`][`${neighbourPosition}`] = {};
                    traversal_graph[`${neighbourChunkPosition}`][`${neighbourPosition}`][`${goalPosition}`] = 1;
                    traversal_graph[`${rootNodeChunkPosition}`][`${goalPosition}`][`${neighbourPosition}`] = 1;

                    if (!allowRecursion) continue;
                    await recursiveConnectiveSearch(neighbourPosition, spatial, traversal_graph);
                }
            }
        }

        let traversalGraph: TraversalGraph = {};
        const creeperPositions = spatial.getAllPositionsOfType(OccupancyType.Creeper);
        const creeperPositionKeys = Object.keys(creeperPositions);
        for (let i = 0; i < creeperPositionKeys.length; i++) {
            const creeperPosition = Spatial.getVectorFromKey(creeperPositionKeys[i]);
            const creeperChunkPosition = spatial.absoluteToChunkPosition(creeperPosition);

            const nodesInChunk = chunkedNodePositions[`${creeperChunkPosition}`];

            let rootNodePosition: Vector = null;
            for (let j = 0; j < nodesInChunk.length; j++) {
                const nodePosition = nodesInChunk[j];
                const path = this.aStarGridSearch(creeperPosition, nodePosition, spatial);
                if (path !== null) {
                    rootNodePosition = path.position;
                    break;
                }
            }

            if (rootNodePosition === null) continue;

            await recursiveConnectiveSearch(rootNodePosition, spatial, traversalGraph);
        }

        let debugPos: Vector[] = [];
        for (let chunkPos in traversalGraph) {
            const chunk = traversalGraph[chunkPos];
            for (let nodePos in chunk) {
                debugPos.push(Spatial.getVectorFromKey(nodePos));
            }
        }

        BrickLoader.debugLoadAbsolutePositions(spatial, debugPos, [255, 0, 0, 0]);

        return traversalGraph;

        // A completed HPA graph is now made, and can be used to quicky traverse larger distances.
    }

    public static aStarGridSearch(start: Vector, goal: Vector, spatial: Spatial): CellNode {
        function heuristicCostEstimate(start: Vector, goal: Vector): number {
            const distance = Math.abs(start[0] - goal[0]) + Math.abs(start[1] - goal[1]) + Math.abs(start[2] - goal[2]);
            return distance;
        }

        function gCost(cell: CellNode): number {
            let current = cell;
            let distance = 0;
            while (current.parent !== null) {
                current = current.parent;
                distance += 1;
            }
            return distance;
        }

        let openCells: { [position: string]: CellNode } = {};
        let closedCells: { [position: string]: CellNode } = {};

        openCells[`${start}`] = {
            fScore: heuristicCostEstimate(start, goal) * 1.01,
            gScore: 0,
            hScore: heuristicCostEstimate(start, goal) * 1.01,
            position: start,
            parent: null,
        };

        let result: CellNode = null;
        while (Object.keys(openCells).length !== 0) {
            let current: CellNode = null;
            for (let position in openCells) {
                const fScore = openCells[position].fScore;
                if (current === null || current.fScore > fScore) {
                    current = openCells[position];
                }
            }
            delete openCells[`${current.position}`];
            closedCells[`${current.position}`] = current;

            if (vec3IsEquals(current.position, goal)) {
                result = current;
                break;
            }

            let neighbours = [
                vec3Add(current.position, [1, 0, 0]),
                vec3Add(current.position, [-1, 0, 0]),
                vec3Add(current.position, [0, 1, 0]),
                vec3Add(current.position, [0, -1, 0]),
                vec3Add(current.position, [0, 0, 1]),
                vec3Add(current.position, [0, 0, -1]),
            ];

            for (let i = 0; i < neighbours.length; i++) {
                const neighbour = neighbours[i];
                if (
                    !(`${spatial.absoluteToChunkPosition(neighbour)}` in spatial.chunks) ||
                    spatial.getTypeAtAbsolutePosition(neighbour) === OccupancyType.Wall ||
                    `${neighbour}` in closedCells
                )
                    continue;

                let neighbourCell = {
                    parent: current,
                    position: neighbour,
                    hScore: heuristicCostEstimate(neighbour, goal) * 1.01,
                    gScore: null,
                    fScore: null,
                };
                neighbourCell.gScore = gCost(neighbourCell);
                neighbourCell.fScore = neighbourCell.hScore + neighbourCell.gScore;

                if (!(`${neighbour}` in openCells) || openCells[`${neighbour}`].gScore > neighbourCell.gScore) {
                    openCells[`${neighbour}`] = neighbourCell;
                }
            }
        }
        return result;
    }

    public static flattenCellNode(cell_node: CellNode): Vector[] {
        let vectorArray: Vector[] = [];
        let currentCellNode: CellNode = cell_node;
        do {
            vectorArray.push(currentCellNode.position);
            currentCellNode = currentCellNode.parent;
        } while (currentCellNode !== null);

        return vectorArray.reverse();
    }
}
