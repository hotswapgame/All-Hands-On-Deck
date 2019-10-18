import { runGameOverSequence, hideEndScreen, updateResetGradient } from '../UI';
import { GAME_STATES, INPUT_TYPES } from '../Constants';

// reset stuff
let resetPressCount = 0;
const RESET_PRESS_MAX = 15;

let sharedData;
let setState;
function init(sharedSource, stateFunc) {
  sharedData = sharedSource;
  setState = stateFunc;
}

function begin() {
  const { score } = sharedData;
  resetPressCount = 0;
  updateResetGradient(1 - resetPressCount / RESET_PRESS_MAX);
  runGameOverSequence(score.ships, score.factory, score.treasure, score.totalTime, score.fireTime);
}

function update(dt) {
  // Has to exist, but unused
}

function exit() {
  hideEndScreen();
}

function handleInput(type, data) {
  if (type === INPUT_TYPES.FLAME) {
    resetPressCount += 1;
    if (resetPressCount >= RESET_PRESS_MAX) {
      sharedData.serial.stop();
      setTimeout(() => location.reload(), 500);
      // setState(GAME_STATES.START);
    }
    updateResetGradient(1 - resetPressCount / RESET_PRESS_MAX);
  }
}

function handleKeyboard(key) {
  switch (key) {
    case 40:
      setState(GAME_STATES.START);
      break;
    case 70:
      resetPressCount += 1;
      if (resetPressCount >= RESET_PRESS_MAX) {
        location.reload();
        // setState(GAME_STATES.START);
      }
      updateResetGradient(1 - resetPressCount / RESET_PRESS_MAX);
      break;
    default: break;
  }
}

export default { init, begin, update, exit, handleInput, handleKeyboard };
