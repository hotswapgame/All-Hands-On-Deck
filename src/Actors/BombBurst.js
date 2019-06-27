import * as THREE from 'three';

class BombBurst {
  constructor(parent) {
    this.gameObject = new THREE.Object3D();

    this.burstTime = 70;
    this.isBursting = true;
    this.fadeTime = 1000;
    this.isFading = false;
    this.isActive = true;

    this.burstMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    this.fadeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.clouds = [];

    this.burstSphere = new THREE.Mesh(
      new THREE.SphereGeometry(15, 15, 15),
      this.burstMat
    );
    this.gameObject.add(this.burstSphere);
    const lineGeo = new THREE.SphereGeometry(0.75, 3, 2);
    this.burstLines = [];
    for (let i = 0; i < 7; i += 1) {
      const newLine = new THREE.Mesh(lineGeo, this.burstMat);
      newLine.scale.y = 20;
      newLine.rotation.z = Math.random() * Math.PI;
      newLine.rotation.x = Math.random() * Math.PI * 2;
      this.burstLines.push(newLine);
      this.gameObject.add(newLine);
    }

    this.gameObject.position.x = 3;
    this.gameObject.position.y = 6;
    parent.add(this.gameObject);
  }

  update(dt) {
    if (this.isBursting) {
      this.burstTime -= dt;
      this.burstLines.forEach((l) => {
        l.scale.x -= 0.1;
        l.scale.y -= 0.02;
        l.scale.z -= 0.1;
      });
      this.burstSphere.scale.x -= 0.2;
      this.burstSphere.scale.y -= 0.2;
      this.burstSphere.scale.z -= 0.2;

      if (this.burstTime < 0) {
        this.burstLines.forEach((l) => { l.visible = false; });
        this.burstSphere.visible = false;
        this.clouds.forEach((c) => { c.material = this.fadeMat; });

        this.isBursting = false;
        this.isFading = true;
      }
    }

    if (this.isFading) {
      this.fadeTime -= dt;

      this.clouds.forEach((c) => { c.material = this.fadeMat; });

      if (this.fadeTime < 0) {
        this.isFading = false;
        this.isActive = false;
      }
    }
  }
}

export default BombBurst;
