import { Scene } from "@babylonjs/core/scene";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

//import "@babylonjs/core/Physics/physicsEngineComponent";

// If you don't need the standard material you will still need to import it since the scene requires it.
//import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { havokModule } from "../externals/havok.ts";
import { CreateSceneClass } from "../createScene.ts";

import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {
    Mesh,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsShapeType,
    PhysicsPrestepType,
    WebXRControllerPhysics, Ray, StandardMaterial, PointerDragBehavior, Scalar, TransformNode
} from "@babylonjs/core";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import HavokPhysics from "@babylonjs/havok";
// @ts-ignore
import { XRSceneWithHavok2 } from "./a_supprimer/xrSceneWithHavok2.ts";

import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { Tools } from "@babylonjs/core/Misc/tools";

export class XRSceneWithHavok4 implements CreateSceneClass {
    preTasks = [havokModule];

    // @ts-ignore
    createScene = async (engine: AbstractEngine, canvas: HTMLCanvasElement, audioContext: AudioContext): Promise<Scene> => {
        const scene: Scene = new Scene(engine);

        const light: HemisphericLight = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;

        const havokInstance = await HavokPhysics();
        const hk = new HavokPlugin(true, havokInstance);

        scene.enablePhysics(new Vector3(0, -9.8, 0), hk);
        // @ts-ignore
        const physicsEngine = scene.getPhysicsEngine();

        const platform = MeshBuilder.CreateGround("ground", { width: 2, height: 5 }, scene);

        const handlebar = MeshBuilder.CreateBox("handlebar", { height: 0.8, width: 0.1, depth: 0.1 }, scene);
        const neutralLocalPos = new Vector3(0, 1, 0.9);
        handlebar.parent = platform;
        handlebar.position = neutralLocalPos.clone();
        handlebar.isPickable = true;

        const dragBehavior = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 1, 0) });
        dragBehavior.moveAttached = false; // Désactive le déplacement automatique
        handlebar.addBehavior(dragBehavior);
        const path = [];
        for (let i = 0; i < 50; i++) {
            path.push(new Vector3(0, 0, i * 10)); // Ligne droite en Z
        }
        // Forme du tunnel (cercle)
        const radius = 5;
        const shape = [];
        for (let i = 0; i < 360; i += 10) {
            const rad = Tools.ToRadians(i);
            shape.push(new Vector3(Math.cos(rad) * radius, Math.sin(rad) * radius, 0));
        }

        // Créer le tunnel en extrudant la forme sur le chemin
        const tunnel = MeshBuilder.ExtrudeShape("tunnel", { shape, path, closeShape: true, closePath: false }, scene);

        // Matériau du tunnel
        const tunnelMat = new StandardMaterial("tunnelMat", scene);
        tunnelMat.diffuseTexture = new Texture("src/asset/texture/tunnel_texture.jpg", scene); // Texture
        tunnel.material = tunnelMat;

        // Rendu
        engine.runRenderLoop(() => scene.render());
        window.addEventListener("resize", () => engine.resize());


        const obstacles: Mesh[] = [];

        let positionz = -10;
        while (positionz < 1000) {
            const x = Math.random() * 10;
            const y = Math.random() * 10;
            positionz = 1 + Math.random() * 3 + positionz;
            // @ts-ignore
            const position = new Vector3(x - 5, y - 5, positionz);

            //loadAsteroid(scene, position, obstacles);
        }

        const target = MeshBuilder.CreateBox("target", { size: 1 }, scene);
        target.position = new Vector3(0, 1, 5);
        var targetAggregate = new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 0 }, scene);
        targetAggregate.body.setCollisionCallbackEnabled(true);

        const xr = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: 'immersive-vr'
            },
            optionalFeatures: true
        });

        var camera = xr.baseExperience.camera;
        camera.parent = platform;

        // Timer when shooting
        let timer = 0;
        // Interval
        let interval = 500;

        xr.input.onControllerAddedObservable.add((controller) => {
            if (controller.inputSource.handedness === 'right') {
                controller.onMotionControllerInitObservable.add((motionController) => {
                    const triggerComponent = motionController.getComponent("xr-standard-trigger");
                    if (triggerComponent) {
                        triggerComponent.onButtonStateChangedObservable.add((component) => {
                            if (component.pressed) {
                                if (Date.now() - timer < interval) {
                                    return;
                                } else {
                                    timer = Date.now();
                                    shootProjectile(controller, scene);
                                }
                            }
                        });
                    }
                });
            }
        });

        let forwardSpeed = 1.5;   // déplacement en z
        let lateralSpeed = 0;   // sensibilité sur x
        let verticalSpeed = 0;  // sensibilité sur y
        let isDragging = false;
        let deltax = 0;
        let deltaz = 0;

        scene.onBeforeRenderObservable.add(() => {
            const deltaTime = engine.getDeltaTime() / 1000; // en secondes

            const forwardMovement = forwardSpeed * deltaTime;
            const lateralMovement = lateralSpeed * deltaTime;
            const verticalMovement = verticalSpeed * deltaTime;
            forwardSpeed += 0.002;

            if (isDragging) {
                if (deltax > 0) {
                    lateralSpeed += deltax * 0.1;
                } else if (deltax < 0) {
                    lateralSpeed += deltax * 0.1;
                }
                if (deltaz > 0) {
                    verticalSpeed += deltaz * 0.01;
                } else if (deltaz < 0) {
                    verticalSpeed += deltaz * 0.3;
                }

                if (verticalSpeed > 0.5)
                    verticalSpeed = 0.5;
                if (verticalSpeed < -0.5)
                    verticalSpeed = -0.5;
                if (lateralSpeed > 0.5)
                    lateralSpeed = 0.5;
                if (lateralSpeed < -0.5)
                    lateralSpeed = -0.5;
            } else {
                if (lateralSpeed > 0) {
                    lateralSpeed -= 0.01;
                } else if (lateralSpeed < 0) {
                    lateralSpeed += 0.01;
                }
                if (verticalSpeed > 0) {
                    verticalSpeed -= 0.01;
                } else if (verticalSpeed < 0) {
                    verticalSpeed += 0.01;
                }
            }

            obstacles.forEach(obstacle => {
                obstacle.position.z -= forwardMovement;
            });

            platform.position.y += verticalMovement;
            platform.position.x += lateralMovement;

            // Temp
            if (platform.position.y < -1.8)
                platform.position.y = -1.8;

            if (platform.position.x > 4)
                platform.position.x = 4;
            if (platform.position.x < -4)
                platform.position.x = -4;
            if (platform.position.y > 3)
                platform.position.y = 3;

            // Nettoyage des obstacles dépassés
            for (let i = obstacles.length - 1; i >= 0; i--) {
                if (obstacles[i].position.z < platform.position.z - 10) {
                    obstacles[i].dispose();
                    obstacles.splice(i, 1);
                } else if (platform.intersectsMesh(obstacles[i], false)) {
                    console.log("Collision détectée !");
                    obstacles[i].dispose();
                    obstacles.splice(i, 1);
                }
            }
        });

        engine.runRenderLoop(() => {
            scene.render();
        });

        window.addEventListener("resize", () => {
            engine.resize();
        });

        hk.onCollisionObservable.add((ev) => {
            console.log(ev.type);
        });

        hk.onCollisionEndedObservable.add((ev) => {
            console.log(ev.type);
        });

        let currentTiltX = 0;
        let currentTiltZ = 0;
        let initialPosition = handlebar.position.clone();

        dragBehavior.onDragStartObservable.add((_event) => {
            isDragging = true;
            initialPosition = handlebar.position.clone();
        });

        dragBehavior.onDragObservable.add((event) => {
            const sensitivity = 0.05;
            currentTiltX += event.delta.z * sensitivity;
            currentTiltZ += event.delta.x * sensitivity;

            const maxTilt = Math.PI / 3;
            currentTiltX = Math.max(-maxTilt, Math.min(maxTilt, currentTiltX));
            currentTiltZ = Math.max(-maxTilt, Math.min(maxTilt, currentTiltZ));

            handlebar.rotation.x = currentTiltX;
            handlebar.rotation.z = currentTiltZ;

            handlebar.position.copyFrom(initialPosition);

            deltax = event.delta.x;
            deltaz = event.delta.z;
        });

        dragBehavior.onDragEndObservable.add((_event) => {
            isDragging = false;
        });

        scene.onBeforeRenderObservable.add(() => {
            if (!isDragging) {
                const dt = engine.getDeltaTime() / 1000;
                const returnSpeed = 1;

                currentTiltX = Scalar.Lerp(currentTiltX, 0, dt * returnSpeed);
                currentTiltZ = Scalar.Lerp(currentTiltZ, 0, dt * returnSpeed);

                handlebar.rotation.x = currentTiltX;
                handlebar.rotation.z = currentTiltZ;
            }
        });

        return scene;
    };
}

