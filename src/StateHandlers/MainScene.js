import EnemyShip from '../Actors/EnemyShip';
import Treasure from '../Actors/Treasure';
import Rock from '../Actors/Rock';

// Set on init
let sharedData;

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

// Screen shake for juice
let isShaking = false;
let shakeTime = 0;
const shakeIntensity = 3;
let shakeXScale = 0;
let shakeYScale = 0;

let shouldGenRocks = false;
const rocks = [];

const treasurePool = [];

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
    enemy.spawn(sharedData.player.moveSphere.rotation, enemySpawnSide, rocks); // WHY PASS ROCKS HERE?
  }
}

function triggerGameOver(fireTime) {
  sharedData.setState('GAME_OVER'); // USE ENUM
  runGameOverSequence(shipsSunk, treasureCount, totalTime, fireTime);
}

function startShake(intensity, time) {
  isShaking = true;
  shakeTime = time;
  shakeXScale = intensity * Math.random() > 0.5 ? 1 : -1;
  shakeYScale = intensity * Math.random() > 0.5 ? 1 : -1;
}

function init(sharedSource) {
  sharedData = sharedSource;

  for (let i = 0; i < 3; i += 1) {
    treasurePool.push(new Treasure(sharedData.scene, sharedData.WORLD_SIZE));
    // REMOVE ROCKS FROM TREASURE
  }

  for (let i = 0; i < 50; i += 1) {
    enemyPool.push(new EnemyShip(sharedData.scene, sharedData.WORLD_SIZE, fireEnemyCannon));
    // REMOVE ROCKS FROM ENEMY
  }
}

function begin() {

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
        if (c.hitBuffer < 0 && c.getPosition().distanceTo(r.getPosition()) < r.hitRadius + c.hitRadius) {
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
          startShake(2, 200);
          shipsSunk += 1;
          increaseHUDCount(shipsSunk, 'enemy-count');
        }
      }
    });
  });
}

function update(dt) {
  sharedData.render();

  player.update(dt, rocks, !isStartSeq); // only collide rocks when not start seq
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

export default { init, update };
