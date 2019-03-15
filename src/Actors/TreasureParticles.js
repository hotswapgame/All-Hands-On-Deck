import * as THREE from 'three';

class TreasureParticles {
  constructor(parent, position) {
    this.gameObject = new THREE.Object3D();
    this.gameObject.position.copy(position);
    parent.add(this.gameObject);

    // Create particles here
    this.particleGeo = new THREE.SphereGeometry(3, 4, 2);
    this.particles = Array.from(
      { length: 500 },
      () => ({
        mesh: new THREE.Mesh(
          this.particleGeo,
          new THREE.MeshBasicMaterial({ color: 0xFFFFCC, transparent: true })
        ),
        initialRot: Math.random() * Math.PI / 2,
        rotSpeed: (Math.random() + 0.2) / 5000,
        initialHeight: Math.random() * 80,
        radius: 26 + Math.random() * 1,
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

      p.mesh.position.x = Math.pow(((p.initialHeight + this.time/200)%80)/80, 1.8)*80;
      const taperFactor = (0.3+0.7*(1-Math.pow(p.mesh.position.x/80, 0.4)));
      p.mesh.position.y = Math.cos(newRot) * (p.radius * taperFactor);
      p.mesh.position.z = Math.sin(newRot) * (p.radius * taperFactor);

      // p.mesh.scale.x = (1 - s) * 0.3;
      // p.mesh.scale.y = (1 - s) * 0.3;
      // p.mesh.scale.z = 1 - s;

      // p.mesh.material.color.r = 1 - s + 0.3;
      // p.mesh.material.color.g = (1 - s) * 0.5;
      // p.mesh.material.color.b = 0;
      p.mesh.material.opacity = 0.8*(1 - p.mesh.position.x / 80);
    });
  }
}

export default TreasureParticles;
