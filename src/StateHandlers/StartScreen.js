import ScreenShake from '../ScreenShake';
import { hideStartScreen, cycleInstructions, showStartScreen } from '../UI';
import { GAME_STATES } from '../Constants';

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

// naming?
function exit() {
  hideStartScreen();
}

export default { init, begin, update, exit };
