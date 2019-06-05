import * as THREE from 'three';

import JetSpray from './JetSpray';
import { getModel } from '../AssetManager';
import { GLOBALS } from '../Constants';

class Bomber {
  constructor(scene, bossRot, spawnAngle) {
    this.scene = scene;
    this.gameObject = new THREE.Object3D();
    this.modelScale = 50;

    this.gameObject.position.setX(GLOBALS.WORLD_SIZE - 2);
    this.forwardAxis = new THREE.Vector3(0, 0, 1);
    this.yawAxis = new THREE.Vector3(1, 0, 0);
    this.speed = 0.00008;

    // Steering markers
    this.forwardMarker = new THREE.Object3D();
    this.forwardMarker.position.y = GLOBALS.WORLD_SIZE;
    this.leftMarker = new THREE.Object3D();
    this.leftMarker.position.z = GLOBALS.WORLD_SIZE;

    const bodyMat = new THREE.MeshPhongMaterial({
      flatShading: true,
      color: 0x333333,
      shininess: 0.1,
      side: THREE.DoubleSide,
    });

    getModel('./Assets/bomber/bomber.stl')
      .then((geo) => {
        this.body = new THREE.Mesh(geo, bodyMat);
        this.body.scale.set(this.modelScale, this.modelScale, this.modelScale);
        this.body.rotateY(Math.PI / 2);
        // this.body.position.set(this.baseSink, 0, 0);
        this.gameObject.add(this.body);
      });

    this.worldP = new THREE.Vector3();
    this.moveSphere = new THREE.Object3D();
    this.moveSphere.add(this.gameObject);
    this.moveSphere.add(this.forwardMarker);
    this.moveSphere.add(this.leftMarker);

    this.scene.add(this.moveSphere);

    this.isActive = true;
    this.startupTime = 4500;
    this.moveSphere.rotation.set(bossRot.x, bossRot.y, bossRot.z);
    this.moveSphere.rotateOnAxis(this.yawAxis, spawnAngle);

    const hitgeo = new THREE.SphereGeometry(5, 10, 10);
    this.hitboxes = [
      new THREE.Mesh(hitgeo, new THREE.MeshBasicMaterial({ wireframe: true })),
      new THREE.Mesh(hitgeo, new THREE.MeshBasicMaterial({ wireframe: true })),
    ];

    this.hitPositions = [
      new THREE.Vector3(3, 12, 0),
      new THREE.Vector3(3, 4, 0),
    ];

    // just replace this array with positions
    this.hitboxes.forEach((h, i) => {
      h.position.copy(this.hitPositions[i]);
      // this shows hitboxes
      h.visible = false;
      this.gameObject.add(h);
    });

    this.jetSpray = new JetSpray(this.gameObject, new THREE.Vector3(1, 1, 0));
  }

  getHit(ballPos) {
    let isHit = false;

    this.hitboxes.forEach((b) => {
      // get this hitbox world position
      const worldP = new THREE.Vector3();
      b.getWorldPosition(worldP);

      // hitbox rad + sphere rad = 9
      if (worldP.distanceTo(ballPos) < 10) {
        isHit = true;
      }
    });

    return isHit;
  }

  die() {
    // trigger death animation
    this.isActive = false;
    this.isDying = false; // true;
    // this.deathTime = 0;
    // this.deathRollDir = Math.random() > 0.5 ? 1 : -1;
    this.scene.remove(this.moveSphere);
  }

  updateHeading(dt, playerPos, bosses) {
    const forwardVec = new THREE.Vector3();
    this.forwardMarker.getWorldPosition(forwardVec);

    const leftVec = new THREE.Vector3();
    this.leftMarker.getWorldPosition(leftVec);
    // B′=B−A, C′=C−A, X′=X−A.
    const forwardCross = new THREE.Vector3().crossVectors(this.worldP, forwardVec).normalize();
    const sideCross = new THREE.Vector3().crossVectors(this.worldP, leftVec).normalize();

    const planeTest = forwardCross.dot(playerPos.normalize());
    let turn = 0;
    if (planeTest > 0.004 || planeTest < -0.004) turn = planeTest > 0 ? 1 : -1;

    bosses.forEach((b) => {
      // Check if boss is close

      if (b.getPosition().distanceTo(this.worldP) < 300) {
        const bossPos = b.getPosition().normalize();
        const sideTest = sideCross.dot(bossPos);
        const frontTest = forwardCross.dot(bossPos);
        // See if boss is in front
        if (sideTest < 0) {
          // tweak to find angle of avoidance
          if (frontTest < 0.2 && frontTest > -0.2) turn = frontTest > 0 ? -1.5 : 1.5;
        }
      }
    });

    this.headingRotation = turn;
    // hard coded turn rate at end, maybe make this a twean
    this.moveSphere.rotateOnAxis(this.yawAxis, dt * turn * 0.0005);
  }

  update(dt, playerPos, bosses) {
    if (this.isActive) {
      // update world pos
      this.gameObject.getWorldPosition(this.worldP);

      if (this.startupTime < 0) {
        this.updateHeading(dt, playerPos, bosses);
        this.moveSphere.rotateOnAxis(this.forwardAxis, this.speed * dt);
        this.jetSpray.update(dt);
      } else {
        this.startupTime -= dt;
        this.moveSphere.rotateOnAxis(this.forwardAxis, this.speed * dt * 0.3);

        if (this.startupTime < 0) this.jetSpray.startEmitting();
      }
    }
  }
}

export default Bomber;
