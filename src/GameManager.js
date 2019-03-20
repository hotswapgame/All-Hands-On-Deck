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
  runGameOverSequence, hideEndScreen, updateResetGradient, cycleDayNight, increaseHUDCount, showHUD, hideHUD
} from './UI';

import { playSound, createLoopedSound } from './SoundPlayer';

let soundtrack;
let seagulls;
let prevTime = 0;
let totalTime = 0;
let shipsSunk = 0;
let treasureCount = 0;
let isGameOver = false;

// Use this to give players grace period at start
let enemySpawnSide = -1;
let activeEnemies = 0;

let waveCount = 0;
let waveEnemiesToSpawn = 0;
let waveChestSpawned = true;
let enemySpawnTimer = 0;
let waveEnemySpawnWindow = 0;
const WAVE_MAX_TIME = 50000; // 50000;
const ENEMY_SPAWN_BUFFER = 10000;
let waveTimer = 5000; // Include a start offset when the game begins

// Start sequence stuff
let isStartSeq = true;
let startSeqCount = 0;
const startSequence = ['SAIL', 'RUDDER', 'HATCH', 'WICK'];

// reset stuff
let resetPressCount = 0;
const RESET_PRESS_MAX = 15;

let screen;

// Screen shake for juice
let isShaking = false;
let shakeTime = 0;
const shakeIntensity = 3;
let shakeXScale = 0;
let shakeYScale = 0;

const HIT_PAUSE_MAX = 30;

const WORLD_SIZE = 200;

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

let shouldGenRocks = false;
const rocks = [];

const treasurePool = Array.from(
  { length: 3 },
  () => new Treasure(scene, WORLD_SIZE, rocks),
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
  () => new EnemyShip(scene, WORLD_SIZE, fireEnemyCannon, rocks)
);

const firePlayerCannon = (side, rotation, position, cannonRotOffset) => {
  const cannonball = cannonballPool.find(b => !b.isActive && !b.isExploding);
  if (cannonball) cannonball.playerFire(side, rotation, position, 0.03, cannonRotOffset);
};

function triggerGameOver(fireTime) {
  isGameOver = true;
  runGameOverSequence(shipsSunk, treasureCount, totalTime, fireTime);
}

function startShake(intensity, time) {
  isShaking = true;
  shakeTime = time;
  shakeXScale = intensity * Math.random() > 0.5 ? 1 : -1;
  shakeYScale = intensity * Math.random() > 0.5 ? 1 : -1;
}

const player = new Player(scene, camera, WORLD_SIZE, firePlayerCannon, triggerGameOver, startShake);

// init renderer
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setClearColor(0x666666, 0);
renderer.setPixelRatio(window.devicePixelRatio);

// do bloom effect here, they should make npm packages for this

// Make world a class that just holds the globe and maybe some clouds, land?
// should also include lights, except for player point light
// const worldTex = new THREE.TextureLoader().load('./Assets/world.png'); //0x5599AA
const worldMat = new THREE.MeshPhysicalMaterial({
  // color: 0x5599AA,
  // flatShading: true,
  // map: null,
  color: 0x5599AA,
  // clearCoatRoughness: 1,
  // clearCoat: 1,
  reflectivity: 1,
  roughness: 0,
  metalness: 0,
  opacity: 0.9,
  // side: THREE.FrontSide,
  // transparent: true,
  // envMapIntensity: 5,
  // premultipliedAlpha: true,
});

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
    enemy.spawn(player.moveSphere.rotation, enemySpawnSide, rocks);
  }
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
              increaseHUDCount(shipsSunk, 'enemy-count');
            }
          }
        });
      } else if (c.ownerType === GAME_TYPES.ENEMY) {
        if (player.getHit(c.getPosition())) {
          c.explode();
          player.addFlame(2000);
          startShake(1, 100);
        }
      }

      rocks.forEach((r) => {
        if (c.getPosition().distanceTo(r.getPosition()) < r.hitRadius + c.hitRadius) {
          c.explode();
        }
      });
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
          player.slowSpeed(0.6);
          startShake(2, 200);
          shipsSunk += 1;
          increaseHUDCount(shipsSunk, 'enemy-count');
        }
      }
    });
  });
}

