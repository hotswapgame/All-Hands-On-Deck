import * as THREE from 'three';

import { playFire, pauseFire } from '../SoundPlayer';

class Flame {
  constructor(parent, position, maxTime, isStatic) {
    this.gameObject = new THREE.Object3D();
    this.gameObject.position.copy(position);
    parent.add(this.gameObject);

    this.isStatic = isStatic;
    this.time = isStatic ? maxTime : 0;

    // for when to stop growing
    this.maxTime = maxTime;

    // Create particles here
    this.particleGeo = new THREE.SphereGeometry(5, 4, 2);
    this.particles = Array.from(
      { length: 25 },
      () => ({
        mesh: new THREE.Mesh(
          this.particleGeo,
          new THREE.MeshBasicMaterial({ color: 0xF00000, transparent: true })
        ),
        forward: new THREE.Vector3(
          Math.random() * 6 - 3,
          Math.random() * 6 - 3,
          Math.random() * 5 + 4
        ),
        initialPos: Math.random() * 900,
      })
    );
    this.particles.forEach((p) => {
      p.mesh.scale.x = 0.3;
      p.mesh.scale.y = 0.3;
      this.gameObject.add(p.mesh);
    });
    // this.tempParticle = new THREE.Mesh(this.particleGeo);
    // this.gameObject.add(this.tempParticle);

    this.gameObject.scale.set(0.0001, 0.0001, 0.0001);
    this.gameObject.visible = false;
    this.growthRate = 0.0002;
  }

  hide() {
    this.gameObject.visible = false;
    if (!this.isStatic) pauseFire();
  }

  setFlame(amount) {
    this.time = amount;
  }

  triggerFlash() {
    this.flashTime = 0;
    this.isFlashing = true;
  }

  calm(amount) {
    this.time -= amount;
    this.triggerFlash();
  }

  burn(startTime) {
    this.time = startTime;
    this.gameObject.visible = true;

    if (!this.isPlaying && !this.isStatic) {
      playFire(0.5);
    }
  }

  updateParticles() {
    this.particles.forEach((p) => {
      const pos = p.forward.clone();
      const s = ((p.initialPos + this.time) % 700) / 700;
      pos.multiplyScalar(s);
      p.mesh.position.x = pos.x;
      p.mesh.position.y = pos.y;
      p.mesh.position.z = pos.z;

      p.mesh.scale.x = (1 - s) * 0.3;
      p.mesh.scale.y = (1 - s) * 0.3;
      p.mesh.scale.z = 1 - s;

      p.mesh.material.color.r = 1 - s + 0.3;
      p.mesh.material.color.g = (1 - s) * 0.5;
      p.mesh.material.color.b = 0;
      p.mesh.material.opacity = (1 - s) * 0.4;
    });
  }

  updateFlash(dt) {
    if (this.isFlashing) {
      this.flashTime += dt;
      if (this.flashTime < 40) {
        this.particles.forEach((p) => {
          p.mesh.material.opacity += 0.3;
          p.mesh.material.color.r += 0.3;
          p.mesh.material.color.g += 0.3;
          p.mesh.material.color.b += 0.3;
        });
      } else {
        this.isFlashing = false;
      }
    }
  }

  setStaticScale(newScale) {
    if (this.isStatic) this.maxTime = newScale;
  }

  addStaticScale(delta) {
    if (this.isStatic) this.maxTime += delta;
  }

  update(dt) {
    this.updateParticles(dt);
    this.updateFlash(dt);

    this.time += dt;

    let s = (this.time + 4500) * this.growthRate;
    if (this.time > this.maxTime) s = (this.maxTime + 4500) * this.growthRate;
    if (this.isStatic) s = this.maxTime / 10000;
    this.gameObject.scale.set(s, s, s);

    // if (this.sound && this.time > 0 && this.time < this.maxTime) {
    //   this.sound.GAIN.gain.setValueAtTime(
    //     0.2 + this.time / this.maxTime * 0.8,
    //     this.sound.ctx.currentTime
    //   );
    // }
  }
}

export default Flame;
