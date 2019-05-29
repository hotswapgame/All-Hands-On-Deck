import * as THREE from 'three';
import { prop, clamp } from 'ramda';

import Player from './Actors/Player';
import Cannonball from './Actors/Cannonball';

import { getModel } from './AssetManager';
import { GLOBALS, SHIP_DIRECTIONS } from './Constants';
import {
  getHatch, getWick, getRudderKnob, getSailKnob, getAllInputSwap, getFlame, getKey
} from './InputParser';

import {
  cycleInstructions, hideStartScreen, showStartScreen,
  hideEndScreen, updateResetGradient, cycleDayNight,
} from './UI';

import ScreenShake from './ScreenShake';
import StateManager from './StateHandlers';

// state handlers


let soundtrack;
let seagulls;
let prevTime = 0;

let screen;

// WHERE DIS STUFF GO?
// night day
let dayCount = 0;
let dayStamp = 0;
const dayDuration = 50000;

const scene = new THREE.Scene();
// Possibly make this a class so I can do that sweet tween
// find a good number for this
const cameraScale = 8;
const camera = new THREE.OrthographicCamera(
  window.innerWidth / (-cameraScale),
  window.innerWidth / cameraScale,
  window.innerHeight / cameraScale,
  window.innerHeight / (-cameraScale),
  -150,
  1000
);

// THESE ARE SHARED BTW MAIN AND START
const cannonballPool = Array.from(
  { length: 50 },
  () => new Cannonball(scene, GLOBALS.WORLD_SIZE)
);

const firePlayerCannon = (side, rotation, position, cannonRotOffset) => {
  const cannonball = cannonballPool.find(b => !b.isActive && !b.isExploding);
  if (cannonball) cannonball.playerFire(side, rotation, position, 0.03, cannonRotOffset);
};


// Maybe do the callback functions here in the main scene update
const player = new Player(scene, camera, GLOBALS.WORLD_SIZE, firePlayerCannon);

// init renderer
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setClearColor(0x666666, 0);
renderer.setPixelRatio(window.devicePixelRatio);

// do bloom effect here, they should make npm packages for this

// Make world a class that just holds the globe and maybe some clouds, land?
// should also include lights, except for player point light
// const worldTex = new THREE.TextureLoader().load('./Assets/world.png'); //0x5599AA
const worldMat = new THREE.MeshPhysicalMaterial({
  // color: 0x5599AA,
  // flatShading: true,
  // map: null,
  color: 0x5599AA,
  // clearCoatRoughness: 1,
  // clearCoat: 1,
  reflectivity: 1,
  roughness: 0,
  metalness: 0,
  opacity: 0.9,
  // side: THREE.FrontSide,
  // transparent: true,
  // envMapIntensity: 5,
  // premultipliedAlpha: true,
});

let world;
getModel('./Assets/world.stl')
  .then((geo) => {
    world = new THREE.Mesh(geo, worldMat);
    world.scale.set(GLOBALS.WORLD_SIZE, GLOBALS.WORLD_SIZE, GLOBALS.WORLD_SIZE);
    scene.add(world);
  });

function update(currentTime) {
  if (prevTime === 0) prevTime = currentTime;
  const dt = currentTime - prevTime;
  prevTime = currentTime;

  // Render at the start to update the matrix
  renderer.render(scene, camera); // use generic render function
  StateManager.update(dt);
  // Should we always do this?
  // if (currentTime - dayStamp > dayDuration) {
  //   cycleDayNight(dayCount);
  //   player.cycleLights(dayCount);
  //   dayCount += 1;
  //   dayStamp = currentTime;
  // }

  // set next frame
  requestAnimationFrame(update.bind(this));
}

function reset() {
  prevTime = 0;

  // reset enemy, treasure, and cannonball pool
  cannonballPool.forEach(c => c.hide());

  // Something something soundtrack
  if (soundtrack) {
    soundtrack.GAIN.gain.setValueAtTime(0, soundtrack.ctx.currentTime);
    soundtrack.playing = false;
  }

  if (!seagulls) {
    // seagulls = createLoopedSound('SEAGULLS');
    // seagulls.sound.start(0);
  }
  // seagulls.GAIN.gain.setValueAtTime(0.2, seagulls.ctx.currentTime);

  requestAnimationFrame(update.bind(this));
}

export function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function playListener() {
  // hide ui
  reset();
}

const gameState = {
  state: 'START',
  player,
  scene,
  renderer,
  world,
  camera,
  cannonballPool,
  score: {
    ships: 0,
    treasure: 0,
    totalTime: 0,
    fireTime: 0,
  },
};