export default new XRSceneWithHavok4();

// @ts-ignore
async function loadAsteroid(scene: Scene, position: Vector3, obstacles: Mesh[]) {
    try {
        const meshes = await SceneLoader.ImportMeshAsync(
            "", 
            "public/AZURE Nature/", 
            "asteroid_1.glb", 
            scene
        );
        const asteroidNode = scene.getNodeByName("asteroid_1");
        if (asteroidNode) {
            console.log("Asteroid trouvé", asteroidNode);

            // Tu peux maintenant travailler avec le nœud, par exemple, le positionner
            (asteroidNode as Mesh).position = position;

            // Si tu veux ajouter un comportement physique au modèle
            new PhysicsAggregate(asteroidNode as TransformNode, PhysicsShapeType.MESH, { mass: 0, restitution: 0 }, scene);
            obstacles.push(asteroidNode as Mesh);
        } else {
            console.error("Nœud 'asteroid_1' non trouvé dans la scène !");
        }
        meshes.meshes.forEach(mesh => {
            mesh.position = position; 
            new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 0, restitution: 0 }, scene);
            obstacles.push(mesh as Mesh);
        });
    } catch (error) {
        // Gestion des erreurs
        console.error("Erreur lors du chargement du modèle:", error);
    }
}

function shootProjectile(controller: WebXRInputSource, scene: Scene) {
    const projectile = MeshBuilder.CreateSphere("projectile", { diameter: 0.2 }, scene);

    const aggregateProjectile = new PhysicsAggregate(projectile, PhysicsShapeType.SPHERE, { mass: 10 }, scene);
    aggregateProjectile.body.setMotionType(PhysicsMotionType.DYNAMIC);
    let startPos: Vector3;
    if (controller.grip) {
        startPos = controller.grip.getAbsolutePosition().clone();
    } else if (controller.pointer) {
        startPos = controller.pointer.getAbsolutePosition().clone();
    } else {
        startPos = scene.activeCamera!.position.clone();
    }
    projectile.position = startPos;

    const tmpRay = new Ray(
        new Vector3(),
        new Vector3(),
        Infinity
    );

    controller.getWorldPointerRayToRef(tmpRay, true);

    tmpRay.direction.normalize();
    const impulseMagnitude = 100;
    aggregateProjectile.body.applyImpulse(
        tmpRay.direction.scale(impulseMagnitude),
        projectile.absolutePosition
    );
}

// @ts-ignore
function switchScene(engine: AbstractEngine, scene: Scene, canvas: HTMLCanvasElement, audioContext: AudioContext) {
    scene.dispose();

    const newSceneInstance = new XRSceneWithHavok4();
    newSceneInstance.createScene(engine, canvas, audioContext).then(newScene => {
        engine.runRenderLoop(() => {
            newScene.render();
        });
    });
}

// @ts-ignore
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
// @ts-ignore
function addXRControllersRoutine(scene: Scene, xr: any, eventMask: number) {
    xr.input.onControllerAddedObservable.add((controller: any) => {
        console.log("Ajout d'un controller");
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
                const controllerPhysics = xr.baseExperience.featuresManager.enableFeature(WebXRControllerPhysics.Name, 'latest');
                controller.physics = controllerPhysics;
            });
        });
    });
}