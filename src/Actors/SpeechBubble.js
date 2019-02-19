import * as THREE from 'three';

const texLoader = new THREE.TextureLoader();
// Static asset stuff
export const SPRITES = {
  PORT: {
    SAIL: texLoader.load('./Assets/SpeechBubbles/sb_l_crank.png'),
    FLAME: texLoader.load('./Assets/SpeechBubbles/sb_l_fire.png'),
    HATCH: texLoader.load('./Assets/SpeechBubbles/sb_l_load.png'),
    NO_AMMO: texLoader.load('./Assets/SpeechBubbles/sb_l_no.png'),
    RUDDER: texLoader.load('./Assets/SpeechBubbles/sb_l_wheel.png'),
    WICK: texLoader.load('./Assets/SpeechBubbles/sb_l_wick.png'),
  },

  STARBOARD: {
    SAIL: texLoader.load('./Assets/SpeechBubbles/sb_r_crank.png'),
    FLAME: texLoader.load('./Assets/SpeechBubbles/sb_r_fire.png'),
    HATCH: texLoader.load('./Assets/SpeechBubbles/sb_r_load.png'),
    NO_AMMO: texLoader.load('./Assets/SpeechBubbles/sb_r_no.png'),
    RUDDER: texLoader.load('./Assets/SpeechBubbles/sb_r_wheel.png'),
    WICK: texLoader.load('./Assets/SpeechBubbles/sb_r_wick.png'),
  },
};

class SpeechBubble {
  constructor(parent, position, spritePos, spriteRot) {
    this.spriteMat = new THREE.SpriteMaterial({
      map: SPRITES.PORT.SAIL,
      color: 0xffffff,
      rotation: spriteRot,
      transparent: true,
      opacity: 0.85,
    });
    this.sprite = new THREE.Sprite(this.spriteMat);
    this.sprite.visible = false;
    this.sprite.position.copy(spritePos);

    this.sprite.scale.set(16, 16, 16);

    this.gameObject = new THREE.Object3D();
    this.gameObject.add(this.sprite);
    this.gameObject.position.copy(position);
    parent.add(this.gameObject);

    this.scale = 0;
    this.scaleV = 0;
    this.maxScale = 1;

    this.active = false;
    this.animationWindow = 600;
    this.activeWindow = 2000;
    this.activeTime = 0;
  }

  setSprite(sprite) {
    this.spriteMat.map = sprite;
    this.sprite.visible = true;
    this.active = true;
    this.activeTime = 0;
    this.scale = 0;
  }

  hide() {
    this.active = false;
    this.sprite.visible = false;
    this.activeTime = 0;
  }

  update(dt) {
    if (this.active) {
      this.activeTime += dt;

      if (this.activeTime < this.animationWindow) {
        this.scaleV += (this.maxScale - this.scale) / this.maxScale * 0.002;
        this.scaleV = this.scaleV * 0.8;
        this.scale += dt * this.scaleV;

        this.gameObject.scale.set(this.scale, this.scale, this.scale);
      } else {
        // this.gameObject.scale.set(1, 1, 1);
      }

      if (this.activeTime >= this.activeWindow) {
        this.hide();
      }

      // animate here
    }
  }
}

export default SpeechBubble;
