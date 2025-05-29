// src/game.ts
import {
    Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, StandardMaterial, Color3, Texture, PointerEventTypes, PointerInfo,
    MeshBuilder, TransformNode, Mesh, Camera, Plane, Matrix, Animatable, Animation
} from '@babylonjs/core';
import { PuzzlePiece } from './puzzlePiece';

import puzzleImageUrl from './assets/puzzle.jpg';

export class Game {
    private _engine: Engine;
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _puzzlePieces: PuzzlePiece[] = [];
    private _rows: number;
    private _cols: number;

    private _puzzleWidth!: number;
    private _puzzleHeight!: number;
    private _pieceDepth: number = 0.1;
    private _imageTexture!: Texture;

    private _draggedPiece: PuzzlePiece | null = null;
    private _dragOffset: Vector3 = Vector3.Zero();
    private _ground!: Mesh;

    private _isGameSolved: boolean = false;
    private _messageDisplay: HTMLParagraphElement;
    private _resetButton: HTMLButtonElement;


    constructor(canvasId: string, rows: number, cols: number) {
        const canvasElement = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvasElement) throw new Error(`Canvas avec ID '${canvasId}' non trouvé !`);
        this._canvas = canvasElement;

        const messageElement = document.getElementById('message') as HTMLParagraphElement;
        if (!messageElement) throw new Error(`Élément avec ID 'message' non trouvé !`);
        this._messageDisplay = messageElement;

        const resetButtonElement = document.getElementById('resetButton') as HTMLButtonElement;
        if (!resetButtonElement) throw new Error(`Bouton avec ID 'resetButton' non trouvé !`);
        this._resetButton = resetButtonElement;

        this._engine = new Engine(this._canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this._scene = new Scene(this._engine);
        this._rows = rows;
        this._cols = cols;

        this._setupScene();
        this._imageTexture = new Texture(puzzleImageUrl, this._scene);

        this._imageTexture.onLoadObservable.add(() => {
            this._createPuzzle();
            this._shufflePuzzle();
            this._addEventListeners();
            this._engine.runRenderLoop(() => {
                this._scene.render();
            });
        });

        window.addEventListener('resize', () => {
            this._engine.resize();
        });

        this._resetButton.addEventListener('click', () => this.resetGame());
    }

