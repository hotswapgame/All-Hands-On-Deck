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
    this.sizeArea = Math.random() * 10 + 8;
    this.sizeHeight = Math.random() * 15 + 8;
    this.rotZ = Math.random() * Math.PI;

    this.gameObject = new THREE.Object3D();
    this.restingPos = worldSize - this.sizeHeight * 0.03;
    this.gameObject.position.x = this.restingPos;
    this.gameObject.rotation.y = Math.PI / 2;
    this.gameObject.rotation.z = this.rotZ;
    this.posSphere.add(this.gameObject);
    this.scene.add(this.posSphere);

    this.rockHolder = new THREE.Object3D();
    this.rockHolder.position.z = this.riseDiff;
    this.gameObject.add(this.rockHolder);

    this.spawnBlockRadius = this.sizeArea + 10;
    this.hitRadius = this.sizeArea * 0.8;
    // Uncomment to show hitbox debug
    // const hitgeo = new THREE.SphereGeometry(this.hitRadius, 10, 10);
    // this.hitBox = new THREE.Mesh(hitgeo, new THREE.MeshBasicMaterial({ wireframe: true }));
    // this.gameObject.add(this.hitBox);

    this.colorArr = [0xFAFAFA, 0xFAFAFA, 0xFAFAFA];

    getModel(`./Assets/Rocks/rocks${rockModelNum}.stl`)
      .then((geo) => {
        const mat = new THREE.MeshLambertMaterial({
          color: this.colorArr[Math.floor(Math.random() * 2.99)],
        });
        this.rock = new THREE.Mesh(geo, mat);
        this.rock.scale.set(this.sizeArea, this.sizeArea, this.sizeHeight);
        this.rockHolder.add(this.rock);
      });

    getModel(`./Assets/Rocks/rocksOffset${rockModelNum}.stl`)
      .then((geo) => {
        const mat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          side: THREE.BackSide,
        });
        this.rockOutline = new THREE.Mesh(geo, mat);
        this.rockOutline.scale.set(this.sizeArea, this.sizeArea, this.sizeHeight);
        this.rockHolder.add(this.rockOutline);
      });

    this.randomlyPlace();
    this.isGoodPlacement = false;
    this.isRising = false;
    this.RISE_TIME_MAX = 1800;
    this.riseTime = this.RISE_TIME_MAX;
    this.riseDiff = this.sizeHeight * -2;

    // for wave transition sink code
    this.isSunken = false;
    this.sinking = false;
    this.sinkTime = this.RISE_TIME_MAX;
  }

  getPosition() {
    // Calc world position on first use
    if (!this.worldPos || !this.isGoodPlacement) {
      this.worldPos = new THREE.Vector3();
      this.gameObject.getWorldPosition(this.worldPos);
    }

    return this.worldPos.clone();
  }

  startSinking() {
    this.sinking = true;
  }

  fixPlacement() {
    this.isGoodPlacement = true;
    this.rising = true;
  }

  randomlyPlace() {
    // set a random rotation
    this.posSphere.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    // Hack to make the position regenerate
    this.worldPos = undefined;
  }

  update(dt) {
    if (this.rising) {
      const timeRatio = (this.riseTime / this.RISE_TIME_MAX);
      this.rockHolder.position.z = timeRatio * timeRatio * this.riseDiff;

      this.riseTime -= dt;
      if (this.riseTime <= 0) {
        this.rising = false;
      }
    }

    if (this.sinking) {
      const timeRatio = 1 - (this.sinkTime / this.RISE_TIME_MAX);
      this.rockHolder.position.z = timeRatio * timeRatio * this.riseDiff;

      this.sinkTime -= dt;
      if (this.sinkTime <= 0) {
        this.sinking = false;
        this.isSunken = true;
        this.scene.remove(this.posSphere); // make sure the rock gets deleted
      }
    }
  }
}

export default Rock;
