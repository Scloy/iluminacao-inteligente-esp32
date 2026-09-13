/**
 * High-Detail 3D Actors: Multi-Pedestrian & Sports Sedan
 * Modelagem 3D anatômica e refinada com membros articulados (joelhos, cotovelos,
 * smartphone luminoso, fones e mochila), além de um veículo esportivo elétrico
 * detalhado com pinças de freio vermelhas, rodas raiadas, DRL em LED e barra de luz traseira.
 */

class DetailedPedestrian {
  constructor(scene, direction = 1, zOffset = 0, colorTheme = null) {
    this.scene = scene;
    this.direction = direction; // 1 = Oeste -> Leste; -1 = Leste -> Oeste
    this.speed = 5.2 + Math.random() * 1.8;
    this.x = (direction === 1) ? -78 : 78;
    this.z = 7.0 + zOffset;
    this.walkCycle = Math.random() * Math.PI * 2;
    this.isDead = false;

    // Paletas de cores elegantes e contemporâneas
    const palettes = [
      { jacket: 0x0284c7, shirt: 0xffffff, pants: 0x1e293b, shoes: 0xf8fafc, hair: 0x451a03, skin: 0xfcd34d }, // Ciano / Jeans
      { jacket: 0xe11d48, shirt: 0x0f172a, pants: 0x0f172a, shoes: 0xffffff, hair: 0x1c1917, skin: 0xfbbf24 }, // Carmesim / Preto
      { jacket: 0x059669, shirt: 0xf1f5f9, pants: 0x334155, shoes: 0xe2e8f0, hair: 0x78350f, skin: 0xfde68a }, // Esmeralda / Grafite
      { jacket: 0x7c3aed, shirt: 0x18181b, pants: 0x1e293b, shoes: 0xf1f5f9, hair: 0x0f172a, skin: 0xfcd34d }, // Roxo / Denim
      { jacket: 0xd97706, shirt: 0xffffff, pants: 0x090d16, shoes: 0xffffff, hair: 0x292524, skin: 0xfbbf24 }, // Âmbar / Preto
      { jacket: 0x06b6d4, shirt: 0x0284c7, pants: 0x27272a, shoes: 0x38bdf8, hair: 0xd97706, skin: 0xfde68a }  // Neon Cyberpunk
    ];
    this.theme = colorTheme || palettes[Math.floor(Math.random() * palettes.length)];

    this.group = new THREE.Group();
    this.buildCharacterMesh();
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = (direction === 1) ? Math.PI / 2 : -Math.PI / 2;
    this.scene.add(this.group);
  }

