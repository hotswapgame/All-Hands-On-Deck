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
    this.posZ = Math.random() * Math.PI;
    getModel(`./Assets/Rocks/rocks${rockModelNum}.stl`)
      .then((geo) => {
        const mat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
        this.gameObject = new THREE.Mesh(geo, mat);
        // this.sizeArea = Math.random() * 12 + 10;
        // this.sizeHeight = Math.random() * 10 + 7;
        this.gameObject.scale.set(this.sizeArea, this.sizeArea, this.sizeHeight);
        this.gameObject.rotation.y = Math.PI / 2;
        // this.gameObject.rotation.z = Math.random() * Math.PI;
        this.gameObject.rotation.z = this.posZ;
        this.gameObject.position.x = worldSize - this.sizeHeight * 0.03;

        this.posSphere.add(this.gameObject);

        this.scene.add(this.posSphere);
      });
    getModel(`./Assets/Rocks/rocksOffset${rockModelNum}.stl`)
      .then((geo) => {
        const mat = new THREE.MeshBasicMaterial({
          color: 0x444455,
          side: THREE.BackSide,
        });
        this.gameObject = new THREE.Mesh(geo, mat);
        this.gameObject.scale.set(this.sizeArea, this.sizeArea, this.sizeHeight);
        this.gameObject.rotation.y = Math.PI / 2;
        this.gameObject.rotation.z = this.posZ;
        this.gameObject.position.x = worldSize - this.sizeHeight * 0.03;
        this.posSphere.add(this.gameObject);
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
