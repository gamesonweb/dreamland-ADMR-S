// IMPLEMENTATION D'ADAM INSPIREE DES EXEMPLES DE BABYLONJS

import { Scene } from "@babylonjs/core/scene";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
//import "@babylonjs/core/Physics/physicsEngineComponent";

// If you don't need the standard material you will still need to import it since the scene requires it.
//import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { havokModule } from "../externals/havok.ts";
import HavokPhysics from "@babylonjs/havok";
import { CreateSceneClass } from "../createScene.ts";


import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
// @ts-ignore
import { Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, PhysicsPrestepType, WebXRControllerPhysics } from "@babylonjs/core";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import {XRSceneWithHavok2} from "./a_supprimer/xrSceneWithHavok2.ts";

import XRDrumKit from "../xrDrumKit.ts"

import XRHandler from "../XRHandler.ts"
import {Player} from "../Player.ts"

import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import "@babylonjs/core/Helpers/sceneHelpers";


export class Scene1Superliminal implements CreateSceneClass {
    preTasks = [havokModule];

    // @ts-ignore
    createScene = async (engine: AbstractEngine, canvas : HTMLCanvasElement, audioContext : AudioContext, player : Player): Promise<Scene> => {
        const scene: Scene = new Scene(engine);

        const light: HemisphericLight = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;

        // Our built-in 'ground' shape.
        const ground: Mesh = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);

        const xr = await scene.createDefaultXRExperienceAsync({
            floorMeshes: [ground],
        });
        console.log("BASE EXPERIENCE")
        console.log(xr.baseExperience)

        new XRHandler(scene, xr, player);

          //Good way of initializing Havok
        // initialize plugin
        const havokInstance = await HavokPhysics();
        // pass the engine to the plugin
        const hk = new HavokPlugin(true, havokInstance);


        // enable physics in the scene with a gravity
        scene.enablePhysics(new Vector3(0, -9.8, 0), hk);

        var groundAggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

        const started = hk._hknp.EventType.COLLISION_STARTED.value;
        const continued = hk._hknp.EventType.COLLISION_CONTINUED.value;
        const finished = hk._hknp.EventType.COLLISION_FINISHED.value;

    const eventMask = started | continued | finished;
      
    // @ts-ignore
    const drum = new XRDrumKit(audioContext, scene, eventMask, xr, hk);

    // Skybox
	var skybox = MeshBuilder.CreateBox("skyBox", {size:1000.0}, scene);
	var skyboxMaterial = new StandardMaterial("skyBox", scene);
	skyboxMaterial.backFaceCulling = false;
	skyboxMaterial.reflectionTexture = new CubeTexture("asset/texture/skybox3", scene);
	skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
	skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
	skyboxMaterial.specularColor = new Color3(0, 0, 0);
	skybox.material = skyboxMaterial;			
	    

        //addScaleRoutineToSphere(sphereObservable);

        var camera=  xr.baseExperience.camera;

        addXRControllersRoutine(scene, xr, eventMask); //eventMask est-il indispensable ?

        // Add keyboard controls for movement
        const moveSpeed = 1;
        addKeyboardControls(xr, moveSpeed);



        // Add collision detection for the ground
        groundAggregate.body.getCollisionObservable().add((collisionEvent: any) => {
          if (collisionEvent.type === "COLLISION_STARTED") {
                var collidedBody = null;
                if(collisionEvent.collider != groundAggregate.body){
                    collidedBody = collisionEvent.collider;
                }
                else{
                    collidedBody = collisionEvent.collidedAgainst;
                }
                const position = collidedBody.transformNode.position;
                collidedBody.transformNode.position = new Vector3(position.x, ground.position.y + 5, position.z); // Adjust the y-coordinate to be just above the ground
                collidedBody.setLinearVelocity(Vector3.Zero());
                collidedBody.setAngularVelocity(Vector3.Zero());
            }
        });

        //-------------------------------------------------------------------------------------------------------
        // Game loop

        let sceneAlreadySwitched = false;


