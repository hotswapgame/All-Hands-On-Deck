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
};

export function startSoundtrack() {
  sounds.soundtrackRoot.play();
  sounds.soundtrackMain.play();
  sounds.soundtrackBoss.play();
}

export function setBossSoundtrack() {
  sounds.soundtrackBoss.volume(1);
  sounds.soundtrackMain.volume(0.1);
  sounds.soundtrackRoot.volume(0.1);
}

export function setMainSoundtrack() {
  sounds.soundtrackBoss.volume(1);
  sounds.soundtrackMain.volume(1);
  sounds.soundtrackRoot.volume(1);
}

export function setStartSoundtrack() {
  sounds.soundtrackBoss.volume(0.1);
  sounds.soundtrackMain.volume(0.1);
  sounds.soundtrackRoot.volume(1);
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
  sounds.fireCrackle.volume(0.5);
  sounds.fireCrackle.play();
}

export function pauseFire() {
  sounds.fireCrackle.pause();
}

export function playTreasure() {
  
}
