import * as THREE from 'three';

class Explosion {
  constructor(parent, maxTime, endCallback) {
    this.gameObject = new THREE.Object3D();
    this.gameObject.rotateX(Math.PI / 2);
    this.gameObject.position.y = 1.5;
    parent.add(this.gameObject);

    this.time = 0;
    // for when to stop growing
    this.maxTime = maxTime;
    this.isActive = false;
    this.endCallback = endCallback;

    // Create particles here
    this.particleGeo = new THREE.SphereGeometry(3, 4, 2);
    this.particles = Array.from(
      { length: 15 },
      () => ({
        mesh: new THREE.Mesh(
          this.particleGeo,
          new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true })
        ),
        forward: new THREE.Vector3(
          Math.random() * 0.02 - 0.01,
          Math.random() * 0.02 - 0.01,
          -0.05
        ),
      })
    );

    this.particles.forEach((p) => {
      p.mesh.scale.set(0.3, 0.3, 0.8);
      this.gameObject.add(p.mesh);
    });

    this.gameObject.scale.set(1, 1, 1);
    this.gameObject.visible = false;
    this.growthRate = 0.0002;
  }

  hide() {
    this.gameObject.visible = false;
    this.isActive = false;
  }

  start() {
    this.time = 0;
    this.gameObject.visible = true;
    this.isActive = true;

    this.particles.forEach(p => p.mesh.position.set(0, 0, 0));
  }

  updateParticles(dt) {
    this.particles.forEach((p) => {
      const pos = p.forward.clone();
      const s = this.time / this.maxTime;

      pos.multiplyScalar(dt);
      p.mesh.position.add(pos);

      p.mesh.scale.x = (1 - s) * 0.3;
      p.mesh.scale.y = (1 - s) * 0.3;
      p.mesh.scale.z = (1 - s) * 0.8;

      // p.mesh.material.color.r = 1 - s;
      // p.mesh.material.color.g = (1 - s);
      // p.mesh.material.color.b = (1 - s);
      p.mesh.material.opacity = (1 - s) * 0.8;
    });
  }

  update(dt) {
    if (this.isActive) {
      this.time += dt;
      this.updateParticles(dt);

      if (this.time > this.maxTime) {
        this.hide();
        this.endCallback();
      }
    }
  }
}

export default Explosion;
