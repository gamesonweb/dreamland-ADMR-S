import { Scene } from "@babylonjs/core/scene";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { WebXRAbstractMotionController } from "@babylonjs/core/XR/motionController/webXRAbstractMotionController";
// @ts-ignore
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
// @ts-ignore
import { Object3DPickable } from "./object/Object3DPickable";
// @ts-ignore
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Player } from "./Player";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";

export class XRHandler{

    xr: WebXRDefaultExperience;
    leftController: WebXRAbstractMotionController | null;
    rightController: WebXRAbstractMotionController | null;
    scene: Scene;
    player : Player;
    headset: WebXRInputSource | null;

    constructor(scene: Scene, xr : WebXRDefaultExperience, player : Player){
        this.scene = scene;
        this.xr = xr;
        this.player = player;
        this.leftController = null;
        this.rightController = null;
        this.headset = null; //TODO : Get headset
        this.getLeftAndRightControllers();
        this.setupObjectSelection();
    }

    getLeftAndRightControllers(){
        this.xr.input.onControllerAddedObservable.add((controller) => {
            controller.onMotionControllerInitObservable.add((motionController) => {
                const handedness = motionController.handedness;
                if (handedness === 'left') {
                    this.leftController = motionController;
                    console.log("left controller added");
                    console.log(this.leftController);

                } else if (handedness === 'right') {
                    this.rightController = motionController;
                    console.log("right controller added");
                    console.log(this.rightController);
                }
            });
        });
    }

    setupObjectSelection() {
        this.xr.input.onControllerAddedObservable.add((controller) => {
            controller.onMotionControllerInitObservable.add((motionController) => {
                const handedness = motionController.handedness;
                if (handedness === 'left') {
                    const xButtonComponent = motionController.getComponent("x-button");
                    if (xButtonComponent) {
                        xButtonComponent.onButtonStateChangedObservable.add((button) => {
                            if (button.pressed) {
                                console.log("X Button pressed");
                                const pickResult = this.xr.pointerSelection.getMeshUnderPointer(controller.uniqueId);
                                if (pickResult) {
                                    this.player.selectObject(pickResult, this.xr, this.scene);
                                }
                            }
                        });
                    }
                }
            });
        });
    }


}
export default XRHandler;
