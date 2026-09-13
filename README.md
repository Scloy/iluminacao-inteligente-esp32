# Sistema de Iluminação Pública Inteligente com ESP32

Projeto completo de **Iluminação Pública Inteligente** com simulação 3D interativa no navegador, microcontrolador ESP32, sensor LDR, 6 sensores de presença PIR, controle por modulação PWM nos postes e comparação de eficiência energética.

A plataforma conta com dois ambientes 3D sincronizados e uma interface inspirada no macOS (janelas flutuantes, dock, launchpad e controles táteis):
1. **Cidade 3D**: Simulação urbana realista com tráfego de pedestres, carros, postes inteligentes e ciclo dia/noite.
2. **Maquete Física (Maker Lab)**: Simulação de bancada com placa ESP32 DevKit V1 (30 pinos), postes artesanais de palito de picolé com luminárias LED e fiação realista, protoboards de PIRs e resistores, e uma mão 3D interativa.

---

## 1. Estrutura do Repositório

```
d:\arduino\
├── index.html                           # Interface visual da plataforma com HUD, Dock e macOS Window Manager
├── styles.css                           # Design System completo (Glassmorphism, tema escuro, dock, janelas)
├── js/
│   ├── app.js                           # Orquestrador da aplicação, HUD, modais e sincronização de modos
│   ├── controller.js                    # Máquina de estados do ESP32 (lógica idêntica ao firmware C++)
│   ├── scene3d.js                       # Renderizador 3D Three.js do Modo Cidade (rua, postes, carros, iluminação física)
│   ├── maqueteScene3d.js                # Renderizador 3D Three.js do Modo Maquete (ESP32, postes de palito, fiação 3D e mão)
│   ├── actors.js                        # Simulação física e inteligência de rotas de pedestres e veículos
│   └── windowManager.js                 # Gerenciador de janelas flutuantes (arraste, recolhimento, dock e atalhos)
├── iluminacao_inteligente_esp32.ino     # Código-fonte oficial C++ para o Arduino IDE / PlatformIO / Wokwi
├── diagram.json                         # Circuito para o simulador online Wokwi
├── .gitignore                           # Configuração de arquivos ignorados pelo Git
└── README.md                            # Documentação completa do projeto
```

---

## 2. Mapa de Pinagem do ESP32

Mapeamento de hardware conforme montagem física e circuito do Wokwi:

| Componente | Identificador | GPIO ESP32 | Tipo de Sinal | Função no Projeto |
| :--- | :--- | :--- | :--- | :--- |
| **Sensor LDR** | LDR 1 | **GPIO 36 (VP)** | Analógico (ADC1) | Leitura de luminosidade ambiental (Dia vs Noite) |
| **Sensor de Presença** | PIR 1 | **GPIO 34** | Digital Input | Detecção de movimento Região 1 |
| **Sensor de Presença** | PIR 2 | **GPIO 35** | Digital Input | Detecção de movimento Região 2 |
| **Sensor de Presença** | PIR 3 | **GPIO 32** | Digital Input | Detecção de movimento Região 3 |
| **Sensor de Presença** | PIR 4 | **GPIO 33** | Digital Input | Detecção de movimento Região 4 |
| **Sensor de Presença** | PIR 5 | **GPIO 25** | Digital Input | Detecção de movimento Região 5 |
| **Sensor de Presença** | PIR 6 | **GPIO 26** | Digital Input | Detecção de movimento Região 6 |
| **Poste Inteligente 1** | Canal 1 | **GPIO 23** | PWM (LEDC Ch 0) | Dimerização dinâmica 0% / 30% / 60% / 100% |
| **Poste Inteligente 2** | Canal 2 | **GPIO 22** | PWM (LEDC Ch 1) | Dimerização dinâmica 0% / 30% / 60% / 100% |
| **Poste Inteligente 3** | Canal 3 | **GPIO 21** | PWM (LEDC Ch 2) | Dimerização dinâmica 0% / 30% / 60% / 100% |
| **Poste Inteligente 4** | Canal 4 | **GPIO 19** | PWM (LEDC Ch 3) | Dimerização dinâmica 0% / 30% / 60% / 100% |
| **Poste Inteligente 5** | Canal 5 | **GPIO 18** | PWM (LEDC Ch 4) | Dimerização dinâmica 0% / 30% / 60% / 100% |
| **Poste Inteligente 6** | Canal 6 | **GPIO 5** | PWM (LEDC Ch 5) | Dimerização dinâmica 0% / 30% / 60% / 100% |
| **Postes Convencionais** | Comparativos | **GPIOs 17, 16, 4, 2, 15, 13** | Digital Output | Referência comparativa de eficiência energética |

---

## 3. Lógica Operacional do ESP32

1. **Condição DIA** (`LDR >= Limiar`, padrão 1800):
   - Postes inteligentes mantidos desligados (`0%` PWM).
2. **Condição NOITE** (`LDR < Limiar`):
   - Em repouso (sem movimento detectado): postes operam em intensidade base `0%` (ou `30%` configurável).
3. **Detecção de Movimento (PIR)**:
   - **Poste principal**: sobe instantaneamente para `100%` (Intensidade Principal).
   - **Postes vizinhos imediatos**: sobem para `60%` (Intensidade Vizinho), criando uma bolha segura de visibilidade.
   - **Demais postes**: permanecem em repouso.
4. **Resolução de Múltiplos Focos**:
   - Conflitos entre múltiplos sensores ativados simultaneamente são resolvidos pela função `max()`.
5. **Temporização Não-Bloqueante (`millis`)**:
   - Ao cessar o movimento, o sistema mantém a iluminação elevada por **10 segundos** (*hold time*) antes de desligar ou retornar à intensidade de repouso.

---

## 4. Como Executar Localmente

Você pode rodar a aplicação em qualquer servidor web local:

### Via Python (Recomendado):
```bash
python -m http.server 8000
```
Em seguida, abra no navegador: `http://localhost:8000`

### Via Node.js:
```bash
npx serve .
```

---

## 5. Simulação no Wokwi

1. Acesse o [Wokwi ESP32](https://wokwi.com/).
2. Abra um novo projeto com **ESP32**.
3. Cole o código `iluminacao_inteligente_esp32.ino` no editor principal.
4. Cole o conteúdo de `diagram.json` na aba de circuito.
5. Inicie a simulação para interagir com os sensores e acompanhar a telemetria no Serial Monitor.
