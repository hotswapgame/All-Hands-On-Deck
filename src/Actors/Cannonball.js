import * as THREE from 'three';

import { GAME_TYPES, SHIP_DIRECTIONS } from '../Constants';
import { getModel } from '../AssetManager';
import Explosion from './Explosion';
import { playExplosion } from '../SoundPlayer';

class Cannonball {
  constructor(scene, worldSize) {
    // Constant properties
    this.type = GAME_TYPES.CANNONBALL;
    this.scene = scene;
    this.worldSize = worldSize;
    this.speed = 0.0003; // 0.07 / worldSize;
    this.enemySpeed = 0.0003; // 0.06 / worldSize;
    this.playerSpeed = 0.0002; // 0.04 / worldSize; // Use only when player owner
    this.forwardAxis = new THREE.Vector3(0, 0, 1);
    this.yawAxis = new THREE.Vector3(1, 0, 0);
    this.hitRadius = 3; // Size for calculating collisions

    this.hitBuffer = 100;

    this.angularV = 0;

    this.isActive = false;
    this.isExploding = false;
    this.ownerType = ''; // set when fired
    this.accelCounter = 1000;
    this.playerAxis = new THREE.Vector3(0, 0, 0);
    // Used to store world position
    this.worldPos = new THREE.Vector3();
    this.worldQuat = new THREE.Quaternion();

    this.flightTime = 0;
    this.maxFlight = 1500;
    this.enemyMaxFlight = 8000;
    this.smokeTime = 0;
    this.smokeMax = 500;

    // maybe scale it up after it fires
    const ballGeo = new THREE.SphereGeometry(1, 32, 32); // un hardcode these pls
    const ballMat = new THREE.MeshBasicMaterial({ flatShading: true, color: 0xFFFFFF });
    const enemyMat = new THREE.MeshLambertMaterial({ flatShading: true, color: 0x111111 });

    // This game object is just one model, the ball itself
    this.gameObject = new THREE.Object3D();
    this.gameObject.position.x = worldSize + 4;
    this.gameObject.visible = false;

    this.playerMesh = new THREE.Mesh(ballGeo, ballMat);
    this.playerMesh.visible = false;
    this.gameObject.add(this.playerMesh);
    getModel('./Assets/enemy/spike.stl')
      .then((geo) => {
        this.enemyMesh = new THREE.Mesh(geo, enemyMat);
        this.enemyMesh.visible = false;
        this.gameObject.add(this.enemyMesh);
      });

    // Fire Smoke
    // maybe scale it up after it fires
    const smokeGeo = new THREE.SphereGeometry(3, 15, 15); // un hardcode these pls
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.smoke = new THREE.Object3D();
    this.smokePuffs = Array.from(
      { length: 10 },
      (_, i) => {
        const mesh = new THREE.Mesh(smokeGeo, smokeMat);
        this.smoke.add(mesh);
        const x = Math.cos((i + 1) / 10 * 2 * Math.PI);
        const z = Math.sin((i + 1) / 10 * 2 * Math.PI);
        const spoke = new THREE.Vector3(x, 0.5, z);
        spoke.normalize();

        return {
          mesh,
          spoke,
        };
      }
    );
    // this.smoke.visible = false;

    this.explosion = new Explosion(this.gameObject, 500, this.hide.bind(this));

    // this is the same thing as in all other actors
    this.moveSphere = new THREE.Object3D();
    this.moveSphere.add(this.gameObject);
    this.scene.add(this.moveSphere);
    this.scene.add(this.smoke);

    // bc emit smoke was the bottle neck
    this.shouldEmitSmoke = false;
    this.shouldExplode = 0;
  }

  updateWorldPos() {
    this.gameObject.getWorldPosition(this.worldPos);
    this.gameObject.getWorldQuaternion(this.worldQuat);
  }

  getPosition() {
    return this.worldPos.clone();
  }

  fire(ownerType) {
    this.isActive = true;
    this.gameObject.visible = true;
    this.smoke.visible = true;
    this.smokeTime = 0;
    this.accelCounter = 300;
    this.ownerType = ownerType;
    // Initialize size for startup animation
    this.gameObject.scale.set(0.001, 0.001, 0.001);
    this.shouldExplode = 0;
    this.hitBuffer = 100;
  }

  emitSmoke() {
    this.updateWorldPos();
    // set fire smoke stuff
    this.smoke.position.copy(this.worldPos);
    this.smoke.setRotationFromQuaternion(this.worldQuat);
    this.smokePuffs.forEach((puff) => {
      puff.mesh.position.set(0, 0, 0);
    });

    this.shouldEmitSmoke = false;
    // this.smoke.rotation.setFromQuaternion(this.worldQuat);
  }

  updateSmoke(dt) {
    if (this.shouldEmitSmoke) this.emitSmoke();
    // move smoke puffs
    if (this.smokeTime < this.smokeMax) {
      this.smokeTime += dt;
      const s = 1 - (this.smokeTime / this.smokeMax);
      this.smokePuffs.forEach((puff) => {
        puff.mesh.scale.set(0.8 * s, 0.8 * s, 0.8 * s);
        puff.mesh.position.add(puff.spoke.clone().multiplyScalar(dt / 70));
      });
    } else {
      this.smoke.visible = false;
    }
  }

