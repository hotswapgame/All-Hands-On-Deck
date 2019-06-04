import * as THREE from 'three';

import { GLOBALS } from '../Constants';
import { getModel } from '../AssetManager';

class Boss {
  constructor(scene, spawnBomber, playerRot, angle) {
    this.scene = scene;
    this.spawnBomber = spawnBomber;
    this.hp = 10; // maybe make this a param
    this.radius = 20;
    this.modelScale = 50;
    this.hitRadius = 27;
    this.worldPos = new THREE.Vector3();
    this.baseSink = -4;
    this.riseRotSpeed = 0.1;
    this.isRising = true;
    this.riseStartOffset = 100;

    // (1.26)
    this.gateSpawnAngles = [0.32, 1.58, 2.84, 4.1, 5.37];
    this.spawnDoor = 0;

    this.passedRockCheck = false;
    this.spawnRot = new THREE.Vector3();
    this.forwardAxis = new THREE.Vector3(0, 0, 1);
    this.yawAxis = new THREE.Vector3(1, 0, 0);

    this.BOMBER_TIME_MAX = 4500;
    this.bomberTime = this.BOMBER_TIME_MAX;
    this.isActive = true;

    // const hitGeo = new THREE.SphereGeometry(this.hitRadius, 10, 10);
    // this.gameObject = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ wireframe: true, color: 0xffffff }));
    this.gameObject = new THREE.Object3D();
    this.gameObject.position.set(GLOBALS.WORLD_SIZE, 0, 0);

    this.flashTime = 0;
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // this mat might need to change
    this.factoryMat = new THREE.MeshPhongMaterial({
      flatShading: true,
      color: 0xCCCCCC,
      shininess: 0.1,
    });
    this.portMat = new THREE.MeshPhongMaterial({
      flatShading: true,
      color: 0x777777,
      shininess: 0.1,
    });
    const gateMat = new THREE.MeshPhongMaterial({
      flatShading: true,
      color: 0xCCCCCC,
      shininess: 0.1,
    });
    const bodyMatOffset = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
    });
    getModel('./Assets/boss/boss-factory.stl')
      .then((geo) => {
        this.factory = new THREE.Mesh(geo, this.factoryMat);
        this.factory.scale.set(this.modelScale, this.modelScale, this.modelScale);
        this.factory.rotateY(Math.PI / 2);
        this.factory.position.set(this.baseSink, 0, 0);
        this.gameObject.add(this.factory);
      });

    getModel('./Assets/boss/boss-ports.stl')
      .then((geo) => {
        this.ports = new THREE.Mesh(geo, this.portMat);
        this.ports.scale.set(this.modelScale, this.modelScale, this.modelScale);
        this.ports.rotateY(Math.PI / 2);
        this.ports.position.set(this.baseSink, 0, 0);
        this.gameObject.add(this.ports);
      });

    getModel('./Assets/boss/boss-outline.stl')
      .then((geo) => {
        this.outline = new THREE.Mesh(geo, bodyMatOffset);
        this.outline.scale.set(this.modelScale, this.modelScale, this.modelScale);
        this.outline.rotateY(Math.PI / 2);
        this.outline.position.set(this.baseSink, 0, 0);
        this.gameObject.add(this.outline);
      });
    // inside of gate
    const insideGeo = new THREE.CylinderGeometry(20, 20, 10, 20, 10, false);
    this.gateInside = new THREE.Mesh(insideGeo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
    this.gateInside.rotateZ(Math.PI / 2);
    // this.outline.position.set(this.baseSink, 0, 0);
    this.gameObject.add(this.gateInside);

    this.moveSphere = new THREE.Object3D();
    this.moveSphere.add(this.gameObject);
    this.scene.add(this.moveSphere);

    // start with player position
    this.moveSphere.rotation.set(playerRot.x, playerRot.y, playerRot.z);
    const startOffset = -Math.PI / 4 - (Math.random() * Math.PI / 6);

    // move away from player based on randomly generated position
    this.moveSphere.rotateOnAxis(this.yawAxis, angle);
    this.moveSphere.rotateOnAxis(this.forwardAxis, -startOffset);
  }

  getPosition() {
    // Calc world position on first use
    this.gameObject.getWorldPosition(this.worldPos);
    return this.worldPos.clone();
  }

  subHealth(amt) {
    this.hp -= amt;

    if (this.hp <= 0) {
      this.scene.remove(this.moveSphere);
      this.isActive = false;
    }

    this.startFlash();
    this.flashTime = 40;
  }

  checkHit(ballPos, r) {
    const worldP = new THREE.Vector3();
    this.gameObject.getWorldPosition(worldP);
    return (worldP.distanceTo(ballPos) < this.hitRadius + r);
  }

  startFlash() {
    this.factory.material = this.flashMat;
    this.ports.material = this.flashMat;
  }

  stopFlash() {
    this.factory.material = this.factoryMat;
    this.ports.material = this.portMat;
  }

  update(dt) {
    // Spawn bomber logic
    this.bomberTime -= dt;
    if (this.bomberTime <= 0) {
      this.spawnBomber(this.moveSphere.rotation, this.gateSpawnAngles[this.spawnDoor % 5]);
      this.spawnDoor += 1;
      this.bomberTime = this.BOMBER_TIME_MAX;
    }

    if (this.flashTime > 0) {
      this.flashTime -= dt;

      if (this.flashTime <= 0) this.stopFlash();
    }
  }
}

export default Boss;
