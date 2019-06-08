import { any } from 'ramda';

import EnemyShip from '../Actors/EnemyShip';
import Boss from '../Actors/Boss';
import Treasure from '../Actors/Treasure';
import Rock from '../Actors/Rock';
import ScreenShake from '../ScreenShake';
import { setBossSoundtrack, setMainSoundtrack, playExplosion } from '../SoundPlayer';

import { WAVES, WAVE_TYPES } from '../WaveConfig';
import { GLOBALS, GAME_TYPES, GAME_STATES, INPUT_TYPES, SHIP_DIRECTIONS } from '../Constants';

import { increaseHUDCount } from '../UI';
import Bomber from '../Actors/Bomber';

// Set on init
let sharedData;
let setState;

// Use this to give players grace period at start
let enemySpawnSide = -1;

let waveCount = -1;
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
const bosses = [];
const bombers = [];
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
  const enemy = enemyPool.find(e => !e.isActive && !e.isDying && !e.isSinking);
  // Hard cap is in the enemy pool rn ~50
  if (enemy) {
    enemySpawnSide *= -1;
    enemy.spawn(sharedData.player.moveSphere.rotation, enemySpawnSide);
  }
}

function spawnBomber(bossRot, spawnAngle) {
  const newBomber = new Bomber(sharedData.scene, bossRot, spawnAngle);
  bombers.push(newBomber);
}

function spawnBoss(angle) {
  const newBoss = new Boss(sharedData.scene, spawnBomber, sharedData.player.moveSphere.rotation, angle);
  bosses.push(newBoss);
}

function init(sharedSource, stateFunc) {
  sharedData = sharedSource;
  setState = stateFunc;

  for (let i = 0; i < 3; i += 1) {
    treasurePool.push(new Treasure(sharedData.scene, GLOBALS.WORLD_SIZE));
  }

  for (let i = 0; i < 20; i += 1) {
    enemyPool.push(new EnemyShip(sharedData.scene, GLOBALS.WORLD_SIZE, fireEnemyCannon));
  }
}

function begin() {
  increaseHUDCount(0, 'enemy-count');
  increaseHUDCount(0, 'treasure-count');
  setMainSoundtrack();

  // Reset local state vars
  enemySpawnSide = -1;
  waveCount = -1;
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
              score.ships += 1;
              increaseHUDCount(score.ships, 'enemy-count');
            }
          }
        });

        bombers.forEach((b) => {
          if (b.isActive && b.getHit(c.getPosition())) {
            b.die();
            c.explode();
            // score?
          }
        });

        bosses.forEach((b) => {
          if (b.checkHit(c.getPosition(), 2)) {
            b.subHealth(1);
            c.explode();
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
  });

  // should also map over enemies to intersect player and each other
  enemyPool.forEach((e1) => {
    if (e1.isActive) {
      if (player.getEnemyHit(e1)) {
        e1.die(true);
        playExplosion();
        player.addFlame(1500);
        player.slowSpeed(0.6);
        ScreenShake.trigger(2, 200);
        score.ships += 1;
        increaseHUDCount(score.ships, 'enemy-count');
      }
    }
  });

  // should also map over enemies to intersect player and each other
  bombers.forEach((b1) => {
    if (b1.isActive) {
      if (player.getEnemyHit(b1)) {
        b1.die(true);
        playExplosion();
        player.addFlame(900);
        player.slowSpeed(0.8);
        ScreenShake.trigger(15, 300);
        score.ships += 1;
      }

      const bPos = b1.getPosition();
      rocks.forEach((r) => {
        if (bPos.distanceTo(r.getPosition()) < r.hitRadius + 10) {
          b1.die(true);
          playExplosion();
        }
      });
    }
  });
}

function filterRocks() {
  // Remove rocks for boss fight for now
  if (rocks.length > 0) {
    let rockToRemove;

    rocks.forEach((r, i) => {
      if (r.isSunken) rockToRemove = i;
    });

    if (rockToRemove !== undefined) rocks.splice(rockToRemove, 1);
  }
}

