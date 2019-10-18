import * as THREE from 'three';
import { prop, clamp } from 'ramda';

import Player from './Actors/Player';
import Cannonball from './Actors/Cannonball';

import { getModel } from './AssetManager';
import { GLOBALS, SHIP_DIRECTIONS, INPUT_TYPES } from './Constants';
import {
  getHatch, getWick, getRudderKnob, getSailKnob, getAllInputSwap, getFlame, getKey
} from './InputParser';

import { cycleDayNight } from './UI';

import ScreenShake from './ScreenShake';
import StateManager from './StateHandlers';

let soundtrack;
let seagulls;
let prevTime = 0;

let screen;

// WHERE DIS STUFF GO?
// night day
let dayCount = 0;
let dayStamp = 0;
const dayDuration = 5000000000;

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
  color: 0xAAAAAA,
  reflectivity: 0,
  roughness: 0,
  metalness: 0,
  opacity: 0.9,
});

let world;
getModel('./Assets/world.stl')
  .then((geo) => {
    world = new THREE.Mesh(geo, worldMat);
    world.scale.set(GLOBALS.WORLD_SIZE, GLOBALS.WORLD_SIZE, GLOBALS.WORLD_SIZE);
    scene.add(world);
  });

// CLEMENT'S BAD CLOUD SCRIPT
const rotationSegmentCount = 5;
const rotationStep = (Math.PI*2)/(rotationSegmentCount+1);
const rotationStepRange = rotationStep*0.2;
const clusterRange = Math.PI*0.00;
const clusterSize = 1;
let cloudRotation = [];
for (let i=0; i<rotationSegmentCount; i++) {
  for (let j=0; j<rotationSegmentCount; j++) {
    let rx = Math.random()*rotationStepRange + i*rotationStep;
    let ry = Math.random()*rotationStepRange + j*rotationStep;
    cloudRotation.push({x:rx, y:ry});
  }
}
for (let i=0; i<cloudRotation.length; i++) {
  for (let j=0; j<clusterSize; j++) {
    let cloudRotationX = cloudRotation[i].x + (Math.random()*clusterRange - clusterRange/2);
    let cloudRotationY = cloudRotation[i].y + (Math.random()*clusterRange - clusterRange/2);
    
    // BIG CLOUDS
    // let cloudScaleAreaX = 25 + Math.random()*20;
    // let cloudScaleAreaY = 25 + Math.random()*20;

    // SMALL CLOUDS
    let cloudPositionHeightFactor = 1.0 + Math.random()*0.2;
    let cloudPositionHeight = GLOBALS.WORLD_SIZE + 15*cloudPositionHeightFactor;
    
    let cloudScaleAreaX = (17 + Math.random()*10) * cloudPositionHeightFactor;
    let cloudScaleAreaY = 0.9 * cloudScaleAreaX + (Math.random() * 0.2);

    let cloudScaleHeight = 10 + Math.random()*15;
    let cloudRotationZ = Math.PI*2*Math.random();
    const cloudModelNum = Math.floor(Math.random() * 2) + 3;
    getModel(`./Assets/cloud${cloudModelNum}.stl`)
      .then((geo) => {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.6,
          //side: THREE.BackSide,
        });
        let cloud = new THREE.Mesh(geo, mat);
        cloud.scale.set(cloudScaleAreaX, cloudScaleAreaY, cloudScaleHeight);
        cloud.rotation.set(cloudRotationX, cloudRotationY, cloudRotationZ);
        let cloudPosition = new THREE.Vector3(0, 0, cloudPositionHeight);
        let cloudRotationE = new THREE.Euler(cloudRotationX, cloudRotationY, cloudRotationZ);
        cloudPosition.applyEuler(cloudRotationE);
        cloud.position.set(cloudPosition.x, cloudPosition.y, cloudPosition.z);
        scene.add(cloud);
      });
  }
}

// END CLEMENT'S BAD CLOUD SCRIPT


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
    factory: 0,
    treasure: 0,
    totalTime: 0,
    fireTime: 0,
  },
};

export function init(input$, serial) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  screen = document.querySelector('#screen');
  screen.appendChild(renderer.domElement);
  ScreenShake.init(screen); // attach screen shake el
  resize();

  gameState.serial = serial;
  // initialize all state managers
  StateManager.init(gameState);

  // OTHER STUFF TO LOOK AT BELOW

  // keyboard shortcuts
  // maybe move these to the init of each state handler and remove them
  window.onkeyup = ({ keyCode }) => {
    StateManager.handleKeyboard(keyCode);
    // if (e.keyCode === 73) {
    //   player.addFlame(8000);
    // }
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
      next: data => StateManager.handleInput(INPUT_TYPES.RUDDER, data.delta),
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
      next: data => StateManager.handleInput(INPUT_TYPES.SAIL, data.delta),
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
      next: data => StateManager.handleInput(INPUT_TYPES.HATCH, data),
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
      next: data => StateManager.handleInput(INPUT_TYPES.WICK, data),
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
      next: () => StateManager.handleInput(INPUT_TYPES.FLAME),
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
      next: d => StateManager.handleInput(INPUT_TYPES.KEY, d),
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
