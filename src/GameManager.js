import * as THREE from 'three';
import { prop, clamp } from 'ramda';

import Player from './Actors/Player';
import Cannonball from './Actors/Cannonball';
import EnemyShip from './Actors/EnemyShip';
import Treasure from './Actors/Treasure';
import Rock from './Actors/Rock';
import { getModel } from './AssetManager';
import { GAME_TYPES, SHIP_DIRECTIONS } from './Constants';
import { WAVE_SIZES } from './WaveConfig';
import {
  getHatch, getWick, getRudderKnob, getSailKnob, getAllInputSwap, getFlame, getKey
} from './InputParser';

import {
  cycleInstructions, hideStartScreen, showStartScreen,
  runGameOverSequence, hideEndScreen
} from './UI';

import { playSound, createLoopedSound } from './SoundPlayer';

let soundtrack;
let prevTime = 0;
let totalTime = 0;
let shipsSunk = 0;
let score = 0;
let isGameOver = false;

// Use this to give players grace period at start
let enemySpawnSide = -1;
let activeEnemies = 0;

let waveCount = 0;
let waveEnemiesToSpawn = 0;
let waveChestSpawned = true;
let enemySpawnTimer = 0;
let waveEnemySpawnWindow = 0;
const WAVE_MAX_TIME = 70000;
let waveTimer = 5000; // Include a start offset when the game begins

// Start sequence stuff
let isStartSeq = true;
let startSeqCount = 0;
const startSequence = ['SAIL', 'RUDDER', 'HATCH', 'WICK'];

// reset stuff
let resetPressCount = 0;
const RESET_PRESS_MAX = 5;

let screen;

// Screen shake for juice
let isShaking = false;
let shakeTime = 0;
const shakeIntensity = 3;
let shakeXScale = 0;
let shakeYScale = 0;
const SHAKE_TIME_MAX = 100;

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

const rocks = Array.from(
  { length: 25 },
  () => new Rock(scene, WORLD_SIZE),
);

const treasurePool = Array.from(
  { length: 10 },
  () => new Treasure(scene, WORLD_SIZE),
);

