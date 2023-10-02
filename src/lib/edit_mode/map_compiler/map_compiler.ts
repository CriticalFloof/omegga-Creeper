import { Brick, User, Vector, WriteSaveObject } from "omegga";
import BrickLoader from "src/lib/bricks/brick_loader";
import { vec3IsEquals, vec3Mod, vec3Mul, vec3TrueMod } from "src/lib/vector_operation";
import HierarchalAstar from "src/lib/world/hierarchal_astar";
import Spatial, { OccupancyType } from "src/lib/world/spatial";
import { Runtime } from "src/runtime/main";

export default class MapCompiler {
    public static run(read_save_data: WriteSaveObject): Promise<{ save: WriteSaveObject; spatial: Spatial }> {
        return new Promise<{ save: WriteSaveObject; spatial: Spatial }>((resolve, reject) => {
            const bricks = read_save_data.bricks;

            //Analyze Sweep
            let creeper_bricks: Brick[] = [];

            for (let i = 0; i < bricks.length; i++) {
                const brick = bricks[i];
                if ("components" in brick && "BCD_Interact" in brick.components && brick.components.BCD_Interact.Message != "") {
                    // This brick has something important to tell us!
                    if (brick.components.BCD_Interact.Message == "creeper_spawn") {
                        if (creeper_bricks.length > 0) {
                            if (!vec3IsEquals(brick.size, creeper_bricks[0].size)) {
                                reject("All creeper spawns must be the same size.");
                                return;
                            }
                            if (
                                !vec3IsEquals(
                                    vec3Mod(brick.position, vec3Mul(brick.size, 2)),
                                    vec3Mod(creeper_bricks[0].position, vec3Mul(creeper_bricks[0].size, 2))
                                )
                            ) {
                                reject("All creeper spawns must be aligned with eachother");
                                return;
                            }
                        }

                        creeper_bricks.push(brick);
                    }
                }
            }
            if (creeper_bricks.length === 0) {
                reject("A map needs at least one creeper spawn to compile!");
            }

            //Modify Sweep
            let spatial = new Spatial(creeper_bricks[0].size, vec3TrueMod(creeper_bricks[0].position, vec3Mul(creeper_bricks[0].size, 2)));
            let save: WriteSaveObject = JSON.parse(JSON.stringify(read_save_data));

            save.author = BrickLoader.writeSaveObjectStandard.brick_owners[0];
            save.brick_owners = BrickLoader.writeSaveObjectStandard.brick_owners;
            save.bricks = [];

            for (let i = 0; i < bricks.length; i++) {
                const brick = bricks[i];

                let new_brick: Brick = brick;
                new_brick.owner_index = 1;

                if ("components" in brick && "BCD_Interact" in brick.components && brick.components.BCD_Interact.Message == "creeper_spawn") {
                    spatial.setTypeAtBrickVolume(brick, OccupancyType.Creeper);
                    continue;
                } else {
                    spatial.setTypeAtBrickVolume(brick, OccupancyType.Wall);
                }

                save.bricks.push(new_brick);
            }

            resolve({ save, spatial });
        });
    }
}
