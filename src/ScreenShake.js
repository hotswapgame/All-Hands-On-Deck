let screenEl;

let isShaking = false;
let shakeTime = 0;
let shakeXScale = 0;
let shakeYScale = 0;

function init(el) {
  screenEl = el;
}

function update(dt) {
  if (isShaking) {
    shakeTime -= dt;
    screenEl.style.left = `${(Math.cos(shakeTime) * shakeXScale)}px`;
    screenEl.style.top = `${(Math.sin(shakeTime) * shakeYScale)}px`;

    if (shakeTime < 0) {
      isShaking = false;
      screenEl.style.left = '0px';
      screenEl.style.top = '0px';
    }
  }
}

function trigger(intensity, time) {
  isShaking = true;
  shakeTime = time;
  shakeXScale = intensity * Math.random() > 0.5 ? 1 : -1;
  shakeYScale = intensity * Math.random() > 0.5 ? 1 : -1;
}

export default { init, trigger, update };