    private _setupScene(): void {
        const camera = new ArcRotateCamera(
            'camera',
            Math.PI / 2,
            Math.PI / 2.5,
            10,
            Vector3.Zero(),
            this._scene
        );
        camera.attachControl(this._canvas, true);
        camera.lowerRadiusLimit = 1;
        camera.upperRadiusLimit = 20;
        camera.wheelPrecision = 50;

        new HemisphericLight('light', new Vector3(0, 1, 0), this._scene);

        this._ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this._scene);
        this._ground.position.y = -0.5;
        this._ground.isVisible = false;
        this._ground.isPickable = true;
    }

    private _createPuzzle(): void {
        const imgWidth = this._imageTexture.getSize().width;
        const imgHeight = this._imageTexture.getSize().height;

        this._puzzleWidth = 10;
        this._puzzleHeight = (imgHeight / imgWidth) * this._puzzleWidth;

        const tileWidth = this._puzzleWidth / this._cols;
        const tileHeight = this._puzzleHeight / this._rows;

        let pieceIndex = 0;
        for (let r = 0; r < this._rows; r++) {
            for (let c = 0; c < this._cols; c++) {
                const piece = new PuzzlePiece(
                    `piece-${pieceIndex}`,
                    this._scene,
                    this._imageTexture,
                    r,
                    c,
                    this._rows,
                    this._cols,
                    tileWidth,
                    tileHeight,
                    pieceIndex,
                    this._pieceDepth
                );
                this._puzzlePieces.push(piece);
                pieceIndex++;
            }
        }
    }

    private _shufflePuzzle(): void {
        const spreadRadiusX = this._puzzleWidth * 1.5;
        const spreadRadiusY = this._puzzleHeight * 1.5;
        const spreadRadiusZ = 5;

        this._puzzlePieces.forEach(piece => {
            piece.reset();
            const randomX = (Math.random() - 0.5) * spreadRadiusX;
            const randomY = (Math.random() - 0.5) * spreadRadiusY;
            const randomZ = (Math.random() - 0.5) * spreadRadiusZ;

            piece.setPosition(randomX, randomY, randomZ + this._pieceDepth / 2 + 0.1);
            piece.currentPosition = piece.mesh.position.clone();
        });
        this._isGameSolved = false;
        this._messageDisplay.textContent = '';
    }

    private _addEventListeners(): void {
        this._scene.onPointerObservable.add((pointerInfo) => {
            if (this._isGameSolved) return;

            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                const pickResult = this._scene.pick(this._scene.pointerX, this._scene.pointerY);
                if (pickResult?.hit && pickResult.pickedMesh?.metadata?.isPuzzlePiece) {
                    this._draggedPiece = pickResult.pickedMesh.metadata.piece;
                    
                    if (this._draggedPiece) {
                        if (this._draggedPiece.isLocked) return;

                        this._draggedPiece.elevate(this._pieceDepth * 2);

                        const intersectionPoint = pickResult.pickedPoint;
                        if (intersectionPoint) {
                            this._dragOffset = intersectionPoint.subtract(this._draggedPiece.mesh.position);
                        } else {
                            console.warn("POINTERDOWN - Le point d'intersection était nul. L'offset de glisser-déposer est zéro.");
                            this._dragOffset = Vector3.Zero();
                        }
                        (this._scene.activeCamera as ArcRotateCamera).detachControl();
                    }
                }
            } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
                if (this._draggedPiece) {
                    (this._scene.activeCamera as ArcRotateCamera).attachControl(this._canvas, true);

                    let snapped = false;
                    // Ajustement du seuil de snap : 1/3 de la largeur d'une pièce
                    // Augmenté un peu pour être plus tolérant au mouvement de la souris
                    const snapThreshold = this._puzzleWidth / this._cols / 2; 

                    console.log(`--- POINTERUP pour pièce ${this._draggedPiece.mesh.name} ---`);
                    console.log("Position actuelle de la pièce glissée:", this._draggedPiece.mesh.position);
                    console.log("Position originale/correcte de la pièce glissée:", this._draggedPiece.originalPosition);
                    console.log("Seuil de snap:", snapThreshold);

                    // 1. Essayer de "snapper" à la position correcte de la pièce elle-même
                    const distToSelfCorrectPos = Vector3.Distance(
                        new Vector3(this._draggedPiece.mesh.position.x, this._draggedPiece.mesh.position.y, 0),
                        new Vector3(this._draggedPiece.originalPosition.x, this._draggedPiece.originalPosition.y, 0)
                    );
                    console.log("Distance à la position correcte de la pièce elle-même (XY):", distToSelfCorrectPos);

                    if (distToSelfCorrectPos < snapThreshold) {
                        this._draggedPiece.snapToOriginalPosition(); // Nouvelle méthode dédiée
                        snapped = true;
                        console.log("SNAP: Pièce snappée à sa propre position correcte.");
                    } else {
                        // 2. Essayer de "snapper" à une pièce voisine déjà verrouillée
                        for (const otherPiece of this._puzzlePieces) {
                            if (otherPiece !== this._draggedPiece && otherPiece.isLocked) {
                                const currentDraggedPiecePos = this._draggedPiece.mesh.position;
                                
                                const draggedPieceRow = this._draggedPiece.row; // Utiliser la propriété 'row'
                                const draggedPieceCol = this._draggedPiece.col; // Utiliser la propriété 'col'
                                
                                const otherPieceRow = otherPiece.row; // Utiliser la propriété 'row'
                                const otherPieceCol = otherPiece.col; // Utiliser la propriété 'col'

                                let idealSnapPosition: Vector3 | null = null;
                                const tileWidth = this._puzzleWidth / this._cols;
                                const tileHeight = this._puzzleHeight / this._rows;


                                // Voisin du haut (draggedPiece est au-dessus de otherPiece)
                                if (draggedPieceRow === otherPieceRow - 1 && draggedPieceCol === otherPieceCol) {
                                    idealSnapPosition = new Vector3(
                                        otherPiece.originalPosition.x,
                                        otherPiece.originalPosition.y + tileHeight,
                                        this._pieceDepth / 2 + 0.01 // Assurez-vous que le Z est cohérent
                                    );
                                    console.log(`Voisin HAUT (${otherPiece.mesh.name}) - Position idéale:`, idealSnapPosition);
                                }
                                // Voisin du bas (draggedPiece est en dessous de otherPiece)
                                else if (draggedPieceRow === otherPieceRow + 1 && draggedPieceCol === otherPieceCol) {
                                    idealSnapPosition = new Vector3(
                                        otherPiece.originalPosition.x,
                                        otherPiece.originalPosition.y - tileHeight,
                                        this._pieceDepth / 2 + 0.01
                                    );
                                    console.log(`Voisin BAS (${otherPiece.mesh.name}) - Position idéale:`, idealSnapPosition);
                                }
                                // Voisin de gauche (draggedPiece est à gauche de otherPiece)
                                else if (draggedPieceCol === otherPieceCol - 1 && draggedPieceRow === otherPieceRow) {
                                    idealSnapPosition = new Vector3(
                                        otherPiece.originalPosition.x + tileWidth,
                                        otherPiece.originalPosition.y,
                                        this._pieceDepth / 2 + 0.01
                                    );
                                    console.log(`Voisin GAUCHE (${otherPiece.mesh.name}) - Position idéale:`, idealSnapPosition);
                                }
                                // Voisin de droite (draggedPiece est à droite de otherPiece)
                                else if (draggedPieceCol === otherPieceCol + 1 && draggedPieceRow === otherPieceRow) {
                                    idealSnapPosition = new Vector3(
                                        otherPiece.originalPosition.x - tileWidth,
                                        otherPiece.originalPosition.y,
                                        this._pieceDepth / 2 + 0.01
                                    );
                                    console.log(`Voisin DROITE (${otherPiece.mesh.name}) - Position idéale:`, idealSnapPosition);
                                }

                                if (idealSnapPosition) {
                                    const distanceToNeighborSnap = Vector3.Distance(
                                        new Vector3(currentDraggedPiecePos.x, currentDraggedPiecePos.y, 0), // Comparaison XY
                                        new Vector3(idealSnapPosition.x, idealSnapPosition.y, 0)
                                    );
                                    console.log(`Distance à la position de snap du voisin (${otherPiece.mesh.name}):`, distanceToNeighborSnap);

                                    if (distanceToNeighborSnap < snapThreshold) {
                                        this._draggedPiece.setPosition(idealSnapPosition.x, idealSnapPosition.y, idealSnapPosition.z);
                                        this._draggedPiece.lock(); // Verrouille la pièce
                                        snapped = true;
                                        console.log(`SNAP: Pièce snappée au voisin ${otherPiece.mesh.name}.`);
                                        break; // Sortir de la boucle, la pièce a trouvé sa place
                                    }
                                }
                            }
                        }
                    }

                    // Si la pièce n'a pas été "snappée" du tout, elle reste à sa position glissée avec une hauteur de repos
                    if (!snapped) {
                        this._draggedPiece.setPosition(
                            this._draggedPiece.currentPosition.x,
                            this._draggedPiece.currentPosition.y,
                            this._pieceDepth / 2
                        );
                        console.log("PAS DE SNAP: Pièce relâchée à sa position actuelle (non verrouillée).");
                    }

                    this._draggedPiece = null;
                    this._dragOffset = Vector3.Zero();
                    this._checkWinCondition(); // Vérifie si le puzzle est résolu après chaque placement
                }
            } else if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
                if (this._draggedPiece && !this._isGameSolved && !this._draggedPiece.isLocked) {
                    const ray = this._scene.createPickingRay(
                        this._scene.pointerX,
                        this._scene.pointerY,
                        Matrix.Identity(),
                        this._scene.activeCamera
                    );

                    const dragPlane = Plane.FromPositionAndNormal(
                        new Vector3(0, 0, this._draggedPiece.mesh.position.z),
                        Vector3.Backward()
                    );
                    
                    const distance = ray.intersectsPlane(dragPlane);

                    if (distance !== null) {
                        const pickedPointOnPlane = ray.origin.add(ray.direction.scale(distance));
                        const newPosition = pickedPointOnPlane.subtract(this._dragOffset);
                        this._draggedPiece.setPosition(newPosition.x, newPosition.y, this._draggedPiece.mesh.position.z);
                    } else {
                        console.warn("POINTERMOVE - Le rayon n'a pas intersecté le plan de déplacement.");
                    }
                }
            }
        });
    }
    private _checkWinCondition(): void {
        // 1. Vérifie si toutes les pièces sont verrouillées.
        const allPiecesAreLocked = this._puzzlePieces.every(piece => piece.isLocked);

        if (allPiecesAreLocked) {
            // Si toutes les pièces sont verrouillées, vérifie maintenant si elles sont dans le bon ordre.
            const allPiecesAreInCorrectPosition = this._puzzlePieces.every(piece => {
                // Pour chaque pièce, vérifie si sa position actuelle est la même que sa position originale.
                // On peut utiliser Vector3.Equals pour une comparaison précise.
                // Alternativement, on peut vérifier la distance si on veut un peu de tolérance.
                // Pour un puzzle "résolu", on veut qu'elles soient *exactement* à la bonne place.
                return piece.currentPosition.equalsWithEpsilon(
                    new Vector3(piece.originalPosition.x, piece.originalPosition.y, piece.originalPosition.z + this._pieceDepth / 2 + 0.01), // Assure que la comparaison inclut le Z après le snap
                    0.001 // Une petite tolérance pour les imprécisions de flottants
                );
            });

            if (allPiecesAreInCorrectPosition && !this._isGameSolved) {
                // Le puzzle est résolu !
                this._isGameSolved = true;
                this._messageDisplay.textContent = "Félicitations, vous avez résolu le puzzle !";
                this._disableInteractions();
                this._animateSolvedPuzzle();
                console.log("Win condition met: Toutes les pièces sont verrouillées ET dans le bon ordre.");
            } else if (!allPiecesAreInCorrectPosition) {
                // Toutes les pièces sont verrouillées, mais PAS dans le bon ordre.
                // Cela signifie qu'elles ont pu se verrouiller sur des positions incorrectes (e.g., aux bords du terrain de jeu).
                console.log("Toutes les pièces sont verrouillées, mais le puzzle n'est pas dans l'ordre correct. Réinitialisation du jeu...");
                this._messageDisplay.textContent = "Oops ! Toutes les pièces sont verrouillées mais pas au bon endroit. Réessayez !";
                setTimeout(() => {
                    this.resetGame(); // Réinitialise le jeu après un court délai
                }, 2000); // Délai de 2 secondes avant la réinitialisation
            }
        }
    }

    private _disableInteractions(): void {
        this._puzzlePieces.forEach(piece => {
            piece.mesh.isPickable = false;
        });
        (this._scene.activeCamera as ArcRotateCamera).attachControl(this._canvas, true);
    }

    private _animateSolvedPuzzle(): void {
        const camera = this._scene.activeCamera as ArcRotateCamera;
        if (!camera) return;

        const frameRate = 60;
        const animationDuration = 3;

        const radiusAnimation = new Animation("radiusAnimation", "radius", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        const radiusKeys = [];
        radiusKeys.push({ frame: 0, value: camera.radius });
        radiusKeys.push({ frame: animationDuration * frameRate, value: 1.2 * Math.max(this._puzzleWidth, this._puzzleHeight) });
        radiusAnimation.setKeys(radiusKeys);

        const alphaAnimation = new Animation("alphaAnimation", "alpha", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        const alphaKeys = [];
        alphaKeys.push({ frame: 0, value: camera.alpha });
        alphaKeys.push({ frame: animationDuration * frameRate, value: camera.alpha + Math.PI / 4 });
        alphaAnimation.setKeys(alphaKeys);

        const targetAnimation = new Animation("targetAnimation", "target", frameRate, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        const targetKeys = [];
        targetKeys.push({ frame: 0, value: camera.target.clone() });
        targetKeys.push({ frame: animationDuration * frameRate, value: Vector3.Zero() });
        targetAnimation.setKeys(targetKeys);

        this._scene.beginDirectAnimation(camera, [radiusAnimation, alphaAnimation, targetAnimation], 0, animationDuration * frameRate, false, 1);

        this._puzzlePieces.forEach(piece => {
            if (piece.mesh.material instanceof StandardMaterial) {
                const emissiveAnimation = new Animation("emissiveAnimation", "emissiveColor", frameRate, Animation.ANIMATIONTYPE_COLOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
                const emissiveKeys = [];
                emissiveKeys.push({ frame: 0, value: Color3.Green() });
                emissiveKeys.push({ frame: frameRate / 2, value: new Color3(0.1, 0.5, 0.1) });
                emissiveKeys.push({ frame: frameRate, value: Color3.Green() });
                emissiveAnimation.setKeys(emissiveKeys);
                this._scene.beginDirectAnimation(piece.mesh.material, [emissiveAnimation], 0, frameRate, true, 1.0);
            }
        });
    }

    public resetGame(): void {
        this._isGameSolved = false;
        this._messageDisplay.textContent = '';
        this._puzzlePieces.forEach(piece => {
            piece.reset();
            piece.mesh.isPickable = true;
            if (piece.mesh.material instanceof StandardMaterial) {
                this._scene.stopAnimation(piece.mesh.material);
            }
        });
        this._shufflePuzzle();
        const camera = this._scene.activeCamera as ArcRotateCamera;
        if (camera) {
            camera.alpha = Math.PI / 2;
            camera.beta = Math.PI / 2.5;
            camera.radius = 10;
            camera.target = Vector3.Zero();
        }
    }

    public run(): void {
    }
}