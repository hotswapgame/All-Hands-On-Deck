import * as THREE from 'three';
import { GAME_TYPES } from '../Constants';

import { getModel } from '../AssetManager';
import { isInRange } from '../utils';

import { playSound } from '../SoundPlayer';

class EnemyShip {
  constructor(scene, worldSize, fireCannon) {
    this.type = GAME_TYPES.ENEMY;
    this.scene = scene;
    this.worldSize = worldSize;
    this.fireCannon = fireCannon;
    this.speed = 0.009 / worldSize;
    this.forwardAxis = new THREE.Vector3(0, 0, 1);
    this.yawAxis = new THREE.Vector3(1, 0, 0);

    this.isActive = false;
    this.floatPos = 0;
    this.floatAcc = 0;
    this.floatVel = 0;
    this.restingPos = this.worldSize - 2;
    this.headingRotation = 0;

    this.isDying = false;
    this.deathTime = 0;
    this.DEATH_TIME_MAX = 1000;
    this.deathRollDir = 0;

    this.pitchSpawnOffset = 0;
    this.pitchOffset = 0;
    this.pitchSpeed = 0;
    this.pitchAcc = 0;

    this.shootTimer = 0;
    this.shootMax = 5000;

    // Used to calc actual world position
    this.worldPos = new THREE.Vector3();
    this.hitPos = new THREE.Vector3();

    // used to create a plane to track player
    this.forwardMarker = new THREE.Object3D();
    this.forwardMarker.position.y = worldSize - 2;

    // container for body of the ship
    this.gameObject = new THREE.Object3D();
    this.gameObject.rotateY(Math.PI / 2);
    this.ship = new THREE.Object3D();
    this.gameObject.add(this.ship);

    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    // Main body
    this.bodyMat = new THREE.MeshPhongMaterial({ flatShading: true, color: 0x444444 });
    getModel('./Assets/enemy/enemy_body_v2.stl')
      .then((geo) => {
        this.body = new THREE.Mesh(geo, this.bodyMat);
        this.ship.add(this.body);
      });

    // sail
    this.sailMat = new THREE.MeshPhongMaterial({ color: 0x111111, side: THREE.DoubleSide });
    getModel('./Assets/enemy/enemy_sail_v2.stl')
      .then((geo) => {
        this.sail = new THREE.Mesh(geo, this.sailMat);
        this.sail.position.y = 14.46; // hardcoded from model
        this.ship.add(this.sail);
      });

    // cannon
    this.cannonMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    getModel('./Assets/enemy/enemy_cannon.stl')
      .then((geo) => {
        this.cannon = new THREE.Mesh(geo, this.cannonMat);
        this.cannon.position.y = 23.99; // hardcoded from model
        this.ship.add(this.cannon);
      });

    const hitgeo = new THREE.SphereGeometry(6, 10, 10);
    this.hitboxes = [
      new THREE.Mesh(hitgeo, new THREE.MeshBasicMaterial({ wireframe: true })),
      new THREE.Mesh(hitgeo, new THREE.MeshBasicMaterial({ wireframe: true })),
    ];

    this.hitPositions = [
      new THREE.Vector3(0, 21, 3),
      new THREE.Vector3(0, 9, 3),
    ];

    // just replace this array with positions
    this.hitboxes.forEach((h, i) => {
      h.position.copy(this.hitPositions[i]);
      // this shows hitboxes
      h.visible = false;
      this.gameObject.add(h);
    });

    // this is the same thing as in all other actors
    this.moveSphere = new THREE.Object3D();
    this.moveSphere.add(this.gameObject);
    this.moveSphere.add(this.forwardMarker);
    this.scene.add(this.moveSphere);
    this.gameObject.visible = false;
    this.id = this.gameObject.id;// for collisions!
  }

  getPosition() {
    return this.hitPos;
  }

  calcHit(position, d) {
    return this.hitPos.distanceTo(position) < d + this.hitRadius;
  }

  getHit(ballPos) {
    let isHit = false;

    this.hitboxes.forEach((b) => {
      // get this hitbox world position
      const worldP = new THREE.Vector3();
      b.getWorldPosition(worldP);

      // hitbox rad + sphere rad = 9
      if (worldP.distanceTo(ballPos) < 9) {
        isHit = true;
      }
    });

    return isHit;
  }

  getEnemyHit(enemy) {
    let isHit = false;
    const worldP = new THREE.Vector3();
    const enemyWorldP = new THREE.Vector3();

    this.hitboxes.forEach((b) => {
      // get this hitbox world position
      b.getWorldPosition(worldP);

      enemy.hitboxes.forEach((ehb) => {
        ehb.getWorldPosition(enemyWorldP);
        if (worldP.distanceTo(enemyWorldP) < 12) isHit = true;
      });
    });

    return isHit;
  }

