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
  constructor(scene, camera, worldSize, fireCannon, gameOverCallback) {
    this.type = GAME_TYPES.PLAYER;
    // move camera to a class that looks at the player maybe
    this.scene = scene;
    this.gameOverCallback = gameOverCallback;
    this.velocityMin = 0;
    this.velocityMax = 0.00015; // scaled to world size bc rotation
    this.velocityTarget = this.velocityMin;
    this.velocity = this.velocityMin;
    this.acceleration = 0.0000001;
    this.forwardAxis = new THREE.Vector3(0, 0, 1);
    this.yawAxis = new THREE.Vector3(1, 0, 0);
    this.worldPos = new THREE.Vector3(0, 0, 0); // stores world location
    this.TURN_MAX = 0.0003;

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

    // ship body
    this.ship = new THREE.Object3D();
    this.gameObject.add(this.ship);

    // this mat might need to change
    const bodyMat = new THREE.MeshLambertMaterial({ flatShading: true, color: 0xBBBBBB });
    getModel('./Assets/pirate/pirate_body.stl')
      .then((geo) => {
        this.body = new THREE.Mesh(geo, bodyMat);
        this.ship.add(this.body);
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
    this.cannonsFired = 0;

    // [back, mid, front]
    this.CANNON_POS = [0, 0.025, 0.05];
    this.FIRE_ROLL_AMOUNT = { PORT: 0.007, STARBOARD: -0.007 };

    // Health stuff, AKA other fire
    this.onFire = false;
    this.fireTime = 0;
    this.fireTimeTotal = 0;
    this.fireMax = 20000;
    this.flames = [
      new Flame(this.gameObject, new THREE.Vector3(0, -5, 7), this.fireMax),
    ];

    // Speech Bubbles
    this.speechBubbles = {
      PORT: [
        new SpeechBubble(this.gameObject, new THREE.Vector3(-10, 17, 6), new THREE.Vector3(-10, 0, 9), 0),
        new SpeechBubble(this.gameObject, new THREE.Vector3(-12, 1, 6), new THREE.Vector3(-10, 0, 9), Math.PI / 18),
      ],

      STARBOARD: [
        new SpeechBubble(this.gameObject, new THREE.Vector3(10, 17, 6), new THREE.Vector3(10, 0, 9), 0),
        new SpeechBubble(this.gameObject, new THREE.Vector3(12, 1, 6), new THREE.Vector3(10, 0, 9), -Math.PI / 18),
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
    const point = new THREE.PointLight(0xFFEEEE, 0.8, 2000000);
    const ambient = new THREE.AmbientLight(0x222222);

    this.gameObject.add(light);
    this.gameObject.add(light2);
    this.gameObject.add(point);
    this.gameObject.add(ambient);

    light.position.set(0, 200, 200);
    light2.position.set(0, -200, 200);
    point.position.set(0, -10, 200);

    // Avoid gimble lock with rotation spheres
    this.moveSphere = new THREE.Object3D();
    this.moveSphere.add(this.gameObject);
    this.gameObject.position.x = worldSize - 4;

    // Add top level obj to scene
    scene.add(this.moveSphere);
  }

  updateWorldPosition() {
    this.gameObject.getWorldPosition(this.worldPos);
  }

  // Used for collisions and player tracking on enemies
  getPosition() {
    return this.worldPos.clone();
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
        this.cannonsFired += 1;
        let rotOffset = 0;

        if (i === 0) rotOffset = side === 'PORT' ? 0.05 : -0.05;
        if (i === 2) rotOffset = side === 'PORT' ? -0.05 : 0.05;
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
      if (isInRange(0.0015, -0.0015, this.rollOffset) && isInRange(0.0015, -0.0015, this.rollSpeed)) {
        this.rollSpeed = 0;
      } else {
        this.rollSpeed += this.rollAcc;
        this.rollSpeed *= 0.98;
        this.rollOffset += this.rollSpeed;
        // console.log(this.rollOffset);
        this.rollOffset = clamp(-0.17, 0.17, this.rollOffset);
        this.ship.rotation.y = this.rollOffset + this.turnRollOffset;
      }
    }
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
      this.fireTime += dt;
      this.flames.forEach(f => f.update(dt));
    }

    if (this.onFire && this.fireTime >= this.fireMax) {
      // trigger game over here
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

  // Central update
  update(dt) {
    this.updateRoll(dt);
    this.updateFlames(dt);
    this.updateBubbles(dt);
    this.updateBob(dt);

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
    // Set this once a frame so that enemies can use it
    this.updateWorldPosition();

    if (this.flames[0].time > this.flames[0].maxTime) {
      this.gameOverCallback(this.cannonsFired, this.fireTimeTotal);
    }
  }
}

export default Player;
