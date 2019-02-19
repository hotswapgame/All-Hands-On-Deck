import * as THREE from 'three';
import { prop, clamp } from 'ramda';

import Player from './Actors/Player';
import Cannonball from './Actors/Cannonball';
import { getModel } from './AssetManager';
import EnemyShip from './Actors/EnemyShip';
import { GAME_TYPES, SHIP_DIRECTIONS } from './Constants';
import {
  getHatch, getWick, getRudderKnob, getSailKnob, getAllInputSwap, getFlame
} from './InputParser';

import { cycleInstructions, hideStartScreen, runGameOverSequence } from './UI';

import { playSound, createLoopedSound } from './SoundPlayer';

let soundtrack;
let prevTime = 0;
let totalTime = 0;
let shipsSunk = 0;
let score = 0;
let isGameOver = false;
// Use this to give players grace period at start
let canSpawn = true;
let enemySpawnSide = -1;

// Start sequence stuff
let canRun = false;
let startSeqCount = 0;
const startSequence = ['SAIL', 'RUDDER', 'HATCH', 'WICK'];

let screen;

// Screen shake for juice
let isShaking = false;
let shakeTime = 0;
const shakeIntensity = 3;
let shakeXScale = 0;
let shakeYScale = 0;
const SHAKE_TIME_MAX = 100;

let activeEnemies = 0;

let hitPauseTime = 0;
const HIT_PAUSE_MAX = 30;

const WORLD_SIZE = 300;

const scene = new THREE.Scene();
// Possibly make this a class so I can do that sweet tween
// find a good number for this
const cameraScale = 8;
const camera = new THREE.OrthographicCamera(
  window.innerWidth / (-cameraScale),
  window.innerWidth / cameraScale,
  window.innerHeight / cameraScale,
  window.innerHeight / (-cameraScale),
  -150,
  1000
);

const cannonballPool = Array.from(
  { length: 150 },
  () => new Cannonball(scene, WORLD_SIZE)
);

let enemySpawnTimer = 0; // start negative to give more time to adapt
let enemySpawnThreshold = 10000;

// Arrow to keep scope, pass to enemy so we can share one pool
// maybe create a separate pool for enemy and player :|
const fireEnemyCannon = (enemyRot, enemyHeading) => {
  const cannonball = cannonballPool.find(b => !b.isActive && !b.isExploding);
  if (cannonball) {
    cannonball.enemyFire(enemyRot, 0.09, enemyHeading);
  }
};

const enemyPool = Array.from(
  { length: 50 },
  () => new EnemyShip(scene, WORLD_SIZE, fireEnemyCannon)
);

const firePlayerCannon = (side, rotation, position, cannonRotOffset) => {
  const cannonball = cannonballPool.find(b => !b.isActive && !b.isExploding);
  if (cannonball) cannonball.playerFire(side, rotation, position, 0.03, cannonRotOffset);
};

function triggerGameOver(cannonsFired, fireTime) {
  isGameOver = true;
  canRun = false;
  runGameOverSequence(shipsSunk, cannonsFired, totalTime, fireTime);
}

const player = new Player(scene, camera, WORLD_SIZE, firePlayerCannon, triggerGameOver);

// init renderer
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setClearColor(0x666666, 0);
renderer.setPixelRatio(window.devicePixelRatio);

// do bloom effect here, they should make npm packages for this

// Make world a class that just holds the globe and maybe some clouds, land?
// should also include lights, except for player point light
// const worldTex = new THREE.TextureLoader().load('./Assets/world.png'); //0x5599AA
const worldMat = new THREE.MeshLambertMaterial({ color: 0x5599AA, flatShading: true });

let world;
getModel('./Assets/world.stl')
  .then((geo) => {
    world = new THREE.Mesh(geo, worldMat);
    world.scale.set(WORLD_SIZE, WORLD_SIZE, WORLD_SIZE);
    scene.add(world);
  });

function spawnEnemy() {
  if (canSpawn) {
    enemySpawnTimer = 0;
    activeEnemies += 1;
    const enemy = enemyPool.find(e => !e.isActive && !e.isDying);
    // Hard cap is in the enemy pool rn ~50
    if (enemy) {
      enemySpawnSide *= -1;
      enemy.spawn(player.moveSphere.rotation, enemySpawnSide);
    }
  }
}

