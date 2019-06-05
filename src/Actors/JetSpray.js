import * as THREE from 'three';

class JetSpray {
  constructor(parent, position) {
    this.gameObject = new THREE.Object3D();
    parent.add(this.gameObject);
    this.gameObject.position.copy(position);

    this.particleTimer = 0;
    this.particleSpawnOffset = 40;
    this.particlesToSpawn = 0;
    this.particleGeo = new THREE.SphereGeometry(2, 3, 3);
    this.particles = [];
    this.baseScale = 1;
  }

  startEmitting() {
    this.particlesToSpawn = 30;
  }

  increase() {
    this.baseScale += 0.2;
  }

  update(dt) {
    if (this.particlesToSpawn > 0) this.particleTimer -= dt;

    if (this.particleTimer <= 0) {
      const newParticle = new THREE.Mesh(
        this.particleGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })
      );
      newParticle.ascend = new THREE.Vector3(
        Math.random() * 0.0035,
        -0.013,
        Math.random() * 0.014 - 0.007
      );
      newParticle.material.opacity = 0.9;
      this.particles.push(newParticle);
      this.gameObject.add(newParticle);

      this.particleTimer = this.particleSpawnOffset;
      this.particlesToSpawn -= 1;
    }

    this.particles.forEach((p) => {
      p.position.x += p.ascend.x * dt;
      p.position.y += p.ascend.y * dt;
      p.position.z += p.ascend.z * dt;
      p.rotation.y += 0.05;
      p.material.opacity -= 0.02;

      if (p.position.y < -7.5) {
        p.position.set(0, 0, 0);
        p.scale.set(this.baseScale, this.baseScale, this.baseScale);
        p.material.opacity = 0.8;
      }
    });
  }
}

export default JetSpray;
