import { Object3D } from "./Object3D";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { Material } from "@babylonjs/core/Materials/material";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";


export class Object3DPickable implements Object3D{
    mesh: Mesh;
  
    constructor(
      scene: Scene,
      name: string,
      material: Material,
      type: "box" | "sphere" | "plane" = "box",
      size: number = 1
    ) 
    {
      this.mesh = this.createMesh(scene, name, type, size);
      this.mesh.material = material;
    }
  
    createMesh(scene: Scene, name: string, type: string, size: number): Mesh {
      switch (type) {
        case "sphere":
          return MeshBuilder.CreateSphere(name, { diameter: size }, scene);
        case "plane":
          return MeshBuilder.CreatePlane(name, { size }, scene);
        default:
          return MeshBuilder.CreateBox(name, { size }, scene);
      }
    }

    
}