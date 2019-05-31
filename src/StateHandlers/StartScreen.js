import ScreenShake from '../ScreenShake';
import { hideStartScreen, cycleInstructions, showStartScreen } from '../UI';
import { GAME_STATES, INPUT_TYPES, SHIP_DIRECTIONS } from '../Constants';

// local state variables
// Start sequence stuff
let isStartSeq = true;
let startSeqCount = 0;
const startSequence = ['SAIL', 'RUDDER', 'HATCH', 'WICK'];

let sharedData;
let setState;
function init(sharedSource, stateFunc) {
  sharedData = sharedSource;
  setState = stateFunc;
}

function begin() {
  startSeqCount = 0;
  isStartSeq = true;
  showStartScreen();
  sharedData.player.reset();
  sharedData.cannonballPool.forEach(c => c.hide());

  // reset score
  sharedData.score.ships = 0;
  sharedData.score.treasure = 0;
  sharedData.score.totalTime = 0;
  sharedData.score.fireTime = 0;
}

// shared items
/**
 * treasurePool
 */
function update(dt) {
  const { scene, renderer, camera, player, cannonballPool } = sharedData;
  ScreenShake.update(dt);

  player.update(dt, []); // only collide rocks when not start seq
  cannonballPool.forEach(c => c.update(dt));

  switch (startSeqCount) {
    case 0:
      if (player.velocityTarget > 0.000001) {
        startSeqCount += 1;
      }

      // Does this need to happen every frame?
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
      setState(GAME_STATES.MAIN);
      break;
    default: break;
  }

  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
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
      if (startSeqCount === 2) {
        startSeqCount += 1;
        cycleInstructions(startSeqCount);
      }

      player.loadCannon(data);
      break;
    case INPUT_TYPES.WICK:
      if (startSeqCount === 3) {
        startSeqCount += 1;
      }

      player.lightFuse(data);
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
      hideStartScreen();
      setState(GAME_STATES.MAIN);
      break;
    case 40:
      player.setSailSpeed(-0.00001);
      // if (isGameOver) {
      //   reset();
      // }
      break;
    case 70:
      player.calmFire(600);
      // if (isGameOver) {
      //   resetPressCount += 1;
      //   if (resetPressCount >= RESET_PRESS_MAX) reset();
      //   updateResetGradient(1 - resetPressCount / RESET_PRESS_MAX);
      // }
      break;
    case 37:
      player.setTurnAngle(0.00005);
      break;
    case 39:
      player.setTurnAngle(-0.00005);
      break;
    default: break;
  }
}

// naming?
function exit() {
  hideStartScreen();
}

export default { init, begin, update, exit, handleInput, handleKeyboard };
