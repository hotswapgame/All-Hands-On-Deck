import { Howl, Howler } from 'howler';

const sounds = {
  soundtrackRoot: new Howl({ src: './Assets/Sound/soundtrackRoot.wav', loop: true }),
  soundtrackMain: new Howl({ src: './Assets/Sound/soundtrackMain.wav', loop: true }),
  soundtrackBoss: new Howl({ src: './Assets/Sound/soundtrackBoss.wav', loop: true }),
  fireCrackle: new Howl({ src: './Assets/Sound/fire.wav', loop: true }),
  playerCannon: [
    new Howl({ src: './Assets/Sound/cannon_0.wav' }),
    new Howl({ src: './Assets/Sound/cannon_1.wav' }),
    new Howl({ src: './Assets/Sound/cannon_2.wav' }),
    new Howl({ src: './Assets/Sound/cannon_3.wav' }),
  ],
  enemyCannon: [
    new Howl({ src: './Assets/Sound/enemyFire_0.wav' }),
    new Howl({ src: './Assets/Sound/enemyFire_1.wav' }),
    new Howl({ src: './Assets/Sound/enemyFire_2.wav' }),
    new Howl({ src: './Assets/Sound/enemyFire_3.wav' }),
    new Howl({ src: './Assets/Sound/enemyFire_4.wav' }),
    new Howl({ src: './Assets/Sound/enemyFire_5.wav' }),
  ],
  explosions: [
    new Howl({ src: './Assets/Sound/explosion_0.wav' }),
    new Howl({ src: './Assets/Sound/explosion_1.wav' }),
    new Howl({ src: './Assets/Sound/explosion_2.wav' }),
  ],
  treasure: [
    new Howl({ src: './Assets/Sound/coins.mp3' }),
  ],
};

export function startSoundtrack() {
  sounds.soundtrackRoot.play();
  sounds.soundtrackMain.play();
  sounds.soundtrackBoss.play();
}

export function setBossSoundtrack() {
  sounds.soundtrackBoss.fade(0.2, 0.6, 5000);
  sounds.soundtrackMain.fade(0.1, 0.6, 5000);
  sounds.soundtrackRoot.fade(0.4, 0.4, 5000);
}

export function setMainFromBossSoundtrack() {
  sounds.soundtrackBoss.fade(0.6, 0.2, 5000);
  sounds.soundtrackMain.fade(0.6, 0.1, 5000);
  sounds.soundtrackRoot.fade(0.4, 0.4, 5000);
}

export function setMainSoundtrack() {
  console.log('set main');
  sounds.soundtrackBoss.fade(0.01, 0.2, 5000);
  sounds.soundtrackMain.fade(0.01, 0.2, 5000);
  sounds.soundtrackRoot.fade(0.2, 0.2, 5000);
}

export function setStartSoundtrack() {
  console.log('set start');
  sounds.soundtrackBoss.volume(0.01);
  sounds.soundtrackMain.volume(0.01);
  sounds.soundtrackRoot.volume(0.2);
}

export function playPlayerCannon() {
  let i = Math.floor(Math.random() * 4);
  if (i === 4) i = 3;
  sounds.playerCannon[i].play();
}

export function playEnemyCannon() {
  let i = Math.floor(Math.random() * 6);
  if (i === 6) i = 5;
  sounds.enemyCannon[i].play();
}

export function playExplosion() {
  let i = Math.floor(Math.random() * 3);
  if (i === 3) i = 2;
  sounds.explosions[i].play();
}

export function playFire(volume) {
  sounds.fireCrackle.play();
  sounds.fireCrackle.fade(0, 0.5, 1000);
}

export function pauseFire() {
  sounds.fireCrackle.fade(0.5, 0.0, 500);
  // sounds.fireCrackle.pause();
}

export function playTreasure() {
  sounds.treasure[0].play();
}
