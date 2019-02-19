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
};

export const INPUT_TYPES = {
  WICK: 'WICK',
  HATCH: 'HATCH',
  SAIL: 'SAIL',
  RUDDER: 'RUDDER',
  FLAME: 'FLAME',
};

export const SHIP_DIRECTIONS = {
  PORT: 'PORT',
  STARBOARD: 'STARBOARD',
};

export default {
  KEYS,
  GAME_TYPES,
  SHIP_DIRECTIONS,
};