  enemyFire(enemyRot, startOffset, angularVelocity) {
    this.fire(GAME_TYPES.ENEMY);
    this.enemyMesh.visible = true;

    // gotta move it so smoke is at right spot
    this.gameObject.position.x = this.worldSize + 4;

    // Set position, then rotate to front of cannon
    this.moveSphere.rotation.set(enemyRot.x, enemyRot.y, enemyRot.z);
    this.moveSphere.rotateOnAxis(this.forwardAxis, startOffset);
    this.angularV = angularVelocity;

    this.shouldEmitSmoke = true;
    this.shouldExplode = 0;
  }

  // Fires cannonball as if rom player
  playerFire(side, playerRot, startOffset, cannonOffset, cannonRotOffset) {
    this.fire(GAME_TYPES.PLAYER);
    this.playerMesh.visible = true;

    // gotta move it so smoke is at right spot
    this.gameObject.position.x = this.worldSize + 4;

    // Set position, then move to relative position of cannon
    this.moveSphere.rotation.set(playerRot.x, playerRot.y, playerRot.z);
    this.moveSphere.rotateOnAxis(this.forwardAxis, startOffset);

    // Based on the side it is fired from, rotate and set player forward axis
    // Might want to make this section generic
    if (side === SHIP_DIRECTIONS.PORT) {
      this.moveSphere.rotateOnAxis(this.yawAxis, Math.PI / 2);
      this.playerAxis = new THREE.Vector3(0, 1, 0);
    } else {
      this.moveSphere.rotateOnAxis(this.yawAxis, -Math.PI / 2);
      this.playerAxis = new THREE.Vector3(0, -1, 0);
    }
    // offset for cannon spot
    this.moveSphere.rotateOnAxis(this.yawAxis, cannonRotOffset);

    // Move to front of cannon
    this.moveSphere.rotateOnAxis(this.forwardAxis, cannonOffset);

    this.shouldEmitSmoke = true;
    this.shouldExplode = 0;
  }

  hide() {
    this.isActive = false;
    this.gameObject.visible = false;
    this.playerMesh.visible = false;
    this.enemyMesh.visible = false;
    this.smoke.visible = false;
    this.flightTime = 0;
    this.isExploding = false;
    this.shouldExplode = 0;
  }

  // Triggers exploding animation
  explode() {
    // trigger explosion animation instead
    this.explosion.start();
    this.isExploding = true;

    playExplosion();

    this.playerMesh.visible = false;
    this.enemyMesh.visible = false;
    this.smoke.visible = false;
    this.isActive = false;
    this.flightTime = 0;
    this.shouldExplode = 0;
  }

  // Triggers splashing animation
  splash() {
    // trigger splash animation instead
    this.hide();
  }

  explodeNextUpdate() {
    if (this.shouldExplode === 0) this.shouldExplode = 5;
  }

  update(dt) {
    this.explosion.update(dt);
    if (this.isActive) {
      this.updateSmoke(dt);
      this.hitBuffer -= dt;

      let move = dt * this.speed;
      if (this.ownerType === GAME_TYPES.ENEMY) {
        move = dt * this.enemySpeed;
        this.enemyMesh.rotateZ(dt * 0.005);
      }


      // Starting animation that speeds up cannonball when first fired
      if (this.accelCounter > 0) {
        this.accelCounter -= dt;
        move *= this.accelCounter / 150;
        move = move < dt * this.speed ? dt * this.speed : move;

        const s = 3 * (300 - this.accelCounter) / 270;
        this.gameObject.scale.set(s, s, s);
        this.gameObject.position.x = this.worldSize + 4;
      } else {
        // Adds to the flight time and moves the cannon closer to water
        this.flightTime += dt;
        // calc distance from surface of water
        const max = this.ownerType === GAME_TYPES.ENEMY ? this.enemyMaxFlight : this.maxFlight;
        const dist = (4 * (max - this.flightTime) / max);
        this.gameObject.position.x = this.worldSize + dist;

        // I want it to go below the water so I added an extra buffer here, thats the 500
        if (this.flightTime > max + 500) {
          this.splash();
        }

        this.gameObject.scale.set(3, 3, 3);
      }

      // Movement
      this.moveSphere.rotateOnAxis(this.forwardAxis, move);
      // add player angular speed
      if (this.ownerType === GAME_TYPES.PLAYER) {
        this.moveSphere.rotateOnAxis(this.playerAxis, dt * this.playerSpeed);
      } else if (this.ownerType === GAME_TYPES.ENEMY) {
        // this.moveSphere.rotateOnAxis(this.yawAxis, dt * this.angularV);
      }
      this.updateWorldPos();

      if (this.shouldExplode < 0) this.explode();
      else if (this.shouldExplode >= 1) this.shouldExplode -= 3;
    }
  }
}

export default Cannonball;
