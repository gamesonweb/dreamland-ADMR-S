import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { getSceneModule } from "./createScene";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Player } from "./Player";
import { Utility } from "./Utility";



// ----- AUDIO INIT ------
const audioContext: AudioContext = new AudioContext();
// ----- END OF AUDIO INIT ------

// @ts-ignore
let scene: Scene | null = null; //Utile ?
let sceneToRender: Scene | null = null; //Utile ?


export const babylonInit = async (): Promise<Scene> => {
  const createSceneModule = getSceneModule();
  // Execute the pretasks, if defined
  await Promise.all(createSceneModule.preTasks || []);
  // Get the canvas element
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  // Generate the BABYLON 3D engine
  const engine = await createEngine(canvas);

  console.log(engine)


  const player = new Player();

  // Create the scene
  const scene = await createSceneModule.createScene(engine, canvas, audioContext, player);

  Utility.setupInspectorControl(scene);
  // JUST FOR TESTING. Not needed for anything else
  (window as any).scene = scene;

  // Register a render loop to repeatedly render the scene
  startRenderLoop(engine, canvas);

  // Watch for browser/canvas resize events
  window.addEventListener("resize", function () {
      engine.resize();
  });

  return scene;
};

window.onload = () => {
  babylonInit().then((scene) => {
    sceneToRender = scene;
  });
  

}

// @ts-ignore
const startRenderLoop = (engine: AbstractEngine, canvas: HTMLCanvasElement) => { //canvas inutile ?
  engine.runRenderLoop(() => {
      if (sceneToRender && sceneToRender.activeCamera) {
          sceneToRender.render();
      }
  });
}

const createEngine = async (canvas : HTMLCanvasElement): Promise<AbstractEngine> => {
  const engineType =
  location.search.split("engine=")[1]?.split("&")[0] || "webgl";
  let engine: AbstractEngine;
  //On peut sûrement se contenter du defaultEngine, toute la partie webgpu vient du code original, à voir
  if (engineType === "webgpu") {
      const webGPUSupported = await WebGPUEngine.IsSupportedAsync;
      if (webGPUSupported) {
          // You can decide which WebGPU extensions to load when creating the engine. I am loading all of them
          await import("@babylonjs/core/Engines/WebGPU/Extensions/");
          const webgpu = engine = new WebGPUEngine(canvas, {
              adaptToDeviceRatio: true,
              antialias: true,
          });
          await webgpu.initAsync();
          engine = webgpu;
      } else {
          engine = createDefaultEngine(canvas);
      }
  } else {
      engine = createDefaultEngine(canvas);
  }
  return engine;
};

const createDefaultEngine = function (canvas : HTMLCanvasElement) { 
  return new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false }); 
};

window.onclick = () => {
    audioContext.resume();
};