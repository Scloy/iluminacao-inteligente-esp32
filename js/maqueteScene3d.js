/**
 * Simulador 3D da Maquete Física (Bancada Maker / Protótipo ESP32)
 * Reprodução foto-realista 1:1 com fidelidade total à pinagem e fotos do Wokwi:
 * - Placa ESP32 DevKit V1 com serigrafia completa de todos os 30 pinos (3V3, EN, VP... GND, VIN)
 * - Fios jumpers coloridos encaixados com precisão cirúrgica em cada pino correspondente:
 *     * Lado Esquerdo: 3V3 e VP no LDR; D34 a D26 nos 6 PIRs; GND e VIN na alimentação
 *     * Lado Direito: GND no barramento de catodos; D23, D22, D21, D19, D18, D5 nos LEDs inteligentes;
 *                     D17, D16, D4, D2, D15, D13 nos LEDs convencionais
 * - Terminais Dupont pretos nos pontos de inserção nas protoboards e headers
 * - Mão 3D proceduralmente aprimorada: anatomia com antebraço proporcional, repouso elegante e
 *   ajuste em tempo real da roda de luz sincronizado ao slider de leitura de ADC
 */

class MaquetePhysicalScene {
  constructor(containerId, controller) {
    this.container = document.getElementById(containerId);
    this.controller = controller;

    this.buttons = []; // 6 Sensores PIR clicáveis
    this.breadboardSmartLeds = [];
    this.breadboardConvLeds = [];
    this.breadboardLedLights = [];
    this.palitoLeds = [];
    this.palitoPointLights = [];
    this.jumperWires = [];
    this.espPins = {}; // Dicionário de coordenadas 3D exatas dos 30 pinos

    this.isHandBusy = false;
    this.isRotatingWheel = false;
    this.isTrackingAdc = false;
    this.handAtKnob = false;
    this.adcReleaseTimer = null;

    this.handWalkSequenceActive = false;
    this.handWalkIndex = 0;
    this.handWalkTimer = null;

    this.initThree();
    this.initLighting();
    this.buildWorkbench();
    this.buildEsp32Board();
    this.buildBreadboardsAndCircuits();
    this.buildPalitoStreetPoles();
    this.buildHandActor();
    this.initInteraction();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c101b);

