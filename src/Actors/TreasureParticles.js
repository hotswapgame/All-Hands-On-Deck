import * as THREE from 'three';

class TreasureParticles {
  constructor(parent, position) {
    this.gameObject = new THREE.Object3D();
    this.gameObject.position.copy(position);
    parent.add(this.gameObject);

    // Create particles here
    this.particleGeo = new THREE.SphereGeometry(5, 4, 2);
    this.particles = Array.from(
      { length: 170 },
      () => ({
        mesh: new THREE.Mesh(
          this.particleGeo,
          new THREE.MeshBasicMaterial({ color: 0xFFFFAA, transparent: true })
        ),
        initialRot: Math.random() * Math.PI / 2,
        rotSpeed: (Math.random() + 0.2) / 5000,
        intialHeight: Math.random() * 70,
        radius: 10 + Math.random() * 6,
      })
    );
    this.particles.forEach((p) => {
      p.mesh.scale.x = 0.2;
      p.mesh.scale.y = 0.2;
      p.mesh.scale.z = 0.2;
      this.gameObject.add(p.mesh);
    });

    // this.gameObject.scale.set(0, 0, 0);
    // this.gameObject.visible = false;
    this.time = 0;
    this.radius = 25;
  }

  hide() {
    this.gameObject.visible = false;
  }

  update(dt) {
    this.time += dt;

    this.particles.forEach((p) => {
      const newRot = p.initialRot + this.time * Math.PI * 2 * p.rotSpeed;

      p.mesh.position.x = p.intialHeight;
      p.mesh.position.y = Math.cos(newRot) * p.radius;
      p.mesh.position.z = Math.sin(newRot) * p.radius;

      // p.mesh.scale.x = (1 - s) * 0.3;
      // p.mesh.scale.y = (1 - s) * 0.3;
      // p.mesh.scale.z = 1 - s;

      // p.mesh.material.color.r = 1 - s + 0.3;
      // p.mesh.material.color.g = (1 - s) * 0.5;
      // p.mesh.material.color.b = 0;
      p.mesh.material.opacity = 0.3 + (1 - p.intialHeight / 70);
    });
  }
}

export default TreasureParticles;
