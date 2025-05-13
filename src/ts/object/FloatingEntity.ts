import {Scene} from "@babylonjs/core/scene";
import {Object3DPickable} from "./Object3DPickable.ts";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Color3, StandardMaterial} from "@babylonjs/core";

export class FloatingEntity extends Object3DPickable{

    private velocity : Vector3;

    constructor(scene: Scene, ) {
        const material = new StandardMaterial("entityMat", scene);
        material.diffuseColor = new Color3(0, 1, 0);
        super(scene, "entity", material, "sphere",0.5);
        this.mesh.position=new Vector3(0,-0.5,0);
        this.velocity = new Vector3((Math.random() - 0.5) * 0.1, Math.random() * 0.1 + 0.05, (Math.random() - 0.5) * 0.1);

    }

    public updateSpheres(dt:number, maxX:number, maxY:number, maxZ:number, minX:number,minY:number,minZ:number): void {
        this.mesh.position.addInPlace(this.velocity.scale(dt));

        if (this.mesh.position.x < minX || this.mesh.position.x > maxX) {
            this.velocity.x = - this.velocity.x;
        }
        if (this.mesh.position.y < minY || this.mesh.position.y > maxY) {
            this.velocity.y = - this.velocity.y;
        }
        if (this.mesh.position.z < minZ || this.mesh.position.z > maxZ) {
            this.velocity.z = - this.velocity.z;
        }
    }


}