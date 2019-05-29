import StartHandler from './StartScreen';
import MainHandler from './MainScene';
import EndHandler from './GameOver';

import { GAME_STATES } from '../Constants';

const handlers = {};
handlers[GAME_STATES.START] = StartHandler;
handlers[GAME_STATES.MAIN] = MainHandler;
handlers[GAME_STATES.END] = EndHandler;

let currentState;
function setState(newState) {
  // the first time we set the state this won't exist
  if (handlers[currentState]) handlers[currentState].exit();
  currentState = newState;
  handlers[currentState].begin();
}

export function init(source) {
  StartHandler.init(source, setState);
  MainHandler.init(source, setState);
  EndHandler.init(source, setState);

  setState(GAME_STATES.START);
}

export function update(dt) {
  handlers[currentState].update(dt);
}

export default { init, update };
