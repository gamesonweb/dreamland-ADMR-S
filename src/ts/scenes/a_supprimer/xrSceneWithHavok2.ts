// IMPLEMENTATION D'ADAM INSPIREE DES EXEMPLES DE BABYLONJS

import { Scene } from "@babylonjs/core/scene";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
//import "@babylonjs/core/Physics/physicsEngineComponent";

// If you don't need the standard material you will still need to import it since the scene requires it.
//import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { havokModule } from "../../externals/havok.ts";
import { CreateSceneClass } from "../../createScene.ts";


import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, PhysicsPrestepType, WebXRControllerPhysics } from "@babylonjs/core";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import HavokPhysics from "@babylonjs/havok";


export class XRSceneWithHavok2 implements CreateSceneClass {
    preTasks = [havokModule];

    
    createScene = async (engine: AbstractEngine): Promise<Scene> => {
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
      
    // const drum = new XRDrum(audioContext, scene, eventMask, xr, hk);

    //addScaleRoutineToSphere(sphereObservable);

    addXRControllersRoutine(scene, xr, eventMask); //eventMask est-il indispensable ?

    // Add keyboard controls for movement
    const moveSpeed = 1;
    addKeyboardControls(xr, moveSpeed);

    // Add collision detection for the ground
    groundAggregate.body.getCollisionObservable().add((collisionEvent: any) => {
      if (collisionEvent.type === "COLLISION_STARTED") {
            var collidedBody = null;
            if(collisionEvent.collider != groundAggregate.body){
                console.log("OUI")
                collidedBody = collisionEvent.collider;
            }
            else{
                console.log("NON")
                collidedBody = collisionEvent.collidedAgainst;
            }
            const position = collidedBody.transformNode.position;
            console.log("Position du sol : " + ground.position.y);
            collidedBody.transformNode.position = new Vector3(position.x, ground.position.y + 5, position.z); // Adjust the y-coordinate to be just above the ground
            collidedBody.setLinearVelocity(Vector3.Zero());
            collidedBody.setAngularVelocity(Vector3.Zero());
        }
    });

    return scene;
    };
}

export default new XRSceneWithHavok2();


function addKeyboardControls(xr: any, moveSpeed: number) {
    window.addEventListener("keydown", (event: KeyboardEvent) => {
        switch (event.key) {
            case "z":
                console.log("w pressé !");
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
  xr.input.onControllerAddedObservable.add((controller: any) => {        console.log("Ajout d'un controller")
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
                console.log("CONTROLLER")
                console.log(controller)
                const controllerPhysics = xr.baseExperience.featuresManager.enableFeature(WebXRControllerPhysics.Name, 'latest')
                controller.physics = controllerPhysics
                    console.log("ICI")
                    console.log(controllerPhysics)
                    console.log(controllerPhysics.getImpostorForController(controller))
                
            });
        });
    });
}

