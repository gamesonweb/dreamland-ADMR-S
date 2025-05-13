import {Mesh} from "@babylonjs/core/Meshes/mesh";
import {Scene} from "@babylonjs/core/scene";

export interface Object3D {
  mesh: Mesh;
  loadMesh?: () => Mesh;
  enableInteractions?: (scene: Scene) => void;
}