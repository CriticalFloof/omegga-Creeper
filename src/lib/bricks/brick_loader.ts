import { Brick, User, Vector, WriteSaveObject } from "omegga";
import Spatial from "../world/spatial";
import OmeggaImprovements from "../local_omegga";
import { Runtime } from "src/runtime/main";
import { vec3Add, vec3Mul, vec3Sub } from "../vector_operation";

export default class BrickLoader {
    public static writeSaveObjectStandard: Partial<WriteSaveObject> = {
        brick_assets: ["PB_DefaultMicroBrick", "PB_DefaultBrick", "PB_DefaultTile"],
        materials: ["BMC_Plastic", "BMC_Metallic", "BMC_Glow", "BMC_Glass", "BMC_Hologram"],
        physical_materials: [], //Physical Materials do not exist in brickadia at the time of making this.
        brick_owners: [
            {
                id: "44444444-0000-fffd-dddd-444444444444",
                name: "Map",
            },
            {
                id: "44444444-0001-fffd-dddd-444444444444",
                name: "Creeper",
            },
            {
                //While developing, I found out that owner index of 0 is silently assigned to PUBLIC and everything else is shifted, so to call the last valid index, a placeholder is present.
                id: "44444444-ffff-fffd-dddd-444444444444",
                name: "PLACEHOLDER",
            },
        ],
    };

    public static debugLoadAbsolutePositions(
        spatial: Spatial,
        positions: Vector[],
        color: [number, number, number, number],
        options?: {
            offX?: number;
            offY?: number;
            offZ?: number;
            quiet?: boolean;
            correctPalette?: boolean;
            correctCustom?: boolean;
        }
    ) {
        let bricks: Brick[] = [];
        for (let i = 0; i < positions.length; i++) {
            const position = positions[i];

            bricks.push({
                owner_index: 2,
                size: spatial.brick_size,
                material_index: 0,
                material_intensity: 1,
                color: color,
                collision: false,
                position: spatial.absoluteToWorldPosition(position),
            });
        }

        if (bricks.length === 0) return;

        let save: WriteSaveObject = {
            ...BrickLoader.writeSaveObjectStandard,
            bricks: bricks,
        };

        Runtime.omegga.loadSaveData(save, options);
    }

    public static debugLoadWorldPositions(
        spatial: Spatial,
        positions: Vector[],
        color: [number, number, number, number],
        options?: {
            offX?: number;
            offY?: number;
            offZ?: number;
            quiet?: boolean;
            correctPalette?: boolean;
            correctCustom?: boolean;
        }
    ) {
        let bricks: Brick[] = [];
        for (let i = 0; i < positions.length; i++) {
            const position = positions[i];

            bricks.push({
                owner_index: 2,
                size: spatial.brick_size,
                material_index: 0,
                material_intensity: 1,
                color: color,
                collision: false,
                position: position,
            });
        }

        if (bricks.length === 0) return;

        let save: WriteSaveObject = {
            ...BrickLoader.writeSaveObjectStandard,
            bricks: bricks,
        };

        Runtime.omegga.loadSaveData(save, options);
    }

    public static loadSpatial(spatial: Spatial, brick: Omit<Brick, "position">): void {
        const absoluteSpatial = spatial.getAllPositions();

        const absoluteSpatialKeys = Object.keys(absoluteSpatial);

        let bricks: Brick[] = [];
        for (let i = 0; i < absoluteSpatialKeys.length; i++) {
            const position = Spatial.getVectorFromKey(absoluteSpatialKeys[i]);
            bricks.push({
                ...brick,
                position: spatial.absoluteToWorldPosition(position),
            });
        }

        if (bricks.length === 0) return;

        let save: WriteSaveObject = {
            ...this.writeSaveObjectStandard,
            bricks: bricks,
        };

        OmeggaImprovements.loadSaveData(save, { quiet: true });
    }

    public static clearSpatial(spatial: Spatial): void {
        const absoluteSpatial = spatial.getAllPositions();

        const absoluteSpatialKeys = Object.keys(absoluteSpatial);

        for (let i = 0; i < absoluteSpatialKeys.length; i++) {
            const position = Spatial.getVectorFromKey(absoluteSpatialKeys[i]);

            Runtime.omegga.clearRegion({ center: spatial.absoluteToWorldPosition(position), extent: spatial.brick_size });
        }
    }
}