function startShake() {
  isShaking = true;
  shakeTime = 0;
  shakeXScale = Math.random() > 0.5 ? 1 : -1;
  shakeYScale = Math.random() > 0.5 ? 1 : -1;
}

function checkCollisions() {
  cannonballPool.forEach((c) => {
    if (c.isActive && !c.isExploding) {
      // Check if enemy is hit
      if (c.ownerType === GAME_TYPES.PLAYER) {
        enemyPool.forEach((e) => {
          if (e.isActive && e.getHit(c.getPosition())) {
            e.die();
            activeEnemies -= 1;
            c.explode();
            shipsSunk += 1;
          }
        });
      } else if (c.ownerType === GAME_TYPES.ENEMY) {
        if (player.getHit(c.getPosition())) {
          c.explode();
          player.addFlame(2000);
          startShake();
        }
      }
    }

    // should also map over enemies to intersect player and each other
    enemyPool.forEach((e1) => {
      if (e1.isActive) {
        enemyPool.forEach((e2) => {
          if (e2.isActive && e2.id !== e1.id && e1.getEnemyHit(e2)) {
            e1.die();
            e2.die();
            activeEnemies -= 2;
            playSound('EXPLODE');
          }
        });

        if (player.getEnemyHit(e1)) {
          e1.die();
          activeEnemies -= 1;
          playSound('EXPLODE');
          player.addFlame(1500);
          startShake();
          shipsSunk += 1;
        }
      }
    });
  });
}

function update(currentTime) {
  if (prevTime === 0) prevTime = currentTime;
  const dt = currentTime - prevTime;
  prevTime = currentTime;

  // start sequence stuff
  if (!isGameOver && !canRun) {
    switch (startSeqCount) {
      case 0:
        if (player.velocityTarget > 0.000001) {
          startSeqCount += 1;
        }

        cycleInstructions(startSeqCount);
        break;
      case 1:
        if (player.turnRate > 0.00001 || player.turnRate < -0.00001) {
          startSeqCount += 1;
        }

        cycleInstructions(startSeqCount);
        break;
      case 4:
        hideStartScreen();
        canRun = true;
        break;
      default: break;
    }
  }

  // update all this on start screen
  if (!isGameOver) {
    player.update(dt);
    cannonballPool.forEach(c => c.update(dt));
  }

  if (canRun) {
    if (!soundtrack) {
      soundtrack = createLoopedSound('SOUNDTRACK');
      soundtrack.sound.start(0);
      soundtrack.GAIN.gain.setValueAtTime(0.5, soundtrack.ctx.currentTime);
    }
    totalTime += dt;
    enemyPool.forEach(e => e.update(dt, player.getPosition()));

    checkCollisions();

    // Enemy spawn logic
    enemySpawnTimer += dt;
    enemySpawnThreshold = clamp(1000, 10000, 10000 * (120000 - totalTime) / 120000);

    if (enemySpawnTimer > enemySpawnThreshold && activeEnemies < 20) spawnEnemy();

    // screen shake
    if (isShaking) {
      shakeTime += dt;
      screen.style.left = (Math.cos(shakeTime) * shakeIntensity * shakeXScale) + 'px';
      screen.style.top = (Math.sin(shakeTime) * shakeIntensity * shakeYScale) + 'px';

      if (shakeTime > SHAKE_TIME_MAX) {
        isShaking = false;
        screen.style.left = '0px';
        screen.style.top = '0px';
      }
    }
  }

  // Rendering is so much simpler with THREE than Canvas
  renderer.render(scene, camera);
  requestAnimationFrame(update.bind(this));
}

function reset() {
  // do game state reset stuff here
  prevTime = 0;
  totalTime = 0;
  requestAnimationFrame(update.bind(this));
}

export function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function playListener() {
  // hide ui
  reset();
}

