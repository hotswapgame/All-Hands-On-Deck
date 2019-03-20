import * as THREE from 'three';
import { clamp } from 'ramda';

import { GAME_TYPES, SHIP_DIRECTIONS } from '../Constants';
// maybe use asset manager only in one spot so I
// can do the loading screen thing, then pass the models
// or since it's memoized just do a preload somewhere
import { getModel } from '../AssetManager';
import { isInRange } from '../utils';
import Flame from './Flame';
import SpeechBubble, { SPRITES } from './SpeechBubble';
import { playSound } from '../SoundPlayer';

class Player {
  constructor(scene, camera, worldSize, fireCannon, gameOverCallback, triggerShake) {
    this.type = GAME_TYPES.PLAYER;
    // move camera to a class that looks at the player maybe
    this.scene = scene;
    this.gameOverCallback = gameOverCallback;
    this.triggerShake = triggerShake;
    this.velocityMin = 0;
    this.velocityMax = 0.0002; // scaled to world size bc rotation
    this.velocityTarget = this.velocityMin;
    this.velocity = this.velocityMin;
    this.acceleration = 0.0000003;
    this.forwardAxis = new THREE.Vector3(0, 0, 1);
    this.yawAxis = new THREE.Vector3(1, 0, 0);
    this.worldPos = new THREE.Vector3(0, 0, 0); // stores world location
    this.TURN_MAX = 0.0004;

    this.rollOffset = 0;
    this.turnRollOffset = 0;

    this.turnRate = 0;
    this.rollSpeed = 0;
    this.rollAcc = 0;

    this.bobTime = 0;
    this.basePosition = worldSize - 4;

    // Set it to be on the edge of the world
    this.gameObject = new THREE.Object3D();
    this.gameObject.position.x = this.basePosition;
    this.gameObject.rotateY(Math.PI / 2);
    // this.isRockTurn = false;
    this.rockTurnVal = 0;
    this.rockTurnTime = 0;
    this.rockTurnTimeMax = 2000;
    this.rockHitRadius = 10;
    // visualize rock hitbox CURRENTLY NOT USED
    // this.rockHit = new THREE.Mesh(
    //   new THREE.SphereGeometry(this.rockHitRadius, 10, 10),
    //   new THREE.MeshBasicMaterial({ wireframe: true })
    // );
    // this.rockHit.position.y = 10;
    // this.gameObject.add(this.rockHit);

    // ship body
    this.ship = new THREE.Object3D();
    this.gameObject.add(this.ship);

    // this mat might need to change
    const bodyMat = new THREE.MeshPhongMaterial({
      flatShading: true,
      color: 0xCCCCCC,
      shininess: 0.1,
    });
    const bodyMatOffset = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
    });

    getModel('./Assets/pirate/pirate_body.stl')
      .then((geo) => {
        this.body = new THREE.Mesh(geo, bodyMat);
        this.ship.add(this.body);
      });
    getModel('./Assets/pirate/pirate_body_offset.stl')
      .then((geo) => {
        this.bodyOffset = new THREE.Mesh(geo, bodyMatOffset);
        this.ship.add(this.bodyOffset);
      });
    const specular = new THREE.Color(0xffffff);
    // Sails
    const sailMat = new THREE.MeshLambertMaterial({
      color: 0xFFFFFF,
      emissive: 0x999999,
      side: THREE.DoubleSide,
      // specular,
      shininess: 100,
      reflectivity: 0,
    });

    const sailWireMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      side: THREE.DoubleSide,
      wireframe: true,
      wireframeLinewidth: 5,
      opacity: 0,
    });

    // Front Sail
    const frontSailGeo = new THREE.Geometry();
    frontSailGeo.vertices.push(
      new THREE.Vector3(-5.67, -3.47, 22.56),
      new THREE.Vector3(5.67, 3.47, 8.06),
      new THREE.Vector3(-10.33, 0, 17.21),
      new THREE.Vector3(-9.30, -1.72, 9.10),
    );
    frontSailGeo.faces.push(
      new THREE.Face3(0, 1, 2),
      new THREE.Face3(3, 1, 2),
    );
    frontSailGeo.computeFaceNormals();

    this.frontSail = new THREE.Mesh(frontSailGeo, sailMat);
    this.frontSail.position.x = 2.07; // hard coded from model file
    this.frontSail.position.y = 18.80;
    this.frontSailWire = new THREE.Mesh(frontSailGeo, sailWireMat);
    this.frontSailWire.position.x = 2.07; // hard coded from model file
    this.frontSailWire.position.y = 18.75;

    this.ship.add(this.frontSail);
    this.ship.add(this.frontSailWire);

    // Back Sail
    const backSailGeo = new THREE.Geometry();
    backSailGeo.vertices.push(
      new THREE.Vector3(-6.55, -4.00, 25.46),
      new THREE.Vector3(6.55, 4.00, 8.72),
      new THREE.Vector3(-11.92, 0, 19.27),
      new THREE.Vector3(-10.73, -1.99, 9.92),
    );
    backSailGeo.faces.push(
      new THREE.Face3(0, 1, 2),
      new THREE.Face3(3, 1, 2),
    );
    backSailGeo.computeFaceNormals();

    this.backSail = new THREE.Mesh(backSailGeo, sailMat);
    this.backSail.position.x = 2.16; // hard coded from model file
    this.backSail.position.y = 7.29;
    this.ship.add(this.backSail);

    this.backSailWire = new THREE.Mesh(backSailGeo, sailWireMat);
    this.backSailWire.position.x = 2.16; // hard coded from model file
    this.backSailWire.position.y = 7.24;
    this.ship.add(this.backSailWire);

    const rudderMat = new THREE.MeshLambertMaterial({
      color: 0xFAFAFA,
      // specular,
      shininess: 100,
      reflectivity: 0,
    });
    getModel('./Assets/pirate/pirate_rudder.stl')
      .then((geo) => {
        this.rudder = new THREE.Mesh(geo, rudderMat);
        this.rudder.position.y = -8.18; // hard coded from model file
        this.ship.add(this.rudder);
      });

    // Map over these positions in loader to set cannon spot
    // values are hard coded from models
    this.portCannons = [[-2.49, 3.86, 0], [-3.49, 10.95, 0], [-2.49, 18.05, 0]];
    this.starboardCannons = [[2.49, 3.86, 0], [3.49, 10.95, 0], [2.49, 18.05, 0]];
    this.cannonMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    this.cannonOutlineMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0xffffff });
    getModel('./Assets/pirate/pirate_cannon.stl')
      .then((geo) => {
        this.portCannons = this.portCannons.map((position) => {
          const cannon = new THREE.Mesh(geo, this.cannonMat);
          cannon.position.set(...position);
          this.ship.add(cannon);
          return cannon;
        });

        this.starboardCannons = this.starboardCannons.map((position) => {
          const cannon = new THREE.Mesh(geo, this.cannonMat);
          // Gotta flip the model
          cannon.rotateZ(Math.PI);
          cannon.position.set(...position);
          this.ship.add(cannon);
          return cannon;
        });

        return getModel('./Assets/pirate/cannon_offset.stl');
      })
      .then((geo) => {
        this.portCannons = this.portCannons.map((cannon) => {
          const outline = new THREE.Mesh(geo, this.cannonOutlineMat);
          outline.position.copy(cannon.position);
          outline.visible = false;
          this.ship.add(outline);
          return { cannon, outline };
        });

        this.starboardCannons = this.starboardCannons.map((cannon) => {
          const outline = new THREE.Mesh(geo, this.cannonOutlineMat);
          outline.rotateZ(Math.PI);
          outline.position.copy(cannon.position);
          outline.visible = false;
          this.ship.add(outline);
          return { cannon, outline };
        });
      });

    // Hitbox stuff
    const hitgeo = new THREE.SphereGeometry(7, 10, 10);
    this.hitboxes = [
      new THREE.Mesh(hitgeo, new THREE.MeshBasicMaterial({ wireframe: true })),
      new THREE.Mesh(hitgeo, new THREE.MeshBasicMaterial({ wireframe: true })),
      new THREE.Mesh(hitgeo, new THREE.MeshBasicMaterial({ wireframe: true })),
    ];

    this.hitPositions = [
      new THREE.Vector3(0, 5, 8),
      new THREE.Vector3(0, -7, 8),
      new THREE.Vector3(0, 17, 8),
    ];

    this.hitboxes[0].position.copy(this.hitPositions[0]);
    // just replace this array with positions
    this.hitboxes.forEach((h, i) => {
      h.position.copy(this.hitPositions[i]);
      // this shows hitboxes
      h.visible = false;
      this.gameObject.add(h);
    });

    // Fire Cannon logic
    this.fireCannon = fireCannon; // passed in to use cannon pool
    // names for these need to match the constants
    this.ammo = { PORT: 0, STARBOARD: 0 };

    // [back, mid, front]
    this.CANNON_POS = [0, 0.025, 0.05];
    this.FIRE_ROLL_AMOUNT = { PORT: 0.007, STARBOARD: -0.007 };

    // Health stuff, AKA other fire
    this.onFire = false;
    this.fireTime = 0;
    this.fireTimeTotal = 0;
    this.fireScore = 0;
    this.fireMax = 20000;
    this.flames = [
      new Flame(this.gameObject, new THREE.Vector3(0, -5, 7), this.fireMax, false),
    ];

    this.deathFlashStart = 10000;
    this.deathFlashMod = [300, 600, 900];
    this.isDeathWarn = false;

    // Speech Bubbles
    this.speechBubbles = {
      PORT: [
        new SpeechBubble(
          this.gameObject,
          new THREE.Vector3(-10, 17, 6),
          new THREE.Vector3(-10, 0, 9),
          0
        ),
        new SpeechBubble(
          this.gameObject,
          new THREE.Vector3(-12, 1, 6),
          new THREE.Vector3(-10, 0, 9),
          Math.PI / 18
        ),
      ],

      STARBOARD: [
        new SpeechBubble(
          this.gameObject,
          new THREE.Vector3(10, 17, 6),
          new THREE.Vector3(10, 0, 9),
          0
        ),
        new SpeechBubble(
          this.gameObject,
          new THREE.Vector3(12, 1, 6),
          new THREE.Vector3(10, 0, 9),
          -Math.PI / 18
        ),
      ],
    };

    // Set camera to follow player nice, values set manually
    // consider camera class if it needs any functionality
    this.camera = camera;
    this.gameObject.add(this.camera);
    this.camera.position.z = 10;
    this.camera.position.y = 22;
    this.camera.rotateX(0.9);

    // Why am I setting lights on the player? so what you look at is illuminated nice
    const light = new THREE.PointLight(0xFFFFFF, 0.2, 2000000);
    const light2 = new THREE.PointLight(0x000000, 0.5, 2000000);
    this.mainLight = new THREE.PointLight(0xFFEEEE, 0.8, 20000);
    this.ambient = new THREE.AmbientLight(0x222222);

    this.gameObject.add(light);
    this.gameObject.add(light2);
    this.gameObject.add(this.mainLight);
    this.gameObject.add(this.ambient);

    light.position.set(0, 200, 200);
    light2.position.set(0, -200, 200);
    this.mainLight.position.set(0, -10, 200);

    // Light transition
    this.lightStart = 20000;
    this.lightTarget = 20000;
    this.LIGHT_CHANGE_MAX = 5000;
    this.lightChangeTime = 0;

    // Avoid gimble lock with rotation spheres
    this.moveSphere = new THREE.Object3D();
    this.moveSphere.add(this.gameObject);
    this.gameObject.position.x = worldSize - 4;

    // Plane test markers
    this.forwardMarker = new THREE.Object3D();
    this.forwardMarker.position.y = worldSize;

    this.leftMarker = new THREE.Object3D();
    this.leftMarker.position.z = worldSize;

    this.moveSphere.add(this.forwardMarker);
    this.moveSphere.add(this.leftMarker);

    // Add top level obj to scene
    scene.add(this.moveSphere);
  }

  reset() {
    this.velocityTarget = this.velocityMin;
    this.velocity = this.velocityMin;
    this.worldPos = new THREE.Vector3(0, 0, 0); // stores world location

    this.rollOffset = 0;
    this.turnRollOffset = 0;

    this.turnRate = 0;
    this.rollSpeed = 0;
    this.rollAcc = 0;

    this.bobTime = 0;

    this.onFire = false;
    this.fireTime = 0;
    this.fireTimeTotal = 0;
    this.fireScore = 0;
    this.flames.forEach(f => f.hide());

    this.moveSphere.rotation.set(0, 0, 0);

    // reset Sails Rudder
    this.setSailSpeed(0);
    this.setTurnAngle(0);

    this.bodyOffset.material.setValues({ color: 0x000000 });

    this.ammo.PORT = 0;
    this.ammo.STARBOARD = 0;
  }

  updateWorldPosition() {
    this.gameObject.getWorldPosition(this.worldPos);
  }

  // Used for collisions and player tracking on enemies
  getPosition() {
    return this.worldPos.clone();
  }

  cycleLights(waveCount) {
    const cycleNum = waveCount % 2;

    this.lightTarget = (cycleNum === 1) ? 20000 : 800;
    this.lightStart = this.mainLight.distance;
    this.lightChangeTime = this.LIGHT_CHANGE_MAX;
  }

  updateLights(dt) {
    if (this.lightChangeTime > 0) {
      const timeRatio = 1 - (this.lightChangeTime / this.LIGHT_CHANGE_MAX);
      const lightDiff = (this.lightTarget - this.lightStart);

      // diff alg for diff directions
      if (lightDiff < 0) {
        this.mainLight.distance = this.lightStart + (Math.sqrt(timeRatio) * lightDiff);
      } else {
        this.mainLight.distance = this.lightStart + (timeRatio * timeRatio * lightDiff);
      }

      this.lightChangeTime -= dt;
    } else {
      this.mainLight.distance = this.lightTarget;
    }
  }

  getHit(ballPos) {
    let isHit = false;

    this.hitboxes.forEach((b) => {
      // get this hitbox world position
      const worldP = new THREE.Vector3();
      b.getWorldPosition(worldP);
      // hitbox rad + sphere rad = 10
      if (worldP.distanceTo(ballPos) < 10) {
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
        if (worldP.distanceTo(enemyWorldP) < 13) isHit = true;
      });
    });

    return isHit;
  }

  setTurnAngle(angle) {
    this.turnRate = clamp(-this.TURN_MAX, this.TURN_MAX, this.turnRate + angle);
    this.rudder.rotation.z = -this.turnRate * 1000;
    // tween this
    // and add a roll
    this.turnRollOffset = -this.turnRate * 150;
    this.ship.rotation.z = this.turnRate * 100;
  }

  setSailSpeed(delta) {
    // scale sails here
    this.velocityTarget = clamp(this.velocityMin, this.velocityMax, this.velocityTarget + delta);

    // Scale sail
    const s = (this.velocityTarget / this.velocityMax);
    this.frontSail.geometry.vertices[3].z = 18 - 9 * s;
    this.frontSail.geometry.vertices[2].z = 20 - 3 * s;
    this.frontSail.geometry.verticesNeedUpdate = true;
    this.frontSail.geometry.computeFaceNormals();

    this.backSail.geometry.vertices[3].z = 19 - 9 * s;
    this.backSail.geometry.vertices[2].z = 22 - 3 * s;
    this.backSail.geometry.verticesNeedUpdate = true;
    this.backSail.geometry.computeFaceNormals();
  }

  slowSpeed(percent) {
    this.velocity *= (1 - percent);
  }

  addRoll(impulse) {
    this.rollSpeed += impulse;
  }

  updateCannonOutlines() {
    this.portCannons.forEach((cannon, i) => {
      cannon.outline.visible = (this.ammo.PORT > i);
    });

    this.starboardCannons.forEach((cannon, i) => {
      cannon.outline.visible = (this.ammo.STARBOARD > i);
    });
  }

  // Fire logic
  loadCannon(side) {
    // no more than 3, and don't load while fuses are lit
    if (this.ammo[side] < 3) {
      this.ammo[side] += 1;
    }

    this.updateCannonOutlines();
  }

  triggerBubble(side, sprite) {
    // Show ammo empty bubble
    const bubble0 = this.speechBubbles[side][0];
    const bubble1 = this.speechBubbles[side][1];

    // sloppy logic for choosing which bubble
    if (!bubble0.active) {
      bubble0.setSprite(SPRITES[side][sprite]);
    } else if (!bubble1.active) {
      bubble1.setSprite(SPRITES[side][sprite]);
    } else if (bubble0.activeTime > bubble1.activeTime) {
      bubble0.setSprite(SPRITES[side][sprite]);
    } else {
      bubble1.setSprite(SPRITES[side][sprite]);
    }
  }

  lightFuse(side) {
    const ammo = this.ammo[side];
    // don't light without ammo
    if (ammo > 0) {
      playSound('CANNON');
      // Filthy gosh darn for loop
      for (let i = 0; i < ammo; i += 1) {
        let rotOffset = 0;

        if (i === 0) rotOffset = side === 'PORT' ? 0.1 : -0.1;
        if (i === 2) rotOffset = side === 'PORT' ? -0.1 : 0.1;
        this.fireCannon(
          side,
          this.moveSphere.rotation,
          this.CANNON_POS[i],
          rotOffset
        );
      }

      this.ammo[side] = 0;
      // maybe cancel the animation to add impact
      this.addRoll(this.FIRE_ROLL_AMOUNT[side]);
    } else {
      this.triggerBubble(side, 'NO_AMMO');
      playSound('ERROR');
    }

    this.updateCannonOutlines();
  }

  updateRoll(dt) {
    // I should probs use dt in here somewhere
    // calc rotation direction
    if (this.ship.rotation.y > 0) {
      this.rollAcc = -0.0003;
    } else if (this.ship.rotation.y < 0) {
      this.rollAcc = 0.0003;
    }

    this.ship.rotation.y = this.turnRollOffset;
    // Only roll when there is roll speed
    if (this.rollSpeed !== 0) {
      // Stop the roll if the speed is low and at center
      if (isInRange(0.0015, -0.0015, this.rollOffset)
          && isInRange(0.0015, -0.0015, this.rollSpeed)) {
        this.rollSpeed = 0;
      } else {
        this.rollSpeed += this.rollAcc;
        this.rollSpeed *= 0.98;
        this.rollOffset += this.rollSpeed;

        this.rollOffset = clamp(-0.17, 0.17, this.rollOffset);
        this.ship.rotation.y = this.rollOffset + this.turnRollOffset;
      }
    }
  }

  heal() {
    this.fireTimeTotal *= 0.8;
  }

  addFlame(amount) {
    if (this.onFire) {
      // add more fire
      this.fireTime += amount;
      this.fireTimeTotal += amount;

      if ((this.fireTimeTotal / 2.5) > this.fireTime) {
        this.fireTime = clamp(0, this.fireMax, this.fireTimeTotal / 2.5);
      }
      this.flames.forEach(f => f.setFlame(this.fireTime));
    } else {
      this.onFire = true;
      this.fireTime = clamp(0, this.fireMax * 0.8, (this.fireTimeTotal / 3));
      this.flames.forEach(f => f.burn(this.fireTime));
    }
  }

  calmFire(amount) {
    if (this.onFire) {
      this.fireTime -= amount;
      this.flames.forEach(f => f.calm(amount));

      if (this.fireTime <= 0) {
        this.fireTime = 0;
        this.onFire = false;
        this.flames.forEach(f => f.hide());
      }
    }
  }

  updateFlames(dt) {
    if (this.onFire) {
      this.fireTimeTotal += dt;
      this.fireScore += dt;
      this.fireTime += dt;
      this.flames.forEach(f => f.update(dt));
    }

    // flash player when close to death, idk why i did this logic...
    // but I'm using one less timer so :P
    if (this.onFire
      && this.fireTime > this.deathFlashStart) {
      const flashIndex = Math.floor((this.fireMax - this.fireTime) / ((this.fireMax - this.deathFlashStart) / 3));
      const fireDelta = this.deathFlashMod[flashIndex];

      if (this.fireTime % fireDelta < fireDelta / 2) {
        this.bodyOffset.material.setValues({ color: 0x000000 });
      } else {
        this.bodyOffset.material.setValues({ color: 0xFFFFFF });
      }
    } else {
      this.bodyOffset.material.setValues({ color: 0x000000 });
    }

    if (this.onFire && this.fireTime >= this.fireMax) {
      // trigger game over here
      this.gameOverCallback(this.fireScore);
    }
  }

  updateBubbles(dt) {
    this.speechBubbles.PORT.forEach(s => s.update(dt));
    this.speechBubbles.STARBOARD.forEach(s => s.update(dt));
  }

  updateBob(dt) {
    this.bobTime += dt;

    const bobOffset = Math.sin(this.bobTime / 1500) * 1.5 + 0.5;
    this.ship.position.z = bobOffset;
  }

  checkRockCollision(rocks) {
    // Bail bc it's still recovering
    if (this.rockTurnTime > 0) return;

    // Maybe do rock invulrablity window?
    const forwardVec = new THREE.Vector3();
    this.forwardMarker.getWorldPosition(forwardVec);

    const leftVec = new THREE.Vector3();
    this.leftMarker.getWorldPosition(leftVec);
    // B′=B−A, C′=C−A, X′=X−A.
    const forwardCross = new THREE.Vector3().crossVectors(this.worldPos, forwardVec).normalize();
    const sideCross = new THREE.Vector3().crossVectors(this.worldPos, leftVec).normalize();

    // this seems like a bottle neck
    // maybe only do first two
    this.hitboxes.forEach((b) => {
      // get this hitbox world position
      const worldP = new THREE.Vector3();
      b.getWorldPosition(worldP);

      // Loop over rocks
      rocks.forEach((r) => {
        // Check if rock is hit
        // we use good placement bc sometimes the rock will hit on spawn
        if (r.isGoodPlacement && !r.isRising
            && r.getPosition().distanceTo(worldP) < this.rockHitRadius + r.hitRadius) {
          playSound('EXPLODE');
          const rockPos = r.getPosition().normalize();

          //        -0.14
          //      +,- | -,-
          // 0.06 _ _ | _ _ -0.06
          //          |
          //      +,+ | -,+
          //         0.14
          const frontTest = sideCross.dot(rockPos); // for grid y
          const sideTest = forwardCross.dot(rockPos); // for grid x

          // // See if rock is in front
          // if (sideTest < 0) {
          // tweak to find angle of avoidance
          const turn = sideTest > 0 ? -1 : 1;
          // hard coded turn rate at end, maybe make this a twean
          this.velocity = 0; // this.velocity * 0.001;
          // this.moveSphere.rotateOnAxis(this.forwardAxis, -0.01); // linear
          // this.moveSphere.rotateOnAxis(this.yawAxis, turn * 0.6); // ease in
          // this.isRockTurn = true;
          this.triggerShake(50, 300);
          this.addFlame(5000);
          this.addRoll(turn * -0.01);
          this.turnRate = 0;
          this.setTurnAngle(0);
          this.rockTurnVal = turn;
          this.rockTurnTime = this.rockTurnTimeMax;
          // }
        }
      });
    });
  }

  // Central update
  update(dt, rocks, shouldCollideRocks) {
    // Set this at the start of each frame, bc why not
    // Actually it's so that we are using the proper matrix from last frame
    this.updateWorldPosition();

    this.updateRoll(dt);
    this.updateFlames(dt);
    this.updateBubbles(dt);
    this.updateBob(dt);
    this.updateLights(dt);

    if (shouldCollideRocks) this.checkRockCollision(rocks);

    if (this.rockTurnTime <= 0) {
      // always moving forward
      // switch to acceleration and velocity with a max speed
      if (this.velocity >= this.velocityMin && this.turnRate !== 0) {
        // if turning apply yaw to forward
        this.moveSphere.rotateOnAxis(this.yawAxis, this.turnRate * dt);
      }
      // just change velocity max
      if (this.velocity > this.velocityTarget) {
        this.velocity -= this.acceleration * dt;
      } else {
        this.velocity += this.acceleration * dt;
      }

      // apply rotspeed to move sphere based on forward
      this.moveSphere.rotateOnAxis(this.forwardAxis, dt * this.velocity);
    } else {
      this.rockTurnTime -= dt;
      const turnAmt = (this.rockTurnTime / this.rockTurnTimeMax) * this.rockTurnVal * 0.0006 * dt;
      this.moveSphere.rotateOnAxis(this.yawAxis, turnAmt); // ease in
      if (this.velocity > this.velocityTarget) {
        this.velocity -= this.acceleration * dt * 0.25;
      } else {
        this.velocity += this.acceleration * dt * 0.25;
      }
      this.moveSphere.rotateOnAxis(this.forwardAxis, dt * this.velocity);
    }
  }
}

export default Player;
