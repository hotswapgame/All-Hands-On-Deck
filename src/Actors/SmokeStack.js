import * as THREE from 'three';

class SmokeStack {
  constructor(parent, position) {
    this.gameObject = new THREE.Object3D();
    parent.add(this.gameObject);
    this.gameObject.position.copy(position);

    this.particleTimer = 0;
    this.particleSpawnOffset = 55;
    this.particlesToSpawn = 0;
    this.particleGeo = new THREE.SphereGeometry(1, 10, 10);
    this.particles = [];
    this.baseScale = 1;
    // Array.from(
    //   { length: 25 },
    //   () => ({
    //     mesh: new THREE.Mesh(
    //       this.particleGeo,
    //       new THREE.MeshBasicMaterial({ color: 0xF00000, transparent: true })
    //     ),
    //     forward: new THREE.Vector3(
    //       Math.random() * 6 - 3,
    //       Math.random() * 6 - 3,
    //       Math.random() * 5 + 4
    //     ),
    //     initialPos: Math.random() * 900,
    //   })
    // );
  }

  startEmitting() {
    this.particlesToSpawn = 27;
  }

  increase() {
    // this.baseScale += 0.3;
  }

  update(dt) {
    if (this.particlesToSpawn > 0) this.particleTimer -= dt;

    if (this.particleTimer <= 0) {
      const newParticle = new THREE.Mesh(
        this.particleGeo,
        new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true })
      );
      newParticle.ascend = new THREE.Vector3(0.009, Math.random() * 0.0025, Math.random() * 0.0025);
      this.particles.push(newParticle);
      this.gameObject.add(newParticle);

      this.particleTimer = this.particleSpawnOffset;
      this.particlesToSpawn -= 1;
    }

    this.particles.forEach((p) => {
      p.position.x += p.ascend.x * dt;
      p.position.y += p.ascend.y * dt;
      p.position.z += p.ascend.z * dt;
      p.material.opacity -= 0.01;
      p.scale.x += this.baseScale / 100;
      p.scale.y += this.baseScale / 100;
      p.scale.z += this.baseScale / 100;
      if (p.position.x > 17) {
        p.position.set(0, 0, 0);
        p.scale.set(this.baseScale, this.baseScale, this.baseScale);
        p.material.opacity = 1;
      }
    });
  }
}

export default SmokeStack;
