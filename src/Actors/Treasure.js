import * as THREE from 'three';
import { any } from 'ramda';

import { GAME_TYPES } from '../Constants';
import { getModel } from '../AssetManager';

class Treasure {
  constructor(scene, worldSize, rocks) {
    this.type = GAME_TYPES.TREASURE;
    this.scene = scene;
    this.worldSize = worldSize;
    this.rocks = rocks;
    this.passedRockCheck = false;
    this.spawnRot = new THREE.Vector3();

    // Positioning... really only need this on spawn
    this.forwardAxis = new THREE.Vector3(0, 0, 1);
    // Used to calc actual world position
    this.worldPos = new THREE.Vector3();
    this.deathWorldPos = new THREE.Vector3();

    // Three stuff
    this.gameObject = new THREE.Object3D();
    this.markerFloatMax = -5; // MAX -4.3 MIN -7
    this.chestPosMin = -20;

    this.markerMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    getModel('./Assets/Treasure/xmark.stl')
      .then((geo) => {
        this.marker = new THREE.Mesh(geo, this.markerMat);
        this.marker.scale.set(25, 25, 25);
        this.marker.position.x = this.markerFloat;
        this.marker.rotateY(Math.PI / 2);
        this.gameObject.add(this.marker);
      });

    this.chestMat = new THREE.MeshPhongMaterial({ color: 0xDDDD99 });
    this.chestMatOffset = new THREE.MeshBasicMaterial({ color: 0xFFFFAA, side: THREE.BackSide });
    this.chest = new THREE.Object3D();
    this.gameObject.add(this.chest);
    this.chest.position.x = -20;

    this.chestScale = 7;
    getModel('./Assets/Treasure/chest_body.stl')
      .then((geo) => {
        this.chestBody = new THREE.Mesh(geo, this.chestMat);
        this.chestBody.scale.set(this.chestScale, this.chestScale, this.chestScale);

        this.chestBody.rotateY(Math.PI / 2);
        this.chest.add(this.chestBody);
      });
    getModel('./Assets/Treasure/chest_body_offset.stl')
      .then((geo) => {
        this.chestBodyOffset = new THREE.Mesh(geo, this.chestMatOffset);
        this.chestBodyOffset.scale.set(this.chestScale, this.chestScale, this.chestScale);

        this.chestBodyOffset.rotateY(Math.PI / 2);
        this.chest.add(this.chestBodyOffset);
      });

    getModel('./Assets/Treasure/chest_top.stl')
      .then((geo) => {
        this.topRotContainer = new THREE.Object3D();
        this.chestTop = new THREE.Mesh(geo, this.chestMat);

        this.chestTop.scale.set(this.chestScale, this.chestScale, this.chestScale);
        this.chestTop.rotateY(Math.PI / 2);
        this.topRotContainer.position.y = this.chestScale * 0.75; // actually forward
        this.topRotContainer.position.x = this.chestScale * 0.89; // actually up
        // pivot axis = z, max rot = Math.PI / 3;
        // this.topRotContainer.rotation.z = (Math.PI / 3);
        this.topRotContainer.add(this.chestTop);
        this.chest.add(this.topRotContainer);
      });
    getModel('./Assets/Treasure/chest_top_offset.stl')
      .then((geo) => {
        this.topRotContainerOffset = new THREE.Object3D();
        this.chestTopOffset = new THREE.Mesh(geo, this.chestMatOffset);

        this.chestTopOffset.scale.set(this.chestScale, this.chestScale, this.chestScale);
        this.chestTopOffset.rotateY(Math.PI / 2);
        this.topRotContainerOffset.position.y = this.chestScale * 0.75; // actually forward
        this.topRotContainerOffset.position.x = this.chestScale * 0.89; // actually up
        // pivot axis = z, max rot = Math.PI / 3;
        // this.topRotContainer.rotation.z = (Math.PI / 3);
        this.topRotContainerOffset.add(this.chestTopOffset);
        this.chest.add(this.topRotContainerOffset);
      });

    this.triggerRadius = 42;
    this.triggerAnimationMax = 1500;
    this.triggerAnimationTime = this.triggerAnimationMax;
    this.isTriggered = false;
    this.isOpening = false;
    this.openTimeMax = 800;
    this.openTime = this.openTimeMax;
    this.isHiding = false;

    // this is the same thing as in all other actors
    this.moveSphere = new THREE.Object3D();
    this.moveSphere.add(this.gameObject);
    this.scene.add(this.moveSphere);
    this.gameObject.position.x = worldSize;
    this.gameObject.visible = false;
    this.isActive = false;
    this.id = this.gameObject.id; // for collisions!
  }

