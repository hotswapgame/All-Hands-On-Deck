import * as THREE from 'three';

import SmokeStack from './SmokeStack';
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
    this.riseRotSpeed = 0.05;
    this.isRising = true;
    this.rotOffset = Math.PI;
    this.riseTimeMax = 3000;
    this.riseTime = 0;
    this.isSinking = false;
    this.riseStartOffset = -100;
    this.gameObject = new THREE.Object3D();
    this.gameObject.position.set(GLOBALS.WORLD_SIZE + this.riseStartOffset, 0, 0);

    // (1.26)
    this.gateSpawnAngles = [0.32, 1.58, 2.84, 4.1, 5.37];
    this.spawnDoor = 0;

    this.passedRockCheck = false;
    this.forwardAxis = new THREE.Vector3(0, 0, 1);
    this.yawAxis = new THREE.Vector3(1, 0, 0);

    this.BOMBER_TIME_MAX = 4500;
    this.bomberTime = this.BOMBER_TIME_MAX;
    this.isActive = true;

    // const hitGeo = new THREE.SphereGeometry(this.hitRadius, 10, 10);
    // this.gameObject = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ wireframe: true, color: 0xffffff }));

    this.flashTime = 0;
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xfafafa });
    this.flashMat2 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.BackSide });
    
    // this mat might need to change
    this.factoryMat = new THREE.MeshPhongMaterial({
      flatShading: true,
      color: 0x888888,
      shininess: 0.1,
    });
    this.portMat = new THREE.MeshPhongMaterial({
      flatShading: true,
      color: 0x333333,
      shininess: 0.1,
    });
    const gateMat = new THREE.MeshPhongMaterial({
      flatShading: true,
      color: 0xAAAAAA,
      shininess: 0.1,
    });
    this.bodyMatOffset = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 1.0,
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
        this.outline = new THREE.Mesh(geo, this.bodyMatOffset);
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

    this.light = new THREE.PointLight(0x770000, 0.0, 20000);
    this.light2 = new THREE.PointLight(0x770000, 0.0, 20000);
    this.gameObject.add(this.light);
    this.gameObject.add(this.light2);
    this.light.position.set(1000, 0, 0);
    this.light2.position.set(200, 0, 0);

    // start with player position
    this.moveSphere.rotation.set(playerRot.x, playerRot.y, playerRot.z);
    const startOffset = -Math.PI / 5 - (Math.random() * Math.PI / 6);

    // move away from player based on randomly generated position
    this.moveSphere.rotateOnAxis(this.yawAxis, angle);
    this.moveSphere.rotateOnAxis(this.forwardAxis, -startOffset);

    // smokeStacks
    this.smokeStacks = [
      new SmokeStack(this.gameObject, new THREE.Vector3(28, -2, 9)),
      new SmokeStack(this.gameObject, new THREE.Vector3(35, 0.3, -3)),
      new SmokeStack(this.gameObject, new THREE.Vector3(38, 5.3, -6)),
    ];

    this.smokeStacks.forEach(s => s.startEmitting());
  }

  getPosition() {
    // Calc world position on first use
    this.gameObject.getWorldPosition(this.worldPos);
    return this.worldPos.clone();
  }

  subHealth(amt) {
    this.hp -= amt;

    if (this.hp <= 0) {
      this.isSinking = true;
      this.sinkTime = 0;
    }

    this.smokeStacks.forEach(s => s.increase());
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
    this.outline.material = this.flashMat2;
  }

  stopFlash() {
    this.factory.material = this.factoryMat;
    this.ports.material = this.portMat;
    this.outline.material = this.bodyMatOffset;
  }

  update(dt) {
    if (this.isRising) {
      this.riseTime += dt;
      if (this.riseTime >= this.riseTimeMax) {
        this.riseTime = this.riseTimeMax;
        this.isRising = false;
      } else if (this.riseTime >= this.riseTimeMax*0.5) {
        this.smokeStacks.forEach(s => s.update(dt));
      }

      const timeRatio = this.riseTime / this.riseTimeMax * (this.riseTime / this.riseTimeMax - 2);
      this.gameObject.rotation.x = (timeRatio * (this.rotOffset)) + this.rotOffset;
      const pos = (timeRatio * (this.riseStartOffset)) + this.riseStartOffset;
      this.gameObject.position.x = GLOBALS.WORLD_SIZE + pos;
    } else if (this.isSinking) {
      this.sinkTime += dt;
      if (this.sinkTime >= 5000) {
        this.scene.remove(this.moveSphere);
        this.isActive = false;
      }

      const timeRatio = this.sinkTime / 1500;
      const pos = (timeRatio * (timeRatio) * (-80));
      this.gameObject.position.x = GLOBALS.WORLD_SIZE + pos;
      const sinkTimeFactor = Math.pow(this.sinkTime, 0.9) / 2.0;
      this.gameObject.position.y = 2*Math.cos(sinkTimeFactor);
      this.gameObject.position.z = 2*Math.sin(sinkTimeFactor);
    } else {
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

      this.smokeStacks.forEach(s => s.update(dt));
    }
  }
}

export default Boss;