        scene.onBeforeAnimationsObservable.add( ()=> {
            const isWithinX = camera.position.x > 9 && camera.position.x < 11;
            const isWithinZ = camera.position.z > 9 && camera.position.z < 11;

            /*
            console.log(camera.position.x)
            console.log(camera.position.z)
            console.log(isWithinX, isWithinZ)
            */

            if (!sceneAlreadySwitched && isWithinX && isWithinZ) {
                sceneAlreadySwitched = true;
                console.log("La caméra est proche de (10, 10). Changement de scène...");
                console.log("La caméra est proche de (10, 10). Changement de scène...");
                console.log("La caméra est proche de (10, 10). Changement de scène...");

                switchScene(engine, scene);

            }
        })

        return scene;
    };
}

export default new Scene1Superliminal();

function switchScene(engine: AbstractEngine, scene : Scene) {
    scene.dispose();

    const newSceneInstance = new XRSceneWithHavok2();
    newSceneInstance.createScene(engine).then(newScene => {
        engine.runRenderLoop(() => {
            newScene.render();
        });
    });
}


function addKeyboardControls(xr: any, moveSpeed: number) {

    window.addEventListener("keydown", (event: KeyboardEvent) => {

        switch (event.key) {
            case "z":
                xr.baseExperience.camera.position.z += moveSpeed;
                break;
            case "s":
                xr.baseExperience.camera.position.z -= moveSpeed;
                break;
            case "q":
                xr.baseExperience.camera.position.x -= moveSpeed;
                break;
            case "d":
                xr.baseExperience.camera.position.x += moveSpeed;
                break;
            case "f":
                xr.baseExperience.camera.position.y -= moveSpeed;
                break;
            case "r":
                xr.baseExperience.camera.position.y += moveSpeed;
                break;
        }
    });
}

// Add movement with left joystick
function addXRControllersRoutine(scene: Scene, xr: any, eventMask: number) {
    xr.input.onControllerAddedObservable.add((controller: any) => {        
        console.log("Ajout d'un controller")
        if (controller.inputSource.handedness === "left") {
            controller.onMotionControllerInitObservable.add((motionController: any) => {
                const xrInput = motionController.getComponent("xr-standard-thumbstick");
                if (xrInput) {
                    xrInput.onAxisValueChangedObservable.add((axisValues: any) => {
                        const speed = 0.05;
                        xr.baseExperience.camera.position.x += axisValues.x * speed;
                        xr.baseExperience.camera.position.z -= axisValues.y * speed;
                    });
                }
            });
        }
    });


    // Add physics to controllers when the mesh is loaded
    xr.input.onControllerAddedObservable.add((controller: any) => {
        controller.onMotionControllerInitObservable.add((motionController: any) => {
            // @ts-ignore
            motionController.onModelLoadedObservable.add((mc: any) => {

                console.log("Ajout d'un mesh au controller");

                const controllerMesh = MeshBuilder.CreateBox("controllerMesh", { size: 0.1 }, scene);
                controllerMesh.parent = controller.grip;
                controllerMesh.position = Vector3.ZeroReadOnly;
                controllerMesh.rotationQuaternion = Quaternion.Identity();

                const controllerAggregate = new PhysicsAggregate(controllerMesh, PhysicsShapeType.BOX, { mass: 1 }, scene);
                controllerAggregate.body.setMotionType(PhysicsMotionType.ANIMATED); // Set motion type to ANIMATED
                controllerAggregate.body.setPrestepType(PhysicsPrestepType.TELEPORT);
                controllerAggregate.body.setCollisionCallbackEnabled(true);
                controllerAggregate.body.setEventMask(eventMask);



                // Make the controller mesh invisible and non-pickable
                controllerMesh.isVisible = false;
                controllerMesh.isPickable = false;

                // Attach WebXRControllerPhysics to the controller
                //const controllerPhysics = xr.baseExperience.featuresManager.enableFeature(WebXRControllerPhysics.Name, 'latest')
                //controller.physics = controllerPhysics
            });
        });
    });
}