// Handles spawning and wave change logic
function updateWave(dt) {
  const { scene, player } = sharedData;
  // hack for start wave?
  const currentWave = waveCount > -1 ? WAVES[waveCount] : { count: 0, type: WAVE_TYPES.BASIC };

  // wave update logic
  switch (currentWave.type) {
    case WAVE_TYPES.BOSS:
      filterRocks();

      // filter out bosses from wave if they dead
      if (bosses.length > 0) {
        let bossToRemove;
        bosses.forEach((b, i) => {
          if (!b.isActive) {
            bossToRemove = i;
            sharedData.score.factory += 1;
          }
        });

        if (bossToRemove !== undefined) bosses.splice(bossToRemove, 1);
        if (bosses.length === 1 && bosses[0].isSinking) bombers.forEach(b => b.die());
      }

      // filter out bombers from wave if they dead
      if (bombers.length > 0) {
        let bomberToRemove;
        bombers.forEach((b, i) => {
          if (!b.isActive && !b.isDying) bomberToRemove = i;
        });

        if (bomberToRemove !== undefined) bombers.splice(bomberToRemove, 1);
      }
      break;
    case WAVE_TYPES.BASIC:
      waveTimer -= dt;
      filterRocks();
      // Treasure spawn logic
      if (!waveChestSpawned && waveTimer < (WAVE_MAX_TIME - WAVE_MAX_TIME / 100)) {
        waveChestSpawned = true;
        const treasure = treasurePool.find(t => !t.isActive);
        if (treasure) treasure.spawn(player.moveSphere.rotation);
      }
      break;
    default: break;
  }

  const shouldChangeWave = (currentWave.type === WAVE_TYPES.BOSS && bosses.length === 0 && waveEnemiesToSpawn < 1)
    || (currentWave.type !== WAVE_TYPES.BOSS && waveTimer <= 0);

  if (shouldChangeWave) {
    // change wave
    waveCount += 1;
    waveTimer = WAVE_MAX_TIME;
    const nextWave = waveCount < WAVES.length ? WAVES[waveCount] : WAVES[WAVES.length - 1];
    enemySpawnTimer = 5000; // Wait 5 sec into new wave before spawning
    waveEnemiesToSpawn = nextWave.count;
    bombers.forEach(b => b.die());

    // Check for wave change
    switch (nextWave.type) {
      case WAVE_TYPES.BOSS:
        rocks.forEach(r => r.startSinking(Math.round(Math.random() * 1000))); // add random delay to rock sinking?
        enemyPool.forEach((e) => { if (e.isActive) e.bossSink(Math.round(Math.random() * 800)); });
        waveEnemySpawnWindow = 1500;
        setBossSoundtrack();
        break;
      case WAVE_TYPES.BASIC:
        waveChestSpawned = false;
        // setMainSoundtrack();
        if (currentWave.type === WAVE_TYPES.BOSS || rocks.length === 0) {
          setMainFromBossSoundtrack();
          rocks.forEach(r => r.startSinking(Math.round(Math.random() * 1000)));
          shouldGenRocks = true;
        }

        // Divy out enemy spawns in the 1st 45 sec
        waveEnemySpawnWindow = (WAVE_MAX_TIME - ENEMY_SPAWN_BUFFER) / waveEnemiesToSpawn;
        break;
      default: break;
    }
  }

  if (shouldGenRocks) {
    // some code
    const rockCount = currentWave.type === WAVE_TYPES.BOSS ? 15 : 30;
    // actually need a for loop here :/
    for (let i = 0; i < rockCount; i += 1) {
      // spawn new rocks
      rocks.push(new Rock(scene, GLOBALS.WORLD_SIZE));
    }

    shouldGenRocks = false;
  }

  // Enemy spawn logic
  if (waveEnemiesToSpawn > 0 && enemySpawnTimer < 0) {
    if (currentWave.type === WAVE_TYPES.BASIC) spawnEnemy();
    else if (currentWave.type === WAVE_TYPES.BOSS) {
      const baseAngle = -Math.PI / 8 * (currentWave.count - 1);
      const spawnAngle = baseAngle + Math.PI / 4 * (currentWave.count - waveEnemiesToSpawn);
      spawnBoss(spawnAngle);

      // when all bosses are spawned, spawn rocks
      if (waveEnemiesToSpawn === 1) shouldGenRocks = true;
    }
    enemySpawnTimer = waveEnemySpawnWindow;
    waveEnemiesToSpawn -= 1;
  }
  enemySpawnTimer -= dt;
}

// maybe pass in shared data?... ye
function update(dt) {
  const { scene, renderer, player, cannonballPool, score, camera } = sharedData;
  // somehow render somewhere, also what goin on with matrix world update?
  ScreenShake.update(dt);

  player.update(dt, rocks, bosses);
  cannonballPool.forEach(c => c.update(dt));
  bombers.forEach(b => b.update(dt, player.getPosition(), bosses));
  bosses.forEach(b => b.update(dt));

  // Make sure rocks don't spawn on player position
  rocks.forEach((r) => {
    if (!r.isGoodPlacement) {
      const rPos = r.getPosition();
      const collideBoss = any(b => b.getPosition().distanceTo(rPos) < 80, bosses);
      const collidePlayer = rPos.distanceTo(player.getPosition()) < 120;
      // arbitary spawn distance of 130
      if (collideBoss || collidePlayer) {
        r.randomlyPlace();
      } else {
        r.fixPlacement();
      }
    }
  });

  // if (!soundtrack) {
  //   soundtrack = createLoopedSound('SOUNDTRACK');
  //   soundtrack.sound.start(0);
  //   soundtrack.GAIN.gain.setValueAtTime(0.2, soundtrack.ctx.currentTime);
  //   soundtrack.playing = true;
  // } else if (!soundtrack.playing) {
  //   soundtrack.GAIN.gain.setValueAtTime(0.2, soundtrack.ctx.currentTime);
  //   soundtrack.playing = true;
  // }

  score.totalTime += dt;
  rocks.forEach(r => r.update(dt));
  enemyPool.forEach(e => e.update(dt, player.getPosition(), rocks));
  treasurePool.forEach((t) => {
    t.checkTrigger(player.getPosition());
    t.update(dt, rocks);
  });

  checkCollisions();
  updateWave(dt);

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

  treasurePool.forEach(t => t.hide());
  enemyPool.forEach(e => e.hide());
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
      player.setTurnAngle(data * 1.5);
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
    case INPUT_TYPES.FLAME:
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