export function init(input$) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  screen = document.querySelector('#screen');
  screen.appendChild(renderer.domElement);
  resize();

  window.onkeyup = (e) => {
    // light port
    if (e.keyCode === 87) {
      player.lightFuse(SHIP_DIRECTIONS.PORT);
    }
    // light starboard
    if (e.keyCode === 83) {
      player.lightFuse(SHIP_DIRECTIONS.STARBOARD);
    }

    if (e.keyCode === 73) {
      player.addFlame(8000);
    }

    // Load port
    if (e.keyCode === 65) {
      player.loadCannon(SHIP_DIRECTIONS.PORT);
    }

    // Load starboard
    if (e.keyCode === 68) {
      player.loadCannon(SHIP_DIRECTIONS.STARBOARD);
    }

    // Load port
    if (e.keyCode === 38) {
      player.setSailSpeed(0.00001);
      if (!canRun && !isGameOver) {
        hideStartScreen();
        canRun = true;
      }
    }

    // Load starboard
    if (e.keyCode === 40) {
      player.setSailSpeed(-0.00001);
    }

    if (e.keyCode === 37) {
      player.setTurnAngle(0.00005);
    }

    // Load starboard
    if (e.keyCode === 39) {
      player.setTurnAngle(-0.00005);
    }

    if (e.keyCode === 70) {
      player.calmFire(500);
    }

    if (e.key === 'z') {
      player.triggerBubble(SHIP_DIRECTIONS.PORT, 'SAIL');
    }

    if (e.key === 'x') {
      player.triggerBubble(SHIP_DIRECTIONS.PORT, 'RUDDER');
    }

    if (e.key === 'c') {
      player.triggerBubble(SHIP_DIRECTIONS.STARBOARD, 'HATCH');
    }

    if (e.key === 'v') {
      player.triggerBubble(SHIP_DIRECTIONS.STARBOARD, 'WICK');
    }

  };

  // Steering
  getRudderKnob(input$)
    .map(data => data.value + Math.PI)
    .fold(
      (prev, value) => {
        let delta = 0;
        const valChange = prev.value - value;
        if (valChange > 0.05) delta = -0.000005;
        if (valChange < -0.05) delta = 0.000005;
        return {
          delta,
          value,
        };
      },
      { delta: 0, value: 0 }
    )
    .filter(data => data.delta !== 0)
    .subscribe({
      next: data => player.setTurnAngle(data.delta),
      error: console.log,
      complete: console.log,
    });

  // Speed
  getSailKnob(input$)
    .map(data => data.value + Math.PI)
    .fold(
      (prev, value) => {
        let delta = 0;
        const valChange = prev.value - value;
        if (valChange > 0.05) delta = 0.000001;
        if (valChange < -0.05) delta = -0.000001;
        return {
          delta,
          value,
        };
      },
      { delta: 0, value: 0 }
    )
    .filter(data => data.delta !== 0)
    .subscribe({
      next: data => player.setSailSpeed(data.delta),
      error: console.log,
      complete: console.log,
    });

  // Ammo
  getHatch(input$)
    .fold(
      (acc, curr) => ({ id: curr.id, prev: curr.isOpen, shouldLoad: (curr.isOpen && !acc.prev) }),
      { id: 0, shouldLoad: false }
    )
    .filter(prop('shouldLoad'))
    .map(({ id }) => (id === 1 ? SHIP_DIRECTIONS.PORT : SHIP_DIRECTIONS.STARBOARD))
    .subscribe({
      next: (direction) => {
        if (startSeqCount === 2) {
          startSeqCount += 1;
          cycleInstructions(startSeqCount);
        }
        player.loadCannon(direction);
      },
      error: console.log,
      complete: console.log,
    });

  // Fire
  getWick(input$)
    .fold(
      (acc, curr) => ({ id: curr.id, prev: curr.isLit, shouldLight: (curr.isLit && !acc.prev) }),
      { id: 0, shouldLight: false }
    )
    .filter(prop('shouldLight'))
    .map(({ id }) => (id === 1 ? SHIP_DIRECTIONS.PORT : SHIP_DIRECTIONS.STARBOARD))
    .subscribe({
      next: (direction) => {
        if (startSeqCount === 3) {
          startSeqCount += 1;
        }

        player.lightFuse(direction);
      },
      error: console.log,
      complete: console.log,
    });

  // Put fire out
  getFlame(input$)
    .fold((acc, curr) => ({
      prev: curr.isPressed,
      output: (!acc.prev && curr.isPressed),
    }), { prev: false })
    .filter(data => data.output)
    .subscribe({
      next: () => player.calmFire(600),
      error: console.log,
      complete: console.log,
    });

  // Used to trigger speech bubbles
  getAllInputSwap(input$)
    .map(([sideId, type]) =>[
      sideId === 1 ? SHIP_DIRECTIONS.PORT : SHIP_DIRECTIONS.STARBOARD,
      type,
    ])
    .subscribe({
      next: ([side, type]) => {
        player.triggerBubble(side, type);
      },
      error: console.log,
      complete: console.log,
    });

  playListener();
}
