import * as THREE from 'three';
import { GAME_TYPES } from '../Constants';

import { getModel } from '../AssetManager';

class Treasure {
  constructor(scene, worldSize) {
    this.type = GAME_TYPES.TREASURE;
    this.scene = scene;
    this.worldSize = worldSize;

    this.isActive = false;
  }

  spawn() {
    this.isActive = true;
  }

  update(dt) {
    console.log(this.type, dt);
  }
}

export default Treasure;