    this.camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      250
    );
    this.camera.position.set(0, 25, 28);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 65;
    this.controls.target.set(0, 1.2, 1.5);
  }

  initLighting() {
    this.ambientLight = new THREE.AmbientLight(0xdbeafe, 0.48);
    this.scene.add(this.ambientLight);

    this.deskLamp = new THREE.SpotLight(0xfffbeb, 2.5);
    this.deskLamp.position.set(-12, 32, 15);
    this.deskLamp.target.position.set(0, 0, 1.5);
    this.deskLamp.angle = Math.PI / 3.0;
    this.deskLamp.penumbra = 0.45;
    this.deskLamp.castShadow = true;
    this.deskLamp.shadow.mapSize.width = 2048;
    this.deskLamp.shadow.mapSize.height = 2048;
    this.deskLamp.shadow.bias = -0.0005;
    this.scene.add(this.deskLamp);
    this.scene.add(this.deskLamp.target);

    this.fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    this.fillLight.position.set(18, 20, -14);
    this.scene.add(this.fillLight);
  }

  buildWorkbench() {
    const tableGeo = new THREE.BoxGeometry(64, 2, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.65,
      metalness: 0.05
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, -1, 0);
    table.receiveShadow = true;
    this.scene.add(table);

    const matCanvas = document.createElement('canvas');
    matCanvas.width = 1024; matCanvas.height = 1024;
    const ctx = matCanvas.getContext('2d');
    ctx.fillStyle = '#114227';
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 1024; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 1024);
      ctx.moveTo(0, i); ctx.lineTo(1024, i);
      ctx.stroke();
    }
    ctx.strokeStyle = '#52b788';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 1024; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 1024);
      ctx.moveTo(0, i); ctx.lineTo(1024, i);
      ctx.stroke();
    }

    ctx.fillStyle = '#74c69d';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('ESP32 PROTOTYPE LAB • WOKWI HARDWARE EMULATION', 80, 50);
    ctx.fillText('PINAGEM EXATA: ESP-WROOM-32 DEVKIT V1 (30 PINOS)', 80, 990);

    const matTexture = new THREE.CanvasTexture(matCanvas);
    const matGeo = new THREE.PlaneGeometry(48, 34);
    const matMeshMat = new THREE.MeshStandardMaterial({ map: matTexture, roughness: 0.55 });
    const matMesh = new THREE.Mesh(matGeo, matMeshMat);
    matMesh.rotation.x = -Math.PI / 2;
    matMesh.position.set(0, 0.02, 0);
    matMesh.receiveShadow = true;
    this.scene.add(matMesh);
  }

  /**
   * Constrói a Placa ESP32 DevKit V1 foto-realista com fidelidade total à foto do Wokwi:
   * - PCB preta com serigrafia completa de todos os 30 pinos (3V3, EN, VP... GND, VIN)
   * - Blindagem Metálica RF com textura fotorrealista gravada a laser com texto ESP32 e logo Espressif
   * - Antena Meandro de Cobre/Ouro no topo (MIFA) com vias douradas
   * - Chip USB CP2102 em 3D com terminais prateados, regulador AMS1117, capacitores de tântalo amarelos
   * - Botões táteis EN e BOOT com carcaça metálica e serigrafia branca
   * - Conector Micro-USB 3D centralizado na base
   * - Barras de header de 15 pinos em cada lateral com contatos dourados
   * - Dicionário global this.espPins com as coordenadas 3D exatas para inserção dos fios
   */
  buildEsp32Board() {
    const espGroup = new THREE.Group();
    // Centralizada entre as protoboards: x = 0, y = 0.62, z = 2.4
    espGroup.position.set(0, 0.62, 2.4);

    const pcbWidth = 3.4;
    const pcbLength = 6.8;
    const pcbHeight = 0.22;

    const leftPinNames = ['3V3', 'EN', 'VP', 'VN', '34', '35', '32', '33', '25', '26', '27', '14', '12', 'GND', 'VIN'];
    const rightPinNames = ['GND', '23', '22', 'TX', 'RX', '21', '19', '18', '5', '17', '16', '4', '2', '15', '13'];

    // 1. Textura procedural do ESP32 com serigrafia completa
    const espTexCanvas = document.createElement('canvas');
    espTexCanvas.width = 1024; espTexCanvas.height = 2048;
    const ctx = espTexCanvas.getContext('2d');

    // Fundo PCB preto fosco (#121316)
    ctx.fillStyle = '#121316';
    ctx.fillRect(0, 0, 1024, 2048);

    // Borda serigrafada branca fina
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 5;
    ctx.strokeRect(36, 36, 952, 1976);

    // Antena Meandro de Cobre/Ouro no topo (Área escura com cantos arredondados)
    ctx.fillStyle = '#1a202c';
    ctx.beginPath();
    ctx.roundRect(140, 48, 744, 260, 24);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Traços de cobre meandro da antena Wi-Fi
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 16;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(190, 110);
    ctx.lineTo(830, 110);
    ctx.lineTo(830, 175);
    ctx.lineTo(260, 175);
    ctx.lineTo(260, 240);
    ctx.lineTo(830, 240);
    ctx.stroke();

    // Vias douradas na antena
    [190, 830].forEach(vx => {
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.arc(vx, 110, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(vx, 110, 6, 0, Math.PI * 2); ctx.fill();
    });

    // Marcação serigráfica da carcaça de blindagem RF
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(170, 340, 684, 680);

    // Linhas decorativas de circuito impresso (Traces)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(340, 1050); ctx.lineTo(340, 1200); ctx.lineTo(440, 1200);
    ctx.moveTo(680, 1050); ctx.lineTo(680, 1200); ctx.lineTo(580, 1200);
    ctx.stroke();

    // Silkscreen "ESP32 DEVKIT V1" em branco
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DOIT ESP32 DEVKIT V1', 512, 1080);

    // Silkscreen dos botões EN e BOOT
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EN', 340, 1850);
    ctx.fillText('BOOT', 684, 1850);

    // Silkscreen da porta USB
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('MICRO-USB', 512, 1820);

    // Serigrafia dos 30 Pinos com ilhas douradas e nomes nítidos e desobstruídos
    const pinStartY = 280;
    const pinSpacingY = 108;

    for (let i = 0; i < 15; i++) {
      const y = pinStartY + i * pinSpacingY;

      // Ilha dourada esquerda
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.arc(72, y, 32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(72, y, 16, 0, Math.PI * 2); ctx.fill();

      // Texto do pino esquerdo (Branco nítido, posicionado com espaçamento ideal)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(leftPinNames[i], 165, y + 12);

      // Ilha dourada direita
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.arc(952, y, 32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(952, y, 16, 0, Math.PI * 2); ctx.fill();

      // Texto do pino direito (Branco nítido, posicionado com espaçamento ideal)
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(rightPinNames[i], 859, y + 12);
    }

    const espTexture = new THREE.CanvasTexture(espTexCanvas);

    // 2. Mesh principal da PCB
    const pcbGeo = new THREE.BoxGeometry(pcbWidth, pcbHeight, pcbLength);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: espTexture,
      roughness: 0.35,
      metalness: 0.15
    });
    const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.castShadow = true;
    espGroup.add(pcbMesh);

    // 3. Blindagem Metálica 3D com textura gráfica gravada a laser (ESP-WROOM-32)
    const shieldCanvas = document.createElement('canvas');
    shieldCanvas.width = 512; shieldCanvas.height = 512;
    const sctx = shieldCanvas.getContext('2d');

    // Gradiente de metal escovado
    const sGrad = sctx.createLinearGradient(0, 0, 512, 512);
    sGrad.addColorStop(0.0, '#cbd5e1');
    sGrad.addColorStop(0.3, '#94a3b8');
    sGrad.addColorStop(0.7, '#e2e8f0');
    sGrad.addColorStop(1.0, '#64748b');
    sctx.fillStyle = sGrad;
    sctx.fillRect(0, 0, 512, 512);

    // Borda metálica chanfrada com abas de solda
    sctx.strokeStyle = '#475569';
    sctx.lineWidth = 14;
    sctx.strokeRect(16, 16, 480, 480);

    // Abas de solda nos 4 lados
    sctx.fillStyle = '#334155';
    [100, 256, 412].forEach(pos => {
      sctx.fillRect(pos - 15, 6, 30, 20);
      sctx.fillRect(pos - 15, 486, 30, 20);
      sctx.fillRect(6, pos - 15, 20, 30);
      sctx.fillRect(486, pos - 15, 20, 30);
    });

    // Texto ESP32 em destaque exatamente como na foto
    sctx.fillStyle = '#1e293b';
    sctx.font = 'bold 74px sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText('ESP32', 256, 120);

    // Ícone da onda/flor Espressif (3 arcos concêntricos)
    sctx.strokeStyle = '#334155';
    sctx.lineWidth = 12;
    sctx.beginPath();
    sctx.arc(256, 220, 65, 0, Math.PI * 1.55);
    sctx.stroke();
    sctx.lineWidth = 9;
    sctx.beginPath();
    sctx.arc(256, 220, 42, Math.PI * 0.45, Math.PI * 2);
    sctx.stroke();
    sctx.lineWidth = 6;
    sctx.beginPath();
    sctx.arc(256, 220, 20, 0, Math.PI * 1.5);
    sctx.stroke();

    // Texto do módulo e certificações
    sctx.font = 'bold 36px sans-serif';
    sctx.fillText('ESP-WROOM-32', 256, 330);
    sctx.font = '24px monospace';
    sctx.fillText('Wi-Fi + BLE SoC', 256, 375);
    sctx.font = '18px monospace';
    sctx.fillText('FCC ID: 2AC7Z-ESPWROOM32', 256, 430);
    sctx.fillText('CE 1313', 256, 460);

    const shieldTex = new THREE.CanvasTexture(shieldCanvas);
    const shieldGeo = new THREE.BoxGeometry(2.18, 0.26, 2.36);
    const shieldMats = [
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 }), // dir
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 }), // esq
      new THREE.MeshStandardMaterial({ map: shieldTex, metalness: 0.85, roughness: 0.25 }),   // topo
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.25 }), // base
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 }), // frente
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 })  // tras
    ];
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMats);
    shieldMesh.position.set(0, 0.24, -1.1);
    shieldMesh.castShadow = true;
    espGroup.add(shieldMesh);

    // 4. Componentes SMD em Relevo 3D
    // Chip USB CP2102
    const cp2102Mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.16, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.1 })
    );
    cp2102Mesh.position.set(0, 0.18, 0.8);
    cp2102Mesh.castShadow = true;
    espGroup.add(cp2102Mesh);

    // Regulador de Tensão AMS1117 3.3V
    const regMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.16, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    regMesh.position.set(0, 0.18, 1.6);
    espGroup.add(regMesh);

    const regTab = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.08, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 })
    );
    regTab.position.set(0, 0.18, 1.32);
    espGroup.add(regTab);

    // Capacitores de Tântalo Amarelos SMD
    [-0.6, 0.6].forEach(cx => {
      const capMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.2, 0.26),
        new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 })
      );
      capMesh.position.set(cx, 0.19, 0.8);
      espGroup.add(capMesh);
    });

    // Botões EN e BOOT em 3D (Posicionados próximos ao conector USB sem cobrir pinos)
    [-0.72, 0.72].forEach(bx => {
      const btnBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.18, 0.42),
        new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.85, roughness: 0.2 })
      );
      btnBase.position.set(bx, 0.18, 2.65);
      espGroup.add(btnBase);

      const btnActuator = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
      );
      btnActuator.position.set(bx, 0.3, 2.65);
      espGroup.add(btnActuator);
    });

    // Conector Micro-USB 3D em Relevo na borda
    const usbGroup = new THREE.Group();
    usbGroup.position.set(0, 0.22, 3.4);

    const usbBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.36, 0.85),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.15 })
    );
    usbGroup.add(usbBody);

    const usbHole = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.18, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 })
    );
    usbHole.position.set(0, 0.02, 0.43);
    usbGroup.add(usbHole);

    espGroup.add(usbGroup);

    // 5. Barras de Header Plásticas dos 30 Pinos alinhadas exatamente sobre as ilhas
    const headerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const pinGoldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.95, roughness: 0.2 });

    [-1.54, 1.54].forEach(hx => {
      const headerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 5.6), headerMat);
      headerBlock.position.set(hx, 0.26, 0.0);
      espGroup.add(headerBlock);
    });

    // 6. Mapeamento 3D Exato dos 30 Pinos
    this.espPins = {};
    const worldCenter = espGroup.position;
    const pinZStart = worldCenter.z - 2.66;
    const pinZStep = 0.38;

    for (let i = 0; i < 15; i++) {
      const pinZ = pinZStart + i * pinZStep;
      const leftVec = new THREE.Vector3(-1.54, 0.88, pinZ);
      const rightVec = new THREE.Vector3(1.54, 0.88, pinZ);

      // Armazenar nomes padrão
      this.espPins[leftPinNames[i]] = leftVec;
      this.espPins[rightPinNames[i]] = rightVec;

      // Aliases inequívocos para evitar colisões
      if (leftPinNames[i] === 'GND') {
        this.espPins['GND_L'] = leftVec;
        this.espPins['GND.1'] = leftVec;
      }
      if (rightPinNames[i] === 'GND') {
        this.espPins['GND_R'] = rightVec;
        this.espPins['GND.2'] = rightVec;
      }
      if (leftPinNames[i] === 'VP') {
        this.espPins['36'] = leftVec;
      }
      if (leftPinNames[i] === 'VN') {
        this.espPins['39'] = leftVec;
      }

      // Orifícios dourados dos soquetes dos pinos no header
      [-1.54, 1.54].forEach(px => {
        const pinSocket = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.05, 0.12),
          pinGoldMat
        );
        pinSocket.position.set(px, 0.46, pinZ - worldCenter.z);
        espGroup.add(pinSocket);
      });
    }

    // Garantir GND padrão como o esquerdo
    this.espPins['GND'] = this.espPins['GND_L'];

    this.scene.add(espGroup);
    this.esp32Group = espGroup;
  }

  /**
   * Constrói as Protoboards e os Componentes Eletrônicos FIEIS AO WOKWI:
   * 1. Protoboard Esquerda (Branca 830 furos) com 6 Módulos PIR HC-SR501
   * 2. Mini Protoboard Superior (Branca 170 furos) com Módulo LDR, Roda de Ajuste e Resistor
   * 3. Protoboard Direita (Fumê 830 furos) com 12 LEDs difusos e 12 Resistores de 220 ohms
   * Conecta cada fio milimetricamente ao pino correspondente no ESP32!
   */
  buildBreadboardsAndCircuits() {
    // =========================================================================
    // 1. PROTOBOARD ESQUERDA: 6 SENSORES PIR HC-SR501 (Branca)
    // =========================================================================
    const leftBb = this.createBreadboardMesh(7.2, 24.0, false);
    leftBb.position.set(-11.5, 0.5, 2.4);
    this.scene.add(leftBb);

    const tagPirTitle = this.createPcbTextLabel("6x SENSORES PIR HC-SR501 (WOKWI)");
    tagPirTitle.position.set(-11.5, 1.05, -10.6);
    this.scene.add(tagPirTitle);

    const pirPositionsZ = [-7.6, -4.4, -1.2, 2.0, 5.2, 8.4];
    const pirWireColors = [0xf97316, 0xffffff, 0x94a3b8, 0xd946ef, 0x3b82f6, 0x22c55e]; // Laranja, Branco, Cinza, Roxo, Azul, Verde
    const pirPins = ['34', '35', '32', '33', '25', '26'];

    this.buttons = [];

    for (let i = 0; i < 6; i++) {
      const zPos = pirPositionsZ[i];
      const pirModule = this.createPirSensorModule(i, zPos, pirWireColors[i], `GPIO ${pirPins[i]}`);
      this.scene.add(pirModule);
      this.buttons.push(pirModule);

      // Conexão do pino de sinal OUT do PIR diretamente ao respectivo pino do ESP32!
      const espTargetPin = this.espPins[pirPins[i]];
      this.createRealisticJumperWire(
        new THREE.Vector3(-9.2, 0.95, zPos),
        espTargetPin,
        pirWireColors[i],
        1.5 + (i % 3) * 0.25
      );
    }

    // Alimentação da Protoboard dos PIRs vinda do ESP32 (Fiel à foto de referência):
    // VCC -> Pino VIN do ESP32 (Vermelho, sai da base esquerda do ESP32)
    this.createRealisticJumperWire(
      new THREE.Vector3(-8.2, 0.95, 9.6),
      this.espPins['VIN'],
      0xef4444,
      1.6
    );
    // GND -> Pino GND_L do ESP32 (Preto, sai da base esquerda do ESP32)
    this.createRealisticJumperWire(
      new THREE.Vector3(-8.6, 0.95, 9.6),
      this.espPins['GND_L'],
      0x0f172a,
      1.8
    );

    // =========================================================================
    // 2. MINI PROTOBOARD SUPERIOR: MÓDULO LDR + RODA DE AJUSTE + RESISTOR
    // =========================================================================
    const topMiniBb = this.createBreadboardMesh(5.6, 7.2, false);
    topMiniBb.position.set(0, 0.5, -9.5);
    this.scene.add(topMiniBb);

    const ldrGroup = new THREE.Group();
    ldrGroup.position.set(0, 1.05, -9.5);

    const ldrPcbMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.15 });
    const ldrPcb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 4.4), ldrPcbMat);
    ldrPcb.castShadow = true;
    ldrGroup.add(ldrPcb);

    const icMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.2, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
    );
    icMesh.position.set(-0.6, 0.16, -0.4);
    ldrGroup.add(icMesh);

    const ledLdrPwr = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.25), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    ledLdrPwr.position.set(0.6, 0.16, -0.5);
    ldrGroup.add(ledLdrPwr);

    const ledLdrDO = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.25), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    ledLdrDO.position.set(0.6, 0.16, -0.1);
    ldrGroup.add(ledLdrDO);

    // Fotoresistor LDR
    const ldrHeadGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.25, 20);
    const ldrHeadMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.3,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.25
    });
    const ldrHead = new THREE.Mesh(ldrHeadGeo, ldrHeadMat);
    ldrHead.position.set(0, 0.7, -1.5);
    ldrHead.castShadow = true;
    ldrGroup.add(ldrHead);

    [-0.16, 0.16].forEach(px => {
      const pinLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9 })
      );
      pinLeg.position.set(px, 0.38, -1.5);
      ldrGroup.add(pinLeg);
    });

    this.ldrIndicatorLight = new THREE.PointLight(0xf59e0b, 0.8, 6);
    this.ldrIndicatorLight.position.set(0, 1.25, -1.5);
    ldrGroup.add(this.ldrIndicatorLight);

    // Roda de Ajuste do Nível de Luz (LDR)
    const potBaseGroup = new THREE.Group();
    potBaseGroup.position.set(0, 0.1, 0.85);

    const potCase = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.48, 1.45),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.45, metalness: 0.3 })
    );
    potCase.position.set(0, 0.24, 0);
    potCase.castShadow = true;
    potBaseGroup.add(potCase);

    const dialCanvas = document.createElement('canvas');
    dialCanvas.width = 512; dialCanvas.height = 512;
    const dctx = dialCanvas.getContext('2d');
    dctx.fillStyle = '#0f172a';
    dctx.beginPath(); dctx.arc(256, 256, 240, 0, Math.PI * 2); dctx.fill();
    dctx.strokeStyle = '#38bdf8'; dctx.lineWidth = 8; dctx.stroke();

    const grad = dctx.createConicGradient(-Math.PI / 2, 256, 256);
    grad.addColorStop(0.15, '#38bdf8');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(0.85, '#eab308');
    dctx.strokeStyle = grad; dctx.lineWidth = 24;
    dctx.beginPath(); dctx.arc(256, 256, 210, 0.75 * Math.PI, 2.25 * Math.PI); dctx.stroke();

    for (let a = 0.75 * Math.PI; a <= 2.25 * Math.PI; a += (1.5 * Math.PI) / 16) {
      const cos = Math.cos(a); const sin = Math.sin(a);
      dctx.strokeStyle = '#ffffff'; dctx.lineWidth = 4;
      dctx.beginPath();
      dctx.moveTo(256 + cos * 190, 256 + sin * 190);
      dctx.lineTo(256 + cos * 225, 256 + sin * 225);
      dctx.stroke();
    }
    dctx.fillStyle = '#38bdf8'; dctx.font = 'bold 36px sans-serif'; dctx.textAlign = 'center';
    dctx.fillText('NOITE', 100, 360);
    dctx.fillStyle = '#eab308'; dctx.fillText('DIA', 412, 360);
    dctx.fillStyle = '#f59e0b'; dctx.font = 'bold 28px sans-serif'; dctx.fillText('LIMIAR', 256, 90);

    const dialTex = new THREE.CanvasTexture(dialCanvas);
    const dialPlate = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: dialTex, transparent: true }));
    dialPlate.rotation.x = -Math.PI / 2;
    dialPlate.position.set(0, 0.49, 0);
    potBaseGroup.add(dialPlate);

    this.lightWheelKnob = new THREE.Group();
    this.lightWheelKnob.position.set(0, 0.56, 0);

    const knobBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.78, 0.52, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.4 })
    );
    knobBody.position.set(0, 0.26, 0);
    knobBody.castShadow = true;
    this.lightWheelKnob.add(knobBody);

    const knobCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.7, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.2, metalness: 0.85 })
    );
    knobCap.position.set(0, 0.54, 0);
    this.lightWheelKnob.add(knobCap);

    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.54), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    notch.position.set(0, 0.61, -0.34);
    this.lightWheelKnob.add(notch);

    this.lightWheelKnob.userData = {
      isLightWheel: true,
      worldTargetPos: new THREE.Vector3(0, 1.55, -8.65)
    };
    knobBody.userData = { isLightWheel: true };
    knobCap.userData = { isLightWheel: true };
    notch.userData = { isLightWheel: true };

    potBaseGroup.add(this.lightWheelKnob);
    ldrGroup.add(potBaseGroup);

    // Resistor divisor de tensão avulso na mini protoboard
    const pullDownResistor = this.createThroughHoleResistor([0x78350f, 0x0f172a, 0xf97316, 0xeab308]);
    pullDownResistor.position.set(0.6, 0.65, 1.5);
    ldrGroup.add(pullDownResistor);

    const tagLdr = this.createPcbTextLabel("SENSOR LDR & RODA DE LUZ");
    tagLdr.position.set(0, 0.3, -2.8);
    ldrGroup.add(tagLdr);

    this.scene.add(ldrGroup);

    // Fios jumpers da Mini Protoboard ao ESP32 conectados exatamente nos pinos corretos:
    // Verde: AO -> Pino VP (GPIO 36) do ESP32!
    this.createRealisticJumperWire(
      new THREE.Vector3(-0.4, 0.95, -7.0),
      this.espPins['VP'],
      0x22c55e,
      2.5
    );
    // Vermelho: VCC -> Pino 3V3 do ESP32!
    this.createRealisticJumperWire(
      new THREE.Vector3(0.4, 0.95, -7.0),
      this.espPins['3V3'],
      0xef4444,
      2.7
    );
    // Preto: GND -> Barra de terra
    this.createRealisticJumperWire(
      new THREE.Vector3(0.0, 0.95, -7.0),
      new THREE.Vector3(-8.6, 0.95, -8.0),
      0x0f172a,
      1.8
    );

    // =========================================================================
    // 3. PROTOBOARD DIREITA: 12x RESISTORES + CONEXÕES DOS POSTES DE PALITO (Wokwi Fumê)
    // Posicionada exatamente onde ficava a rua, com os fios conectando diretamente aos postes!
    // =========================================================================
    const rightBb = this.createBreadboardMesh(7.2, 24.0, true);
    rightBb.position.set(18.0, 0.5, 2.4);
    this.scene.add(rightBb);

    const tagLedsTitle = this.createPcbTextLabel("PROTOBOARD DE RESISTORES (220 OHMS)");
    tagLedsTitle.position.set(18.0, 1.05, -10.6);
    this.scene.add(tagLedsTitle);

    // Mapeamento dos 12 canais aos pinos correspondentes do ESP32
    const smartPins = ['23', '22', '21', '19', '18', '5'];
    const smartColors = [0x78350f, 0xf97316, 0xeab308, 0x22c55e, 0x3b82f6, 0xa855f7];
    const polePositionsZ = [-7.6, -4.2, -0.8, 2.6, 6.0, 9.4];

    const convPins = ['17', '16', '4', '2', '15', '13'];
    const convColors = [0x94a3b8, 0xffffff, 0xd946ef, 0xa855f7, 0x22c55e, 0xeab308];

    this.breadboardSmartLeds = [];
    this.breadboardConvLeds = [];
    this.breadboardLedLights = [];

    // 6 Canais dos Postes Inteligentes (Alinhados aos Postes de Palito)
    for (let i = 0; i < 6; i++) {
      const zPos = polePositionsZ[i];
      const pin = smartPins[i];
      const wireColor = smartColors[i];

      // Resistor de 220 ohms na protoboard
      const res220 = this.createThroughHoleResistor([0xef4444, 0xef4444, 0x78350f, 0xeab308]);
      res220.position.set(16.6, 0.95, zPos);
      this.scene.add(res220);

      // Jumper conectando do pino EXATO do ESP32 ao resistor na protoboard
      const espTargetPin = this.espPins[pin];
      this.createRealisticJumperWire(
        espTargetPin,
        new THREE.Vector3(15.4, 0.95, zPos),
        wireColor,
        2.4 + (i % 3) * 0.35
      );
    }

    // 6 Canais Convencionais (Resistores comparativos na protoboard)
    for (let i = 0; i < 6; i++) {
      const zPos = -6.0 + i * 2.8;
      const pin = convPins[i];
      const wireColor = convColors[i];

      // Resistor de 220 ohms
      const res220 = this.createThroughHoleResistor([0xef4444, 0xef4444, 0x78350f, 0xeab308]);
      res220.position.set(16.6, 0.95, zPos);
      this.scene.add(res220);

      // Jumper do ESP32
      const espTargetPin = this.espPins[pin];
      this.createRealisticJumperWire(
        espTargetPin,
        new THREE.Vector3(15.4, 0.95, zPos),
        wireColor,
        2.6 + (i % 3) * 0.35
      );
    }

    // Fio de Terra (GND) ligando o pino GND do ESP32 ao barramento da Protoboard dos LEDs
    this.createRealisticJumperWire(
      this.espPins['GND_R'],
      new THREE.Vector3(20.8, 0.95, -8.2),
      0x0f172a,
      2.8
    );
  }

  createPirSensorModule(index, zPos, signalColor, gpioLabel) {
    const pirGroup = new THREE.Group();
    pirGroup.position.set(-13.0, 0.75, zPos);

    const pcbGeo = new THREE.BoxGeometry(2.6, 0.22, 2.6);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x1e40af,
      roughness: 0.4,
      metalness: 0.15
    });
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    pcb.castShadow = true;
    pirGroup.add(pcb);

    [-1.05, 1.05].forEach(hx => {
      [-1.05, 1.05].forEach(hz => {
        const hole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.24, 12),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
        );
        hole.position.set(hx, 0.01, hz);
        pirGroup.add(hole);
      });
    });

    const domeGeo = new THREE.SphereGeometry(0.92, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.94
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 0.12, 0);
    dome.castShadow = true;
    pirGroup.add(dome);

    for (let r = 0.3; r <= 0.8; r += 0.25) {
      const ringGeo = new THREE.RingGeometry(r - 0.02, r + 0.02, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.13 + Math.sqrt(Math.max(0, 0.92 * 0.92 - r * r)), 0);
      pirGroup.add(ring);
    }

    const pinBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.45, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    pinBlock.position.set(1.4, 0.12, 0);
    pirGroup.add(pinBlock);

    [-0.28, 0, 0.28].forEach(pz => {
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9 })
      );
      pin.rotation.z = Math.PI / 2;
      pin.position.set(1.65, 0.12, pz);
      pirGroup.add(pin);
    });

    [-0.6, 0.6].forEach(px => {
      const pot = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.35, 0.45),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
      );
      pot.position.set(px, 0.2, -0.9);
      pirGroup.add(pot);
    });

    const label = this.createPcbTextLabel(`PIR ${index + 1} (${gpioLabel})`);
    label.position.set(0, 0.1, 1.8);
    pirGroup.add(label);

    pirGroup.userData = {
      index: index,
      isPirSensor: true,
      worldTargetPos: new THREE.Vector3(-13.0, 1.6, zPos)
    };
    dome.userData = { index: index, isPirSensor: true };
    pcb.userData = { index: index, isPirSensor: true };

    return pirGroup;
  }

  createThroughHoleResistor(bandColors) {
    const rGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2d4b7, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.9, 16), bodyMat);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    rGroup.add(body);

    [-0.45, 0.45].forEach(x => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), bodyMat);
      cap.position.set(x, 0, 0);
      rGroup.add(cap);
    });

    const bandPositions = [-0.25, -0.08, 0.08, 0.28];
    for (let b = 0; b < 4; b++) {
      const bandMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.08, 16),
        new THREE.MeshStandardMaterial({ color: bandColors[b], roughness: 0.2 })
      );
      bandMesh.rotation.z = Math.PI / 2;
      bandMesh.position.set(bandPositions[b], 0, 0);
      rGroup.add(bandMesh);
    }

    const wireMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });
    [-0.65, 0.65].forEach(x => {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5), wireMat);
      wire.position.set(x, -0.22, 0);
      rGroup.add(wire);
    });

    return rGroup;
  }

  create5mmLedMesh(colorHex, labelText) {
    const ledGroup = new THREE.Group();

    const flange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.1, 20),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 })
    );
    flange.position.set(0, 0.05, 0);
    ledGroup.add(flange);

    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.45, 20), ledMat);
    body.position.set(0, 0.32, 0);
    ledGroup.add(body);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), ledMat);
    dome.position.set(0, 0.54, 0);
    ledGroup.add(dome);

    const pointLight = new THREE.PointLight(colorHex, 0.0, 5.5, 2.0);
    pointLight.position.set(0, 0.7, 0);
    ledGroup.add(pointLight);

    return { group: ledGroup, material: ledMat, light: pointLight };
  }

  buildPalitoStreetPoles() {
    const polePositionsZ = [-7.6, -4.2, -0.8, 2.6, 6.0, 9.4];
    const smartColors = [0x78350f, 0xf97316, 0xeab308, 0x22c55e, 0x3b82f6, 0xa855f7];

    this.palitoLeds = [];
    this.palitoPointLights = [];

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.75,
      metalness: 0.05
    });

    const tapeMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.55,
      metalness: 0.1
    });

    const dupontMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5
    });

    for (let i = 0; i < 6; i++) {
      const zPos = polePositionsZ[i];
      const poleX = 22.2;
      const poleGroup = new THREE.Group();
      poleGroup.position.set(poleX, 0.4, zPos);

      // 1. Base redonda de apoio do poste (massa/cola quente na bancada)
      const baseMount = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.85, 0.32, 16),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 })
      );
      baseMount.position.set(0, 0.16, 0);
      poleGroup.add(baseMount);

      // 2. Palito de picolé vertical
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.75, 8.5, 0.2), woodMat);
      stick.position.set(0, 4.25, 0);
      stick.castShadow = true;
      poleGroup.add(stick);

      // 3. Junção superior curva
      const topArc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.2, 16, 1, false, 0, Math.PI), woodMat);
      topArc.rotation.z = Math.PI / 2;
      topArc.rotation.y = Math.PI / 2;
      topArc.position.set(0, 8.5, 0);
      poleGroup.add(topArc);

      // 4. Braço horizontal do poste de palito
      const armStick = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.18), woodMat);
      armStick.position.set(-0.75, 8.0, 0);
      armStick.castShadow = true;
      poleGroup.add(armStick);

      // 5. LED Difuso do Poste (Luminária)
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        roughness: 0.2,
        transparent: true,
        opacity: 0.92
      });

      const ledMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.45, 18), ledMat);
      ledMesh.position.set(-1.45, 7.8, 0);
      ledMesh.rotation.z = Math.PI;
      poleGroup.add(ledMesh);

      const ledDome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), ledMat);
      ledDome.position.set(-1.45, 7.55, 0);
      ledDome.rotation.z = Math.PI;
      poleGroup.add(ledDome);

      // Terminais metálicos do LED onde os fios se conectam
      const legAnode = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9 })
      );
      legAnode.position.set(-1.38, 8.08, 0.08);
      poleGroup.add(legAnode);

      const legCathode = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9 })
      );
      legCathode.position.set(-1.38, 8.08, -0.08);
      poleGroup.add(legCathode);

      // Ponto de Luz Âmbar Realista
      const ledLight = new THREE.PointLight(0xfffbeb, 0.0, 16, 1.8);
      ledLight.position.set(-1.45, 7.2, 0);
      ledLight.castShadow = true;
      poleGroup.add(ledLight);

      this.palitoLeds.push(ledMat);
      this.palitoPointLights.push(ledLight);

      // Etiqueta indicativa do canal do poste
      const tagPole = this.createPcbTextLabel(`P${i + 1}`);
      tagPole.position.set(0, 2.5, 0.16);
      poleGroup.add(tagPole);

      this.scene.add(poleGroup);

      // =========================================================================
      // 6. FIOS NO PALITO (Fiel à Maquete Maker Física):
      // Dois fios (sinal colorido + terra preto) correm ao longo do palito,
      // presos por abraçadeiras / fita isolante preta, e conectam à protoboard!
      // =========================================================================

      // A. Fio de Sinal (Positivo/Ânodo) - Cor do canal
      const signalPoints = [
        new THREE.Vector3(poleX - 1.38, 8.48, zPos + 0.08),  // Ponto no terminal do LED
        new THREE.Vector3(poleX - 0.7, 8.54, zPos + 0.08),   // Passa por cima do braço de palito
        new THREE.Vector3(poleX - 0.05, 8.56, zPos + 0.08),  // Curva na quina superior
        new THREE.Vector3(poleX + 0.38, 8.1, zPos + 0.08),   // Desce rente à lateral do palito
        new THREE.Vector3(poleX + 0.38, 5.5, zPos + 0.08),   // Meio do palito
        new THREE.Vector3(poleX + 0.38, 2.8, zPos + 0.08),   // Base do palito
        new THREE.Vector3(poleX + 0.28, 1.0, zPos + 0.08),   // Saída inferior
        new THREE.Vector3(poleX - 1.2, 1.45, zPos + 0.08),   // Arco suave sobre a bancada
        new THREE.Vector3(17.8, 0.95, zPos)                  // Inserido no trilho do resistor da protoboard!
      ];

      const signalCurve = new THREE.CatmullRomCurve3(signalPoints);
      const signalTubeGeo = new THREE.TubeGeometry(signalCurve, 42, 0.045, 8, false);
      const signalTubeMat = new THREE.MeshStandardMaterial({
        color: smartColors[i],
        roughness: 0.35,
        metalness: 0.1
      });
      const signalTube = new THREE.Mesh(signalTubeGeo, signalTubeMat);
      signalTube.castShadow = true;
      this.scene.add(signalTube);

      // Terminal Dupont preto na inserção da protoboard
      const collarSig = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.2), dupontMat);
      collarSig.position.set(17.8, 1.12, zPos);
      this.scene.add(collarSig);

      // B. Fio de Terra (Negativo/Cátodo/GND) - Fio preto/ardósia
      const gndPoints = [
        new THREE.Vector3(poleX - 1.38, 8.48, zPos - 0.08),  // Terminal do cátodo
        new THREE.Vector3(poleX - 0.7, 8.54, zPos - 0.08),   // Por cima do braço
        new THREE.Vector3(poleX - 0.05, 8.56, zPos - 0.08),  // Quina superior
        new THREE.Vector3(poleX + 0.38, 8.1, zPos - 0.08),   // Lateral do palito
        new THREE.Vector3(poleX + 0.38, 5.5, zPos - 0.08),   // Meio do palito
        new THREE.Vector3(poleX + 0.38, 2.8, zPos - 0.08),   // Base do palito
        new THREE.Vector3(poleX + 0.28, 1.0, zPos - 0.08),   // Saída inferior
        new THREE.Vector3(poleX - 0.8, 1.38, zPos - 0.14),   // Arco até o barramento azul
        new THREE.Vector3(20.8, 0.95, zPos)                  // Inserido no barramento GND da protoboard!
      ];

      const gndCurve = new THREE.CatmullRomCurve3(gndPoints);
      const gndTubeGeo = new THREE.TubeGeometry(gndCurve, 42, 0.045, 8, false);
      const gndTubeMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.45,
        metalness: 0.05
      });
      const gndTube = new THREE.Mesh(gndTubeGeo, gndTubeMat);
      gndTube.castShadow = true;
      this.scene.add(gndTube);

      // Terminal Dupont no GND
      const collarGnd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.2), dupontMat);
      collarGnd.position.set(20.8, 1.12, zPos);
      this.scene.add(collarGnd);

      // C. Fitas Isolantes Pretas prendendo os fios ao palito
      [2.2, 4.8, 7.2].forEach(tapeY => {
        const tapeBand = new THREE.Mesh(
          new THREE.BoxGeometry(0.82, 0.24, 0.38),
          tapeMat
        );
        tapeBand.position.set(poleX, tapeY, zPos);
        this.scene.add(tapeBand);
      });

      // Abraçadeira no braço horizontal
      const armTape = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.62, 0.34),
        tapeMat
      );
      armTape.position.set(poleX - 0.7, 8.4, zPos);
      this.scene.add(armTape);
    }
  }

  /**
   * Constrói a Mão 3D com anatomia e proporções naturais
   * (Sem braço cilíndrico gigante obstruindo a bancada!)
   */
  buildHandActor() {
    this.handGroup = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c2a2, roughness: 0.55, metalness: 0.02 });
    const palmMat = new THREE.MeshStandardMaterial({ color: 0xe8b598, roughness: 0.6 });

    // 1. Palma proporcional
    const palm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 2.4), palmMat);
    palm.castShadow = true;
    this.handGroup.add(palm);

    // 2. Antebraço elegante e manga com proporção fina e realista
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.72, 3.8, 18),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 })
    );
    arm.rotation.x = Math.PI / 3.4;
    arm.position.set(0, 2.1, 2.2);
    arm.castShadow = true;
    this.handGroup.add(arm);

    // Punho de transição entre manga e mão
    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.65, 0.35, 18),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.8 })
    );
    cuff.rotation.x = Math.PI / 3.4;
    cuff.position.set(0, 0.9, 1.0);
    this.handGroup.add(cuff);

    // 3. Dedo Indicador
    const fingerGroup = new THREE.Group();
    fingerGroup.position.set(0.5, -0.15, -1.2);

    const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 1.1, 14), skinMat);
    f1.rotation.x = Math.PI / 3.8;
    f1.position.set(0, -0.4, -0.3);
    f1.castShadow = true;
    fingerGroup.add(f1);

    const f2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 14), skinMat);
    f2.rotation.x = Math.PI / 2.2;
    f2.position.set(0, -0.85, -0.8);
    f2.castShadow = true;
    fingerGroup.add(f2);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 14), skinMat);
    tip.position.set(0, -0.85, -1.25);
    tip.castShadow = true;
    fingerGroup.add(tip);

    this.handGroup.add(fingerGroup);
    this.fingerTip = tip;

    // 4. Demais dedos curvados
    [-0.4, -0.8].forEach(dx => {
      const curled = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 1.1, 12), skinMat);
      curled.rotation.z = Math.PI / 2.5;
      curled.rotation.x = Math.PI / 2;
      curled.position.set(dx, -0.4, -0.4);
      curled.castShadow = true;
      this.handGroup.add(curled);
    });

    // Polegar lateral
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.0, 12), skinMat);
    thumb.rotation.z = -Math.PI / 3;
    thumb.position.set(1.15, -0.2, 0.1);
    thumb.castShadow = true;
    this.handGroup.add(thumb);

    // Posição de repouso ELEGANTE no canto superior esquerdo da bancada
    // (Não fica pairando nem tampando a visão das protoboards!)
    this.handRestPos = new THREE.Vector3(-14.0, 8.8, -4.5);
    this.handGroup.position.copy(this.handRestPos);
    this.handGroup.rotation.set(-0.15, Math.PI / 2.8, 0);

    this.scene.add(this.handGroup);
  }

  clickButtonWithHand(targetIndex, onComplete = null) {
    if (this.isHandBusy) return;
    if (targetIndex < 0 || targetIndex >= this.buttons.length) return;

    this.isHandBusy = true;
    const pir = this.buttons[targetIndex];
    const targetPos = pir.userData.worldTargetPos;

    const startPos = this.handGroup.position.clone();
    const hoverPos = new THREE.Vector3(targetPos.x + 0.8, 4.4, targetPos.z + 1.2);
    const pressPos = new THREE.Vector3(targetPos.x + 0.8, 2.55, targetPos.z + 1.2);

    const startTime = performance.now();
    const moveDuration = 320;
    const pressDuration = 180;
    const holdDuration = 160;
    const liftDuration = 220;

    const animateHand = (time) => {
      const elapsed = time - startTime;

      if (elapsed < moveDuration) {
        const t = elapsed / moveDuration;
        const ease = t * t * (3 - 2 * t);
        this.handGroup.position.lerpVectors(startPos, hoverPos, ease);
        requestAnimationFrame(animateHand);
      } else if (elapsed < moveDuration + pressDuration) {
        const t = (elapsed - moveDuration) / pressDuration;
        const ease = t * t;
        this.handGroup.position.lerpVectors(hoverPos, pressPos, ease);
        requestAnimationFrame(animateHand);
      } else if (elapsed < moveDuration + pressDuration + holdDuration) {
        if (!pir.userData.isPressed) {
          pir.userData.isPressed = true;
          this.controller.triggerManualPIR(targetIndex, true);
        }
        requestAnimationFrame(animateHand);
      } else if (elapsed < moveDuration + pressDuration + holdDuration + liftDuration) {
        const t = (elapsed - (moveDuration + pressDuration + holdDuration)) / liftDuration;
        this.handGroup.position.lerpVectors(pressPos, hoverPos, t);
        requestAnimationFrame(animateHand);
      } else {
        pir.userData.isPressed = false;
        // Retorno ao repouso
        this.handGroup.position.copy(this.handRestPos);
        this.handGroup.rotation.set(-0.15, Math.PI / 2.8, 0);
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
    const startHandRot = this.handGroup.rotation.clone();

    const hoverPos = new THREE.Vector3(0.12, 4.8, -7.2);
    const gripPos = new THREE.Vector3(0.1, 2.65, -7.35);
    const hoverRot = new THREE.Euler(-0.15, 0.05, 0);

    const startRatio = startVal / 4095;
    const endRatio = endVal / 4095;
    const startAngle = (0.5 - startRatio) * 3.6;
    const endAngle = (0.5 - endRatio) * 3.6;

    const startTime = performance.now();
    const tMove = 380;
    const tDescend = 220;
    const tTwist = 700;
    const tAscend = 240;
    const tReturn = 380;

    const animateRotation = (time) => {
      const elapsed = time - startTime;

      if (elapsed < tMove) {
        const t = elapsed / tMove;
        const ease = t * t * (3 - 2 * t);
        this.handGroup.position.lerpVectors(startHandPos, hoverPos, ease);
        this.handGroup.rotation.x = THREE.MathUtils.lerp(startHandRot.x, hoverRot.x, ease);
        this.handGroup.rotation.y = THREE.MathUtils.lerp(startHandRot.y, hoverRot.y, ease);
        this.handGroup.rotation.z = THREE.MathUtils.lerp(startHandRot.z, hoverRot.z, ease);
        requestAnimationFrame(animateRotation);
      } else if (elapsed < tMove + tDescend) {
        const t = (elapsed - tMove) / tDescend;
        const ease = t * t;
        this.handGroup.position.lerpVectors(hoverPos, gripPos, ease);
        requestAnimationFrame(animateRotation);
      } else if (elapsed < tMove + tDescend + tTwist) {
        const t = (elapsed - (tMove + tDescend)) / tTwist;
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        const currentVal = THREE.MathUtils.lerp(startVal, endVal, ease);
        this.controller.setLdrValue(currentVal);

        const currentAngle = THREE.MathUtils.lerp(startAngle, endAngle, ease);
        if (this.lightWheelKnob) {
          this.lightWheelKnob.rotation.y = currentAngle;
        }

        this.handGroup.rotation.y = hoverRot.y + (currentAngle - startAngle) * 0.72;
        this.handGroup.rotation.z = (currentAngle - startAngle) * 0.14;

        window.dispatchEvent(new CustomEvent('maqueteLdrTurned', { detail: { value: currentVal } }));
        requestAnimationFrame(animateRotation);
      } else if (elapsed < tMove + tDescend + tTwist + tAscend) {
        const t = (elapsed - (tMove + tDescend + tTwist)) / tAscend;
        this.controller.setLdrValue(endVal);
        if (this.lightWheelKnob) {
          this.lightWheelKnob.rotation.y = endAngle;
        }

        this.handGroup.position.lerpVectors(gripPos, hoverPos, t);
        this.handGroup.rotation.y = THREE.MathUtils.lerp(hoverRot.y + (endAngle - startAngle) * 0.72, hoverRot.y, t);
        this.handGroup.rotation.z = THREE.MathUtils.lerp((endAngle - startAngle) * 0.14, 0, t);
        requestAnimationFrame(animateRotation);
      } else if (elapsed < tMove + tDescend + tTwist + tAscend + tReturn) {
        const t = (elapsed - (tMove + tDescend + tTwist + tAscend)) / tReturn;
        const ease = t * t * (3 - 2 * t);
        this.handGroup.position.lerpVectors(hoverPos, this.handRestPos, ease);
        this.handGroup.rotation.x = THREE.MathUtils.lerp(hoverRot.x, -0.15, ease);
        this.handGroup.rotation.y = THREE.MathUtils.lerp(hoverRot.y, Math.PI / 2.8, ease);
        this.handGroup.rotation.z = THREE.MathUtils.lerp(0, 0, ease);
        requestAnimationFrame(animateRotation);
      } else {
        this.handGroup.position.copy(this.handRestPos);
        this.handGroup.rotation.set(-0.15, Math.PI / 2.8, 0);
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

  /**
   * Sincronização contínua com a barra de ADC
   */
  trackHandToAdcSlider(adcValue) {
    if (this.isHandBusy && !this.isTrackingAdc) return;

    this.isHandBusy = true;
    this.isTrackingAdc = true;

    if (this.adcReleaseTimer) {
      clearTimeout(this.adcReleaseTimer);
      this.adcReleaseTimer = null;
    }

    const gripPos = new THREE.Vector3(0.1, 2.65, -7.35);
    const hoverRot = new THREE.Euler(-0.15, 0.05, 0);

    const ratio = Math.max(0, Math.min(1, adcValue / 4095));
    const angle = (0.5 - ratio) * 3.6;

    if (!this.handAtKnob) {
      const startPos = this.handGroup.position.clone();
      const startTime = performance.now();
      const duration = 180;

      const step = (t) => {
        const elapsed = t - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = progress * progress * (3 - 2 * progress);
        this.handGroup.position.lerpVectors(startPos, gripPos, ease);
        this.handGroup.rotation.x = THREE.MathUtils.lerp(this.handGroup.rotation.x, hoverRot.x, ease);
        this.handGroup.rotation.y = THREE.MathUtils.lerp(this.handGroup.rotation.y, hoverRot.y + angle * 0.72, ease);
        this.handGroup.rotation.z = THREE.MathUtils.lerp(this.handGroup.rotation.z, angle * 0.14, ease);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          this.handAtKnob = true;
        }
      };
      requestAnimationFrame(step);
    } else {
      this.handGroup.position.copy(gripPos);
      this.handGroup.rotation.x = hoverRot.x;
      this.handGroup.rotation.y = hoverRot.y + angle * 0.72;
      this.handGroup.rotation.z = angle * 0.14;
    }

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

    const startPos = this.handGroup.position.clone();
    const startRot = this.handGroup.rotation.clone();
    const startTime = performance.now();
    const duration = 380;

    const step = (t) => {
      const elapsed = t - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress * progress * (3 - 2 * progress);
      this.handGroup.position.lerpVectors(startPos, this.handRestPos, ease);
      this.handGroup.rotation.x = THREE.MathUtils.lerp(startRot.x, -0.15, ease);
      this.handGroup.rotation.y = THREE.MathUtils.lerp(startRot.y, Math.PI / 2.8, ease);
      this.handGroup.rotation.z = THREE.MathUtils.lerp(startRot.z, 0, ease);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.handGroup.position.copy(this.handRestPos);
        this.handGroup.rotation.set(-0.15, Math.PI / 2.8, 0);
        this.isHandBusy = false;
        this.isTrackingAdc = false;
        this.handAtKnob = false;
      }
    };
    requestAnimationFrame(step);
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
        this.handGroup.position.lerp(this.handRestPos, 0.1);
        return;
      }

      this.clickButtonWithHand(this.handWalkIndex, () => {
        this.handWalkIndex++;
        this.handWalkTimer = setTimeout(stepNext, 500);
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
          if (current.userData && (current.userData.isLightWheel || current.userData.isPirSensor || typeof current.userData.index === 'number')) {
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
          current = current.parent;
        }
      }
    });
  }

  update(delta) {
    // 1. Dimerização dos 6 LEDs Inteligentes na Protoboard e nos Postes de Palito
    for (let i = 0; i < 6; i++) {
      const pwm = this.controller.smartPolesPWM[i];
      const palitoLedMat = this.palitoLeds[i];
      const palitoPointLight = this.palitoPointLights[i];
      const bbLedMat = this.breadboardSmartLeds[i];
      const bbLedLight = this.breadboardLedLights[i];

      let emissiveHex = 0x000000;
      let emissiveIntensity = 0.0;
      let lightIntensity = 0.0;
      let lightColorHex = 0xfffbeb;

      if (pwm >= 90) {
        // 100% - Intensidade Principal (Movimento detectado no PIR correspondente)
        emissiveHex = 0xf59e0b;
        emissiveIntensity = 3.2;
        lightIntensity = 3.0;
        lightColorHex = 0xfffbeb;
      } else if (pwm >= 50) {
        // 60% - Intensidade Vizinho (Postes e LEDs adjacentes)
        emissiveHex = 0xfbbf24;
        emissiveIntensity = 1.8;
        lightIntensity = 1.6;
        lightColorHex = 0xfef08a;
      } else if (pwm > 0) {
        // 30% - Standby noturno suave (quando configurado)
        emissiveHex = 0xd97706;
        emissiveIntensity = 0.65;
        lightIntensity = 0.5;
        lightColorHex = 0xfde047;
      } else {
        // 0% - Totalmente APAGADO (sem apertar / repouso)
        emissiveHex = 0x000000;
        emissiveIntensity = 0.0;
        lightIntensity = 0.0;
      }

      if (palitoLedMat) {
        palitoLedMat.emissive.setHex(emissiveHex);
        palitoLedMat.emissiveIntensity = emissiveIntensity;
      }
      if (palitoPointLight) {
        palitoPointLight.intensity = THREE.MathUtils.lerp(palitoPointLight.intensity, lightIntensity, delta * 10.0);
        palitoPointLight.color.setHex(lightColorHex);
      }

      if (bbLedMat) {
        bbLedMat.emissive.setHex(emissiveHex);
        bbLedMat.emissiveIntensity = emissiveIntensity;
      }
      if (bbLedLight) {
        bbLedLight.intensity = THREE.MathUtils.lerp(bbLedLight.intensity, lightIntensity * 0.7, delta * 10.0);
        bbLedLight.color.setHex(lightColorHex);
      }
    }

    // 2. Dimerização dos 6 LEDs Convencionais na Protoboard (Apagados por padrão sem apertar)
    const convPwm = this.controller.conventionalPolesPWM;
    for (let i = 0; i < 6; i++) {
      const bbConvMat = this.breadboardConvLeds[i];
      const bbConvLight = this.breadboardLedLights[6 + i];

      let convEmissive = 0x000000;
      let convIntensity = 0.0;
      let convLightInt = 0.0;

      if (convPwm >= 90) {
        convEmissive = 0xfacc15;
        convIntensity = 2.2;
        convLightInt = 1.5;
      } else if (convPwm > 0) {
        convEmissive = 0xca8a04;
        convIntensity = 0.7;
        convLightInt = 0.4;
      }

      if (bbConvMat) {
        bbConvMat.emissive.setHex(convEmissive);
        bbConvMat.emissiveIntensity = convIntensity;
      }
      if (bbConvLight) {
        bbConvLight.intensity = THREE.MathUtils.lerp(bbConvLight.intensity, convLightInt, delta * 10.0);
        bbConvLight.color.setHex(0xfef08a);
      }
    }

    // 3. Iluminação da Bancada (LDR)
    const ldrRatio = this.controller.ldrValue / 4095;
    this.deskLamp.intensity = THREE.MathUtils.lerp(0.15, 2.6, ldrRatio);
    if (this.ldrIndicatorLight) {
      this.ldrIndicatorLight.intensity = THREE.MathUtils.lerp(0.1, 1.2, ldrRatio);
    }

    if (!this.isRotatingWheel && !this.isTrackingAdc) {
      this.updateLightWheelRotation(this.controller.ldrValue);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  setCameraPreset(presetName) {
    switch (presetName) {
      case 'esp32':
        this.camera.position.set(0, 8.5, 7.5);
        this.controls.target.set(0, 0.8, 2.4);
        break;
      case 'pirs':
      case 'botoes':
        this.camera.position.set(-16.5, 11.0, 8.0);
        this.controls.target.set(-11.5, 1.5, 2.4);
        break;
      case 'ldr':
        this.camera.position.set(0, 8.5, -3.2);
        this.controls.target.set(0, 1.6, -8.65);
        break;
      case 'leds':
        this.camera.position.set(21.0, 11.5, 9.0);
        this.controls.target.set(18.0, 1.8, 2.4);
        break;
      case 'palitos':
        this.camera.position.set(26.0, 13.5, 9.0);
        this.controls.target.set(21.5, 4.0, 2.4);
        break;
      case 'top':
        this.camera.position.set(0, 36, 0.5);
        this.controls.target.set(0, 0, 0);
        break;
      default:
        this.camera.position.set(0, 25, 28);
        this.controls.target.set(0, 1.2, 1.5);
        break;
    }
  }

  createBreadboardMesh(width, depth, isDark = false) {
    const bbGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x27272a : 0xf1f5f9,
      roughness: isDark ? 0.35 : 0.45,
      metalness: isDark ? 0.15 : 0.05
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, 0.7, depth), bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    bbGroup.add(body);

    const railMatRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const railMatBlue = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

    [-width / 2 + 0.4, width / 2 - 0.4].forEach(rx => {
      const redLine = new THREE.Mesh(new THREE.PlaneGeometry(0.1, depth * 0.92), railMatRed);
      redLine.rotation.x = -Math.PI / 2;
      redLine.position.set(rx - 0.15, 0.36, 0);
      bbGroup.add(redLine);

      const blueLine = new THREE.Mesh(new THREE.PlaneGeometry(0.1, depth * 0.92), railMatBlue);
      blueLine.rotation.x = -Math.PI / 2;
      blueLine.position.set(rx + 0.15, 0.36, 0);
      bbGroup.add(blueLine);
    });

    const holeMat = new THREE.MeshBasicMaterial({ color: isDark ? 0x18181b : 0x334155 });
    const holeGeo = new THREE.PlaneGeometry(0.11, 0.11);

    for (let z = -depth / 2 + 1.2; z <= depth / 2 - 1.2; z += 0.75) {
      for (let x = -width / 2 + 1.2; x <= width / 2 - 1.2; x += 0.75) {
        if (Math.abs(x) < 0.35) continue;
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(x, 0.36, z);
        bbGroup.add(hole);
      }
    }

    return bbGroup;
  }

  /**
   * Cria cabos jumpers realistas com terminais Dupont nas extremidades
   * conectando exatamente os pinos do ESP32 aos componentes
   */
  createRealisticJumperWire(start, end, hexColor, arcElevation = 1.6) {
    const wireGroup = new THREE.Group();

    // 1. Terminais Dupont pretos nas duas pontas (colarinhos de plástico)
    const dupontMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const collarGeo = new THREE.BoxGeometry(0.22, 0.45, 0.22);

    const collarStart = new THREE.Mesh(collarGeo, dupontMat);
    collarStart.position.set(start.x, start.y + 0.18, start.z);
    wireGroup.add(collarStart);

    const collarEnd = new THREE.Mesh(collarGeo, dupontMat);
    collarEnd.position.set(end.x, end.y + 0.18, end.z);
    wireGroup.add(collarEnd);

    // 2. Curva realista Bézier de 4 pontos (sai vertical, faz curva suave no ar e desce vertical)
    const p0 = new THREE.Vector3(start.x, start.y + 0.38, start.z);
    const p1 = new THREE.Vector3(start.x, start.y + 0.38 + arcElevation * 0.7, start.z);
    const p2 = new THREE.Vector3(end.x, end.y + 0.38 + arcElevation * 0.7, end.z);
    const p3 = new THREE.Vector3(end.x, end.y + 0.38, end.z);

    const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
    const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.065, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: 0.35,
      metalness: 0.08
    });
    const wireTube = new THREE.Mesh(tubeGeo, tubeMat);
    wireTube.castShadow = true;
    wireGroup.add(wireTube);

    this.scene.add(wireGroup);
    this.jumperWires.push(wireGroup);
    return wireGroup;
  }

  createPcbTextLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 75);

    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(3.6, 0.9);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
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
