import { runGameOverSequence, hideEndScreen } from '../UI';

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
  runGameOverSequence(score.ships, score.treasure, score.totalTime, score.fireTime);
}

function update(dt) {

}

function exit() {
  hideEndScreen();
}

export default { init, begin, update, exit };
