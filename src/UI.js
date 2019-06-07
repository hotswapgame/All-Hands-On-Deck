import { forEach } from 'ramda';

export function cycleInstructions(instructionCounter) {
  const elements = document.getElementsByClassName('instruction-text');
  for (let i = 0; i < 4; i += 1) {
    elements[i].classList.remove('active');
  }
  elements[instructionCounter].classList.add('active');
}

export function increaseHUDCount(c, id) {
  const element = document.getElementById(id);
  element.innerHTML = c;
  if (element.classList.contains('active')) {
    element.classList.remove('active');
  }

  element.classList.add('active');
  setTimeout(() => {
    if (element.classList.contains('active')) {
      element.classList.remove('active');
    }
  }, 200);
}

export function showStartScreen() {
  document.getElementById('start-screen').classList.add('active');
}

export function hideStartScreen() {
  document.getElementById('start-screen').classList.remove('active');
  const elementHUD = document.getElementById('screen-hud');
  if (!elementHUD.classList.contains('active')) {
    elementHUD.classList.add('active');
  }
}

export function hideEndScreen() {
  document.getElementById('game-over').classList.remove('active');
  const statElements = document.getElementsByClassName('stat-box');
  forEach(e => e.classList.remove('active'), statElements);
}

function revealStat(i) {
  const element = document.getElementsByClassName('stat-box')[i];
  element.classList.add('active');
}

export function updateResetGradient(resetPercent) {
  const bg = document.getElementById('game-over');
  const pos1 = resetPercent * 80;
  const pos2 = 50 + resetPercent * 50;
  const pos0 = (1-resetPercent) * -10;
  bg.style.background = `linear-gradient(
    0deg,
    rgba(20, 0, 0, 1.0) ${pos0}%,
    rgba(100, 20, 10, 0.7) ${pos1}%,
    rgba(100, 20, 10, 0) ${pos2}%)
  `;
}

export function runGameOverSequence(shipSunk, factoryDestroyed, treasureFound, timeTotal, timeFire) {
  const elementHUD = document.getElementById('screen-hud');
  if (elementHUD.classList.contains('active')) {
    elementHUD.classList.remove('active');
  }
  const elementGO = document.getElementById('game-over'); // clement you should be more specifc than just 'element'
  elementGO.classList.add('active');

  document.getElementById('sunk').getElementsByClassName('stat')[0].innerHTML = shipSunk;
  document.getElementById('factory').getElementsByClassName('stat')[0].innerHTML = factoryDestroyed;
  document.getElementById('treasure').getElementsByClassName('stat')[0].innerHTML = treasureFound;

  let secA = Math.floor((timeTotal % 60000) / 1000);
  secA = ('0' + secA).slice(-2);
  const minA = Math.floor(timeTotal / 60000);
  document.getElementById('time').getElementsByClassName('stat')[0].innerHTML = minA + ':' + secA;

  let secB = Math.floor((timeFire % 60000) / 1000);
  secB = ('0' + secB).slice(-2);
  const minB = Math.floor(timeFire / 60000);
  document.getElementById('fire').getElementsByClassName('stat')[0].innerHTML = minB + ':' + secB;

  const elements = document.getElementsByClassName('stat-box');
  // why did you use just five, and how did it work?
  for (let i = 0; i < elements.length; i += 1) {
    const item = elements[i];
    item.classList.remove('active');
    setTimeout(() => revealStat(i), 750 + 500 * i);
  }
}

export function cycleDayNight(cycleCount) {
  const element = document.getElementById('screen-bg');
  if (cycleCount % 2 === 0) {
    element.style.backgroundPosition = '50% 0%';
  } else {
    element.style.backgroundPosition = '50% 100%';
  }
  if (element.classList.length === 0) {
    element.classList.add(`change-scene-${cycleCount % 2}`);
    setTimeout(() => element.classList.remove(`change-scene-${cycleCount % 2}`), 5000);
  }
}

export default {
  runGameOverSequence,
  cycleInstructions,
  hideStartScreen,
};
