import * as THREE from 'three';
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
    this.speed = 0.0001;

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
    this.startupTime = 4000;
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

  // checkHit(pos, r) {

  // }

  die() {
    // trigger death animation
    this.isActive = false;
    this.isDying = false; // true;
    // this.deathTime = 0;
    // this.deathRollDir = Math.random() > 0.5 ? 1 : -1;
    this.scene.remove(this.moveSphere);
  }

  // hide() { // remove from scene }

  updateHeading(dt, playerPos) {
    const forwardVec = new THREE.Vector3();
    this.forwardMarker.getWorldPosition(forwardVec);

    const leftVec = new THREE.Vector3();
    this.leftMarker.getWorldPosition(leftVec);
    // B′=B−A, C′=C−A, X′=X−A.
    const forwardCross = new THREE.Vector3().crossVectors(this.worldP, forwardVec).normalize();

    const planeTest = forwardCross.dot(playerPos.normalize());
    let turn = 0;
    if (planeTest > 0.004 || planeTest < -0.004) turn = planeTest > 0 ? 1 : -1;

    this.headingRotation = turn;
    // hard coded turn rate at end, maybe make this a twean
    this.moveSphere.rotateOnAxis(this.yawAxis, dt * turn * 0.0007);
  }

  update(dt, playerPos) {
    if (this.isActive) {
      // update world pos
      this.gameObject.getWorldPosition(this.worldP);

      if (this.startupTime < 0) {
        this.updateHeading(dt, playerPos);
        this.moveSphere.rotateOnAxis(this.forwardAxis, this.speed * dt);
      } else {
        this.startupTime -= dt;
        this.moveSphere.rotateOnAxis(this.forwardAxis, this.speed * dt * 0.3);
      }
    }
  }
}

export default Bomber;