  buildCharacterMesh() {
    const matSkin = new THREE.MeshStandardMaterial({ color: this.theme.skin, roughness: 0.45 });
    const matJacket = new THREE.MeshStandardMaterial({ color: this.theme.jacket, roughness: 0.6 });
    const matShirt = new THREE.MeshStandardMaterial({ color: this.theme.shirt, roughness: 0.7 });
    const matPants = new THREE.MeshStandardMaterial({ color: this.theme.pants, roughness: 0.8 });
    const matShoes = new THREE.MeshStandardMaterial({ color: this.theme.shoes, roughness: 0.5 });
    const matHair = new THREE.MeshStandardMaterial({ color: this.theme.hair, roughness: 0.85 });
    const matAcc = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.6 });
    const matPhone = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.0
    });

    // Pélvis / Cintura
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 1.05;
    this.group.add(this.pelvis);

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.28, 0.36), matPants);
    hips.castShadow = true;
    this.pelvis.add(hips);

    // Torso (Jaqueta estilizada com camisa interna visível)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.74, 0.42), matJacket);
    torso.position.y = 0.48;
    torso.castShadow = true;
    this.pelvis.add(torso);

    const shirtStripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.68, 0.43), matShirt);
    shirtStripe.position.set(0, 0.48, 0.01);
    this.pelvis.add(shirtStripe);

    // Mochila urbana com fivelas metálicas
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.54, 0.22), matAcc);
    backpack.position.set(0, 0.48, -0.26);
    backpack.castShadow = true;
    this.pelvis.add(backpack);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 }));
    buckle.position.set(0, 0.46, -0.38);
    this.pelvis.add(buckle);

    // Cabeça com pescoço e feições
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.98;
    this.pelvis.add(this.headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 12), matSkin);
    neck.position.y = -0.06;
    this.headGroup.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 16), matSkin);
    head.castShadow = true;
    this.headGroup.add(head);

    // Cabelo / Boné urbano
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.245, 16, 16), matHair);
    hair.position.set(0, 0.06, -0.03);
    hair.scale.set(1.02, 0.94, 1.05);
    hair.castShadow = true;
    this.headGroup.add(hair);

    // Fones de Ouvido (Headphones nos ouvidos)
    [-0.24, 0.24].forEach(px => {
      const earCup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), matAcc);
      earCup.rotation.z = Math.PI / 2;
      earCup.position.set(px, 0.02, 0);
      this.headGroup.add(earCup);
    });

    // Membros Superiores (Braços com articulação de cotovelo)
    // Braço Esquerdo
    this.shoulderL = new THREE.Group();
    this.shoulderL.position.set(0.36, 0.74, 0);
    this.pelvis.add(this.shoulderL);

    const upperArmL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.16), matJacket);
    upperArmL.position.y = -0.18;
    upperArmL.castShadow = true;
    this.shoulderL.add(upperArmL);

    this.elbowL = new THREE.Group();
    this.elbowL.position.y = -0.36;
    this.shoulderL.add(this.elbowL);

    const foreArmL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.14), matSkin);
    foreArmL.position.y = -0.17;
    foreArmL.castShadow = true;
    this.elbowL.add(foreArmL);

    // Braço Direito (segura smartphone)
    this.shoulderR = new THREE.Group();
    this.shoulderR.position.set(-0.36, 0.74, 0);
    this.pelvis.add(this.shoulderR);

    const upperArmR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.16), matJacket);
    upperArmR.position.y = -0.18;
    upperArmR.castShadow = true;
    this.shoulderR.add(upperArmR);

    this.elbowR = new THREE.Group();
    this.elbowR.position.y = -0.36;
    this.shoulderR.add(this.elbowR);

    const foreArmR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.14), matSkin);
    foreArmR.position.y = -0.17;
    foreArmR.castShadow = true;
    this.elbowR.add(foreArmR);

    // Smartphone com tela brilhante
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.015), matPhone);
    phone.position.set(0, -0.32, 0.08);
    phone.rotation.x = 0.55;
    this.elbowR.add(phone);

    // Membros Inferiores Articulados (Coxa -> Joelho com flexão natural -> Tênis)
    // Perna Esquerda
    this.hipL = new THREE.Group();
    this.hipL.position.set(0.16, -0.12, 0);
    this.pelvis.add(this.hipL);

    const thighL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.46, 0.22), matPants);
    thighL.position.y = -0.23;
    thighL.castShadow = true;
    this.hipL.add(thighL);

    this.kneeL = new THREE.Group();
    this.kneeL.position.y = -0.46;
    this.hipL.add(this.kneeL);

    const calfL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.44, 0.19), matPants);
    calfL.position.y = -0.22;
    calfL.castShadow = true;
    this.kneeL.add(calfL);

    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.16, 0.36), matShoes);
    shoeL.position.set(0, -0.44, 0.07);
    shoeL.castShadow = true;
    this.kneeL.add(shoeL);

    // Perna Direita
    this.hipR = new THREE.Group();
    this.hipR.position.set(-0.16, -0.12, 0);
    this.pelvis.add(this.hipR);

    const thighR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.46, 0.22), matPants);
    thighR.position.y = -0.23;
    thighR.castShadow = true;
    this.hipR.add(thighR);

    this.kneeR = new THREE.Group();
    this.kneeR.position.y = -0.46;
    this.hipR.add(this.kneeR);

    const calfR = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.44, 0.19), matPants);
    calfR.position.y = -0.22;
    calfR.castShadow = true;
    this.kneeR.add(calfR);

    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.16, 0.36), matShoes);
    shoeR.position.set(0, -0.44, 0.07);
    shoeR.castShadow = true;
    this.kneeR.add(shoeR);
  }

  update(delta) {
    this.x += this.direction * this.speed * delta;
    this.group.position.x = this.x;

    this.walkCycle += delta * (this.speed * 1.5);
    const cycle = this.walkCycle;

    // Oscilação vertical e lateral do quadril
    this.pelvis.position.y = 1.05 + Math.abs(Math.sin(cycle * 2)) * 0.06;
    this.pelvis.rotation.z = Math.sin(cycle) * 0.035;
    this.headGroup.position.y = 0.98 + Math.sin(cycle * 2) * 0.025;

    // Cinemática dos membros
    const legAngleL = Math.sin(cycle) * 0.65;
    const legAngleR = Math.sin(cycle + Math.PI) * 0.65;

    this.hipL.rotation.x = legAngleL;
    this.hipR.rotation.x = legAngleR;

    this.kneeL.rotation.x = (legAngleL < 0) ? Math.abs(legAngleL) * 1.15 : 0.06;
    this.kneeR.rotation.x = (legAngleR < 0) ? Math.abs(legAngleR) * 1.15 : 0.06;

    this.shoulderL.rotation.x = -legAngleL * 0.72;
    this.shoulderR.rotation.x = -legAngleR * 0.52;
    this.elbowL.rotation.x = Math.max(0.1, -this.shoulderL.rotation.x * 0.58);
    this.elbowR.rotation.x = 0.65 + Math.sin(cycle) * 0.12;

    if ((this.direction === 1 && this.x > 82) || (this.direction === -1 && this.x < -82)) {
      this.destroy();
    }
  }

  destroy() {
    this.isDead = true;
    this.scene.remove(this.group);
  }
}