export function init(input$) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  screen = document.querySelector('#screen');
  screen.appendChild(renderer.domElement);
  ScreenShake.init(screen); // attach screen shake el
  resize();

  // initialize all state managers
  StateManager.init(gameState);

  // OTHER STUFF TO LOOK AT BELOW

  // keyboard shortcuts
  // maybe move these to the init of each state handler and remove them
  window.onkeyup = (e) => {
    if (e.keyCode === 75) {
      // treasurePool.forEach((t) => {
      //   if (t.keyTurnCheck()) {
      //     // score
      //     treasureCount += 1;
      //     player.heal();
      //     increaseHUDCount(treasureCount, 'treasure-count');
      //   }
      // });
    }
    // light port
    if (e.keyCode === 87) {
      player.lightFuse(SHIP_DIRECTIONS.PORT);
    }
    // light starboard
    if (e.keyCode === 83) {
      player.lightFuse(SHIP_DIRECTIONS.STARBOARD);
    }

    if (e.keyCode === 73) {
      player.addFlame(8000);
    }

    // Load port
    if (e.keyCode === 65) {
      player.loadCannon(SHIP_DIRECTIONS.PORT);
    }

    // Load starboard
    if (e.keyCode === 68) {
      player.loadCannon(SHIP_DIRECTIONS.STARBOARD);
    }

    // Load port
    if (e.keyCode === 38) {
      player.setSailSpeed(0.00001);
      // if (isStartSeq && !isGameOver) {
      //   hideStartScreen();
      //   isStartSeq = false;
      // }
    }

    if (e.keyCode === 40) {
      player.setSailSpeed(-0.00001);
      // if (isGameOver) {
      //   reset();
      // }
    }

    if (e.keyCode === 37) {
      player.setTurnAngle(0.00005);
    }

    if (e.keyCode === 39) {
      player.setTurnAngle(-0.00005);
    }

    if (e.keyCode === 70) {
      // if (isGameOver) {
      //   resetPressCount += 1;
      //   if (resetPressCount >= RESET_PRESS_MAX) reset();
      //   updateResetGradient(1 - resetPressCount / RESET_PRESS_MAX);
      // } else {
      //   player.calmFire(600);
      // }
    }
  };

  // Steering
  getRudderKnob(input$)
    .map(data => data.value + Math.PI)
    .fold(
      (prev, value) => {
        let delta = 0;
        const valChange = prev.value - value;
        if (valChange > 0.05) delta = -0.000007;
        if (valChange < -0.05) delta = 0.000007; // 0.0003
        return {
          delta,
          value,
        };
      },
      { delta: 0, value: 0 }
    )
    .filter(data => data.delta !== 0)
    .subscribe({
      next: data => player.setTurnAngle(data.delta),
      error: console.log,
      complete: console.log,
    });

  // Speed
  getSailKnob(input$)
    .map(data => data.value + Math.PI)
    .fold(
      (prev, value) => {
        let delta = 0;
        const valChange = prev.value - value;
        if (valChange > 0.05) delta = 0.000002;
        if (valChange < -0.05) delta = -0.000002;
        return {
          delta,
          value,
        };
      },
      { delta: 0, value: 0 }
    )
    .filter(data => data.delta !== 0)
    .subscribe({
      next: data => player.setSailSpeed(data.delta),
      error: console.log,
      complete: console.log,
    });

  // Ammo
  getHatch(input$)
    .fold(
      (acc, curr) => ({ id: curr.id, prev: curr.isOpen, shouldLoad: (curr.isOpen && !acc.prev) }),
      { id: 0, shouldLoad: false }
    )
    .filter(prop('shouldLoad'))
    .map(({ id }) => (id === 1 ? SHIP_DIRECTIONS.PORT : SHIP_DIRECTIONS.STARBOARD))
    .subscribe({
      next: (direction) => {
        // if (startSeqCount === 2) {
        //   startSeqCount += 1;
        //   cycleInstructions(startSeqCount);
        // }
        player.loadCannon(direction);
      },
      error: console.log,
      complete: console.log,
    });

  // Fire
  getWick(input$)
    .fold(
      (acc, curr) => ({ id: curr.id, prev: curr.isLit, shouldLight: (curr.isLit && !acc.prev) }),
      { id: 0, shouldLight: false }
    )
    .filter(prop('shouldLight'))
    .map(({ id }) => (id === 1 ? SHIP_DIRECTIONS.PORT : SHIP_DIRECTIONS.STARBOARD))
    .subscribe({
      next: (direction) => {
        // if (startSeqCount === 3) {
        //   startSeqCount += 1;
        // }

        player.lightFuse(direction);
      },
      error: console.log,
      complete: console.log,
    });

  // Put fire out
  getFlame(input$)
    .fold((acc, curr) => ({
      prev: curr.isPressed,
      output: (!acc.prev && curr.isPressed),
    }), { prev: false })
    .filter(data => data.output)
    .subscribe({
      next: () => {
        // if (isGameOver) {
        //   resetPressCount += 1;
        //   if (resetPressCount >= RESET_PRESS_MAX) reset();
        //   updateResetGradient(1 - resetPressCount / RESET_PRESS_MAX);
        // } else {
        //   player.calmFire(1000);
        // }
      },
      error: console.log,
      complete: console.log,
    });

  // open treasure
  getKey(input$)
    .fold((acc, curr) => ({
      prev: curr.isPressed,
      output: (!acc.prev && curr.isPressed),
    }), { prev: false })
    .filter(data => data.output)
    .subscribe({
      next: (d) => {
        // treasurePool.forEach((t) => {
        //   if (t.keyTurnCheck()) {
        //     // score
        //     treasureCount += 1;
        //     player.heal();
        //     increaseHUDCount(treasureCount, 'treasure-count');
        //   }
        // });
      },
      error: console.log,
      complete: console.log,
    });

  // Used to trigger speech bubbles
  getAllInputSwap(input$)
    .map(([sideId, type]) => [
      sideId === 1 ? SHIP_DIRECTIONS.PORT : SHIP_DIRECTIONS.STARBOARD,
      type,
    ])
    .subscribe({
      next: ([side, type]) => {
        player.triggerBubble(side, type);
      },
      error: console.log,
      complete: console.log,
    });

  playListener();
}
