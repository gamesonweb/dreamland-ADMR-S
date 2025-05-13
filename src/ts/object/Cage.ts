import {Color3, Mesh, MeshBuilder, PolygonMeshBuilder, StandardMaterial, Vector2} from "@babylonjs/core";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {Scene} from "@babylonjs/core/scene";

// @ts-ignore
class Cage{
    public cageSize : number = 10;
    public halfSize : number = this.cageSize / 2;
    private wallLeft: Mesh;
    private wallRight: Mesh;
    private wallBack: Mesh;
    private wallFront: Mesh;
    private ceiling: Mesh;
    private floor: Mesh;



    constructor(scene:Scene) {

        const wallMaterial = new StandardMaterial("wallMat", scene);
        wallMaterial.diffuseColor = new Color3(0.8, 0.8, 0.8);

        this.wallLeft = MeshBuilder.CreateBox("wallLeft", { width: 0.2, height: this.cageSize, depth: this.cageSize }, scene);
        this.wallLeft.position = new Vector3(-this.halfSize, this.cageSize / 2, 0);
        this.wallLeft.material = wallMaterial;

        this.wallRight = this.wallLeft.clone("wallRight");
        this.wallRight.position = new Vector3(this.halfSize, this.cageSize / 2, 0);

        this.wallBack = MeshBuilder.CreateBox("wallBack", { width: this.cageSize, height: this.cageSize, depth: 0.2 }, scene);
        this.wallBack.position = new Vector3(0, this.cageSize / 2, -this.halfSize);
        this.wallBack.material = wallMaterial;

        this.wallFront = this.wallBack.clone("wallFront");
        this.wallFront.position = new Vector3(0, this.cageSize / 2, this.halfSize);

        this.ceiling = MeshBuilder.CreateBox("ceiling", { width: this.cageSize, height: 0.2, depth: this.cageSize }, scene);
        this.ceiling.position = new Vector3(0, this.cageSize, 0);
        this.ceiling.material = wallMaterial;



        const outerShape = [
            new Vector2(-this.halfSize, -this.halfSize),
            new Vector2(this.halfSize, -this.halfSize),
            new Vector2(this.halfSize, this.halfSize),
            new Vector2(-this.halfSize, this.halfSize)
        ];

        const holeSize = 1; // demi-dimension du trou
        const innerHole = [
            new Vector2(-holeSize, -holeSize),
            new Vector2(holeSize, -holeSize),
            new Vector2(holeSize, holeSize),
            new Vector2(-holeSize, holeSize)
        ];

        const floorTri = new PolygonMeshBuilder("floor", outerShape);
        floorTri.addHole(innerHole);

        this.floor = floorTri.build();

        this.floor.rotation.x = Math.PI / 2;  // Pour qu’il soit horizontal
        this.floor.position.y = 0;

        const floorMaterial = new StandardMaterial("floorMat", scene);
        floorMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        this.floor.material = floorMaterial;
    }
}

