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
    getModel(`./Assets/Rocks/rocks${rockModelNum}.stl`)
      .then((geo) => {
        const mat = new THREE.MeshPhongMaterial({ color: 0xdddddd });
        this.gameObject = new THREE.Mesh(geo, mat);
        this.size = Math.random() * 10 + 7;
        this.gameObject.scale.set(this.size, this.size, this.size);
        this.gameObject.rotation.y = Math.PI / 2;
        this.gameObject.position.x = worldSize;

        this.posSphere.add(this.gameObject);

        // this.worldPos = new THREE.Vector3();
        // this.gameObject.getWorldPosition(this.worldPos);
        // console.log(this.worldPos);
      });

    this.scene.add(this.posSphere);
    // set a random rotation
    this.posSphere.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
  }

  // checkPlayerCollision(playerPos) {

  // }
}

export default Rock;
