/**
 * Maquete 3D Completa, Realista e Detalhada — Rua Inteligente com Sistema de Iluminação Pública Automatizada
 * Protótipo Físico Acadêmico de Engenharia e Tecnologia:
 *
 * 1. ESTRUTURA DA MAQUETE:
 *    - Base retangular rígida em MDF (acabamento amadeirado realista, bordas cortadas a laser, pés de borracha e plaqueta acadêmica).
 *    - Trecho urbano em escala reduzida com rua asfaltada de duas mãos, sinalização horizontal (faixa dupla/tracejada amarela, bordas brancas),
 *      faixas de pedestres nas extremidades e calçadas elevadas com meio-fio.
 *    - Pequenas casas e edifícios nas laterais construídos em materiais de maquete universitária (MDF cortado a laser, papelão Paraná/kraft,
 *      acrílico translúcido nas janelas, iluminação interna suave).
 *    - Árvores em escala (bucha vegetal/flocagem arquitetônica), placas de trânsito (PARE, 40 km/h, Faixa de Pedestres), bancos e lixeiras.
 *
 * 2. SISTEMA DE ILUMINAÇÃO INTELIGENTE:
 *    - 6 Postes de iluminação pública distribuídos ao longo da calçada com estrutura tubular vertical em PVC branco/cinza e braço curvo.
 *    - Luminárias LED brancas de alto brilho na extremidade superior com iluminação real (PointLight + SpotLight + feixe volumétrico).
 *    - Sensores LDR posicionados para identificar a luminosidade ambiente.
 *    - 6 Sensores infravermelhos (IR) posicionados ao longo do meio-fio da calçada para detectar a passagem de veículos e pedestres.
 *    - Iluminação automatizada multi-nível: 0% (Dia), 30% (Noite em repouso/standby) e 100% / 60% (Detecção de movimento próxima).
 *
 * 3. COMPONENTES ELETRÔNICOS NA ÁREA TÉCNICA COM CAIXA TRANSPARENTE REMOVÍVEL:
 *    - Área técnica dedicada na parte frontal da base de MDF.
 *    - Arduino Nano (ATmega328P, PCB azul, Mini-USB, 30 pinos, LEDs ON/TX/RX/L) montado na Protoboard central.
 *    - Sensores LDR (com roda/trimpot de ajuste de luz), Sensores Infravermelhos (IR), LEDs brancos de status, resistores 220Ω/10kΩ.
 *    - Fios jumper coloridos organizando o barramento entre a protoboard, os sensores e os postes de PVC.
 *    - Fonte de alimentação (Módulo MB102 + Fonte DC 12V/9V com plug P4 e chave seletora).
 *    - Caixa protetora de acrílico transparente removível (com frestas de ventilação a laser, parafusos allen e alça superior) que pode ser
 *      aberta/removida ou fechada interativamente.
 *
 * 4. FUNCIONAMENTO DEMONSTRATIVO (3 SITUAÇÕES):
 *    - Durante o dia: iluminação dos postes desligada (0%) devido à luminosidade natural do estúdio.
 *    - Durante a noite: iluminação dos postes ativada automaticamente em intensidade econômica (30%).
 *    - Na detecção de movimento: veículos e pedestres em miniatura percorrem a maquete, acionando os sensores infravermelhos (IR)
 *      e elevando a intensidade luminosa dos postes próximos para 100% (e vizinhos para 60%).
 *
 * 5. ESTÉTICA E APRESENTAÇÃO:
 *    - Vista isométrica em perspectiva com fundo neutro de estúdio fotográfico/acadêmico e iluminação realista.
 */

class MaquetePhysicalScene {
  constructor(containerId, controller) {
    this.container = document.getElementById(containerId);
    this.controller = controller;

    // Arrays de luzes e materiais dos 6 postes de PVC e indicadores da protoboard
    this.palitoLeds = [];
    this.palitoPointLights = [];
    this.poleCones = [];
    this.poleLdrCaps = [];
    this.breadboardSmartLeds = [];
    this.breadboardConvLeds = [];
    this.breadboardLedLights = [];
    this.irSensorModules = [];
    this.irBeamLines = [];
    this.buttons = [];
    this.jumperWires = [];
    this.buildingWindows = [];

    // Veículos e pedestres em miniatura na rua da maquete
    this.miniCars = [];
    this.miniPedestrians = [];
    this.autoTrafficEnabled = true;
    this.demoMode = 'night_motion'; // 'day' | 'night' | 'night_motion'

    // Estado da caixa de acrílico transparente removível
    this.acrylicCoverOpen = false;
    this.acrylicCoverTargetY = 0;
    this.acrylicCoverCurrentY = 0;

    // Estado da Mão 3D interativa
    this.handGroup = null;
    this.isHandBusy = false;
    this.isRotatingWheel = false;
    this.isTrackingAdc = false;
    this.handAtKnob = false;
    this.adcReleaseTimer = null;
    this.handWalkSequenceActive = false;
    this.handWalkIndex = 0;
    this.handWalkTimer = null;

    // Posições Z das 6 zonas ao longo da rua (Rua vai no eixo X de -20 a +20; ou eixo X é longitudinal!)
    // Vamos alinhar a Rua Inteligente no eixo X (de X = -22 a X = +22) para uma vista isométrica panorâmica perfeita!
    // Posições X dos 6 postes de PVC e dos 6 sensores IR:
    this.polePositionsX = [-16.5, -9.9, -3.3, 3.3, 9.9, 16.5];

    this.initThree();
    this.setupLights();
    this.buildStudioEnvironment();
    this.buildMdfBaseStructure();
    this.buildSmartStreetAndSidewalks();
    this.buildScaleBuildingsAndHouses();
    this.buildScaleTreesAndUrbanElements();
    this.buildSmartPvcStreetPoles();
    this.buildInfraredStreetSensors();
    this.buildTechnicalAreaElectronics();
    this.buildRemovableAcrylicCover();
    this.buildScaleVehiclesAndPedestrians();
    this.buildHandActor();
    this.initInteraction();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initThree() {
    this.scene = new THREE.Scene();
    // Fundo neutro de estúdio fotográfico / exposição acadêmica (transita suavemente entre estúdio claro de dia e estúdio meia-luz à noite)
    this.studioDayColor = new THREE.Color(0xdbe4ee);
    this.studioNightColor = new THREE.Color(0x1e293b);
    this.scene.background = this.studioNightColor.clone();
    this.scene.fog = new THREE.FogExp2(0x1e293b, 0.0045);

    // Câmera em perspectiva isométrica (FOV 34° para aspecto de maquete física de estúdio sem distorção exagerada)
    this.camera = new THREE.PerspectiveCamera(
      34,
      window.innerWidth / window.innerHeight,
      0.5,
      300
    );
    // Vista Isométrica em Perspectiva Clássica (visualizando toda a estrutura da maquete + área técnica frontal)
    this.camera.position.set(28, 27, 34);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 95;
    this.controls.target.set(0, 1.8, 1.5);
  }

  setupLights() {
    // Luz Hemisférica de Estúdio
    this.ambientLight = new THREE.HemisphereLight(0xf8fafc, 0x475569, 0.55);
    this.scene.add(this.ambientLight);

    // Key Light de Estúdio (Simula iluminação natural solar / softbox de exposição)
    this.deskLamp = new THREE.DirectionalLight(0xfffbeb, 0.45);
    this.deskLamp.position.set(22, 38, 24);
    this.deskLamp.castShadow = true;
    this.deskLamp.shadow.mapSize.width = 2048;
    this.deskLamp.shadow.mapSize.height = 2048;
    this.deskLamp.shadow.camera.near = 5;
    this.deskLamp.shadow.camera.far = 110;
    const d = 32;
    this.deskLamp.shadow.camera.left = -d;
    this.deskLamp.shadow.camera.right = d;
    this.deskLamp.shadow.camera.top = d;
    this.deskLamp.shadow.camera.bottom = -d;
    this.deskLamp.shadow.bias = -0.0005;
    this.scene.add(this.deskLamp);

    // Rim Light suave de contra-luz para destacar bordas de MDF, PVC e caixa de acrílico
    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.35);
    this.rimLight.position.set(-26, 22, -20);
    this.scene.add(this.rimLight);

    // Fill Light frontal dedicado para a Área Técnica (garante nitidez do Arduino Nano e Protoboard sob a caixa transparente)
    this.techBayLight = new THREE.PointLight(0xe0f2fe, 0.45, 22, 1.6);
    this.techBayLight.position.set(0, 6.5, 11.5);
    this.scene.add(this.techBayLight);
  }

