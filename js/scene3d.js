/**
 * High-Fidelity 3D Scene Renderer (Three.js)
 * Cenário urbano moderno completo:
 * - Skyline da cidade ao fundo com edifícios iluminados à noite
 * - Avenida asfaltada realista com marcações, bueiros, meio-fio de granito e calçadas táteis
 * - Mobiliário urbano: ponto de ônibus com abrigo de vidro e painel luminoso, árvores, floreiras e balizadores
 * - Postes de iluminação de design contemporâneo com luminárias LED detalhadas e física de luz precisa
 * - Cones de iluminação suaves no asfalto e anéis translúcidos de detecção PIR
 */

class SmartStreetScene {
  constructor(containerId, controller) {
    this.container = document.getElementById(containerId);
    this.controller = controller;

    this.poleXPositions = [-50, -30, -10, 10, 30, 50];
    this.smartPoles = [];
    this.convPoles = [];
    this.pirZones = [];
    this.showPirZones = true;
    this.buildingWindows = [];

    this.initThree();
    this.buildCitySkyline();
    this.buildEnvironment();
    this.buildStreetFurniture();
    this.buildStreetlights();
    this.initLighting();
    this.initActors();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050811);
    this.scene.fog = new THREE.FogExp2(0x050811, 0.0075);

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.5,
      600
    );
    this.camera.position.set(0, 26, 52);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 110;
    this.controls.target.set(0, 2.5, 0);
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0x1e293b, 0.18);
    this.scene.add(this.ambientLight);

    // Luz solar (Dia)
    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    this.sunLight.position.set(45, 85, 45);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 250;
    const d = 80;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Luz da lua (Noite)
    this.moonLight = new THREE.DirectionalLight(0x38bdf8, 0.14);
    this.moonLight.position.set(-35, 65, -45);
    this.scene.add(this.moonLight);

    // Criação de estrelas no céu
    this.createStarfield();
  }

  createStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 600;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 400;
      starPositions[i + 1] = 40 + Math.random() * 120;
      starPositions[i + 2] = (Math.random() - 0.5) * 400;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0.85
    });
    this.starPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starPoints);
  }

  /**
   * Constrói o Skyline da Cidade ao Fundo com edifícios modernos
   */
  buildCitySkyline() {
    const skylineGroup = new THREE.Group();

    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x0c1220,
      roughness: 0.7,
      metalness: 0.5
    });

    const windowMatWarm = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });

    const windowMatCool = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.0,
      roughness: 0.2
    });

    // Edifícios ao Norte (Horizonte Distante: Z = 95 a 130)
    for (let x = -110; x <= 110; x += 22) {
      const height = 45 + Math.random() * 55;
      const width = 16 + Math.random() * 8;
      const depth = 16 + Math.random() * 8;
      const zPos = 95 + Math.random() * 25;

      const bGeo = new THREE.BoxGeometry(width, height, depth);
      const bMesh = new THREE.Mesh(bGeo, buildingMat);
      bMesh.position.set(x, height / 2, zPos);
      skylineGroup.add(bMesh);

      // Janelas iluminadas nos edifícios
      for (let wy = 6; wy < height - 6; wy += 5) {
        if (Math.random() > 0.28) {
          const wGeo = new THREE.PlaneGeometry(width * 0.78, 1.6);
          const mat = Math.random() > 0.5 ? windowMatWarm : windowMatCool;
          const wMesh = new THREE.Mesh(wGeo, mat);
          wMesh.position.set(x, wy, zPos - depth / 2 - 0.05);
          skylineGroup.add(wMesh);
          this.buildingWindows.push(wMesh);
        }
      }
    }

    // Edifícios ao Sul (Horizonte Distante: Z = -95 a -130)
    for (let x = -110; x <= 110; x += 24) {
      const height = 40 + Math.random() * 50;
      const width = 16 + Math.random() * 8;
      const depth = 16 + Math.random() * 8;
      const zPos = -95 - Math.random() * 25;

      const bGeo = new THREE.BoxGeometry(width, height, depth);
      const bMesh = new THREE.Mesh(bGeo, buildingMat);
      bMesh.position.set(x, height / 2, zPos);
      skylineGroup.add(bMesh);

      for (let wy = 6; wy < height - 6; wy += 5) {
        if (Math.random() > 0.3) {
          const wGeo = new THREE.PlaneGeometry(width * 0.78, 1.6);
          const mat = Math.random() > 0.5 ? windowMatWarm : windowMatCool;
          const wMesh = new THREE.Mesh(wGeo, mat);
          wMesh.position.set(x, wy, zPos + depth / 2 + 0.05);
          wMesh.rotation.y = Math.PI;
          skylineGroup.add(wMesh);
          this.buildingWindows.push(wMesh);
        }
      }
    }

    this.scene.add(skylineGroup);
  }

  /**
   * Constrói a Avenida, Asfalto, Calçadas e Marcações
   */
  buildEnvironment() {
    // 1. Pista Asfáltica com Especularidade Suave
    const roadGeo = new THREE.PlaneGeometry(170, 15);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x181e29,
      roughness: 0.55,
      metalness: 0.2
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, 0);
    road.receiveShadow = true;
    this.scene.add(road);

    // Marcações Amarelas Centrais (Linha Dupla Seccionada)
    for (let x = -80; x <= 80; x += 6) {
      const stripeGeo = new THREE.PlaneGeometry(3.6, 0.22);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

      const s1 = new THREE.Mesh(stripeGeo, stripeMat);
      s1.rotation.x = -Math.PI / 2;
      s1.position.set(x, 0.015, 0.18);
      this.scene.add(s1);

      const s2 = new THREE.Mesh(stripeGeo, stripeMat);
      s2.rotation.x = -Math.PI / 2;
      s2.position.set(x, 0.015, -0.18);
      this.scene.add(s2);
    }

    // Faixas Brancas Contínuas nos Bordos da Pista
    const edgeGeo = new THREE.PlaneGeometry(170, 0.22);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const edgeN = new THREE.Mesh(edgeGeo, edgeMat);
    edgeN.rotation.x = -Math.PI / 2;
    edgeN.position.set(0, 0.015, 6.8);
    this.scene.add(edgeN);

    const edgeS = new THREE.Mesh(edgeGeo, edgeMat);
    edgeS.rotation.x = -Math.PI / 2;
    edgeS.position.set(0, 0.015, -6.8);
    this.scene.add(edgeS);

    // Faixas de Pedestres Realistas
    for (let z = -6.2; z <= 6.2; z += 1.1) {
      const zebraGeo = new THREE.PlaneGeometry(4.2, 0.58);
      const zebraMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
      const zebra = new THREE.Mesh(zebraGeo, zebraMat);
      zebra.rotation.x = -Math.PI / 2;
      zebra.position.set(-10, 0.018, z);
      this.scene.add(zebra);
    }

    // Bueiros e Grelhas de Drenagem Metálicas no Asfalto
    const drainMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9, roughness: 0.3 });
    const manholeMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8, roughness: 0.4 });

    [-40, 0, 40].forEach(x => {
      // Bueiro circular no centro
      const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.02, 24), manholeMat);
      manhole.position.set(x + 5, 0.015, 3.2);
      this.scene.add(manhole);

      // Grelha de drenagem na beira da sarjeta
      const drain = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.8), drainMat);
      drain.position.set(x - 8, 0.015, 6.5);
      this.scene.add(drain);
    });

    // 2. Calçadas de Granito com Meio-Fio Biselado
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.8 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.85 });
    const tactileMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.6 }); // Piso tátil amarelo

    // Calçada Norte (Postes Inteligentes - Z = 7 a 13)
    const swNorth = new THREE.Mesh(new THREE.BoxGeometry(170, 0.38, 6.5), sidewalkMat);
    swNorth.position.set(0, 0.19, 10.25);
    swNorth.receiveShadow = true;
    this.scene.add(swNorth);

    // Meio-fio Norte
    const curbNorth = new THREE.Mesh(new THREE.BoxGeometry(170, 0.42, 0.3), curbMat);
    curbNorth.position.set(0, 0.21, 7.15);
    curbNorth.receiveShadow = true;
    this.scene.add(curbNorth);

    // Faixa de Piso Tátil Amarelo ao longo da calçada
    const tactileNorth = new THREE.Mesh(new THREE.PlaneGeometry(170, 0.4), tactileMat);
    tactileNorth.rotation.x = -Math.PI / 2;
    tactileNorth.position.set(0, 0.385, 8.4);
    this.scene.add(tactileNorth);

    // Calçada Sul (Postes Convencionais - Z = -7 a -13)
    const swSouth = new THREE.Mesh(new THREE.BoxGeometry(170, 0.38, 6.5), sidewalkMat);
    swSouth.position.set(0, 0.19, -10.25);
    swSouth.receiveShadow = true;
    this.scene.add(swSouth);

    const curbSouth = new THREE.Mesh(new THREE.BoxGeometry(170, 0.42, 0.3), curbMat);
    curbSouth.position.set(0, 0.21, -7.15);
    curbSouth.receiveShadow = true;
    this.scene.add(curbSouth);

    // Faixas Gramadas Exteriores (Estendendo-se até o horizonte distante)
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x143423, roughness: 0.95 });
    const grassN = new THREE.Mesh(new THREE.PlaneGeometry(240, 110), grassMat);
    grassN.rotation.x = -Math.PI / 2;
    grassN.position.set(0, -0.01, 68);
    this.scene.add(grassN);

    const grassS = new THREE.Mesh(new THREE.PlaneGeometry(240, 110), grassMat);
    grassS.rotation.x = -Math.PI / 2;
    grassS.position.set(0, -0.01, -68);
    this.scene.add(grassS);
  }

  /**
   * Constrói Mobiliário Urbano: Ponto de Ônibus, Árvores, Floreiras e Balizadores
   */
  buildStreetFurniture() {
    // 1. Ponto de Ônibus Moderno com Vidro e Painel Publicitário Luminoso
    const busStop = this.createModernBusStop();
    busStop.position.set(-18, 0.38, 10.8);
    this.scene.add(busStop);

    // 2. Balizadores Urbanos Metálicos ao longo do meio-fio
    const bollardGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.85, 12);
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.8, roughness: 0.3 });
    const bollardRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let x = -65; x <= 65; x += 15) {
      if (Math.abs(x - (-10)) > 4) { // Deixa livre a faixa de pedestres
        const bollard = new THREE.Mesh(bollardGeo, bollardMat);
        bollard.position.set(x, 0.7, 7.3);
        bollard.castShadow = true;

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 16), bollardRingMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.3;
        bollard.add(ring);

        this.scene.add(bollard);
      }
    }

    // 3. Árvores Urbanas e Floreiras
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const leavesMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
    const leavesMat2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.75 });

    for (let x = -60; x <= 60; x += 25) {
      // Árvores no lado norte
      const tree = this.createRealisticTree(trunkMat, (x % 2 === 0) ? leavesMat1 : leavesMat2);
      tree.position.set(x + 4, 0.38, 12.2);
      this.scene.add(tree);

      // Floreiras decorativas de concreto com arbustos
      const planter = this.createPlanterBox();
      planter.position.set(x - 6, 0.38, 8.8);
      this.scene.add(planter);
    }
  }

  createModernBusStop() {
    const group = new THREE.Group();

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.85, roughness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.9
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7 });

    // Estrutura de colunas e teto
    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.18, 2.6), steelMat);
    roof.position.set(0, 2.6, 0);
    roof.castShadow = true;
    group.add(roof);

    [-2.8, 2.8].forEach(px => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 12), steelMat);
      col.position.set(px, 1.3, -0.9);
      col.castShadow = true;
      group.add(col);
    });

    // Vidro traseiro
    const glassBack = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 0.04), glassMat);
    glassBack.position.set(0, 1.3, -0.9);
    group.add(glassBack);

    // Banco de madeira
    const bench = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.12, 0.6), woodMat);
    bench.position.set(0, 0.5, -0.4);
    bench.castShadow = true;
    group.add(bench);

    // Painel publicitário luminoso (Totem)
    const adPanelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.2
    });
    const adTotem = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 1.1), steelMat);
    adTotem.position.set(3.0, 1.2, 0);
    group.add(adTotem);

    const adScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), adPanelMat);
    adScreen.rotation.y = -Math.PI / 2;
    adScreen.position.set(2.9, 1.2, 0);
    group.add(adScreen);

    return group;
  }

  createPlanterBox() {
    const group = new THREE.Group();
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.9 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.8), boxMat);
    box.position.y = 0.275;
    box.castShadow = true;
    group.add(box);

    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 1), bushMat);
    bush.position.y = 0.72;
    bush.castShadow = true;
    group.add(bush);

    return group;
  }

  createRealisticTree(trunkMat, leavesMat) {
    const group = new THREE.Group();

    // Tronco
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 3.2, 12), trunkMat);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    group.add(trunk);

    // Copa volumétrica em camadas
    const layer1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), leavesMat);
    layer1.position.y = 3.8;
    layer1.castShadow = true;
    group.add(layer1);

    const layer2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), leavesMat);
    layer2.position.set(0.3, 4.8, -0.2);
    layer2.castShadow = true;
    group.add(layer2);

    return group;
  }

  /**
   * Constrói os Postes Inteligentes e Convencionais com Acabamento Arquitetônico
   */
  buildStreetlights() {
    this.poleXPositions.forEach((x, index) => {
      // 1. Postes Inteligentes (Norte: Z = 7.5, Luminária avança para Z = 4.3)
      const smartPole = this.createSmartPole(x, 7.5, index);
      this.smartPoles.push(smartPole);
      this.scene.add(smartPole.group);

      // Zona PIR Visual (Círculo no chão)
      const pirZone = this.createPirVisualZone(x, 7.0, index);
      this.pirZones.push(pirZone);
      this.scene.add(pirZone.group);

      // 2. Postes Convencionais (Sul: Z = -7.5, Luminária avança para Z = -4.3)
      const convPole = this.createConvPole(x, -7.5, index);
      this.convPoles.push(convPole);
      this.scene.add(convPole.group);
    });
  }

  createSmartPole(x, z, index) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Materiais metálicos premium
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.85,
      roughness: 0.25
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2
    });

    // Material emissivo da luminária LED
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.3,
      roughness: 0.2
    });

    // Base reforçada do poste
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.8, 16), headMat);
    base.position.y = 0.4;
    group.add(base);

    // Mastro vertical cônico (7.5m de altura)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 7.4, 16), poleMat);
    mast.position.y = 4.1;
    mast.castShadow = true;
    group.add(mast);

    // Braço curvo elegante avançando em direção ao asfalto
    const armGeo = new THREE.CylinderGeometry(0.09, 0.13, 3.4, 16);
    armGeo.rotateZ(Math.PI / 2);
    armGeo.rotateY(Math.PI / 2);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0, 7.6, -1.4);
    arm.rotation.x = -0.18;
    arm.castShadow = true;
    group.add(arm);

    // Cabeça da luminária moderna (LED Street Fixture) com aletas de refrigeração
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.2, 1.45), headMat);
    head.position.set(0, 7.8, -3.0);
    head.castShadow = true;
    group.add(head);

    // Lente protetora transparente cobrindo a matriz LED
    const ledMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.25), ledMat);
    ledMesh.rotation.x = Math.PI / 2;
    ledMesh.position.set(0, 7.69, -3.0);
    group.add(ledMesh);

    // Cúpula do Sensor PIR acoplada ao mastro (altura 2.5m)
    const pirMount = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.24), headMat);
    pirMount.position.set(0, 2.5, -0.22);
    group.add(pirMount);

    const pirDomeMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.25
    });
    const pirDome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), pirDomeMat);
    pirDome.position.set(0, 2.5, -0.36);
    group.add(pirDome);

    // Spotlight LED inteligente direcionado à via
    const spot = new THREE.SpotLight(0xfff7ed, 0.0, 38, Math.PI / 3.8, 0.65, 1.5);
    spot.position.set(x, 7.7, z - 3.0);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(x, 0, 1.5);
    this.scene.add(targetObj);
    spot.target = targetObj;
    spot.castShadow = true;
    spot.shadow.mapSize.width = 1024;
    spot.shadow.mapSize.height = 1024;
    spot.shadow.bias = -0.001;
    this.scene.add(spot);

    return {
      index,
      group,
      spotLight: spot,
      ledMaterial: ledMat,
      pirDomeMaterial: pirDomeMat,
      worldPosition: new THREE.Vector3(x, 8.4, z - 3.0)
    };
  }

  createConvPole(x, z, index) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.6, roughness: 0.4 });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.0,
      roughness: 0.3
    });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 7.4, 16), poleMat);
    mast.position.y = 4.1;
    mast.castShadow = true;
    group.add(mast);

    const armGeo = new THREE.CylinderGeometry(0.1, 0.14, 3.4, 16);
    armGeo.rotateZ(Math.PI / 2);
    armGeo.rotateY(Math.PI / 2);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0, 7.6, 1.4);
    arm.rotation.x = 0.18;
    group.add(arm);

    // Globo clássico de vapor de sódio
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16), lampMat);
    lamp.scale.set(0.7, 0.5, 1.3);
    lamp.position.set(0, 7.6, 3.0);
    group.add(lamp);

    const spot = new THREE.SpotLight(0xffbe69, 0.0, 38, Math.PI / 3.8, 0.6, 1.5);
    spot.position.set(x, 7.7, z + 3.0);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(x, 0, -1.5);
    this.scene.add(targetObj);
    spot.target = targetObj;
    spot.castShadow = false;
    this.scene.add(spot);

    return {
      index,
      group,
      spotLight: spot,
      lampMaterial: lampMat
    };
  }

  createPirVisualZone(x, z, index) {
    const group = new THREE.Group();
    group.position.set(x, 0.035, z);

    const ringGeo = new THREE.RingGeometry(0.6, 8.2, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    const edgeGeo = new THREE.RingGeometry(8.05, 8.2, 36);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = -Math.PI / 2;
    group.add(edge);

    return { group, ringMaterial: ringMat, edgeMaterial: edgeMat, index };
  }

  initActors() {
    this.actors = new SimulationActors(this.scene, this.controller, this.poleXPositions);
  }

  update(delta) {
    if (this.actors) {
      this.actors.update(delta);
    }

    this.updateDayNightEnvironment();

    // Atualiza os 6 Postes Inteligentes
    this.smartPoles.forEach((pole, i) => {
      const pwmPercent = this.controller.smartPolesPWM[i];

      let targetIntensity = 0;
      let emissiveIntensity = 0;
      let emissiveColor = 0x38bdf8;

      if (pwmPercent === 100) {
        targetIntensity = 4.4;
        emissiveIntensity = 3.8;
        emissiveColor = 0xfef08a;
      } else if (pwmPercent === 60) {
        targetIntensity = 2.5;
        emissiveIntensity = 2.2;
        emissiveColor = 0xa5f3fc;
      } else if (pwmPercent === 30) {
        targetIntensity = 1.0;
        emissiveIntensity = 0.9;
        emissiveColor = 0x60a5fa;
      } else {
        targetIntensity = 0.0;
        emissiveIntensity = 0.05;
        emissiveColor = 0x1e293b;
      }

      pole.spotLight.intensity = THREE.MathUtils.lerp(pole.spotLight.intensity, targetIntensity, delta * 7.5);
      pole.ledMaterial.emissiveIntensity = emissiveIntensity;
      pole.ledMaterial.emissive.setHex(emissiveColor);

      // Status do sensor PIR físico no poste
      const isDetecting = this.controller.pirState[i];
      const hasHoldTimer = (this.controller.getPirTimeRemaining(i) > 0);

      if (isDetecting) {
        pole.pirDomeMaterial.emissive.setHex(0x10b981); // Verde
        pole.pirDomeMaterial.emissiveIntensity = 2.5;
      } else if (hasHoldTimer) {
        pole.pirDomeMaterial.emissive.setHex(0xf59e0b); // Âmbar durante hold
        pole.pirDomeMaterial.emissiveIntensity = 1.6;
      } else {
        pole.pirDomeMaterial.emissive.setHex(0x06b6d4); // Ciano repouso
        pole.pirDomeMaterial.emissiveIntensity = 0.25;
      }
    });

    // Atualiza Postes Convencionais
    this.convPoles.forEach(pole => {
      const convPwm = this.controller.conventionalPolesPWM;
      const targetIntensity = (convPwm > 0) ? 3.8 : 0.0;
      pole.spotLight.intensity = THREE.MathUtils.lerp(pole.spotLight.intensity, targetIntensity, delta * 6.0);
      pole.lampMaterial.emissiveIntensity = (convPwm > 0) ? 1.8 : 0.05;
    });

    // Atualiza Zonas PIR no chão
    this.pirZones.forEach(zone => {
      zone.group.visible = this.showPirZones;
      const isDetecting = this.controller.pirState[zone.index];
      const isInHold = (this.controller.getPirTimeRemaining(zone.index) > 0);

      if (isDetecting) {
        zone.ringMaterial.color.setHex(0x10b981);
        zone.edgeMaterial.color.setHex(0x10b981);
        zone.ringMaterial.opacity = 0.26 + Math.sin(Date.now() * 0.008) * 0.08;
      } else if (isInHold) {
        zone.ringMaterial.color.setHex(0xf59e0b);
        zone.edgeMaterial.color.setHex(0xf59e0b);
        zone.ringMaterial.opacity = 0.16;
      } else {
        zone.ringMaterial.color.setHex(0x06b6d4);
        zone.edgeMaterial.color.setHex(0x06b6d4);
        zone.ringMaterial.opacity = 0.07;
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  updateDayNightEnvironment() {
    const ldrRatio = this.controller.ldrValue / 4095;

    this.sunLight.intensity = THREE.MathUtils.lerp(0.0, 1.9, ldrRatio);
    this.ambientLight.intensity = THREE.MathUtils.lerp(0.05, 0.85, ldrRatio);
    this.moonLight.intensity = THREE.MathUtils.lerp(0.22, 0.0, ldrRatio);

    if (this.starPoints) {
      this.starPoints.material.opacity = THREE.MathUtils.lerp(0.9, 0.0, ldrRatio);
    }

    // Janelas dos edifícios brilham forte à noite e apagam de dia
    const windowIntensity = THREE.MathUtils.lerp(1.5, 0.05, ldrRatio);
    this.buildingWindows.forEach(w => {
      w.material.emissiveIntensity = windowIntensity;
    });

    const nightColor = new THREE.Color(0x050811);
    const dayColor = new THREE.Color(0x93c5fd);
    const duskColor = new THREE.Color(0x282663);

    let skyColor;
    if (ldrRatio < 0.3) {
      skyColor = nightColor.clone().lerp(duskColor, ldrRatio / 0.3);
    } else {
      skyColor = duskColor.clone().lerp(dayColor, (ldrRatio - 0.3) / 0.7);
    }

    this.scene.background = skyColor;
    this.scene.fog.color = skyColor;
  }

  setCameraPreset(presetName) {
    switch (presetName) {
      case 'aerial':
        this.camera.position.set(0, 80, 8);
        this.controls.target.set(0, 0, 0);
        break;
      case 'street':
        this.camera.position.set(-58, 4.5, 12);
        this.controls.target.set(-10, 3, 4);
        break;
      case 'pole3':
        this.camera.position.set(-10, 7.5, 14);
        this.controls.target.set(-10, 5.5, 4.5);
        break;
      case 'night':
        this.camera.position.set(0, 30, 52);
        this.controls.target.set(0, 2, 0);
        break;
      default:
        this.camera.position.set(0, 26, 52);
        this.controls.target.set(0, 2.5, 0);
        break;
    }
  }

  togglePirZones(visible) {
    this.showPirZones = visible;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.SmartStreetScene = SmartStreetScene;
