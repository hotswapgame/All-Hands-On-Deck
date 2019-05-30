import EnemyShip from '../Actors/EnemyShip';
import Treasure from '../Actors/Treasure';
import Rock from '../Actors/Rock';
import ScreenShake from '../ScreenShake';
import { playSound, createLoopedSound } from '../SoundPlayer';

import { WAVE_SIZES } from '../WaveConfig';
import { GLOBALS, GAME_TYPES, GAME_STATES, INPUT_TYPES, SHIP_DIRECTIONS } from '../Constants';

import { increaseHUDCount } from '../UI';

// Set on init
let sharedData;
let setState;

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
let soundtrack;

let shouldGenRocks = false;
const rocks = [];

const treasurePool = [];

// HACK FOR REDUCING GC LOAD
let shouldUpdateWorldMatrix = false;

// ENEMY STUFF
const enemyPool = [];
// Arrow to keep scope, pass to enemy so we can share one pool
// maybe create a separate pool for enemy and player :|
// Better not be called ever before init
const fireEnemyCannon = (enemyRot, enemyHeading) => {
  const cannonball = sharedData.cannonballPool.find(b => !b.isActive && !b.isExploding);
  if (cannonball) {
    cannonball.enemyFire(enemyRot, 0.09, enemyHeading);
  }
};

function spawnEnemy() {
  activeEnemies += 1;
  const enemy = enemyPool.find(e => !e.isActive && !e.isDying);
  // Hard cap is in the enemy pool rn ~50
  if (enemy) {
    enemySpawnSide *= -1;
    enemy.spawn(sharedData.player.moveSphere.rotation, enemySpawnSide);
  }
}

function init(sharedSource, stateFunc) {
  sharedData = sharedSource;
  setState = stateFunc;

  for (let i = 0; i < 3; i += 1) {
    treasurePool.push(new Treasure(sharedData.scene, GLOBALS.WORLD_SIZE));
  }

  for (let i = 0; i < 50; i += 1) {
    enemyPool.push(new EnemyShip(sharedData.scene, GLOBALS.WORLD_SIZE, fireEnemyCannon));
  }
}

function begin() {
  increaseHUDCount(0, 'enemy-count');
  increaseHUDCount(0, 'treasure-count');

  treasurePool.forEach(t => t.hide());
  enemyPool.forEach(e => e.hide());

  // Reset local state vars
  enemySpawnSide = -1;
  activeEnemies = 0;
  waveCount = 0;
  waveEnemiesToSpawn = 0;
  waveChestSpawned = true;
  enemySpawnTimer = 0;
  waveEnemySpawnWindow = 0;
  waveTimer = 5000; // Include a start offset when the game begins
  shouldGenRocks = false;
}

function checkCollisions() {
  const { player, cannonballPool, score } = sharedData;

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
              score.ships += 1;
              increaseHUDCount(score.ships, 'enemy-count');
            }
          }
        });
      } else if (c.ownerType === GAME_TYPES.ENEMY) {
        if (player.getHit(c.getPosition())) {
          c.explode();
          player.addFlame(2000);
          ScreenShake.trigger(1, 100);
        }
      }

      rocks.forEach((r) => {
        if (c.hitBuffer < 0
          && c.getPosition().distanceTo(r.getPosition()) < r.hitRadius + c.hitRadius) {
          c.explodeNextUpdate();
        }
      });
    }

    // should also map over enemies to intersect player and each other
    enemyPool.forEach((e1) => {
      if (e1.isActive) {
        if (player.getEnemyHit(e1)) {
          e1.die(true);
          activeEnemies -= 1;
          playSound('EXPLODE');
          player.addFlame(1500);
          player.slowSpeed(0.6);
          ScreenShake.trigger(2, 200);
          score.ships += 1;
          increaseHUDCount(score.ships, 'enemy-count');
        }
      }
    });
  });
}

// maybe pass in shared data?... ye
function update(dt) {
  const { scene, renderer, player, cannonballPool, score, camera } = sharedData;
  // somehow render somewhere, also what goin on with matrix world update?
  ScreenShake.update(dt);

  player.update(dt, rocks);
  cannonballPool.forEach(c => c.update(dt));

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

  if (!soundtrack) {
    soundtrack = createLoopedSound('SOUNDTRACK');
    soundtrack.sound.start(0);
    soundtrack.GAIN.gain.setValueAtTime(0.2, soundtrack.ctx.currentTime);
    soundtrack.playing = true;
  } else if (!soundtrack.playing) {
    soundtrack.GAIN.gain.setValueAtTime(0.2, soundtrack.ctx.currentTime);
    soundtrack.playing = true;
  }

  score.totalTime += dt;
  rocks.forEach(r => r.update(dt));
  enemyPool.forEach(e => e.update(dt, player.getPosition(), rocks));
  treasurePool.forEach((t) => {
    t.checkTrigger(player.getPosition());
    t.update(dt, rocks);
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
      rocks.push(new Rock(scene, GLOBALS.WORLD_SIZE));
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

  // keep track of time player is on fire
  if (player.onFire) score.fireTime += dt;

  // Check end game
  if (player.onFire && player.fireTime >= player.fireMax) {
    // trigger game over here
    setState(GAME_STATES.END);
  }

  shouldUpdateWorldMatrix = !shouldUpdateWorldMatrix;
  if (shouldUpdateWorldMatrix) scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

function exit() {
  shouldGenRocks = false;
  rocks.forEach(r => sharedData.scene.remove(r.posSphere)); // remove from scene
  rocks.splice(0, rocks.length); // clean out rocks array
}

function openTreasure() {
  treasurePool.forEach((t) => {
    if (t.keyTurnCheck()) {
      // score
      sharedData.score.treasure += 1;
      sharedData.player.heal();
      increaseHUDCount(sharedData.score.treasure, 'treasure-count');
    }
  });
}

// For rudder and sail data will be a delta value
// For wick and cannon data will be a direction
function handleInput(type, data) {
  const { player } = sharedData;

  switch (type) {
    case INPUT_TYPES.SAIL:
      player.setSailSpeed(data);
      break;
    case INPUT_TYPES.RUDDER:
      player.setTurnAngle(data);
      break;
    case INPUT_TYPES.HATCH:
      player.loadCannon(data);
      break;
    case INPUT_TYPES.WICK:
      player.lightFuse(data);
      break;
    case INPUT_TYPES.KEY:
      openTreasure();
      break;
    case INPUT_TYPES.FIRE:
      player.calmFire(1000);
      break;
    default: break;
  }
}

function handleKeyboard(key) {
  const { player } = sharedData;

  switch (key) {
    case 87:
      player.lightFuse(SHIP_DIRECTIONS.PORT);
      break;
    case 83:
      player.lightFuse(SHIP_DIRECTIONS.STARBOARD);
      break;
    case 65:
      player.loadCannon(SHIP_DIRECTIONS.PORT);
      break;
    case 68:
      player.loadCannon(SHIP_DIRECTIONS.STARBOARD);
      break;
    case 38:
      player.setSailSpeed(0.00001);
      break;
    case 40:
      player.setSailSpeed(-0.00001);
      break;
    case 70:
      player.calmFire(600);
      break;
    case 37:
      player.setTurnAngle(0.00005);
      break;
    case 39:
      player.setTurnAngle(-0.00005);
      break;
    case 75:
      openTreasure();
      break;
    default: break;
  }
}

export default { init, begin, update, exit, handleInput, handleKeyboard };
