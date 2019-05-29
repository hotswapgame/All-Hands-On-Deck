export const KEYS = {
  // Arrow keys
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,

  // W, A, S, D keys
  W: 87,
  A: 65,
  S: 83,
  D: 68,

  // Other keys
  SPACE: 32,
};

// to me this is more straightforward than using type of,
// and it allows for broader categories
export const GAME_TYPES = {
  PLAYER: 'PLAYER',
  ENEMY: 'ENEMY',
  CANNONBALL: 'CANNONBALL',
  TREASURE: 'TREASURE',
  ROCK: 'ROCK',
};

export const GAME_STATES = {
  START: 'START',
  MAIN: 'MAIN',
  END: 'END',
};

export const INPUT_TYPES = {
  WICK: 'WICK',
  HATCH: 'HATCH',
  SAIL: 'SAIL',
  RUDDER: 'RUDDER',
  FLAME: 'FLAME',
  KEY: 'KEY',
};

export const SHIP_DIRECTIONS = {
  PORT: 'PORT',
  STARBOARD: 'STARBOARD',
};

export const GLOBALS = {
  WORLD_SIZE: 200,
};

export default {
  KEYS,
  GAME_TYPES,
  SHIP_DIRECTIONS,
};
