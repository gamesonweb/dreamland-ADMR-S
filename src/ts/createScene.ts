
import type { Scene } from "@babylonjs/core/scene";

// Change this import to check other scenes
// @ts-ignore
import { XRSceneWithHavok } from "./scenes/xrSceneWithHavok";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Player } from "./Player";
// @ts-ignore
import { SceneNiveau3 } from "./scenes/sceneNiveau3.ts";
// @ts-ignore
import {XRSceneWithHavok5} from "./scenes/SceneTestAlai2.ts";
// @ts-ignore
import {XRSceneWithHavok4} from "./scenes/SceneTestAlai1.ts";
// @ts-ignore
import {Scene1Superliminal} from "./scenes/Scene1Superliminal.ts";

export interface CreateSceneClass {
    createScene: (engine: AbstractEngine, canvas: HTMLCanvasElement, audiocontext : AudioContext, player : Player) => Promise<Scene>;
    preTasks?: Promise<unknown>[];


}

export interface CreateSceneModule {
    default: CreateSceneClass;
}

export const getSceneModule = (): CreateSceneClass => {
    return new Scene1Superliminal();

}

