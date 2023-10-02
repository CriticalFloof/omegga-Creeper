import { Vector } from "omegga";

export function vec3IsEquals(vec1: Vector, vec2: Vector | number): boolean {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];
    return vec1[0] === vec2[0] && vec1[1] === vec2[1] && vec1[2] === vec2[2];
}

export function vec3IsLessThan(vec1: Vector, vec2: Vector | number): boolean {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];
    return vec1[0] < vec2[0] && vec1[1] < vec2[1] && vec1[2] < vec2[2];
}

export function vec3IsGreaterThan(vec1: Vector, vec2: Vector | number): boolean {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];
    return vec1[0] > vec2[0] && vec1[1] > vec2[1] && vec1[2] > vec2[2];
}

export function vec3IsLessThanEquals(vec1: Vector, vec2: Vector | number): boolean {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];
    return vec1[0] <= vec2[0] && vec1[1] <= vec2[1] && vec1[2] <= vec2[2];
}

export function vec3IsGreaterThanEquals(vec1: Vector, vec2: Vector | number): boolean {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];
    return vec1[0] >= vec2[0] && vec1[1] >= vec2[1] && vec1[2] >= vec2[2];
}

export function vec3Add(vec1: Vector, vec2: Vector | number): Vector {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];
    return [vec1[0] + vec2[0], vec1[1] + vec2[1], vec1[2] + vec2[2]];
}

export function vec3Sub(vec1: Vector, vec2: Vector | number): Vector {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];
    return [vec1[0] - vec2[0], vec1[1] - vec2[1], vec1[2] - vec2[2]];
}

export function vec3Mul(vec1: Vector, vec2: Vector | number): Vector {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];
    return [vec1[0] * vec2[0], vec1[1] * vec2[1], vec1[2] * vec2[2]];
}

export function vec3Div(vec1: Vector, vec2: Vector | number): Vector {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];
    return [vec1[0] / vec2[0], vec1[1] / vec2[1], vec1[2] / vec2[2]];
}

export function vec3Mod(vec1: Vector, vec2: Vector | number): Vector {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];
    return [vec1[0] % vec2[0], vec1[1] % vec2[1], vec1[2] % vec2[2]];
}

export function vec3TrueMod(vec1: Vector, vec2: Vector | number): Vector {
    if (typeof vec2 == "number") vec2 = [vec2, vec2, vec2];

    function mod(a, b) {
        return ((a % b) + b) % b;
    }

    return [mod(vec1[0], vec2[0]), mod(vec1[1], vec2[1]), mod(vec1[2], vec2[2])];
}

export function vec3Ceil(vec1: Vector): Vector {
    return [Math.ceil(vec1[0]), Math.ceil(vec1[1]), Math.ceil(vec1[2])];
}

export function vec3Floor(vec1: Vector): Vector {
    return [Math.floor(vec1[0]), Math.floor(vec1[1]), Math.floor(vec1[2])];
}

export function vec3Abs(vec1: Vector): Vector {
    return [Math.abs(vec1[0]), Math.abs(vec1[1]), Math.abs(vec1[2])];
}