const cannonballPool = Array.from(
  { length: 50 },
  () => new Cannonball(scene, WORLD_SIZE)
);

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
  activeEnemies += 1;
  const enemy = enemyPool.find(e => !e.isActive && !e.isDying);
  // Hard cap is in the enemy pool rn ~50
  if (enemy) {
    enemySpawnSide *= -1;
    enemy.spawn(player.moveSphere.rotation, enemySpawnSide);
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
            e.die(false);
            c.explode();
            if (e.hitCount > 1) {
              activeEnemies -= 1;
              shipsSunk += 1;
            }
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
            e1.die(true);
            e2.die(true);
            activeEnemies -= 2;
            playSound('EXPLODE');
          }
        });

        if (player.getEnemyHit(e1)) {
          e1.die(true);
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
  if (isStartSeq) {
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
        isStartSeq = false;
        break;
      default: break;
    }
  }

  // update all this on start screen
  // Split this into sep update functions pls
  if (!isGameOver) {
    player.update(dt);
    cannonballPool.forEach(c => c.update(dt));
  }

  if (!isGameOver && !isStartSeq) {
    if (!soundtrack) {
      soundtrack = createLoopedSound('SOUNDTRACK');
      soundtrack.sound.start(0);
      soundtrack.GAIN.gain.setValueAtTime(0.5, soundtrack.ctx.currentTime);
      soundtrack.playing = true;
    } else if (!soundtrack.playing) {
      soundtrack.GAIN.gain.setValueAtTime(0.5, soundtrack.ctx.currentTime);
      soundtrack.playing = true;
    }
    totalTime += dt;
    enemyPool.forEach(e => e.update(dt, player.getPosition()));
    treasurePool.forEach((t) => {
      t.checkTrigger(player.getPosition());
      t.update(dt);
    });

    checkCollisions();

    // Wave Change Logic
    if (waveTimer < 0) {
      // We stop having a difficulty curve after the wave config is empty
      if (waveCount < WAVE_SIZES.length) waveEnemiesToSpawn = WAVE_SIZES[waveCount];
      else waveEnemiesToSpawn = WAVE_SIZES[WAVE_SIZES.length - 1];

      // Divy out enemy spawns in the 1st 45 sec
      waveEnemySpawnWindow = (WAVE_MAX_TIME - 30000) / waveEnemiesToSpawn;
      enemySpawnTimer = 5000; // Wait 5 sec into new wave before spawning

      waveChestSpawned = false;

      waveTimer = WAVE_MAX_TIME;
      waveCount += 1; // set next wave index too
    }
    waveTimer -= dt;

    // Enemy spawn logic
    if (waveEnemiesToSpawn > 0 && enemySpawnTimer < 0) {
      spawnEnemy();
      enemySpawnTimer = waveEnemySpawnWindow;
      waveEnemiesToSpawn -= 1;
    }
    enemySpawnTimer -= dt;

    // Treasure spawn logic
    if (!waveChestSpawned && waveTimer < (WAVE_MAX_TIME - WAVE_MAX_TIME / 3)) {
      waveChestSpawned = true;
      const treasure = treasurePool.find(t => !t.isActive);
      treasure.spawn(player.moveSphere.rotation);
    }

    // screen shake
    if (isShaking) {
      shakeTime += dt;
      screen.style.left = `${(Math.cos(shakeTime) * shakeIntensity * shakeXScale)}px`;
      screen.style.top = `${(Math.sin(shakeTime) * shakeIntensity * shakeYScale)}px`;

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
  shipsSunk = 0;
  score = 0;
  isGameOver = false;

  isStartSeq = true; // ????
  startSeqCount = 0;

  resetPressCount = 0;
  enemySpawnSide = -1;
  activeEnemies = 0;

  // reset ui?
  cycleInstructions(startSeqCount);
  // Hide end screen
  hideEndScreen();
  showStartScreen();

  // Reset player?
  player.reset();
  // reset enemy and cannonball pool
  enemyPool.forEach(e => e.hide());
  cannonballPool.forEach(c => c.hide());

  // Something something soundtrack
  if (soundtrack) {
    soundtrack.GAIN.gain.setValueAtTime(0, soundtrack.ctx.currentTime);
    soundtrack.playing = false;
  }

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
    if (e.keyCode === 75) {
      treasurePool.forEach((t) => {
        if (t.keyTurnCheck()) {
          // score
        }
      });
    }
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
      if (isStartSeq && !isGameOver) {
        hideStartScreen();
        isStartSeq = false;
      }
    }

    if (e.keyCode === 40) {
      player.setSailSpeed(-0.00001);

      if (isGameOver) {
        reset();
      }
    }

    if (e.keyCode === 37) {
      player.setTurnAngle(0.00005);
    }

    if (e.keyCode === 39) {
      player.setTurnAngle(-0.00005);
    }

    if (e.keyCode === 70) {
      player.calmFire(500);
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
      next: () => {
        if (isGameOver) resetPressCount += 1;
        else player.calmFire(600);

        if (resetPressCount >= RESET_PRESS_MAX) reset();
      },
      error: console.log,
      complete: console.log,
    });

  // open treasure
  getKey(input$)
    .fold((acc, curr) => ({
      prev: curr.isPressed,
      output: (!acc.prev && curr.isPressed),
    }), { prev: false })
    .filter(data => data.output)
    .subscribe({
      next: (d) => {
        treasurePool.forEach((t) => {
          if (t.keyTurnCheck()) {
            // score
          }
        });
      },
      error: console.log,
      complete: console.log,
    });

  // Used to trigger speech bubbles
  getAllInputSwap(input$)
    .map(([sideId, type]) => [
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