  spawn(spawnRot) {
    this.isActive = true;
    // randomly rotate the model, or spin it on update
    this.spawRot = spawnRot;

    // start with player position
    this.moveSphere.rotation.set(spawnRot.x, spawnRot.y, spawnRot.z);

    // Spawn opposite of player
    this.moveSphere.rotateOnAxis(this.forwardAxis, Math.PI / 2);

    // fix roll offset from death animation
    this.gameObject.visible = true;
  }

  hide() {
    this.isActive = false;
    this.gameObject.visible = false;
    // reset trigger timer, open timer, top rotation, positions? isStates
    this.isTriggered = false;
    this.isOpening = false;
    this.isHiding = false;
    this.deathWorldPos.copy(this.worldPos);

    this.topRotContainer.rotation.z = 0;
    this.topRotContainerOffset.rotation.z = 0;
    this.openTime = this.openTimeMax;
    this.triggerAnimationTime = this.triggerAnimationMax;
    this.passedRockCheck = false;
  }

  checkTrigger(playerPos) {
    // get this hitbox world position
    const worldP = new THREE.Vector3();
    this.gameObject.getWorldPosition(worldP);

    // This seems like a good distance
    this.isTriggered = worldP.distanceTo(playerPos) < (this.triggerRadius);
  }

  keyTurnCheck() {
    if (!this.isOpening && this.isTriggered
        && this.triggerAnimationMax / 3 > this.triggerAnimationTime) {
      // do that sweet end animation code
      this.isOpening = true;
    }
  }

  update(dt) {
    if (this.isActive) {
      if (!this.passedRockCheck) {
        this.gameObject.getWorldPosition(this.worldPos);
        if (this.worldPos.x !== this.deathWorldPos.x) {
          const posCheck = r => (r.getPosition().distanceTo(this.worldPos)
                                 < 25 + r.spawnBlockRadius);
          this.passedRockCheck = !any(posCheck)(this.rocks);

          // start with player position
          this.moveSphere.rotation.set(this.spawnRot.x, this.spawnRot.y, this.spawnRot.z);

          // Spawn opposite of player
          this.moveSphere.rotateOnAxis(
            this.forwardAxis,
            Math.PI / 2 + (Math.PI / 4 * Math.random())
          );
        }
      }
      const triggerOffset = (1 - (this.triggerAnimationTime / this.triggerAnimationMax));
      // some hard coded position bs
      // Tweak these with ease
      this.marker.position.x = this.markerFloatMax - 3 * triggerOffset;
      this.chest.position.x = this.chestPosMin + this.chestScale * 3 * triggerOffset;
      if (this.isTriggered) {
        if (this.triggerAnimationTime > 0) {
          this.triggerAnimationTime -= dt;
        } else {
          this.triggerAnimationTime = 0;
        }
      } else if (this.triggerAnimationTime < this.triggerAnimationMax) {
        this.triggerAnimationTime += dt;
      }

      if (this.isOpening) {
        if (this.openTime + 300 > this.openTimeMax) {
          this.topRotContainer.rotation.z += Math.PI / 2 * dt / this.openTimeMax;
          this.topRotContainerOffset.rotation.z += Math.PI / 2 * dt / this.openTimeMax;
        }

        this.openTime -= dt;

        if (this.openTime < 0) {
          this.isHiding = true;
          this.isOpening = false;
          this.hide();
        }
      }
    }
  }
}

export default Treasure;
