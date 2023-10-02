import * as fsp from "fs/promises";
import * as fs from "fs";
import * as zlib from "zlib";
import MapManager from "../map/map_manager";
import Spatial, { Chunk } from "./spatial";
import { Vector } from "omegga";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";

const pipe = promisify(pipeline);

export default class SpatialManager {
    private static getSpatialTxtPath(map_name: string): string {
        return path.join(MapManager.getPluginFolderPath(map_name), `/${map_name}_spatial.txt`);
    }

    private static getSpatialGzPath(map_name: string): string {
        return path.join(MapManager.getPluginFolderPath(map_name), `/${map_name}_spatial.txt.gz`);
    }

    public static async write(map_name: string, spatial: Spatial) {
        const file = JSON.stringify(spatial); //this.compress(spatial);

        await fsp.writeFile(this.getSpatialTxtPath(map_name), file, { encoding: "utf8" }).catch((err) => {
            console.error(err);
        });

        const gzip = zlib.createGzip();
        const source = fs.createReadStream(this.getSpatialTxtPath(map_name));
        const destination = fs.createWriteStream(this.getSpatialGzPath(map_name));

        await pipe(source, gzip, destination).catch((err) => {
            console.error(err);
        });

        await fsp.unlink(this.getSpatialTxtPath(map_name));
    }

    public static async read(map_name: string): Promise<Spatial> {
        const gunzip = zlib.createGunzip();
        const source = fs.createReadStream(this.getSpatialGzPath(map_name));
        const destination = fs.createWriteStream(this.getSpatialTxtPath(map_name));
        await pipe(source, gunzip, destination);

        const file = (await fsp.readFile(this.getSpatialTxtPath(map_name), { encoding: "utf8" }).catch((err) => {
            console.error(err);
        })) as string;

        let spatial: Spatial = JSON.parse(file); //this.uncompress(file);
        spatial = Spatial.fromSpatial(spatial.brick_size, spatial.brick_offset, spatial.chunks);

        await fsp.unlink(this.getSpatialTxtPath(map_name));

        return spatial;
    }

    // These compress the files greatly, but take some time to do so, not much of an issue when compiling...
    private static compress(spatial: Spatial): string {
        let file = `{${spatial.brick_size}|${spatial.brick_offset}}`;

        const spatialKeys = Object.keys(spatial.chunks);
        for (let i = 0; i < spatialKeys.length; i++) {
            const chunk = spatial.chunks[spatialKeys[i]];
            file += `@${spatialKeys[i]}:`;

            let storedValues: number[] = Array.apply(null, Array(128)).map(Number.prototype.valueOf, 0);

            let iteration = 0;
            for (let z = 0; z < spatial.chunkSize[0]; z++) {
                for (let y = 0; y < spatial.chunkSize[1]; y++) {
                    for (let x = 0; x < spatial.chunkSize[2]; x++) {
                        if (iteration >= 32) iteration = 0;
                        const pow = (y % 2) * 16 + x;
                        const index = Math.floor(z * 8 + y / 2);
                        if (!(`${[x, y, z]}` in chunk)) {
                            storedValues[index] += 2 * Math.pow(3, pow);
                            continue;
                        }
                        storedValues[index] += chunk[`${[x, y, z]}`] * Math.pow(3, pow);

                        iteration++;
                    }
                }
            }

            file += storedValues.join(",");
        }
        return file;
    }

    // This uncompresses the file, but takes some time to do, not so great since this is done during runtime.
    // Look into caching the data to reduce load times of repeat maps.
    private static uncompress(file: string): Spatial {
        const { size, offset } = file.match(/{(?<size>.+)\|(?<offset>.+)}/).groups;

        let chunks: { [chunk_position: string]: Chunk } = {};
        const content = file.match(/@.+?:.+?(?=@|$)/g);
        for (let i = 0; i < content.length; i++) {
            const snippet = content[i];
            const { chunk_position, data } = snippet.match(/@(?<chunk_position>.+?):(?<data>.+?)(?=@|$)/).groups;

            const numbersStr: string[] = data.split(",");
            const numbers: number[] = [];
            for (let j = 0; j < numbersStr.length; j++) {
                numbers.push(parseInt(numbersStr[j]));
            }

            let decodedPositions = {};
            for (let j = 0; j < numbers.length; j++) {
                const encoded32Positions = numbers[j];
                for (let k = 0; k < 32; k++) {
                    const modul = Math.pow(3, k + 1); // 3, 9, 27...
                    const value = Math.floor((encoded32Positions % modul) / Math.pow(3, k));

                    if (value === 2) {
                        continue;
                    }
                    const total = j * 32 + k; // 0..4095
                    const index = [total % 16, Math.floor((total % 256) / 16), Math.floor(total / 256)];
                    decodedPositions[`${index}`] = value;
                }
            }

            chunks[chunk_position] = decodedPositions;
        }

        let sizeArray = size.split(",");
        let offsetArray = offset.split(",");

        const spatial = Spatial.fromSpatial(
            [parseInt(sizeArray[0]), parseInt(sizeArray[1]), parseInt(sizeArray[2])] as Vector,
            [parseInt(offsetArray[0]), parseInt(offsetArray[1]), parseInt(offsetArray[2])] as Vector,
            chunks
        );

        return spatial;
    }
}