function update(currentTime) {
  if (prevTime === 0) prevTime = currentTime;
  const dt = currentTime - prevTime;
  prevTime = currentTime;

  // Render at the start to update the matrix
  renderer.render(scene, camera);

  // update all this on start screen
  // Split this into sep update functions pls
  if (!isGameOver) {
    player.update(dt, rocks, !isStartSeq); // only collide rocks when not start seq
    cannonballPool.forEach(c => c.update(dt));
  }

  // Make sure rocks don't spawn on player position
  rocks.forEach((r) => {
    if (!r.isGoodPlacement) {
      // arbitary spawn distance of 130
      if (r.getPosition().distanceTo(player.getPosition()) < 130) {
        r.randomlyPlace();
      } else {
        r.fixPlacement();
      }
    }
  });

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

  if (!isGameOver && !isStartSeq) {
    if (!soundtrack) {
      soundtrack = createLoopedSound('SOUNDTRACK');
      soundtrack.sound.start(0);
      soundtrack.GAIN.gain.setValueAtTime(0.2, soundtrack.ctx.currentTime);
      soundtrack.playing = true;
    } else if (!soundtrack.playing) {
      soundtrack.GAIN.gain.setValueAtTime(0.2, soundtrack.ctx.currentTime);
      soundtrack.playing = true;
    }
    totalTime += dt;
    rocks.forEach(r => r.update(dt));
    enemyPool.forEach(e => e.update(dt, player.getPosition()));
    treasurePool.forEach((t) => {
      t.checkTrigger(player.getPosition());
      t.update(dt);
    });

    checkCollisions();

    // Filter hidden rocks from array
    if (shouldGenRocks) {
      let rockToRemove;

      rocks.forEach((r, i) => {
        if (r.isSunken) rockToRemove = i;
      });

      if (rockToRemove !== undefined) rocks.splice(rockToRemove, 1);
    }

    if (shouldGenRocks && rocks.length === 0) {
      // some code
      // actually need a for loop here :/
      for (let i = 0; i < 25; i += 1) {
        rocks.push(new Rock(scene, WORLD_SIZE));
      }

      shouldGenRocks = false;
    }

    // Wave Change Logic
    if (waveTimer < 0) {
      // We stop having a difficulty curve after the wave config is empty
      if (waveCount < WAVE_SIZES.length) waveEnemiesToSpawn = WAVE_SIZES[waveCount];
      else waveEnemiesToSpawn = WAVE_SIZES[WAVE_SIZES.length - 1];

      // Spawn new rocks
      if (waveCount % 4 === 0) {
        shouldGenRocks = true;
        rocks.forEach(r => r.startSinking());
      }

      // Divide the wave count to make it cycle less often
      if (waveCount !== 0) cycleDayNight(waveCount + 1);
      // cycle lights as well
      player.cycleLights(waveCount + 1);

      // Divy out enemy spawns in the 1st 45 sec
      waveEnemySpawnWindow = (WAVE_MAX_TIME - ENEMY_SPAWN_BUFFER) / waveEnemiesToSpawn;
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
    if (!waveChestSpawned && waveTimer < (WAVE_MAX_TIME - WAVE_MAX_TIME / 100)) {
      waveChestSpawned = true;
      const treasure = treasurePool.find(t => !t.isActive);
      if (treasure) treasure.spawn(player.moveSphere.rotation);
    }

    // screen shake
    if (isShaking) {
      shakeTime -= dt;
      screen.style.left = `${(Math.cos(shakeTime) * shakeIntensity * shakeXScale)}px`;
      screen.style.top = `${(Math.sin(shakeTime) * shakeIntensity * shakeYScale)}px`;

      if (shakeTime < 0) {
        isShaking = false;
        screen.style.left = '0px';
        screen.style.top = '0px';
      }
    }
  }

  // set next frame
  requestAnimationFrame(update.bind(this));
}

function reset() {
  // do game state reset stuff here
  prevTime = 0;
  totalTime = 0;
  shipsSunk = 0;
  treasureCount = 0;
  isGameOver = false;

  isStartSeq = true; // ????
  startSeqCount = 0;

  resetPressCount = 0;
  enemySpawnSide = -1;
  activeEnemies = 0;

  // Screen shake stuff
  isShaking = false;
  shakeTime = 0;
  shakeXScale = 0;
  shakeYScale = 0;

  // Init wave related stuff
  waveCount = 0;
  waveEnemiesToSpawn = 0;
  waveChestSpawned = true;
  enemySpawnTimer = 0;
  waveEnemySpawnWindow = 0;
  waveTimer = 5000;

  // reset ui?
  cycleInstructions(startSeqCount);
  // Hide end screen
  hideEndScreen();
  showStartScreen();

  // Reset player?
  player.reset();
  // reset enemy, treasure, and cannonball pool
  enemyPool.forEach(e => e.hide());
  treasurePool.forEach(t => t.hide());
  cannonballPool.forEach(c => c.hide());

  // Remove rocks from scene and reset array
  shouldGenRocks = false;
  rocks.forEach(r => scene.remove(r.posSphere)); // remove from scene
  rocks.splice(0, rocks.length); // clean out rocks array

  // Something something soundtrack
  if (soundtrack) {
    soundtrack.GAIN.gain.setValueAtTime(0, soundtrack.ctx.currentTime);
    soundtrack.playing = false;
  }

  if (!seagulls) {
    seagulls = createLoopedSound('SEAGULLS');
    seagulls.sound.start(0);
  }
  seagulls.GAIN.gain.setValueAtTime(0.2, seagulls.ctx.currentTime);

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
          treasureCount += 1;
          player.heal();
          increaseHUDCount(treasureCount, 'treasure-count');
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
      if (isGameOver) {
        resetPressCount += 1;
        if (resetPressCount >= RESET_PRESS_MAX) reset();
        updateResetGradient(1 - resetPressCount / RESET_PRESS_MAX);
      } else {
        player.calmFire(600);
      }
    }
  };

  // Steering
  getRudderKnob(input$)
    .map(data => data.value + Math.PI)
    .fold(
      (prev, value) => {
        let delta = 0;
        const valChange = prev.value - value;
        if (valChange > 0.05) delta = -0.000007;
        if (valChange < -0.05) delta = 0.000007; // 0.0003
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
        if (valChange > 0.05) delta = 0.000002;
        if (valChange < -0.05) delta = -0.000002;
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
        if (isGameOver) {
          resetPressCount += 1;
          if (resetPressCount >= RESET_PRESS_MAX) reset();
          updateResetGradient(1 - resetPressCount / RESET_PRESS_MAX);
        } else {
          player.calmFire(1000);
        }
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
            treasureCount += 1;
            player.heal();
            increaseHUDCount(treasureCount, 'treasure-count');
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
