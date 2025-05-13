// IMPLEMENTATION D'ADAM INSPIREE DES EXEMPLES DE BABYLONJS

import { Scene } from "@babylonjs/core/scene";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import 'babylonjs-loaders';
//import "@babylonjs/core/Physics/physicsEngineComponent";

// If you don't need the standard material you will still need to import it since the scene requires it.
//import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { havokModule } from "../externals/havok";
import { CreateSceneClass } from "../createScene";


import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
// @ts-ignore
import {
    Mesh,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsShapeType,
    PhysicsPrestepType,
    // @ts-ignore
    WebXRControllerPhysics, Ray, StandardMaterial, Color3, PointerDragBehavior, Scalar, WebXRDefaultExperience
} from "@babylonjs/core";

import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import HavokPhysics from "@babylonjs/havok";

import {WebXRInputSource} from "@babylonjs/core/XR/webXRInputSource";
import { XRSceneWithHavok2 } from "./a_supprimer/xrSceneWithHavok2.ts";
import {SceneLoader} from "@babylonjs/core/Loading/sceneLoader";


export class SceneNiveau3 implements CreateSceneClass {
    preTasks = [havokModule];

    // @ts-ignore
    createScene = async (engine: AbstractEngine, canvas : HTMLCanvasElement, audioContext : AudioContext): Promise<Scene> => {
        const scene: Scene = new Scene(engine);

        const light: HemisphericLight = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;
        const havokInstance = await HavokPhysics();


        const hk = new HavokPlugin(true, havokInstance);

        scene.enablePhysics(new Vector3(0, -9.8, 0), hk);
        // @ts-ignore
        const physicsEngine = scene.getPhysicsEngine();

        const platform = MeshBuilder.CreateGround("ground", { width: 2, height: 5 }, scene);
        //const platformAggregate = new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 1, restitution: 0.1 }, scene);
       /* if (platformAggregate.body.setMotionType) {
            platformAggregate.body.setMotionType(PhysicsMotionType.A);
        }*/

        const handlebar = MeshBuilder.CreateBox("handlebar", { height: 0.8, width: 0.1, depth: 0.1 }, scene);
        const neutralLocalPos = new Vector3(0, 1, 0.9);
        handlebar.parent = platform;
        handlebar.position = neutralLocalPos.clone();
        handlebar.isPickable = true;

        const dragBehavior = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 1, 0) });
        dragBehavior.moveAttached = false; // Désactive le déplacement automatique
        handlebar.addBehavior(dragBehavior);



        // Création du tunnel
        const tunnel = MeshBuilder.CreateBox("tunnel", { width: 10, height: 10, depth: 1000 }, scene);
        const tunnelMat = new StandardMaterial("tunnelMat", scene);
        tunnelMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
        tunnelMat.backFaceCulling = false;
        tunnel.material = tunnelMat;
        tunnel.position.z = 500;

        // Chargement du GLB
        const glbResult = await SceneLoader.ImportMeshAsync("", "src/asset/", "super_mario_star.glb", scene);

        const meshEnfant = glbResult.meshes[0];
        const meshParent = glbResult.meshes[1];

        meshEnfant.parent = meshParent;
        const glbMeshTemplate = meshParent;

        // on le cache

        // Matériau unique pour les cubes
        const cubeMat = new StandardMaterial("cubeMat", scene);
        cubeMat.diffuseColor = new Color3(0, 1, 0);

        const obstacles: Mesh[] = [];
        let positionZ = -10;

        while (positionZ < 1000) {
            const isCube = Math.random() < 0.5;
            let obstacle: Mesh;

            if (isCube) {
                // Création d'un cube
                obstacle = MeshBuilder.CreateBox("obstacleCube", { size: 1 }, scene);
                obstacle.material = cubeMat;
            } else {
                // Clonage de l'étoile
                // @ts-ignore
                obstacle = glbMeshTemplate.clone("obstacleStar") as Mesh;
                // Important : on l’active
                obstacle.setEnabled(true);
                // Ajuster la taille si nécessaire
                obstacle.scaling.setAll(1);
            }

            // Placement
            positionZ += 1 + Math.random() * 3;
            const x = Math.random() * 10 - 5;
            const y = Math.random() * 10 - 5;
            obstacle.position.set(x, y, positionZ);

            // Collision simplifiée : BOX pour tout le monde
            new PhysicsAggregate(obstacle, PhysicsShapeType.BOX, { mass: 0, restitution: 0 }, scene);

            obstacles.push(obstacle);
        }

       /* const target = MeshBuilder.CreateBox("target", { size: 1 }, scene);
        target.position = new Vector3(0, 1, 5);
        var targetAggregate = new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 0 }, scene);
        targetAggregate.body.setCollisionCallbackEnabled(true);

*/

        const xr = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: 'immersive-vr'
            },
            optionalFeatures: true
        });

        var camera=  xr.baseExperience.camera;
        camera.parent = platform;

        const cameraHitbox = MeshBuilder.CreateSphere("cameraHitbox", { diameter: 1.1 }, scene);
        cameraHitbox.parent = camera;

        cameraHitbox.isVisible = false;

        //timer when shooting
        let timer = 0;
        //interval
        let interval = 300;
        let forwardSpeed = 1.5;   // déplacement en z
        let lateralSpeed = 0;   // sensibilité sur x
        let verticalSpeed = 0;  // sensibilité sur y
        let isDragging = false;
        let deltax = 0;
        let deltaz = 0;
        let currentTiltX = 0;
        let currentTiltZ = 0;
        let initialPosition = handlebar.position.clone();
        const projectiles: Mesh[] = [];
        let meteorSpawnTimer = 0; // en ms
        let part2StartTime: number | null = null;
        let part2Started = false;
        const meteores: Mesh[] = [];
        const swords: Mesh[] = [];
        let partie = 1;
        let part3StartTime: number | null = null;
        let part3Started = false;
        let timerpart2 = 180000;
        let timerpart3 = 180000;

        //partie 2
        xr.input.onControllerAddedObservable.add((controller) => {
            if (controller.inputSource.handedness === 'right') {
                controller.onMotionControllerInitObservable.add((motionController) => {
                    const triggerComponent = motionController.getComponent("xr-standard-trigger");
                    console.log(triggerComponent);
                    if (triggerComponent )  {
                        console.log("test");

                        triggerComponent.onButtonStateChangedObservable.add((component) => {
                            if (component.pressed && partie == 2) {
                                console.log("test");
                                if (Date.now() - timer < interval) {
                                    return;
                                }
                                else {
                                    timer = Date.now();
                                    shootProjectile(controller, scene, projectiles);

                                }
                            }
                        });
                    }
                });
            }
        });




        scene.onBeforeRenderObservable.add(() => {
            const dtMs = engine.getDeltaTime();      // dtMs en millisecondes
            const deltaTime = dtMs / 1000;        // deltaTime en secondes

            //partie 1
            if (partie == 1) {
                if (obstacles.length > 0) {
                    const forwardMovement = forwardSpeed * deltaTime;
                    const lateralMovement = lateralSpeed * deltaTime;
                    const verticalMovement = verticalSpeed * deltaTime;
                    forwardSpeed += 0.002;

                    //   console.log("lateralSpeed", lateralSpeed);
                    //   console.log("verticalSpeed", verticalSpeed);
                    //  console.log("lateralMovement", lateralMovement);
                    //  console.log("verticalMovement", verticalMovement);
                    if (isDragging) {

                        if (deltax > 0) {
                            //   console.log("Guidon tiré vers la droite");
                            lateralSpeed += deltax * 0.1;

                        } else if (deltax < 0) {
                            lateralSpeed += deltax * 0.1;
                            // console.log("Guidon tiré vers la gauche");
                        }
                        if (deltaz > 0) {
                            verticalSpeed += deltaz * 0.01;
                            //   console.log("Guidon tiré vers l'avant");
                        } else if (deltaz < 0) {
                            verticalSpeed += deltaz * 0.3;
                            //    console.log("Guidon tiré vers soi");
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
                    })

                    platform.position.y += verticalMovement;
                    platform.position.x += lateralMovement;

                    //temp
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
                }
                else {
                    console.log("Partie 1 terminée");
                    partie = 2;
                }
            }
            // Partie 2
            else if (partie == 2) {
                if (!part2Started) {
                    part2Started = true;
                    part2StartTime = Date.now();
                    console.log("Partie 2 : les météores arrivent !");
                    tunnel.dispose();
                }

                const elapsed = Date.now() - (part2StartTime as number);
                if (elapsed >= timerpart2) { // 3 minutes
                    console.log("Fin du niveau");
                    partie = 3;
                    return;
                }

                const spawnInterval = 2000 - ((2000 - 500) * (elapsed / 180000));
                meteorSpawnTimer += dtMs;
                if (meteorSpawnTimer >= spawnInterval) {
                    meteorSpawnTimer = 0;
                    const meteor = spawnMeteor(scene, platform);
                    meteores.push(meteor);
                }

                const meteorSpeed = 1.5;

                // Mise à jour de chaque météore
                for (let i = meteores.length - 1; i >= 0; i--) {
                    const meteor = meteores[i];
                    if (!meteor) { continue; }
                    const direction = platform.position.subtract(meteor.position).normalize();
                    meteor.position.addInPlace(direction.scale(meteorSpeed * deltaTime));

                    if (meteor.intersectsMesh(cameraHitbox, false)) {
                        console.log("Un météore a touché le joueur !");
                        meteor.dispose();
                        meteores.splice(i, 1);
                        continue;
                    }

                    for (let j = projectiles.length - 1; j >= 0; j--) {
                        const projectile = projectiles[j];
                        if (!projectile) { continue; }
                        if (meteor.intersectsMesh(projectile, false)) {
                            projectile.dispose();
                            projectiles.splice(j, 1);

                            meteor.metadata.hits = (meteor.metadata.hits || 0) + 1;
                            console.log(`Météore touché : ${meteor.metadata.hits} fois`);

                            const meteorMat = (meteor.material as StandardMaterial);
                            if (meteor.metadata.hits === 1) {
                                meteorMat.diffuseColor = new Color3(1, 0.5, 0.5);
                            } else if (meteor.metadata.hits === 2) {
                                meteorMat.diffuseColor = new Color3(1, 0.3, 0.3);
                            } else if (meteor.metadata.hits >= 3) {
                                console.log("Météore explosé !");
                                //TODO: explosion
                                meteor.dispose();
                                meteores.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }
            else if (partie == 3) {
                if (!part3Started) {
                    part3Started = true;
                    part3StartTime = Date.now();

                    console.log("Partie 3 : les météores arrivent !");
                    xr.input.controllers.forEach((controller) => {
                        const sword = createSword(controller, scene);
                        swords.push(sword);
                    });
                }

                const elapsed = Date.now() - (part3StartTime as number);
                if (elapsed >= timerpart3) { // 3 minutes
                    console.log("Fin du niveau");
                    //TODO: fin du niveau
                    return;
                }

                const spawnInterval = 2000 - ((2000 - 500) * (elapsed / 180000));
                meteorSpawnTimer += dtMs;
                if (meteorSpawnTimer >= spawnInterval) {
                    meteorSpawnTimer = 0;
                    const meteor = spawnMeteor(scene, platform);
                    meteores.push(meteor);
                }

                const meteorSpeed = 1.5;

                for (let i = meteores.length - 1; i >= 0; i--) {
                    const meteor = meteores[i];
                    if (!meteor) { continue; }
                    const direction = platform.position.subtract(meteor.position).normalize();
                    meteor.position.addInPlace(direction.scale(meteorSpeed * deltaTime));

                    if (meteor.intersectsMesh(cameraHitbox, false)) {
                        console.log("Un météore a touché le joueur !");
                        meteor.dispose();
                        meteores.splice(i, 1);
                        continue;
                    }

                    for (let s = 0; s < swords.length; s++) {
                        const sword = swords[s];
                        if (meteor.intersectsMesh(sword, false)) {
                            meteor.metadata.hits = (meteor.metadata.hits || 0) + 3;
                            console.log(`Météore touché par épée : ${meteor.metadata.hits} fois`);

                            const meteorMat = (meteor.material as StandardMaterial);
                            if (meteor.metadata.hits === 1) {
                                meteorMat.diffuseColor = new Color3(1, 0.5, 0.5);
                            } else if (meteor.metadata.hits === 2) {
                                meteorMat.diffuseColor = new Color3(1, 0.3, 0.3);
                            } else if (meteor.metadata.hits >= 3) {
                                console.log("Météore explosé !");
                                //TODO: explosion
                                meteor.dispose();
                                meteores.splice(i, 1);
                                break;
                            }
                        }
                    }
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
        })

        dragBehavior.onDragStartObservable.add((_event) => {
            isDragging = true;
            console.log("Guidon saisi");
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
            /*
            if (event.delta.x > 0) {
                console.log("Guidon tiré vers la droite");
            } else if (event.delta.x < 0) {
                console.log("Guidon tiré vers la gauche");
            }
            if (event.delta.z > 0) {
                console.log("Guidon tiré vers l'avant");
            } else if (event.delta.z < 0) {
                console.log("Guidon tiré vers soi");
            }*/
        });

        dragBehavior.onDragEndObservable.add((_event) => {
            isDragging = false;
            console.log("Guidon relâché" , lateralSpeed, verticalSpeed);

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

export default new SceneNiveau3();


function spawnMeteor(scene: Scene, platform: Mesh): Mesh {

    const meteor = MeshBuilder.CreateSphere("obstacle", { diameter: 2 }, scene);
    const meteorMat = new StandardMaterial("meteorMat", scene);
    meteorMat.diffuseColor = new Color3(1, 1, 0);
    meteor.material = meteorMat;

    meteor.metadata = { hits: 0 };

    const spawnDistance = 100;
    const heightOffset = (Math.random() - 0.5) * 20;
    const zOffset = (Math.random() - 0.5) * 40;

    meteor.position = new Vector3(
        platform.position.x - spawnDistance,
        platform.position.y + heightOffset,
        platform.position.z + zOffset
    );

    return meteor;
}
function createSword(controller: WebXRInputSource, scene: Scene): Mesh {
    const sword = MeshBuilder.CreateBox("sword", { height: 1.2, width: 0.1, depth: 0.1 }, scene);
    sword.position = new Vector3(0, -0.3, 0.2);
    const swordMat = new StandardMaterial("swordMat", scene);
    swordMat.diffuseColor = new Color3(0.8, 0.8, 0.8);
    sword.material = swordMat;

    if (controller.grip) {
        sword.parent = controller.grip;
    }
    sword.isPickable = false;
    return sword;
}

function shootProjectile(controller: WebXRInputSource, scene: Scene, projectiles: Mesh[]) {
    const projectile = MeshBuilder.CreateSphere("projectile", { diameter: 0.2 }, scene);

    const aggregateProjectile = new PhysicsAggregate(projectile, PhysicsShapeType.SPHERE, { mass: 10 }, scene);
    aggregateProjectile.body.setMotionType(PhysicsMotionType.DYNAMIC);

    // Position de départ du projectile
    let startPos: Vector3;
    if (controller.grip) {
        startPos = controller.grip.getAbsolutePosition().clone();
    } else if (controller.pointer) {
        startPos = controller.pointer.getAbsolutePosition().clone();
    } else {
        startPos = scene.activeCamera!.position.clone();
    }
    projectile.position = startPos.clone();

    const tmpRay = new Ray(new Vector3(), new Vector3(), Infinity);
    controller.getWorldPointerRayToRef(tmpRay, true);
    tmpRay.direction.normalize();
    const impulseMagnitude = 150;
    aggregateProjectile.body.applyImpulse(
        tmpRay.direction.scale(impulseMagnitude),
        projectile.absolutePosition
    );

    projectiles.push(projectile);
}

// @ts-ignore
function switchScene(engine: AbstractEngine, scene : Scene) {
    scene.dispose();

    const newSceneInstance = new XRSceneWithHavok2();
    newSceneInstance.createScene(engine).then(newScene => {
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