/**
 * Gerenciador de Atores: Múltiplos Pedestres e Sedã Esportivo Elétrico
 */
class SimulationActors {
  constructor(scene, controller, poleXPositions) {
    this.scene = scene;
    this.controller = controller;
    this.polePositions = poleXPositions;
    this.pirRadius = 8.5;

    this.pedestrians = [];

    // Veículo Esportivo Elétrico
    this.carActive = false;
    this.carMesh = null;
    this.carSpeed = 16.5;
    this.carX = -88;
    this.carZ = 2.2;

    this.buildHighDetailCar();
  }

  buildHighDetailCar() {
    const carGroup = new THREE.Group();

    // Materiais automotivos realistas
    const paintMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48, // Vermelho rubi metálico
      metalness: 0.85,
      roughness: 0.22
    });
    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.9,
      roughness: 0.3
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.95,
      roughness: 0.08,
      transparent: true,
      opacity: 0.82
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.15
    });
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Pinças vermelhas Brembo
      metalness: 0.6,
      roughness: 0.3
    });
    const drlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 3.5
    });
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xff0033,
      emissiveIntensity: 2.8
    });

    // 1. Chassi e Carroceria Aerodinâmica
    const bodyBase = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.72, 1.95), paintMat);
    bodyBase.position.y = 0.65;
    bodyBase.castShadow = true;
    carGroup.add(bodyBase);

    // Spoilers e Saias laterais pretas
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.16, 2.02), blackTrimMat);
    skirt.position.y = 0.34;
    carGroup.add(skirt);

    // Cabine com teto solar panorâmico
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.68, 1.62), glassMat);
    cabin.position.set(-0.25, 1.3, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Teto aerodinâmico
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.55), paintMat);
    roof.position.set(-0.25, 1.66, 0);
    carGroup.add(roof);

    // Retrovisores aerodinâmicos
    [-0.88, 0.88].forEach(pz => {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.22), paintMat);
      mirror.position.set(0.85, 1.18, pz);
      carGroup.add(mirror);
    });

    // 2. Rodas Esportivas de 5 Raios com Discos e Pinças de Freio
    this.wheels = [];
    const wheelPositions = [
      [1.4, 0.44, 1.04], [1.4, 0.44, -1.04],
      [-1.4, 0.44, 1.04], [-1.4, 0.44, -1.04]
    ];

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 });
    const tireGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.34, 20);
    tireGeo.rotateX(Math.PI / 2);

    wheelPositions.forEach(pos => {
      const wGroup = new THREE.Group();
      wGroup.position.set(...pos);

      // Pneu
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wGroup.add(tire);

      // Roda de liga leve
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.36, 16), rimMat);
      rim.rotation.x = Math.PI / 2;
      wGroup.add(rim);

      // Disco de freio ventilado
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.28, 16), blackTrimMat);
      disc.rotation.x = Math.PI / 2;
      wGroup.add(disc);

      // Pinça de freio vermelha
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.38), caliperMat);
      caliper.position.set(0.15, 0.12, 0);
      wGroup.add(caliper);

      carGroup.add(wGroup);
      this.wheels.push(wGroup);
    });

    // 3. Faróis Full-LED DRL na Dianteira
    const drlStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.7), drlMat);
    drlStrip.position.set(2.32, 0.72, 0);
    carGroup.add(drlStrip);

    // Faróis de projeção
    [-0.68, 0.68].forEach(pz => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.32), drlMat);
      hl.position.set(2.32, 0.66, pz);
      carGroup.add(hl);
    });

    // 4. Barra de Luz Traseira Contínua em LED Vermelho
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 1.75), tailMat);
    tailBar.position.set(-2.32, 0.72, 0);
    carGroup.add(tailBar);

    // 5. Spotlight dos Faróis Iluminando o Asfalto à Frente
    this.carSpotlight = new THREE.SpotLight(0xfff7ed, 3.4, 38, Math.PI / 4.2, 0.5, 1.2);
    this.carSpotlight.position.set(2.3, 0.75, 0);
    const carTarget = new THREE.Object3D();
    carTarget.position.set(18, 0, 0);
    carGroup.add(carTarget);
    this.carSpotlight.target = carTarget;
    carGroup.add(this.carSpotlight);

    carGroup.position.set(this.carX, 0, this.carZ);
    carGroup.visible = false;
    this.scene.add(carGroup);
    this.carMesh = carGroup;
  }

  spawnPedestrian(direction = 1) {
    const zOffset = (Math.random() - 0.5) * 1.4;
    const ped = new DetailedPedestrian(this.scene, direction, zOffset);
    this.pedestrians.push(ped);
    return ped;
  }

  triggerCar() {
    this.carActive = true;
    this.carX = -88;
    this.carMesh.position.x = this.carX;
    this.carMesh.visible = true;
  }

  clearAllPedestrians() {
    this.pedestrians.forEach(p => p.destroy());
    this.pedestrians = [];
  }

  getPedestrianCount() {
    return this.pedestrians.length;
  }

  update(delta) {
    const activePirRegions = [false, false, false, false, false, false];

    // Atualiza pedestres
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const ped = this.pedestrians[i];
      ped.update(delta);

      if (ped.isDead) {
        this.pedestrians.splice(i, 1);
        continue;
      }

      this.polePositions.forEach((xPos, idx) => {
        const dist = Math.abs(ped.x - xPos);
        if (dist <= this.pirRadius) {
          activePirRegions[idx] = true;
        }
      });
    }

    // Atualiza Carro Esportivo
    if (this.carActive) {
      this.carX += this.carSpeed * delta;
      this.carMesh.position.x = this.carX;

      this.wheels.forEach(w => {
        w.rotation.z -= delta * (this.carSpeed / 0.44);
      });

      this.polePositions.forEach((xPos, idx) => {
        const dist = Math.abs(this.carX - xPos);
        if (dist <= this.pirRadius + 2.2) {
          activePirRegions[idx] = true;
        }
      });

      if (this.carX > 88) {
        this.carActive = false;
        this.carMesh.visible = false;
      }
    }

    // Sincroniza detecção física de atores com o ESP32
    for (let i = 0; i < 6; i++) {
      this.controller.setActorPresence(i, activePirRegions[i]);
    }
  }
}

window.SimulationActors = SimulationActors;