  // Spawn within an arc of the player at a set distance
  spawn(playerRot, spawnSide) {
    this.isActive = true;
    this.floatPos = -20;
    this.pitchSpawnOffset = -Math.PI / 3;

    // start with player position
    this.moveSphere.rotation.set(playerRot.x, playerRot.y, playerRot.z);
    const yawOffset = Math.PI + (Math.random() * Math.PI / 4) * spawnSide;
    const startOffset = -Math.PI / 4;

    // move away from player based on randomly generated position
    this.moveSphere.rotateOnAxis(this.yawAxis, yawOffset);
    this.moveSphere.rotateOnAxis(this.forwardAxis, startOffset);

    // Add top level obj to scene
    this.gameObject.visible = true;

    // fix roll offset from death animation
    this.gameObject.rotation.y = Math.PI / 2;
    // trigger spawning animation right here
  }

  die() {
    // trigger death animation
    this.isActive = false;
    this.isDying = true;
    this.deathTime = 0;
    this.deathRollDir = Math.random() > 0.5 ? 1 : -1;
  }

  showFlash() {
    this.body.material = this.flashMat;
    this.sail.material = this.flashMat;
    this.cannon.material = this.flashMat;
  }

  stopFlash() {
    this.body.material = this.bodyMat;
    this.sail.material = this.sailMat;
    this.cannon.material = this.cannonMat;
  }

  hide() {
    this.floatPos = -20;
    this.gameObject.visible = false;
    this.stopFlash();
    this.isDying = false;
  }

  addPitch(impulse) {
    this.pitchSpeed += impulse;
  }

  updatePitch(dt) {
    // I should probs use dt in here somewhere
    // calc rotation direction
    if (this.ship.rotation.x > 0) {
      this.pitchAcc = -0.0003;
    } else if (this.ship.rotation.x < 0) {
      this.pitchAcc = 0.0003;
    }

    this.ship.rotation.x = this.pitchSpawnOffset;
    // Only roll when there is roll speed
    if (this.pitchSpeed !== 0) {
      // Stop the roll if the speed is low and at center
      if (isInRange(0.0015, -0.0015, this.pitchOffset) && isInRange(0.0015, -0.0015, this.pitchSpeed)) {
        this.pitchSpeed = 0;
      } else {
        this.pitchSpeed += this.pitchAcc;
        this.pitchSpeed *= 0.98;
        this.pitchOffset += this.pitchSpeed;
        this.ship.rotation.x = this.pitchOffset + this.pitchSpawnOffset;
      }
    }
  }

  updateFloat(dt) {
    this.floatAcc = -1 * (this.floatPos) * 0.00001;
    this.floatVel += this.floatAcc * dt;
    this.floatVel *= 0.935;
    this.floatPos += this.floatVel * dt;
    this.gameObject.position.x = this.restingPos + this.floatPos;
    this.pitchSpawnOffset = -this.floatPos / this.restingPos * Math.PI * 4;
  }

  // Logic for seeking the player
  updateHeading(dt, playerPos) {
    this.gameObject.getWorldPosition(this.worldPos);
    const forwardVec = new THREE.Vector3();
    this.forwardMarker.getWorldPosition(forwardVec);
    // B′=B−A, C′=C−A, X′=X−A.
    const cross = new THREE.Vector3().crossVectors(this.worldPos, forwardVec).normalize();
    const planeTest = cross.dot(playerPos.normalize());
    let turn = 0;
    if (planeTest > 0.001 || planeTest < -0.001) turn = planeTest > 0 ? 1 : -1;
    this.headingRotation = turn;
    // hard coded turn rate at end, maybe make this a twean
    this.moveSphere.rotateOnAxis(this.yawAxis, dt * turn * 0.0003);
  }

  update(dt, playerPos) {
    if (this.isActive) {
      this.updatePitch(dt);
      this.updateFloat(dt);
      this.updateHeading(dt, playerPos);

      // maybe add another enemy that's got cannons at the side
      // move
      this.moveSphere.rotateOnAxis(this.forwardAxis, this.speed * dt);

      // Fire cannon every time the timer is at the right value
      this.shootTimer += dt;
      if (this.shootTimer >= this.shootMax) {
        this.shootTimer = 0;
        playSound('CANNON');
        this.fireCannon(this.moveSphere.rotation, this.headingRotation * 0.0003);
        this.addPitch(0.006);
      }
    } else if (this.isDying) {
      this.deathTime += dt;
      // white flash
      if (this.deathTime < 60) {
        this.showFlash();
      } else {
        this.stopFlash();

        // roll over
        const rollOffset = dt * this.deathRollDir * 0.003;
        this.gameObject.rotateY(rollOffset);
        // float
        const sinkPos = -(this.deathTime - 60) / this.DEATH_TIME_MAX * 20;
        this.gameObject.position.x = this.restingPos + sinkPos;
      }

      // hide
      if (this.deathTime > this.DEATH_TIME_MAX) this.hide();
    }
  }
}

export default EnemyShip;
