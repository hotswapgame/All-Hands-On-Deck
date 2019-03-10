import * as THREE from 'three';

import { GAME_TYPES } from '../Constants';
import { getModel } from '../AssetManager';

class Rock {
  constructor(scene, worldSize) {
    this.type = GAME_TYPES.ROCK;
    this.scene = scene;
    this.worldSize = worldSize;

    this.posSphere = new THREE.Object3D();
    const rockModelNum = Math.floor(Math.random() * 3);
    this.sizeArea = Math.random() * 12 + 10;
    this.sizeHeight = Math.random() * 10 + 7;
    this.rotZ = Math.random() * Math.PI;

    this.gameObject = new THREE.Object3D();
    this.gameObject.position.x = worldSize - this.sizeHeight * 0.03;
    this.gameObject.rotation.y = Math.PI / 2;
    this.gameObject.rotation.z = this.rotZ;
    this.posSphere.add(this.gameObject);
    this.scene.add(this.posSphere);

    this.spawnBlockRadius = this.sizeArea + 10;
    this.hitRadius = this.sizeArea * 0.8;
    // Uncomment to show hitbox debug
    // const hitgeo = new THREE.SphereGeometry(this.hitRadius, 10, 10);
    // this.hitBox = new THREE.Mesh(hitgeo, new THREE.MeshBasicMaterial({ wireframe: true }));
    // this.gameObject.add(this.hitBox);

    getModel(`./Assets/Rocks/rocks${rockModelNum}.stl`)
      .then((geo) => {
        const mat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
        this.rock = new THREE.Mesh(geo, mat);
        // this.sizeArea = Math.random() * 12 + 10;
        // this.sizeHeight = Math.random() * 10 + 7;
        this.rock.scale.set(this.sizeArea, this.sizeArea, this.sizeHeight);
        // this.rock.rotation.y = Math.PI / 2;
        this.gameObject.add(this.rock);
      });
    getModel(`./Assets/Rocks/rocksOffset${rockModelNum}.stl`)
      .then((geo) => {
        const mat = new THREE.MeshBasicMaterial({
          color: 0x444455,
          side: THREE.BackSide,
        });
        this.rockOutline = new THREE.Mesh(geo, mat);
        this.rockOutline.scale.set(this.sizeArea, this.sizeArea, this.sizeHeight);
        // this.rockOutline.rotation.y = Math.PI / 2;
        this.gameObject.add(this.rockOutline);
      });

    // set a random rotation
    this.posSphere.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
  }

  getPosition() {
    // Calc world position on first use
    if (!this.worldPos) {
      this.worldPos = new THREE.Vector3();
      this.gameObject.getWorldPosition(this.worldPos);
    }

    return this.worldPos;
  }

  // checkPlayerCollision(playerPos) {

  // }
}

export default Rock;