  /**
   * 0. FUNDO INFINITO NEUTRO DE ESTÚDIO E BANCADA DE EXPOSIÇÃO ACADÊMICA
   */
  buildStudioEnvironment() {
    const studioCanvas = document.createElement('canvas');
    studioCanvas.width = 1024;
    studioCanvas.height = 1024;
    const ctx = studioCanvas.getContext('2d');

    const grad = ctx.createRadialGradient(512, 512, 60, 512, 512, 512);
    grad.addColorStop(0, '#cbd5e1');
    grad.addColorStop(0.6, '#94a3b8');
    grad.addColorStop(1, '#64748b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Grade sutil de estúdio técnico
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 1024; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
    }

    const studioTex = new THREE.CanvasTexture(studioCanvas);
    this.studioFloorMat = new THREE.MeshStandardMaterial({
      map: studioTex,
      roughness: 0.75,
      metalness: 0.05
    });

    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), this.studioFloorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.85;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);
  }

  /**
   * 1. ESTRUTURA DA MAQUETE: Base Retangular Rígida com Acabamento em MDF
   * Dimensões da base de MDF: 48 unid. de largura (X: -24 a +24) x 32 unid. de profundidade (Z: -14 a +18)
   */
  buildMdfBaseStructure() {
    this.mdfGroup = new THREE.Group();

    // Textura procedural da superfície de MDF Cru / Laminado de Marcenaria Universitária
    const mdfTopCanvas = document.createElement('canvas');
    mdfTopCanvas.width = 1024;
    mdfTopCanvas.height = 1024;
    const ctx = mdfTopCanvas.getContext('2d');

    ctx.fillStyle = '#b6895b';
    ctx.fillRect(0, 0, 1024, 1024);

    // Fibras prensadas características de chapa de MDF
    for (let i = 0; i < 18000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const w = 1 + Math.random() * 8;
      const h = 1 + Math.random() * 2;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(138, 98, 60, 0.22)' : 'rgba(205, 165, 120, 0.20)';
      ctx.fillRect(x, y, w, h);
    }

    // Moldura chanfrada gravada a laser na chapa de MDF
    ctx.strokeStyle = 'rgba(78, 52, 28, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, 988, 988);

    const mdfTopTex = new THREE.CanvasTexture(mdfTopCanvas);

    // Textura de borda de MDF cortado a laser (mais escura/caramelizada)
    const mdfEdgeCanvas = document.createElement('canvas');
    mdfEdgeCanvas.width = 512;
    mdfEdgeCanvas.height = 64;
    const ectx = mdfEdgeCanvas.getContext('2d');
    ectx.fillStyle = '#7c532d';
    ectx.fillRect(0, 0, 512, 64);
    for (let x = 0; x < 512; x += 3) {
      ectx.fillStyle = Math.random() > 0.5 ? 'rgba(55, 34, 16, 0.35)' : 'rgba(150, 106, 65, 0.25)';
      ectx.fillRect(x, 0, 2, 64);
    }
    const mdfEdgeTex = new THREE.CanvasTexture(mdfEdgeCanvas);

    const mdfTopMat = new THREE.MeshStandardMaterial({ map: mdfTopTex, roughness: 0.68, metalness: 0.04 });
    const mdfEdgeMat = new THREE.MeshStandardMaterial({ map: mdfEdgeTex, roughness: 0.75, metalness: 0.04 });

    // Placa Principal de MDF (48 x 1.1 x 32) centrada em X=0, Z=2.0
    const baseMaterials = [
      mdfEdgeMat, // direita
      mdfEdgeMat, // esquerda
      mdfTopMat,  // topo
      mdfEdgeMat, // base
      mdfEdgeMat, // frente
      mdfEdgeMat  // trás
    ];
    const mdfBoard = new THREE.Mesh(new THREE.BoxGeometry(48.0, 1.1, 32.0), baseMaterials);
    mdfBoard.position.set(0, -0.05, 2.0);
    mdfBoard.castShadow = true;
    mdfBoard.receiveShadow = true;
    this.mdfGroup.add(mdfBoard);

    // Moldura lateral de acabamento em MDF (perfil de 15mm cercando a maquete)
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x8c5e35, roughness: 0.65 });
    const trimFront = new THREE.Mesh(new THREE.BoxGeometry(48.4, 1.35, 0.35), trimMat);
    trimFront.position.set(0, 0.05, 18.05);
    this.mdfGroup.add(trimFront);

    const trimBack = new THREE.Mesh(new THREE.BoxGeometry(48.4, 1.35, 0.35), trimMat);
    trimBack.position.set(0, 0.05, -14.05);
    this.mdfGroup.add(trimBack);

    const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.35, 32.4), trimMat);
    trimLeft.position.set(-24.05, 0.05, 2.0);
    this.mdfGroup.add(trimLeft);

    const trimRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.35, 32.4), trimMat);
    trimRight.position.set(24.05, 0.05, 2.0);
    this.mdfGroup.add(trimRight);

    // 4 Pés de borracha antiderrapantes nos cantos inferiores da base de MDF
    const footMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    [[-22, -12.5], [22, -12.5], [-22, 16.5], [22, 16.5]].forEach(([fx, fz]) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.35, 20), footMat);
      foot.position.set(fx, -0.72, fz);
      foot.castShadow = true;
      this.mdfGroup.add(foot);
    });

    // Plaqueta Acadêmica de Identificação do Protótipo na borda frontal do MDF
    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 1024;
    plaqueCanvas.height = 160;
    const pctx = plaqueCanvas.getContext('2d');
    pctx.fillStyle = '#1e293b';
    pctx.fillRect(0, 0, 1024, 160);
    pctx.strokeStyle = '#f59e0b';
    pctx.lineWidth = 8;
    pctx.strokeRect(8, 8, 1008, 144);

    pctx.fillStyle = '#f8fafc';
    pctx.font = 'bold 38px sans-serif';
    pctx.textAlign = 'center';
    pctx.fillText('PROTÓTIPO DE ENGENHARIA — RUA INTELIGENTE AUTOMATIZADA', 512, 68);
    pctx.fillStyle = '#38bdf8';
    pctx.font = '26px monospace';
    pctx.fillText('CONTROLE CENTRAL ARDUINO NANO / ESP32 • SENSORES LDR & INFRAVERMELHO (IR) • LED PWM', 512, 118);

    const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
    const plaqueMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(14.5, 1.15),
      new THREE.MeshBasicMaterial({ map: plaqueTex })
    );
    plaqueMesh.position.set(-13.5, 0.06, 18.24);
    this.mdfGroup.add(plaqueMesh);

    // Gramado sintético de maquete (flocagem verde estática) nas áreas laterais das edificações
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c43, roughness: 0.92, metalness: 0.02 });
    const northLawn = new THREE.Mesh(new THREE.BoxGeometry(46.8, 0.12, 6.2), grassMat);
    northLawn.position.set(0, 0.54, -10.5);
    northLawn.receiveShadow = true;
    this.mdfGroup.add(northLawn);

    const southLawn = new THREE.Mesh(new THREE.BoxGeometry(46.8, 0.12, 4.4), grassMat);
    southLawn.position.set(0, 0.54, 6.2);
    southLawn.receiveShadow = true;
    this.mdfGroup.add(southLawn);

    this.scene.add(this.mdfGroup);
  }

  /**
   * 1B. PROTOBOARD NO MEIO SERVINDO DE RUA IMPROVISADA (Estilo Protótipo Universitário Maker)
   * Em vez de asfalto tradicional, uma longa Protoboard de bancada ocupa o centro da maquete (Z = -1.6),
   * fazendo o papel de rua de duas mãos de forma criativa/improvisada:
   * - O sulco divisor central da protoboard (DIP ravine) com fitas amarelas tracejadas divide as duas mãos da via!
   * - Os furos (tie-points) de matriz da protoboard formam a textura da pista onde os carrinhos trafegam.
   * - Os barramentos laterais (+ vermelho e - azul) funcionam como acostamento/guias energizadas.
   * - Nas extremidades, tiras de papel/fita branca coladas sobre os furos formam as faixas de pedestres improvisadas.
   * - Os resistores de 220Ω e jumpers dos 6 postes/sensores ficam espetados diretamente nas bordas da "Protoboard-Rua"!
   */
  buildSmartStreetAndSidewalks() {
    this.streetGroup = new THREE.Group();

    // Textura de alta resolução da Protoboard Gigante fazendo papel de Rua Improvisada
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 2048;
    roadCanvas.height = 512;
    const rctx = roadCanvas.getContext('2d');

    // Corpo de plástico ABS branco/creme clássico de Protoboard
    rctx.fillStyle = '#f1f5f9';
    rctx.fillRect(0, 0, 2048, 512);

    // Sombras das divisórias modulares (3 protoboards de 830 pontos encaixadas lado a lado formando a rua)
    rctx.strokeStyle = '#cbd5e1';
    rctx.lineWidth = 5;
    [682, 1365].forEach(seamX => {
      rctx.beginPath();
      rctx.moveTo(seamX, 0);
      rctx.lineTo(seamX, 512);
      rctx.stroke();
    });

    // Barramentos de alimentação superior e inferior (Power Rails: Linha Vermelha VCC + e Linha Azul GND -)
    rctx.fillStyle = '#ef4444';
    rctx.fillRect(24, 18, 2000, 6);
    rctx.fillRect(24, 462, 2000, 6);

    rctx.fillStyle = '#2563eb';
    rctx.fillRect(24, 48, 2000, 6);
    rctx.fillRect(24, 492, 2000, 6);

    // Sulco central da protoboard (canaleta DIP no meio da pista, Y = 236 a 276)
    rctx.fillStyle = '#cbd5e1';
    rctx.fillRect(0, 234, 2048, 44);
    rctx.fillStyle = '#94a3b8';
    rctx.fillRect(0, 240, 2048, 4);
    rctx.fillRect(0, 268, 2048, 4);

    // Furos metálicos (tie-points) da protoboard ao longo de toda a "rua"
    for (let x = 36; x <= 2012; x += 18) {
      // Furos dos barramentos de alimentação (agrupados de 5 em 5)
      if (Math.floor((x - 36) / 18) % 6 !== 5) {
        rctx.fillStyle = '#334155';
        rctx.fillRect(x - 3, 28, 6, 6);
        rctx.fillRect(x - 3, 38, 6, 6);
        rctx.fillRect(x - 3, 472, 6, 6);
        rctx.fillRect(x - 3, 482, 6, 6);
      }

      // Colunas A-E (Mão Superior da Rua: Y = 78 a 214)
      for (let row = 0; row < 5; row++) {
        const py = 82 + row * 32;
        rctx.fillStyle = '#cbd5e1';
        rctx.fillRect(x - 5, py - 5, 10, 10);
        rctx.fillStyle = '#1e293b';
        rctx.fillRect(x - 3, py - 3, 6, 6);
      }

      // Colunas F-J (Mão Inferior da Rua: Y = 296 a 432)
      for (let row = 0; row < 5; row++) {
        const py = 300 + row * 32;
        rctx.fillStyle = '#cbd5e1';
        rctx.fillRect(x - 5, py - 5, 10, 10);
        rctx.fillStyle = '#1e293b';
        rctx.fillRect(x - 3, py - 3, 6, 6);
      }
    }

    // Fita adesiva amarela colada no sulco central da protoboard para improvisar a faixa divisória de mão dupla!
    rctx.fillStyle = '#facc15';
    for (let x = 160; x < 1880; x += 68) {
      rctx.fillRect(x, 248, 42, 16);
      rctx.strokeStyle = 'rgba(161, 98, 7, 0.45)';
      rctx.lineWidth = 1.5;
      rctx.strokeRect(x, 248, 42, 16);
    }

    // Faixas de pedestres improvisadas com tirinhas de fita isolante preta e etiquetas brancas nas pontas da protoboard
    const crosswalkPositions = [88, 1852];
    crosswalkPositions.forEach(cwX => {
      // Fundo de fita isolante preta colada sobre a protoboard
      rctx.fillStyle = '#18181b';
      rctx.fillRect(cwX - 8, 68, 120, 376);
      // Tiras brancas da faixa de pedestres
      rctx.fillStyle = '#f8fafc';
      for (let y = 80; y <= 416; y += 44) {
        rctx.fillRect(cwX + 4, y, 96, 24);
      }
    });

    // Setas indicativas de fluxo desenhadas à caneta marcadora sobre a protoboard
    rctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    [520, 1024, 1520].forEach(ax => {
      // Seta mão superior (Oeste <- Leste)
      rctx.fillRect(ax, 142, 50, 8);
      rctx.beginPath();
      rctx.moveTo(ax - 16, 146);
      rctx.lineTo(ax + 4, 130);
      rctx.lineTo(ax + 4, 162);
      rctx.fill();

      // Seta mão inferior (Oeste -> Leste)
      rctx.fillRect(ax, 360, 50, 8);
      rctx.beginPath();
      rctx.moveTo(ax + 66, 364);
      rctx.lineTo(ax + 46, 348);
      rctx.lineTo(ax + 46, 380);
      rctx.fill();
    });

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.anisotropy = 8;

    const protoSideMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.05 });
    const protoTopMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.42, metalness: 0.06 });

    // Corpo elevado da Protoboard-Rua no centro da maquete (Z = -1.6, altura de protoboard real)
    const roadMesh = new THREE.Mesh(
      new THREE.BoxGeometry(46.8, 0.36, 7.6),
      [protoSideMat, protoSideMat, protoTopMat, protoSideMat, protoSideMat, protoSideMat]
    );
    roadMesh.position.set(0, 0.58, -1.6);
    roadMesh.receiveShadow = true;
    roadMesh.castShadow = true;
    this.streetGroup.add(roadMesh);

    // Abas de encaixe lateral típicas de protoboard nas bordas da rua
    [-16.0, -5.0, 5.0, 16.0].forEach(tx => {
      const tabN = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.25), protoSideMat);
      tabN.position.set(tx, 0.56, -5.45);
      this.streetGroup.add(tabN);
    });

    // Componentes espetados nas bordas da Protoboard-Rua (Resistores 220Ω + LEDs indicadores + Fios até cada Poste de PVC)
    const smartColors = [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x3b82f6, 0xa855f7];
    for (let i = 0; i < 6; i++) {
      const px = this.polePositionsX[i];

      // Resistor limitador de 220Ω espetado diretamente no barramento norte da Protoboard-Rua
      const streetRes = this.createThroughHoleResistor([0xef4444, 0xef4444, 0x78350f, 0xeab308]);
      streetRes.position.set(px - 0.85, 0.88, -4.85);
      this.streetGroup.add(streetRes);

      // Jumper saindo do trilho da Protoboard-Rua e subindo pela base do Poste de PVC
      this.createRealisticJumperWire(
        new THREE.Vector3(px - 0.35, 0.72, -4.85),
        new THREE.Vector3(px, 0.88, -5.65),
        smartColors[i],
        0.55
      );
    }

    // Calçadas laterais em MDF/papelão cinza margeando a Protoboard-Rua
    const sidewalkCanvas = document.createElement('canvas');
    sidewalkCanvas.width = 1024;
    sidewalkCanvas.height = 128;
    const sctx = sidewalkCanvas.getContext('2d');
    sctx.fillStyle = '#cbd5e1';
    sctx.fillRect(0, 0, 1024, 128);
    sctx.strokeStyle = '#94a3b8';
    sctx.lineWidth = 2;
    for (let x = 0; x <= 1024; x += 32) {
      sctx.beginPath(); sctx.moveTo(x, 0); sctx.lineTo(x, 128); sctx.stroke();
    }
    sctx.beginPath(); sctx.moveTo(0, 64); sctx.lineTo(1024, 64); sctx.stroke();

    const sidewalkTex = new THREE.CanvasTexture(sidewalkCanvas);
    const sidewalkMat = new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.72, metalness: 0.04 });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });

    // Calçada Norte (Z = -6.4, largura 2.0) e Calçada Sul (Z = +3.2, largura 2.0)
    [-6.4, 3.2].forEach((sz, idx) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(46.8, 0.28, 2.0), sidewalkMat);
      sw.position.set(0, 0.64, sz);
      sw.receiveShadow = true;
      sw.castShadow = true;
      this.streetGroup.add(sw);

      // Guia / Meio-fio branco e amarelo
      const curbZ = idx === 0 ? sz + 1.02 : sz - 1.02;
      const curb = new THREE.Mesh(new THREE.BoxGeometry(46.8, 0.30, 0.12), curbMat);
      curb.position.set(0, 0.65, curbZ);
      this.streetGroup.add(curb);
    });

    // Etiqueta identificando a "Protoboard-Rua" improvisada
    const protoStreetTag = this.createPcbTextLabel('PROTOBOARD CENTRAL (RUA IMPROVISADA DE 2 MÃOS)');
    protoStreetTag.scale.set(0.85, 0.85, 0.85);
    protoStreetTag.position.set(0, 0.80, -5.05);
    this.streetGroup.add(protoStreetTag);

    this.scene.add(this.streetGroup);
  }

  /**
   * 1C. PEQUENAS CASAS E EDIFÍCIOS NAS LATERAIS (Estilo Maquete Física Universitária em MDF, Papelão Paraná e Acrílico)
   */
  buildScaleBuildingsAndHouses() {
    this.buildingsGroup = new THREE.Group();

    // Materiais típicos de maquete física de arquitetura/engenharia:
    const mdfWallMat = new THREE.MeshStandardMaterial({ color: 0xc89d6c, roughness: 0.68 });
    const cardboardMat = new THREE.MeshStandardMaterial({ color: 0xd6b588, roughness: 0.78 });
    const foamboardMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55 });
    const terracottaRoofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });
    const darkRoofMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });

    // 1. LADO NORTE (Z = -10.5): Casas residenciais e edifícios acadêmicos/comerciais em escala
    const northConfigs = [
      { x: -18.5, w: 6.2, h: 4.2, d: 4.2, type: 'house', wallMat: foamboardMat, roofMat: terracottaRoofMat, label: 'RESIDÊNCIA 01' },
      { x: -10.5, w: 6.8, h: 7.4, d: 4.5, type: 'building', wallMat: mdfWallMat, roofMat: darkRoofMat, label: 'ED. ENGENHARIA' },
      { x: -2.0,  w: 6.0, h: 4.6, d: 4.2, type: 'house', wallMat: cardboardMat, roofMat: terracottaRoofMat, label: 'CASA MODELO' },
      { x: 6.5,   w: 7.2, h: 8.6, d: 4.6, type: 'building', wallMat: foamboardMat, roofMat: darkRoofMat, label: 'LAB. SMART CITY' },
      { x: 16.5,  w: 6.6, h: 5.2, d: 4.2, type: 'house', wallMat: mdfWallMat, roofMat: terracottaRoofMat, label: 'COMÉRCIO LOCAL' }
    ];

    northConfigs.forEach(cfg => {
      const bldg = this.createScaleModelBuilding(cfg.w, cfg.h, cfg.d, cfg.type, cfg.wallMat, cfg.roofMat, cfg.label);
      bldg.position.set(cfg.x, 0.6, -10.5);
      this.buildingsGroup.add(bldg);
    });

    // 2. LADO SUL (Z = +6.4): Casinhas baixas e chalés de maquete (mais baixos para não obstruir a visão isométrica da rua)
    const southConfigs = [
      { x: -17.5, w: 5.2, h: 2.8, d: 2.8, type: 'house', wallMat: cardboardMat, roofMat: terracottaRoofMat, label: 'CASA 02' },
      { x: -6.5,  w: 5.5, h: 3.1, d: 2.8, type: 'house', wallMat: foamboardMat, roofMat: darkRoofMat, label: 'QUIOSQUE URBANO' },
      { x: 6.5,   w: 5.5, h: 3.0, d: 2.8, type: 'house', wallMat: mdfWallMat, roofMat: terracottaRoofMat, label: 'POSTO DE SAÚDE' },
      { x: 17.5,  w: 5.2, h: 2.8, d: 2.8, type: 'house', wallMat: cardboardMat, roofMat: terracottaRoofMat, label: 'CASA 04' }
    ];

    southConfigs.forEach(cfg => {
      const bldg = this.createScaleModelBuilding(cfg.w, cfg.h, cfg.d, cfg.type, cfg.wallMat, cfg.roofMat, cfg.label);
      bldg.position.set(cfg.x, 0.6, 6.4);
      this.buildingsGroup.add(bldg);
    });

    this.scene.add(this.buildingsGroup);
  }

  createScaleModelBuilding(w, h, d, type, wallMat, roofMat, titleText) {
    const group = new THREE.Group();

    // Corpo principal com linhas de encaixe a laser nas quinas
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.set(0, h / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Base de encaixe em MDF escuro
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.3, 0.22, d + 0.3),
      new THREE.MeshStandardMaterial({ color: 0x784f2a, roughness: 0.7 })
    );
    plinth.position.set(0, 0.11, 0);
    group.add(plinth);

    if (type === 'house') {
      // Telhado de duas águas em papelão ondulado / MDF gravado
      const roofHeight = 1.45;
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-w / 2 - 0.35, 0);
      roofShape.lineTo(0, roofHeight);
      roofShape.lineTo(w / 2 + 0.35, 0);
      roofShape.closePath();

      const extrudeSettings = { depth: d + 0.5, bevelEnabled: false };
      const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.set(0, h, -d / 2 - 0.25);
      roofMesh.castShadow = true;
      group.add(roofMesh);
    } else {
      // Platibanda de prédio com detalhes de corte a laser e reservatório superior
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.45, d + 0.25), roofMat);
      parapet.position.set(0, h + 0.22, 0);
      parapet.castShadow = true;
      group.add(parapet);

      const hvac = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.35, 0.9, d * 0.4),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })
      );
      hvac.position.set(w * 0.18, h + 0.65, 0);
      group.add(hvac);
    }

    // Janelas em acrílico translúcido com molduras de MDF cortadas a laser (ambas as faces)
    const floors = Math.max(1, Math.floor(h / 2.2));
    const cols = Math.max(2, Math.floor(w / 1.8));
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.7 });

    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const wx = -w / 2 + (w / (cols + 1)) * (c + 1);
        const wy = 1.2 + f * 2.0;
        if (wy > h - 0.6) continue;

        const winMat = new THREE.MeshStandardMaterial({
          color: 0xbae6fd,
          emissive: 0xfef08a,
          emissiveIntensity: 0.35,
          roughness: 0.15,
          metalness: 0.2,
          transparent: true,
          opacity: 0.88
        });
        this.buildingWindows.push(winMat);

        [-d / 2 - 0.03, d / 2 + 0.03].forEach(wz => {
          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.05, 0.05), frameMat);
          frame.position.set(wx, wy, wz);
          group.add(frame);

          const pane = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.88, 0.07), winMat);
          pane.position.set(wx, wy, wz);
          group.add(pane);
        });
      }
    }

    // Porta de entrada em madeira MDF
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.55, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.65 })
    );
    door.position.set(0, 0.8, d / 2 + 0.02);
    group.add(door);

    return group;
  }

  /**
   * 1D. ÁRVORES EM ESCALA, PLACAS DE TRÂNSITO E MOBILIÁRIO URBANO
   */
  buildScaleTreesAndUrbanElements() {
    this.urbanElementsGroup = new THREE.Group();

    // 1. Árvores de Maquete Arquitetônica (Tronco de madeira balsa/arame torcido + copa em espuma/bucha vegetal verde)
    const treePositions = [
      [-21.8, -7.8], [-14.2, -7.8], [-6.2, -7.8], [2.2, -7.8], [11.8, -7.8], [21.2, -7.8],
      [-12.0, 4.6], [0.0, 4.6], [12.0, 4.6]
    ];

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
    const foliageColors = [0x2e6f40, 0x3b7a57, 0x4f7942];

    treePositions.forEach(([tx, tz], idx) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0.65, tz);

      // Base de fixação em MDF
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.5, 0.12, 12),
        new THREE.MeshStandardMaterial({ color: 0x8c5e35, roughness: 0.7 })
      );
      base.position.y = 0.06;
      tree.add(base);

      // Tronco
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.9, 10), trunkMat);
      trunk.position.y = 1.0;
      trunk.castShadow = true;
      tree.add(trunk);

      // Copa em espuma flocada (3 volumes orgânicos)
      const fMat = new THREE.MeshStandardMaterial({
        color: foliageColors[idx % foliageColors.length],
        roughness: 0.92
      });
      const mainCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), fMat);
      mainCrown.position.set(0, 2.35, 0);
      mainCrown.castShadow = true;
      tree.add(mainCrown);

      const subCrown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82, 1), fMat);
      subCrown1.position.set(0.55, 2.05, 0.35);
      subCrown1.castShadow = true;
      tree.add(subCrown1);

      const subCrown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), fMat);
      subCrown2.position.set(-0.5, 2.15, -0.3);
      subCrown2.castShadow = true;
      tree.add(subCrown2);

      this.urbanElementsGroup.add(tree);
    });

    // 2. Placas de Trânsito em Escala (PARE, Limite 40 km/h, Faixa de Pedestres)
    this.createTrafficSign(-19.2, -5.5, 'STOP');
    this.createTrafficSign(19.2, 2.3, 'STOP');
    this.createTrafficSign(-7.0, -5.5, 'SPEED_40');
    this.createTrafficSign(7.0, 2.3, 'SPEED_40');
    this.createTrafficSign(-18.0, 2.3, 'CROSSWALK');
    this.createTrafficSign(18.0, -5.5, 'CROSSWALK');

    // 3. Bancos de madeira de maquete nas calçadas
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x9c6644, roughness: 0.7 });
    [[-13.2, -6.9], [0.0, -6.9], [13.2, -6.9], [-3.5, 3.7], [3.5, 3.7]].forEach(([bx, bz]) => {
      const bench = new THREE.Group();
      bench.position.set(bx, 0.78, bz);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.42), benchMat);
      seat.position.y = 0.25;
      bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.32, 0.08), benchMat);
      back.position.set(0, 0.42, bz < 0 ? -0.18 : 0.18);
      bench.add(back);
      this.urbanElementsGroup.add(bench);
    });

    this.scene.add(this.urbanElementsGroup);
  }

  createTrafficSign(x, z, signType) {
    const signGroup = new THREE.Group();
    signGroup.position.set(x, 0.78, z);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.35 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 10), poleMat);
    post.position.y = 1.05;
    post.castShadow = true;
    signGroup.add(post);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (signType === 'STOP') {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        const px = 64 + Math.cos(a) * 56;
        const py = 64 + Math.sin(a) * 56;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PARE', 64, 75);
    } else if (signType === 'SPEED_40') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(64, 64, 54, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 12; ctx.stroke();
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('40', 64, 76);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('km/h', 64, 98);
    } else {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(64, 10); ctx.lineTo(118, 64); ctx.lineTo(64, 118); ctx.lineTo(10, 64);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('PEDESTRE', 64, 72);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(0.68, 0.68),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    board.position.set(0, 2.1, 0);
    board.rotation.y = Math.PI / 4;
    signGroup.add(board);

    this.urbanElementsGroup.add(signGroup);
  }

  /**
   * 2. SISTEMA DE ILUMINAÇÃO INTELIGENTE:
   *    6 Postes em Tubo de PVC ao longo da calçada, contendo:
   *    - Estrutura vertical tubular em PVC branco/cinza com luva de base
   *    - Luminárias LED brancas na extremidade superior + Cones volumétricos
   *    - Sensor LDR individual no topo de cada luminária para leitura ambiente
   *    - Fiação interna/aparente descendo até o barramento da maquete
   */
  buildSmartPvcStreetPoles() {
    this.polesGroup = new THREE.Group();
    this.palitoLeds = [];
    this.palitoPointLights = [];
    this.poleCones = [];
    this.poleLdrCaps = [];

    // Material realista de tubo de PVC rígido (branco acetinado / cinza claro de engenharia)
    const pvcPipeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.28,
      metalness: 0.08
    });

    const pvcFittingMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.35,
      metalness: 0.12
    });

    const smartColors = [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x3b82f6, 0xa855f7];

    for (let i = 0; i < 6; i++) {
      const px = this.polePositionsX[i];
      const pz = -5.65; // Posicionados alinhados ao longo da calçada Norte, projetando a luminária sobre a rua!
      const poleGroup = new THREE.Group();
      poleGroup.position.set(px, 0.78, pz);

      // 1. Flange / Luva de PVC fixada na calçada da maquete com 4 parafusos
      const pvcFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.28, 20), pvcFittingMat);
      pvcFlange.position.y = 0.14;
      pvcFlange.castShadow = true;
      poleGroup.add(pvcFlange);

      // 2. Tubo Vertical em PVC (Altura 6.2 unid.)
      const pvcVertical = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 6.2, 20), pvcPipeMat);
      pvcVertical.position.y = 3.2;
      pvcVertical.castShadow = true;
      poleGroup.add(pvcVertical);

      // Anel de identificação de cor do canal PWM no tubo de PVC
      const colorBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.22, 20),
        new THREE.MeshStandardMaterial({ color: smartColors[i], roughness: 0.3 })
      );
      colorBand.position.y = 1.4;
      poleGroup.add(colorBand);

      // 3. Joelho 90° / Curva de PVC no topo
      const pvcElbow = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 16), pvcFittingMat);
      pvcElbow.position.set(0, 6.3, 0);
      poleGroup.add(pvcElbow);

      // 4. Braço Horizontal em PVC avançando sobre a pista de asfalto
      const pvcArm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 2.3, 16), pvcPipeMat);
      pvcArm.rotation.x = Math.PI / 2 + 0.15;
      pvcArm.position.set(0, 6.45, 1.1);
      pvcArm.castShadow = true;
      poleGroup.add(pvcArm);

      // 5. Cúpula da Luminária LED em Acrílico / Plástico ABS Moldado na extremidade superior
      const luminaireHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.22, 1.35),
        pvcFittingMat
      );
      luminaireHousing.position.set(0, 6.62, 2.15);
      luminaireHousing.castShadow = true;
      poleGroup.add(luminaireHousing);

      // 6. Sensor Fotoresistor LDR no topo da luminária do poste (identifica a luminosidade ambiente)
      const ldrCellMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.2,
        roughness: 0.3
      });
      const ldrSensorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16), ldrCellMat);
      ldrSensorCap.position.set(0, 6.76, 2.15);
      poleGroup.add(ldrSensorCap);
      this.poleLdrCaps.push(ldrCellMat);

      // 7. Matriz de LEDs Brancos de Alto Brilho na face inferior da luminária
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.0,
        roughness: 0.15
      });

      const ledLens = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 1.05), ledMat);
      ledLens.position.set(0, 6.49, 2.15);
      poleGroup.add(ledLens);

      // Domo do LED branco 5mm central visível
      const ledDome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), ledMat);
      ledDome.position.set(0, 6.42, 2.15);
      poleGroup.add(ledDome);

      // 8. Feixe Volumétrico de Luz Branca (Cone translúcido projetado sobre o asfalto)
      const coneGeo = new THREE.ConeGeometry(3.4, 6.4, 28, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xf8fafc,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const lightCone = new THREE.Mesh(coneGeo, coneMat);
      lightCone.position.set(0, 3.2, 2.15);
      poleGroup.add(lightCone);
      this.poleCones.push(coneMat);

      // 9. PointLight real iluminando a rua asfaltada e os veículos da maquete
      const poleLight = new THREE.PointLight(0xf8fafc, 1.0, 15.5, 1.7);
      poleLight.position.set(0, 6.1, 2.15);
      poleLight.castShadow = false;
      poleGroup.add(poleLight);

      this.palitoLeds.push(ledMat);
      this.palitoPointLights.push(poleLight);

      // Etiqueta de identificação do Poste (P1 a P6)
      const tag = this.createPcbTextLabel(`POSTE PVC ${i + 1}`);
      tag.scale.set(0.6, 0.6, 0.6);
      tag.rotation.x = -Math.PI / 3;
      tag.position.set(0, 0.35, -0.55);
      poleGroup.add(tag);

      this.polesGroup.add(poleGroup);
    }

    this.scene.add(this.polesGroup);
  }

  /**
   * 2B. SENSORES INFRAVERMELHOS (IR) AO LONGO DA RUA PARA DETECTAR VEÍCULOS E PEDESTRES
   * Posicionados na borda da calçada Sul (Z = 2.25) apontando seus emissores/receptores IR para a pista!
   */
  buildInfraredStreetSensors() {
    this.irSensorsGroup = new THREE.Group();
    this.buttons = [];
    this.irSensorModules = [];
    this.irBeamLines = [];

    const pirPins = ['34', '35', '32', '33', '25', '26'];
    const irColors = [0xf97316, 0x38bdf8, 0xa855f7, 0xf43f5e, 0x3b82f6, 0x10b981];

    for (let i = 0; i < 6; i++) {
      const sx = this.polePositionsX[i];
      const sz = 2.35; // Beira da calçada Sul olhando para o tráfego da rua

      const irModule = this.createIrObstacleSensorModule(i, sx, sz, irColors[i], `D${i + 2} / GPIO ${pirPins[i]}`);
      this.irSensorsGroup.add(irModule);
      this.buttons.push(irModule);
      this.irSensorModules.push(irModule);
    }

    this.scene.add(this.irSensorsGroup);
  }

  /**
   * Cria um módulo Sensor Infravermelho (IR Obstacle Avoidance Module FC-51 / TCRT5000) realista:
   * - PCB Azul com CI comparador LM393, trimpot de ajuste, LED Power (verde) e LED Status de Detecção (vermelho/âmbar)
   * - Par de fotodiodos na ponta voltados para a rua: Emissor IR (transparente/azulado) + Receptor Fotodiodo (preto escuro)
   * - Feixe laser infravermelho pontilhado cruzando a rua da maquete
   */
  createIrObstacleSensorModule(index, xPos, zPos, wireColor, pinLabel) {
    const irGroup = new THREE.Group();
    irGroup.position.set(xPos, 0.82, zPos);

    // Suporte em L de acrílico/MDF na calçada
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
    );
    bracket.position.set(0, 0.15, 0.35);
    irGroup.add(bracket);

    // Placa PCB Azul do Sensor Infravermelho
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.15 });
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 2.2), pcbMat);
    pcb.position.set(0, 0.32, 0.2);
    pcb.castShadow = true;
    irGroup.add(pcb);

    // Chip LM393 e Trimpot na placa do sensor IR
    const lm393 = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.12, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
    );
    lm393.position.set(0, 0.42, 0.25);
    irGroup.add(lm393);

    const trimpot = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.22, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 })
    );
    trimpot.position.set(0.35, 0.44, 0.75);
    irGroup.add(trimpot);

    // Dois LEDs frontais de Infravermelho apontados horizontalmente para a rua (-Z):
    // 1. LED Emissor IR (cristal azulado)
    const irEmitter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.85, roughness: 0.15 })
    );
    irEmitter.rotation.x = Math.PI / 2;
    irEmitter.position.set(-0.34, 0.35, -1.05);
    irGroup.add(irEmitter);

    // 2. Fotodiodo Receptor IR (cápsula escura preta)
    const irReceiver = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15, metalness: 0.3 })
    );
    irReceiver.rotation.x = Math.PI / 2;
    irReceiver.position.set(0.34, 0.35, -1.05);
    irGroup.add(irReceiver);

    // LED SMD Indicador de Detecção de Movimento no módulo IR
    const statusLedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.15
    });
    const statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), statusLedMat);
    statusLed.position.set(-0.38, 0.45, 0.75);
    irGroup.add(statusLed);

    // Feixe Infravermelho visual na pista (muda de ciano suave para vermelho/âmbar brilhante ao detectar veículo/pedestre)
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22
    });
    const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6.8, 8), beamMat);
    beamMesh.rotation.x = Math.PI / 2;
    beamMesh.position.set(0, 0.35, -4.5);
    irGroup.add(beamMesh);
    this.irBeamLines.push(beamMat);

    // Etiqueta do sensor IR
    const label = this.createPcbTextLabel(`IR ${index + 1}`);
    label.scale.set(0.48, 0.48, 0.48);
    label.position.set(0, 0.44, 1.55);
    irGroup.add(label);

    irGroup.userData = {
      index: index,
      isPirSensor: true,
      statusLedMat: statusLedMat,
      worldTargetPos: new THREE.Vector3(xPos, 1.3, zPos)
    };
    pcb.userData = { index: index, isPirSensor: true };
    irEmitter.userData = { index: index, isPirSensor: true };
    irReceiver.userData = { index: index, isPirSensor: true };

    return irGroup;
  }

  /**
   * 3. COMPONENTES ELETRÔNICOS NA ÁREA TÉCNICA DA BASE DA MAQUETE:
   *    - Área técnica organizada na faixa frontal da base de MDF (Z = +9.5 a +17.2)
   *    - Arduino Nano como unidade central de controle na Protoboard Principal + Placa ESP32 DevKit em barramento integrado
   *    - Módulo Sensor LDR + Roda de Ajuste de Luminosidade (Trimpot 3D)
   *    - Barramento de Resistores e LEDs brancos/indicadores dos postes
   *    - Fonte de Alimentação (Módulo MB102 + Fonte Chaveada 12V/5V com plug P4)
   *    - Fios jumper conectando todos os componentes aos sensores IR e aos postes de PVC
   */
  buildTechnicalAreaElectronics() {
    this.techBayGroup = new THREE.Group();

    // 1. Piso da Área Técnica em Acrílico Preto Fosco / Fibra de Carbono para destacar o circuito
    const bayFloor = new THREE.Mesh(
      new THREE.BoxGeometry(44.0, 0.14, 7.6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.15 })
    );
    bayFloor.position.set(0, 0.56, 13.0);
    bayFloor.receiveShadow = true;
    this.techBayGroup.add(bayFloor);

    // 2. PROTOBOARD CENTRAL GRANDE (Branca 830 pontos) com ARDUINO NANO + Barramento de Controle
    const mainBb = this.createBreadboardMesh(16.5, 5.4, false);
    mainBb.position.set(-2.5, 0.85, 13.0);
    this.techBayGroup.add(mainBb);

    // 3. ARDUINO NANO (Unidade Central de Controle na Protoboard Principal, em X = -6.5, Z = 13.0)
    this.buildArduinoNanoOnBreadboard(-6.5, 1.35, 13.0);

    // 4. ESP32 DevKit V1 (Co-processador Wi-Fi/Telemetria ao lado na Protoboard, em X = -0.2, Z = 13.0)
    this.buildEsp32OnBreadboard(-0.2, 1.35, 13.0);

    // 5. LEDs Brancos e Resistores dos 6 Postes na Protoboard Central (X = 2.4 a 4.9)
    this.breadboardSmartLeds = [];
    this.breadboardConvLeds = [];
    this.breadboardLedLights = [];

    const smartColors = [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x3b82f6, 0xa855f7];
    for (let i = 0; i < 6; i++) {
      const lx = 2.1 + i * 0.58;
      const lz = 12.1;

      // Resistor 220 ohms
      const res = this.createThroughHoleResistor([0xef4444, 0xef4444, 0x78350f, 0xeab308]);
      res.rotation.y = Math.PI / 2;
      res.position.set(lx, 1.28, 13.3);
      this.techBayGroup.add(res);

      // LED Branco 5mm de monitoramento de cada poste na protoboard
      const ledObj = this.create5mmLedMesh(0xffffff);
      ledObj.group.position.set(lx, 1.22, lz);
      this.techBayGroup.add(ledObj.group);
      this.breadboardSmartLeds.push(ledObj.material);
      this.breadboardLedLights.push(ledObj.light);

      // Fio jumper saindo do Arduino Nano para o resistor do LED na protoboard
      const nanoPinPos = new THREE.Vector3(-7.6 + i * 0.42, 1.45, 12.25);
      this.createRealisticJumperWire(
        nanoPinPos,
        new THREE.Vector3(lx, 1.25, 13.8),
        smartColors[i],
        1.1 + (i % 3) * 0.25
      );

      // Fio jumper saindo da protoboard até a canaleta subterrânea rumo ao Poste de PVC e Sensor IR correspondente
      const ductEntryPos = new THREE.Vector3(lx, 1.25, 11.2);
      const irSensorTerminal = new THREE.Vector3(this.polePositionsX[i], 0.95, 3.35);
      this.createRealisticJumperWire(
        ductEntryPos,
        irSensorTerminal,
        smartColors[i],
        0.55 + (i % 2) * 0.2
      );
    }

    // 6. MINI PROTOBOARD DO SENSOR LDR + RODA DE LUZ (em X = -15.5, Z = 13.0)
    this.buildLdrSensorAndWheelModule(-15.5, 0.85, 13.0);

    // 7. FONTE DE ALIMENTAÇÃO REGULADA (Módulo Fonte Protoboard MB102 + Fonte DC 12V/9V com Plug P4 em X = +13.5, Z = 13.0)
    this.buildPowerSupplyModule(13.5, 0.85, 13.0);

    this.scene.add(this.techBayGroup);
  }

  /**
   * Constrói o ARDUINO NANO (ATmega328P) com riqueza de detalhes na protoboard:
   * PCB Azul Clássico, MCU ATmega328P rotacionado a 45°, Cristal 16MHz, Conector Mini-USB metálico,
   * Botão de Reset central, header ICSP de 6 pinos, 30 pinos serigrafados (D2-D12, A0-A7, 5V, GND, VIN) e LEDs ON/L/TX/RX.
   */
  buildArduinoNanoOnBreadboard(x, y, z) {
    const nanoGroup = new THREE.Group();
    nanoGroup.position.set(x, y, z);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // PCB Azul Arduino Oficial (#005c99)
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 248);

    // Serigrafia dos 30 pinos do Arduino Nano
    const topPins = ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'GND', 'RST', 'RX0', 'TX1'];
    const botPins = ['D13', '3V3', 'REF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', '5V', 'RST', 'GND', 'VIN'];

    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < 15; i++) {
      const px = 42 + i * 30.5;
      // Ilhas douradas
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.arc(px, 22, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px, 234, 8, 0, Math.PI * 2); ctx.fill();
      // Texto branco
      ctx.fillStyle = '#ffffff';
      ctx.fillText(topPins[i], px, 48);
      ctx.fillText(botPins[i], px, 212);
    }

    // Logo Arduino Nano no centro da PCB
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('ARDUINO', 295, 115);
    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('NANO V3.0', 295, 145);

    const pcbTex = new THREE.CanvasTexture(canvas);
    const pcbMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.16, 1.95),
      new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.35, metalness: 0.15 })
    );
    pcbMesh.castShadow = true;
    nanoGroup.add(pcbMesh);

    // Microcontrolador ATmega328P TQFP-32 (rotacionado a 45 graus como no Arduino Nano real)
    const atmega = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.14, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.35 })
    );
    atmega.rotation.y = Math.PI / 4;
    atmega.position.set(-0.35, 0.14, 0);
    nanoGroup.add(atmega);

    // Conector Mini-USB prateado na extremidade esquerda
    const miniUsb = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.34, 0.78),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 })
    );
    miniUsb.position.set(-2.15, 0.22, 0);
    nanoGroup.add(miniUsb);

    // Botão de Reset tátil branco/prata
    const rstBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    rstBtn.position.set(0.65, 0.16, 0);
    nanoGroup.add(rstBtn);

    // LEDs SMD do Arduino Nano (ON verde, PWM/L amarelo, TX/RX azul)
    const ledOn = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    ledOn.position.set(-1.3, 0.13, 0.35);
    nanoGroup.add(ledOn);

    const ledL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    ledL.position.set(-1.3, 0.13, -0.35);
    nanoGroup.add(ledL);

    // Etiqueta flutuante identificando o Arduino Nano
    const tagNano = this.createPcbTextLabel('ARDUINO NANO (ATmega328P)');
    tagNano.scale.set(0.75, 0.75, 0.75);
    tagNano.position.set(0, 0.25, 1.55);
    nanoGroup.add(tagNano);

    this.techBayGroup.add(nanoGroup);
    this.arduinoNanoGroup = nanoGroup;
  }

  /**
   * Constrói a placa ESP32 DevKit ao lado na mesma Protoboard (compatibilidade total com modo Wokwi/ESP32)
   */
  buildEsp32OnBreadboard(x, y, z) {
    const espGroup = new THREE.Group();
    espGroup.position.set(x, y, z);

    const pcbMesh = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.16, 1.95),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.2 })
    );
    pcbMesh.castShadow = true;
    espGroup.add(pcbMesh);

    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.22, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.22 })
    );
    shield.position.set(-0.35, 0.18, 0);
    espGroup.add(shield);

    const ledPwr = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    ledPwr.position.set(1.1, 0.14, 0.4);
    espGroup.add(ledPwr);

    const tagEsp = this.createPcbTextLabel('MÓDULO ESP32 TELEMETRIA');
    tagEsp.scale.set(0.68, 0.68, 0.68);
    tagEsp.position.set(0, 0.25, 1.55);
    espGroup.add(tagEsp);

    this.techBayGroup.add(espGroup);
    this.esp32Group = espGroup;
  }

  /**
   * Constrói a Mini Protoboard com Sensor LDR + Roda de Ajuste 3D (Trimpot) para simular Dia/Noite
   */
  buildLdrSensorAndWheelModule(x, y, z) {
    const miniBb = this.createBreadboardMesh(5.6, 5.2, false);
    miniBb.position.set(x, y, z);
    this.techBayGroup.add(miniBb);

    const ldrGroup = new THREE.Group();
    ldrGroup.position.set(x, y + 0.42, z);

    // PCB Azul do Módulo LDR
    const ldrPcb = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.16, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 })
    );
    ldrPcb.castShadow = true;
    ldrGroup.add(ldrPcb);

    // Fotoresistor LDR elevado
    const ldrHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.22, 20),
      new THREE.MeshStandardMaterial({ color: 0xb45309, emissive: 0xf59e0b, emissiveIntensity: 0.35, roughness: 0.25 })
    );
    ldrHead.position.set(0, 0.55, -1.15);
    ldrGroup.add(ldrHead);

    this.ldrIndicatorLight = new THREE.PointLight(0xf59e0b, 0.8, 5);
    this.ldrIndicatorLight.position.set(0, 1.1, -1.15);
    ldrGroup.add(this.ldrIndicatorLight);

    // Roda / Trimpot de Ajuste de Luminosidade (clicável pela Mão 3D)
    const dialCanvas = document.createElement('canvas');
    dialCanvas.width = 256;
    dialCanvas.height = 256;
    const dctx = dialCanvas.getContext('2d');
    dctx.fillStyle = '#0f172a';
    dctx.beginPath(); dctx.arc(128, 128, 120, 0, Math.PI * 2); dctx.fill();
    dctx.strokeStyle = '#38bdf8'; dctx.lineWidth = 6; dctx.stroke();
    dctx.fillStyle = '#38bdf8'; dctx.font = 'bold 24px sans-serif'; dctx.textAlign = 'center';
    dctx.fillText('NOITE', 56, 185);
    dctx.fillStyle = '#eab308';
    dctx.fillText('DIA', 200, 185);

    const dialPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 2.1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(dialCanvas), transparent: true })
    );
    dialPlate.rotation.x = -Math.PI / 2;
    dialPlate.position.set(0, 0.14, 0.55);
    ldrGroup.add(dialPlate);

    this.lightWheelKnob = new THREE.Group();
    this.lightWheelKnob.position.set(0, 0.18, 0.55);

    const knobBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.72, 0.48, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.5 })
    );
    knobBody.position.y = 0.24;
    this.lightWheelKnob.add(knobBody);

    const notch = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.52),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    notch.position.set(0, 0.50, -0.28);
    this.lightWheelKnob.add(notch);

    const wheelWorldPos = new THREE.Vector3(x, y + 0.9, z + 0.55);
    this.lightWheelWorldPos = wheelWorldPos;
    this.lightWheelKnob.userData = { isLightWheel: true, worldTargetPos: wheelWorldPos };
    knobBody.userData = { isLightWheel: true };
    notch.userData = { isLightWheel: true };

    ldrGroup.add(this.lightWheelKnob);

    const tagLdr = this.createPcbTextLabel('SENSOR LDR (LUZ AMBIENTE)');
    tagLdr.scale.set(0.68, 0.68, 0.68);
    tagLdr.position.set(0, 0.1, 2.8);
    ldrGroup.add(tagLdr);

    this.techBayGroup.add(ldrGroup);

    // Jumpers conectando o módulo LDR ao pino A0 do Arduino Nano (Amarelo), 5V (Vermelho) e GND (Preto)
    this.createRealisticJumperWire(
      new THREE.Vector3(x + 1.2, 1.25, z),
      new THREE.Vector3(-7.2, 1.45, 13.75),
      0xfacc15,
      1.6
    );
    this.createRealisticJumperWire(
      new THREE.Vector3(x + 1.2, 1.25, z + 0.4),
      new THREE.Vector3(-5.8, 1.45, 13.75),
      0xef4444,
      1.4
    );
  }

  /**
   * Constrói a FONTE DE ALIMENTAÇÃO (Fonte Chaveada 9V/12V + Regulador 5V MB102 com Jack P4, Capacitor Eletrolítico e LED Power)
   */
  buildPowerSupplyModule(x, y, z) {
    const pwrGroup = new THREE.Group();
    pwrGroup.position.set(x, y, z);

    // Carcaça da Fonte de Alimentação Externa (Caixa preta com ventilação e etiqueta 9V/12V 2A)
    const adapterBox = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 1.35, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.2 })
    );
    adapterBox.position.set(0, 0.68, 0);
    adapterBox.castShadow = true;
    pwrGroup.add(adapterBox);

    // Conector Barrel Jack P4 + Chave Liga/Desliga vermelha + Regulador 7805 com dissipador de alumínio
    const heatsink = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.9, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 })
    );
    heatsink.position.set(-1.4, 1.55, -0.6);
    pwrGroup.add(heatsink);

    // Dois capacitores eletrolíticos cilíndricos
    [-0.2, 0.65].forEach(cx => {
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.75, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.5, roughness: 0.3 })
      );
      cap.position.set(cx, 1.52, -0.6);
      pwrGroup.add(cap);
    });

    // Botão Switch Vermelho ON/OFF
    const powerSwitch = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.35, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    );
    powerSwitch.position.set(1.65, 1.42, 0.5);
    pwrGroup.add(powerSwitch);

    // LED Verde Indicador de Alimentação 5V Ativa
    const pwrLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    pwrLed.position.set(-1.6, 1.42, 0.85);
    pwrGroup.add(pwrLed);

    const tagPwr = this.createPcbTextLabel('FONTE DE ALIMENTAÇÃO (5V / 9V DC)');
    tagPwr.scale.set(0.75, 0.75, 0.75);
    tagPwr.position.set(0, 0.48, 2.8);
    pwrGroup.add(tagPwr);

    this.techBayGroup.add(pwrGroup);

    // Cabos de alimentação Positivo (Vermelho 5V) e Negativo (Preto GND) alimentando os barramentos da Protoboard Central
    this.createRealisticJumperWire(
      new THREE.Vector3(x - 2.2, 1.35, z - 0.5),
      new THREE.Vector3(5.2, 1.25, 10.9),
      0xef4444,
      1.6
    );
    this.createRealisticJumperWire(
      new THREE.Vector3(x - 2.2, 1.35, z + 0.5),
      new THREE.Vector3(5.2, 1.25, 15.1),
      0x09090b,
      1.5
    );
  }

  /**
   * 3B. CAIXA TRANSPARENTE REMOVÍVEL DE ACRÍLICO SOBRE A ÁREA TÉCNICA
   * Protege o Arduino Nano, a protoboard e a fonte de alimentação, permitindo visualizar o circuito nitidamente
   * e podendo ser suspensa/removida com um clique!
   */
  buildRemovableAcrylicCover() {
    this.acrylicCoverGroup = new THREE.Group();
    this.acrylicCoverGroup.position.set(0, 0.62, 13.0);

    const w = 44.2;
    const h = 4.2;
    const d = 7.8;

    // Material de Acrílico Cristal Cortado a Laser (transparente com reflexo especular realista)
    const acrylicMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.24,
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.65,
      reflectivity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), acrylicMat);
    boxMesh.position.set(0, h / 2, 0);
    boxMesh.userData = { isAcrylicCover: true };
    this.acrylicCoverGroup.add(boxMesh);

    // Bordas esverdeadas/azuladas de acrílico cortado a laser (LineSegments destacando a caixa)
    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 });
    const edgesWire = new THREE.LineSegments(edgesGeo, edgesMat);
    edgesWire.position.set(0, h / 2, 0);
    this.acrylicCoverGroup.add(edgesWire);

    // Alça superior em acrílico/alumínio escovado para levantar a tampa removível
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 });
    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.22, 0.45), handleMat);
    handleBar.position.set(0, h + 0.45, 0);
    handleBar.userData = { isAcrylicCover: true };
    this.acrylicCoverGroup.add(handleBar);

    [-1.8, 1.8].forEach(hx => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 12), handleMat);
      post.position.set(hx, h + 0.22, 0);
      this.acrylicCoverGroup.add(post);
    });

    // 4 Cantoneiras de encaixe com parafusos Allen nos cantos da caixa transparente
    [[-w / 2 + 0.4, -d / 2 + 0.4], [w / 2 - 0.4, -d / 2 + 0.4], [-w / 2 + 0.4, d / 2 - 0.4], [w / 2 - 0.4, d / 2 - 0.4]].forEach(([cx, cz]) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 12), handleMat);
      screw.position.set(cx, h + 0.05, cz);
      this.acrylicCoverGroup.add(screw);
    });

    this.scene.add(this.acrylicCoverGroup);
  }

  /**
   * Alterna a abertura/remoção da Caixa Transparente de Acrílico da Área Técnica
   */
  toggleAcrylicCover(forceState = null) {
    if (typeof forceState === 'boolean') {
      this.acrylicCoverOpen = forceState;
    } else {
      this.acrylicCoverOpen = !this.acrylicCoverOpen;
    }
    this.acrylicCoverTargetY = this.acrylicCoverOpen ? 7.5 : 0.62;
    return this.acrylicCoverOpen;
  }

  /**
   * 4. VEÍCULOS E PEDESTRES EM MINIATURA NA RUA DA MAQUETE (Detecção de Movimento Automática e Demonstrativa)
   */
  buildScaleVehiclesAndPedestrians() {
    this.miniActorsGroup = new THREE.Group();
    this.miniCars = [];
    this.miniPedestrians = [];

    // 1. Carro em Escala 1:43 (Mão Oeste -> Leste, Z = -0.15, trafegando sobre a faixa inferior da Protoboard-Rua)
    const car1 = this.createScaleCarMesh(0x0284c7, 1);
    car1.position.set(-18.0, 0.78, -0.15);
    this.miniActorsGroup.add(car1);
    this.miniCars.push({ mesh: car1, dir: 1, speed: 6.2, z: -0.15 });

    // 2. Carro em Escala 1:43 (Mão Leste -> Oeste, Z = -3.05, trafegando sobre a faixa superior da Protoboard-Rua)
    const car2 = this.createScaleCarMesh(0xe11d48, -1);
    car2.position.set(16.0, 0.78, -3.05);
    this.miniActorsGroup.add(car2);
    this.miniCars.push({ mesh: car2, dir: -1, speed: 5.4, z: -3.05 });

    // 3. Dois Pedestres em Escala nas calçadas da maquete
    const ped1 = this.createScalePedestrianMesh(0xf59e0b);
    ped1.position.set(-11.0, 0.78, 2.95);
    this.miniActorsGroup.add(ped1);
    this.miniPedestrians.push({ mesh: ped1, dir: 1, speed: 2.3, z: 2.95 });

    const ped2 = this.createScalePedestrianMesh(0x10b981);
    ped2.position.set(9.0, 0.78, -6.1);
    this.miniActorsGroup.add(ped2);
    this.miniPedestrians.push({ mesh: ped2, dir: -1, speed: 2.1, z: -6.1 });

    this.scene.add(this.miniActorsGroup);
  }

  createScaleCarMesh(colorHex, direction) {
    const car = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.25, metalness: 0.35 });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.15, metalness: 0.6 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.52, 1.32), bodyMat);
    chassis.position.y = 0.38;
    chassis.castShadow = true;
    car.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.45, 1.14), cabinMat);
    cabin.position.set(-0.1 * direction, 0.82, 0);
    cabin.castShadow = true;
    car.add(cabin);

    // 4 Rodas
    [[-0.82, -0.68], [0.82, -0.68], [-0.82, 0.68], [0.82, 0.68]].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 14), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.26, wz);
      car.add(wheel);
    });

    // Faróis dianteiros e lanternas traseiras
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    [-0.42, 0.42].forEach(lz => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.24), headLightMat);
      hl.position.set(1.36 * direction, 0.42, lz);
      car.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.24), tailLightMat);
      tl.position.set(-1.36 * direction, 0.42, lz);
      car.add(tl);
    });

    return car;
  }

  createScalePedestrianMesh(shirtColor) {
    const ped = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.3, 0.08, 14),
      new THREE.MeshStandardMaterial({ color: 0x64748b })
    );
    base.position.y = 0.04;
    ped.add(base);

    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.72, 12),
      new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.6 })
    );
    torso.position.y = 0.45;
    torso.castShadow = true;
    ped.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf1c2a2, roughness: 0.5 })
    );
    head.position.y = 0.98;
    head.castShadow = true;
    ped.add(head);

    return ped;
  }

  /**
   * Executa rapidamente uma das 3 situações demonstrativas pedidas:
   * - 'day': Durante o dia (iluminação dos postes desligada devido à luminosidade natural)
   * - 'night': Durante a noite em repouso (iluminação ativada automaticamente em 30%)
   * - 'motion': Na detecção de movimento (veículo/pedestre ativa sensores IR e eleva os postes próximos a 100%)
   */
  setDemonstrationState(mode) {
    this.demoMode = mode;
    if (mode === 'day') {
      this.autoTrafficEnabled = false;
      this.controller.resetAllPIRs();
      this.controller.setLdrValue(3600);
      window.dispatchEvent(new CustomEvent('maqueteLdrTurned', { detail: { value: 3600 } }));
    } else if (mode === 'night') {
      this.autoTrafficEnabled = false;
      this.controller.resetAllPIRs();
      this.controller.setLdrValue(450);
      window.dispatchEvent(new CustomEvent('maqueteLdrTurned', { detail: { value: 450 } }));
    } else if (mode === 'motion') {
      this.autoTrafficEnabled = true;
      if (this.controller.isDay) {
        this.controller.setLdrValue(450);
        window.dispatchEvent(new CustomEvent('maqueteLdrTurned', { detail: { value: 450 } }));
      }
      // Garante disparo imediato no poste central também para feedback instantâneo
      this.controller.triggerManualPIR(2, true);
    }
  }

  /**
   * Dispara uma passagem de veículo em escala na rua da maquete
   */
  triggerMiniCarPass() {
    this.autoTrafficEnabled = true;
    if (this.miniCars.length > 0) {
      this.miniCars[0].mesh.position.x = -21.0;
    }
  }

  /**
   * Constrói a Mão 3D interativa proporcional que aciona os sensores IR ou gira o ajuste do LDR
   */
  buildHandActor() {
    this.handGroup = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c2a2, roughness: 0.55, metalness: 0.02 });
    const palmMat = new THREE.MeshStandardMaterial({ color: 0xe8b598, roughness: 0.6 });

    const palm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 2.0), palmMat);
    palm.castShadow = true;
    this.handGroup.add(palm);

    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.62, 3.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 })
    );
    arm.rotation.x = Math.PI / 3.4;
    arm.position.set(0, 1.8, 1.9);
    arm.castShadow = true;
    this.handGroup.add(arm);

    const fingerGroup = new THREE.Group();
    fingerGroup.position.set(0.4, -0.12, -1.0);

    const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.95, 12), skinMat);
    f1.rotation.x = Math.PI / 3.8;
    f1.position.set(0, -0.35, -0.25);
    fingerGroup.add(f1);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 12), skinMat);
    tip.position.set(0, -0.72, -0.95);
    fingerGroup.add(tip);

    this.handGroup.add(fingerGroup);
    this.fingerTip = tip;

    this.handRestPos = new THREE.Vector3(-21.5, 8.2, 14.5);
    this.handGroup.position.copy(this.handRestPos);
    this.handGroup.rotation.set(-0.15, Math.PI / 4, 0);

    this.scene.add(this.handGroup);
  }

  clickButtonWithHand(targetIndex, onComplete = null) {
    if (this.isHandBusy) return;
    if (targetIndex < 0 || targetIndex >= this.buttons.length) return;

    this.isHandBusy = true;
    const sensor = this.buttons[targetIndex];
    const targetPos = sensor.userData.worldTargetPos;

    const startPos = this.handGroup.position.clone();
    const hoverPos = new THREE.Vector3(targetPos.x, 4.2, targetPos.z + 1.2);
    const pressPos = new THREE.Vector3(targetPos.x, 2.2, targetPos.z + 0.9);

    const startTime = performance.now();
    const moveDuration = 300;
    const pressDuration = 170;
    const holdDuration = 160;
    const liftDuration = 210;

    const animateHand = (time) => {
      const elapsed = time - startTime;

      if (elapsed < moveDuration) {
        const t = elapsed / moveDuration;
        const ease = t * t * (3 - 2 * t);
        this.handGroup.position.lerpVectors(startPos, hoverPos, ease);
        requestAnimationFrame(animateHand);
      } else if (elapsed < moveDuration + pressDuration) {
        const t = (elapsed - moveDuration) / pressDuration;
        this.handGroup.position.lerpVectors(hoverPos, pressPos, t * t);
        requestAnimationFrame(animateHand);
      } else if (elapsed < moveDuration + pressDuration + holdDuration) {
        if (!sensor.userData.isPressed) {
          sensor.userData.isPressed = true;
          this.controller.triggerManualPIR(targetIndex, true);
        }
        requestAnimationFrame(animateHand);
      } else if (elapsed < moveDuration + pressDuration + holdDuration + liftDuration) {
        const t = (elapsed - (moveDuration + pressDuration + holdDuration)) / liftDuration;
        this.handGroup.position.lerpVectors(pressPos, hoverPos, t);
        requestAnimationFrame(animateHand);
      } else {
        sensor.userData.isPressed = false;
        this.handGroup.position.copy(this.handRestPos);
        this.handGroup.rotation.set(-0.15, Math.PI / 4, 0);
        this.isHandBusy = false;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateHand);
  }

  adjustLightWheelWithHand(targetLdrVal = null, onComplete = null) {
    if (this.isHandBusy && !this.isTrackingAdc) return;

    if (targetLdrVal === null) {
      targetLdrVal = this.controller.isDay ? 450 : 3600;
    }
    const endVal = Math.max(0, Math.min(4095, targetLdrVal));

    this.isHandBusy = true;
    this.isRotatingWheel = true;

    const startVal = this.controller.ldrValue;
    const startHandPos = this.handGroup.position.clone();
    const wheelPos = this.lightWheelWorldPos || new THREE.Vector3(-15.5, 1.75, 13.55);

    const hoverPos = new THREE.Vector3(wheelPos.x, 4.8, wheelPos.z + 1.0);
    const gripPos = new THREE.Vector3(wheelPos.x, 2.6, wheelPos.z + 0.8);

    const startRatio = startVal / 4095;
    const endRatio = endVal / 4095;
    const startAngle = (0.5 - startRatio) * 3.6;
    const endAngle = (0.5 - endRatio) * 3.6;

    const startTime = performance.now();
    const tMove = 340;
    const tDescend = 200;
    const tTwist = 620;
    const tAscend = 220;
    const tReturn = 340;

    const animateRotation = (time) => {
      const elapsed = time - startTime;

      if (elapsed < tMove) {
        const t = elapsed / tMove;
        const ease = t * t * (3 - 2 * t);
        this.handGroup.position.lerpVectors(startHandPos, hoverPos, ease);
        requestAnimationFrame(animateRotation);
      } else if (elapsed < tMove + tDescend) {
        const t = (elapsed - tMove) / tDescend;
        this.handGroup.position.lerpVectors(hoverPos, gripPos, t * t);
        requestAnimationFrame(animateRotation);
      } else if (elapsed < tMove + tDescend + tTwist) {
        const t = (elapsed - (tMove + tDescend)) / tTwist;
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const currentVal = THREE.MathUtils.lerp(startVal, endVal, ease);
        this.controller.setLdrValue(currentVal);

        const currentAngle = THREE.MathUtils.lerp(startAngle, endAngle, ease);
        if (this.lightWheelKnob) this.lightWheelKnob.rotation.y = currentAngle;

        window.dispatchEvent(new CustomEvent('maqueteLdrTurned', { detail: { value: currentVal } }));
        requestAnimationFrame(animateRotation);
      } else if (elapsed < tMove + tDescend + tTwist + tAscend) {
        const t = (elapsed - (tMove + tDescend + tTwist)) / tAscend;
        this.controller.setLdrValue(endVal);
        if (this.lightWheelKnob) this.lightWheelKnob.rotation.y = endAngle;
        this.handGroup.position.lerpVectors(gripPos, hoverPos, t);
        requestAnimationFrame(animateRotation);
      } else if (elapsed < tMove + tDescend + tTwist + tAscend + tReturn) {
        const t = (elapsed - (tMove + tDescend + tTwist + tAscend)) / tReturn;
        const ease = t * t * (3 - 2 * t);
        this.handGroup.position.lerpVectors(hoverPos, this.handRestPos, ease);
        requestAnimationFrame(animateRotation);
      } else {
        this.handGroup.position.copy(this.handRestPos);
        this.handGroup.rotation.set(-0.15, Math.PI / 4, 0);
        this.isHandBusy = false;
        this.isRotatingWheel = false;
        this.controller.setLdrValue(endVal);
        this.updateLightWheelRotation(endVal);
        window.dispatchEvent(new CustomEvent('maqueteLdrTurned', { detail: { value: endVal } }));
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateRotation);
  }

  trackHandToAdcSlider(adcValue) {
    if (this.isHandBusy && !this.isTrackingAdc) return;

    this.isHandBusy = true;
    this.isTrackingAdc = true;

    if (this.adcReleaseTimer) {
      clearTimeout(this.adcReleaseTimer);
      this.adcReleaseTimer = null;
    }

    const wheelPos = this.lightWheelWorldPos || new THREE.Vector3(-15.5, 1.75, 13.55);
    const gripPos = new THREE.Vector3(wheelPos.x, 2.6, wheelPos.z + 0.8);
    const ratio = Math.max(0, Math.min(1, adcValue / 4095));
    const angle = (0.5 - ratio) * 3.6;

    this.handGroup.position.copy(gripPos);
    this.handAtKnob = true;

    if (this.lightWheelKnob) {
      this.lightWheelKnob.rotation.y = angle;
    }
  }

  scheduleReleaseHandAfterAdc(delayMs = 650) {
    if (this.adcReleaseTimer) clearTimeout(this.adcReleaseTimer);
    this.adcReleaseTimer = setTimeout(() => {
      this.stopHandAdcTracking();
    }, delayMs);
  }

  stopHandAdcTracking() {
    if (!this.isTrackingAdc) return;
    if (this.adcReleaseTimer) clearTimeout(this.adcReleaseTimer);

    this.handGroup.position.copy(this.handRestPos);
    this.handGroup.rotation.set(-0.15, Math.PI / 4, 0);
    this.isHandBusy = false;
    this.isTrackingAdc = false;
    this.handAtKnob = false;
  }

  updateLightWheelRotation(ldrValue) {
    if (!this.lightWheelKnob) return;
    const ratio = Math.max(0, Math.min(1, ldrValue / 4095));
    const angle = (0.5 - ratio) * 3.6;
    this.lightWheelKnob.rotation.y = angle;
  }

  startHandWalkSequence() {
    if (this.handWalkSequenceActive) return;
    this.handWalkSequenceActive = true;
    this.handWalkIndex = 0;

    const stepNext = () => {
      if (!this.handWalkSequenceActive) return;
      if (this.handWalkIndex >= 6) {
        this.handWalkSequenceActive = false;
        this.handGroup.position.copy(this.handRestPos);
        return;
      }

      this.clickButtonWithHand(this.handWalkIndex, () => {
        this.handWalkIndex++;
        this.handWalkTimer = setTimeout(stepNext, 480);
      });
    };

    stepNext();
  }

  stopHandWalkSequence() {
    this.handWalkSequenceActive = false;
    if (this.handWalkTimer) clearTimeout(this.handWalkTimer);
  }

  initInteraction() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      let isInteractive = false;
      for (let hit of intersects) {
        let current = hit.object;
        while (current && current !== this.scene) {
          if (
            current.userData &&
            (current.userData.isLightWheel ||
              current.userData.isPirSensor ||
              current.userData.isAcrylicCover ||
              typeof current.userData.index === 'number')
          ) {
            isInteractive = true;
            break;
          }
          current = current.parent;
        }
        if (isInteractive) break;
      }

      this.renderer.domElement.style.cursor = isInteractive ? 'pointer' : 'default';
    });

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      if (this.isHandBusy) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      for (let hit of intersects) {
        let current = hit.object;
        while (current && current !== this.scene) {
          if (current.userData && current.userData.isLightWheel) {
            const target = this.controller.isDay ? 450 : 3600;
            this.adjustLightWheelWithHand(target);
            return;
          }
          if (current.userData && (current.userData.isPirSensor || typeof current.userData.index === 'number')) {
            this.clickButtonWithHand(current.userData.index);
            return;
          }
          if (current.userData && current.userData.isAcrylicCover) {
            const opened = this.toggleAcrylicCover();
            window.dispatchEvent(new CustomEvent('acrylicCoverToggled', { detail: { open: opened } }));
            return;
          }
          current = current.parent;
        }
      }
    });
  }

  update(delta) {
    // 1. Animação suave da Caixa Transparente Removível de Acrílico
    if (this.acrylicCoverGroup) {
      this.acrylicCoverCurrentY = THREE.MathUtils.lerp(
        this.acrylicCoverGroup.position.y,
        this.acrylicCoverTargetY || 0.62,
        delta * 6.5
      );
      this.acrylicCoverGroup.position.y = this.acrylicCoverCurrentY;
    }

    // 2. Movimento dos Veículos e Pedestres em Miniatura na Rua da Maquete e Detecção Infravermelha (IR)
    if (this.autoTrafficEnabled) {
      const zoneDetected = [false, false, false, false, false, false];

      this.miniCars.forEach(car => {
        car.mesh.position.x += car.dir * car.speed * delta;
        if (car.dir === 1 && car.mesh.position.x > 22.5) car.mesh.position.x = -22.5;
        if (car.dir === -1 && car.mesh.position.x < -22.5) car.mesh.position.x = 22.5;

        for (let i = 0; i < 6; i++) {
          if (Math.abs(car.mesh.position.x - this.polePositionsX[i]) < 3.1) {
            zoneDetected[i] = true;
          }
        }
      });

      this.miniPedestrians.forEach(ped => {
        ped.mesh.position.x += ped.dir * ped.speed * delta;
        if (ped.dir === 1 && ped.mesh.position.x > 21.5) ped.mesh.position.x = -21.5;
        if (ped.dir === -1 && ped.mesh.position.x < -21.5) ped.mesh.position.x = 21.5;

        for (let i = 0; i < 6; i++) {
          if (Math.abs(ped.mesh.position.x - this.polePositionsX[i]) < 2.2) {
            zoneDetected[i] = true;
          }
        }
      });

      for (let i = 0; i < 6; i++) {
        this.controller.setActorPresence(i, zoneDetected[i]);
      }
    }

    // 3. Atualização dos 6 Postes de PVC (LEDs Brancos + Cones + PointLights) e Sensores IR
    for (let i = 0; i < 6; i++) {
      const pwm = this.controller.smartPolesPWM[i];
      const isIrActive = this.controller.pirState[i];

      const poleLedMat = this.palitoLeds[i];
      const poleLight = this.palitoPointLights[i];
      const coneMat = this.poleCones[i];
      const bbLedMat = this.breadboardSmartLeds[i];
      const bbLedLight = this.breadboardLedLights[i];

      let emissiveHex = 0x1e293b;
      let emissiveIntensity = 0.0;
      let lightIntensity = 0.0;
      let coneOpacity = 0.0;
      let lightColorHex = 0xffffff;

      if (pwm >= 90) {
        // 100% - Intensidade Máxima (Detecção de Movimento próxima!)
        emissiveHex = 0xffffff;
        emissiveIntensity = 3.5;
        lightIntensity = 3.2;
        coneOpacity = 0.16;
        lightColorHex = 0xffffff;
      } else if (pwm >= 50) {
        // 60% - Intensidade Vizinho
        emissiveHex = 0xe0f2fe;
        emissiveIntensity = 1.9;
        lightIntensity = 1.7;
        coneOpacity = 0.09;
        lightColorHex = 0xf0f9ff;
      } else if (pwm > 0) {
        // 30% - Iluminação Noturna Base / Economia
        emissiveHex = 0xbae6fd;
        emissiveIntensity = 0.85;
        lightIntensity = 0.65;
        coneOpacity = 0.045;
        lightColorHex = 0xe0f2fe;
      } else {
        // 0% - Durante o Dia (Desligado)
        emissiveHex = 0x334155;
        emissiveIntensity = 0.0;
        lightIntensity = 0.0;
        coneOpacity = 0.0;
      }

      if (poleLedMat) {
        poleLedMat.emissive.setHex(emissiveHex);
        poleLedMat.emissiveIntensity = emissiveIntensity;
      }
      if (poleLight) {
        poleLight.intensity = THREE.MathUtils.lerp(poleLight.intensity, lightIntensity, delta * 10.0);
        poleLight.color.setHex(lightColorHex);
      }
      if (coneMat) {
        coneMat.opacity = THREE.MathUtils.lerp(coneMat.opacity, coneOpacity, delta * 10.0);
      }
      if (bbLedMat) {
        bbLedMat.emissive.setHex(emissiveHex);
        bbLedMat.emissiveIntensity = emissiveIntensity * 0.9;
      }
      if (bbLedLight) {
        bbLedLight.intensity = THREE.MathUtils.lerp(bbLedLight.intensity, lightIntensity * 0.45, delta * 10.0);
      }

      // Atualiza feixe e LED do Sensor Infravermelho (IR) na calçada
      const irBeam = this.irBeamLines[i];
      if (irBeam) {
        irBeam.color.setHex(isIrActive ? 0xf59e0b : 0x38bdf8);
        irBeam.opacity = isIrActive ? 0.65 : 0.18;
      }
      const irMod = this.irSensorModules[i];
      if (irMod && irMod.userData && irMod.userData.statusLedMat) {
        irMod.userData.statusLedMat.emissiveIntensity = isIrActive ? 2.5 : 0.15;
      }
    }

    // 4. Transição Dia / Noite na Iluminação de Estúdio e nas Janelas dos Edifícios da Maquete
    const ldrRatio = this.controller.ldrValue / 4095;
    this.deskLamp.intensity = THREE.MathUtils.lerp(0.28, 2.35, ldrRatio);
    this.ambientLight.intensity = THREE.MathUtils.lerp(0.38, 1.15, ldrRatio);

    // Cor de fundo neutra de estúdio (mais clara durante o dia, cinza-azulado neutro durante a noite para destacar os LEDs)
    this.scene.background.lerpColors(this.studioNightColor, this.studioDayColor, ldrRatio);
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.scene.background);
    }

    // Janelas das casas e edifícios acendem suavemente à noite
    const winEmissive = this.controller.isDay ? 0.05 : 0.55;
    this.buildingWindows.forEach(wMat => {
      wMat.emissiveIntensity = THREE.MathUtils.lerp(wMat.emissiveIntensity, winEmissive, delta * 5.0);
    });

    if (this.ldrIndicatorLight) {
      this.ldrIndicatorLight.intensity = THREE.MathUtils.lerp(0.15, 1.25, ldrRatio);
    }

    if (!this.isRotatingWheel && !this.isTrackingAdc) {
      this.updateLightWheelRotation(this.controller.ldrValue);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Presets de Câmera da Maquete 3D Acadêmica
   */
  setCameraPreset(presetName) {
    switch (presetName) {
      case 'esp32':
      case 'nano':
        // Foco na Área Técnica (Arduino Nano + Protoboard + Fonte + Caixa Transparente)
        this.camera.position.set(-2.5, 11.5, 25.5);
        this.controls.target.set(-2.5, 1.2, 13.0);
        break;
      case 'pirs':
      case 'botoes':
        // Foco nos Sensores Infravermelhos (IR) e Faixa de Pedestres na Rua
        this.camera.position.set(0, 11.5, 14.5);
        this.controls.target.set(0, 1.0, 1.5);
        break;
      case 'ldr':
        // Foco no Módulo Sensor LDR e Roda de Luz
        this.camera.position.set(-15.5, 9.5, 22.5);
        this.controls.target.set(-15.5, 1.2, 13.0);
        break;
      case 'leds':
        // Foco na Fonte de Alimentação e Barramento de LEDs/Resistores
        this.camera.position.set(9.0, 10.5, 23.5);
        this.controls.target.set(7.5, 1.2, 13.0);
        break;
      case 'palitos':
      case 'postes':
        // Perspectiva ao longo dos Postes de PVC e Casas da Rua Inteligente
        this.camera.position.set(-26.5, 11.0, 6.5);
        this.controls.target.set(2.0, 3.2, -2.5);
        break;
      case 'top':
        // Vista Superior Ortogonal da Maquete Completa
        this.camera.position.set(0, 48, 2.5);
        this.controls.target.set(0, 0, 2.0);
        break;
      default:
        // Vista Isométrica em Perspectiva Completa de Estúdio
        this.camera.position.set(28, 27, 34);
        this.controls.target.set(0, 1.8, 1.5);
        break;
    }
  }

  createBreadboardMesh(width, depth, isDark = false) {
    const bbGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x27272a : 0xf8fafc,
      roughness: 0.4,
      metalness: 0.05
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.55, depth), bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    bbGroup.add(body);

    const railMatRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const railMatBlue = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

    [-depth / 2 + 0.35, depth / 2 - 0.35].forEach(rz => {
      const redLine = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.92, 0.08), railMatRed);
      redLine.rotation.x = -Math.PI / 2;
      redLine.position.set(0, 0.28, rz - 0.12);
      bbGroup.add(redLine);

      const blueLine = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.92, 0.08), railMatBlue);
      blueLine.rotation.x = -Math.PI / 2;
      blueLine.position.set(0, 0.28, rz + 0.12);
      bbGroup.add(blueLine);
    });

    return bbGroup;
  }

  createThroughHoleResistor(bandColors) {
    const rGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2d4b7, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.72, 12), bodyMat);
    body.rotation.z = Math.PI / 2;
    rGroup.add(body);

    const bandPositions = [-0.2, -0.06, 0.06, 0.22];
    for (let b = 0; b < 4; b++) {
      const bandMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: bandColors[b], roughness: 0.2 })
      );
      bandMesh.rotation.z = Math.PI / 2;
      bandMesh.position.set(bandPositions[b], 0, 0);
      rGroup.add(bandMesh);
    }

    return rGroup;
  }

  create5mmLedMesh(colorHex) {
    const ledGroup = new THREE.Group();

    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.92
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.35, 16), ledMat);
    body.position.set(0, 0.22, 0);
    ledGroup.add(body);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), ledMat);
    dome.position.set(0, 0.39, 0);
    ledGroup.add(dome);

    const pointLight = new THREE.PointLight(colorHex, 0.0, 3.5, 2.0);
    pointLight.position.set(0, 0.55, 0);
    ledGroup.add(pointLight);

    return { group: ledGroup, material: ledMat, light: pointLight };
  }

  createRealisticJumperWire(start, end, hexColor, arcElevation = 1.4) {
    const wireGroup = new THREE.Group();

    const dupontMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const collarGeo = new THREE.BoxGeometry(0.18, 0.36, 0.18);

    const collarStart = new THREE.Mesh(collarGeo, dupontMat);
    collarStart.position.set(start.x, start.y + 0.12, start.z);
    wireGroup.add(collarStart);

    const collarEnd = new THREE.Mesh(collarGeo, dupontMat);
    collarEnd.position.set(end.x, end.y + 0.12, end.z);
    wireGroup.add(collarEnd);

    const p0 = new THREE.Vector3(start.x, start.y + 0.28, start.z);
    const p1 = new THREE.Vector3(start.x, start.y + 0.28 + arcElevation, start.z);
    const p2 = new THREE.Vector3(end.x, end.y + 0.28 + arcElevation, end.z);
    const p3 = new THREE.Vector3(end.x, end.y + 0.28, end.z);

    const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
    const tubeGeo = new THREE.TubeGeometry(curve, 22, 0.05, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.35, metalness: 0.08 });
    const wireTube = new THREE.Mesh(tubeGeo, tubeMat);
    wireTube.castShadow = true;
    wireGroup.add(wireTube);

    this.scene.add(wireGroup);
    this.jumperWires.push(wireGroup);
    return wireGroup;
  }

  createPcbTextLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, 512, 112);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 104);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 66);

    const tex = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.75),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.MaquetePhysicalScene = MaquetePhysicalScene;
