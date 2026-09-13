/*
  ====================================================================================
  PROJETO: ILUMINAÇÃO PÚBLICA INTELIGENTE COM ESP32
  ====================================================================================
  Componentes:
  - 1x ESP32 (Microcontrolador principal)
  - 1x Sensor LDR (Leitura de luminosidade ambiente - Dia / Noite)
  - 6x Sensores de Movimento PIR (Detectam presença nas 6 regiões da via)
  - 6x Saídas PWM para Postes Inteligentes (Controle dinâmico 0%, 30%, 60%, 100%)
  - 6x Saídas para Postes Convencionais (Referência comparativa: 100% à noite, 0% de dia)

  Lógica Operacional:
  - DIA: Todos os postes apagados (0%).
  - NOITE (sem movimento): Todos os postes inteligentes operam em intensidade base (30%).
  - NOITE (movimento detectado):
      * Poste correspondente ao PIR ativado -> 100% (Intensidade Principal)
      * Postes imediatamente vizinhos -> 60% (Intensidade Vizinho)
      * Demais postes -> 30% (Intensidade Base)
  - Múltiplos movimentos simultâneos: Zonas combinadas; conflitos resolvidos pelo maior valor (max).
  - Temporização não-bloqueante (millis): Mantém a iluminação por 10s após cessar movimento.
  - Saída Serial estruturada para depuração e integração com dashboards em Python.
  ====================================================================================
*/

// ====================================================================================
// 3. DEFINIÇÃO DOS PINOS (GPIOs do ESP32)
// ====================================================================================
// Postes Inteligentes (Saídas PWM)
const uint8_t PINOS_POSTES_INTELIGENTES[6] = {23, 22, 21, 19, 18, 5};

// Sensores de Movimento PIR (Entradas Digitais)
const uint8_t PINOS_SENSORES_PIR[6]      = {34, 35, 32, 33, 25, 26};

// Sensor de Claridade LDR (Entrada Analógica - ADC1 recomendado)
const uint8_t PINO_LDR                   = 36; // VP (ADC1_CH0)

// Postes Convencionais de Comparação (Saídas Digitais / PWM constante)
// Mapeamento correspondente ao circuito do Wokwi: LEDs 7 a 12
const uint8_t PINOS_POSTES_CONVENCIONAIS[6] = {17, 16, 4, 2, 15, 13};

// ====================================================================================
// 4. PARÂMETROS CONFIGURÁVEIS DO SISTEMA
// ====================================================================================
const uint8_t  INTENSIDADE_DESLIGADO   = 0;     // 0% - Durante o dia
const uint8_t  INTENSIDADE_BASE         = 0;     // 0% - Base sem movimento (apagado no repouso até apertar)
const uint8_t  INTENSIDADE_VIZINHO      = 60;    // 60% - Postes adjacentes ao movimento
const uint8_t  INTENSIDADE_PRINCIPAL    = 100;   // 100% - Poste com movimento detectado

const uint32_t TEMPO_PERMANENCIA_MS     = 10000; // 10 segundos antes de retornar à base
const uint16_t LIMIAR_LDR_DIA_NOITE     = 1800;  // Acima = DIA (claridade), Abaixo = NOITE (escuro)
                                                 // *Ajustável conforme montagem física ou Wokwi

// Configurações do PWM LEDC do ESP32
const uint32_t PWM_FREQ                 = 5000;  // Frequência de 5 kHz (sem flicker visível)
const uint8_t  PWM_RESOLUCAO            = 8;     // Resolução de 8 bits (0 a 255)
const uint8_t  CANAIS_PWM_LEDC[6]       = {0, 1, 2, 3, 4, 5}; // 6 canais LEDC dedicados

// ====================================================================================
// VARIÁVEIS GLOBAIS DE ESTADO
// ====================================================================================
uint16_t valorLdrAtual          = 0;
bool     ehDia                  = false;
bool     estadoPIR[6]           = {false, false, false, false, false, false};
uint32_t ultimoMovimentoMs[6]   = {0, 0, 0, 0, 0, 0};
uint8_t  intensidadeAlvo[6]     = {0, 0, 0, 0, 0, 0};
uint8_t  intensidadeAtual[6]    = {0, 0, 0, 0, 0, 0};
uint8_t  intensidadeConvencional= 0; // 0% de dia, 100% à noite

uint32_t ultimoEnvioSerialMs    = 0;
const uint32_t INTERVALO_SERIAL_MS = 500; // Envia telemetria a cada 500ms

// ====================================================================================
// PROTÓTIPOS DAS FUNÇÕES (Conforme Seção 12 do Roteiro)
// ====================================================================================
void configurarPinos();
void configurarPWM();
void lerLuminosidade();
void verificarDiaNoite();
void lerSensoresPIR();
void atualizarTemporizadores();
void calcularIntensidades();
void aplicarIntensidades();
void definirIntensidadePoste(uint8_t indicePoste, uint8_t percentual);
void controlarPostesConvencionais();
void enviarDadosSerial();

// ====================================================================================
// 5. CONFIGURAÇÃO DO setup()
// ====================================================================================
void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("\n==================================================");
  Serial.println("   SISTEMA DE ILUMINACAO PUBLICA INTELIGENTE");
  Serial.println("        ESP32 + LDR + 6x PIR + PWM LEDC");
  Serial.println("==================================================");

  // Configuração de pinos e PWM
  configurarPinos();
  configurarPWM();

  // Estado seguro inicial: Desligar todos os postes
  for (uint8_t i = 0; i < 6; i++) {
    definirIntensidadePoste(i, INTENSIDADE_DESLIGADO);
    digitalWrite(PINOS_POSTES_CONVENCIONAIS[i], LOW);
  }

  Serial.println("[SETUP] Pinos e Canais PWM configurados com sucesso.");
  Serial.println("[SETUP] Sistema inicializado e pronto para operacao.\n");
}

// ====================================================================================
// 13. FLUXO DO loop() (Conforme Roteiro)
// ====================================================================================
void loop() {
  // 1. Ler o LDR e determinar se é dia ou noite
  lerLuminosidade();
  verificarDiaNoite();

  // 2. Processar de acordo com a condição de luminosidade
  if (ehDia) {
    // DIA: Postes inteligentes e convencionais desligados (0%)
    for (uint8_t i = 0; i < 6; i++) {
      intensidadeAlvo[i] = INTENSIDADE_DESLIGADO;
      ultimoMovimentoMs[i] = 0; // Reseta temporizadores
    }
    intensidadeConvencional = 0;
  } else {
    // NOITE: Postes convencionais sempre em 100%
    intensidadeConvencional = 100;

    // 3. Ler os 6 sensores PIR
    lerSensoresPIR();

    // 4. Atualizar os temporizadores não-bloqueantes com millis()
    atualizarTemporizadores();

    // 5. Calcular as intensidades dinâmicas (30% / 60% / 100% com regra de vizinhança)
    calcularIntensidades();
  }

  // 6. Aplicar os níveis PWM nos postes inteligentes e convencionais
  aplicarIntensidades();
  controlarPostesConvencionais();

  // 7. Enviar dados formatados para o Serial Monitor / Python
  enviarDadosSerial();
}

// ====================================================================================
// 12. IMPLEMENTAÇÃO DAS FUNÇÕES MODULARES
// ====================================================================================

/**
 * Configura direções dos pinos de entrada e saída.
 */
void configurarPinos() {
  // Entradas dos sensores PIR
  for (uint8_t i = 0; i < 6; i++) {
    pinMode(PINOS_SENSORES_PIR[i], INPUT);
  }

  // Entrada analógica do LDR
  pinMode(PINO_LDR, INPUT);

  // Saídas dos postes convencionais
  for (uint8_t i = 0; i < 6; i++) {
    pinMode(PINOS_POSTES_CONVENCIONAIS[i], OUTPUT);
    digitalWrite(PINOS_POSTES_CONVENCIONAIS[i], LOW);
  }
}

/**
 * Configura os 6 canais LEDC PWM do ESP32 para controle dos postes inteligentes.
 */
void configurarPWM() {
  for (uint8_t i = 0; i < 6; i++) {
    #if defined(ESP_IDF_VERSION_MAJOR) && (ESP_IDF_VERSION_MAJOR >= 5)
      // Core ESP32 v3.x
      ledcAttachChannel(PINOS_POSTES_INTELIGENTES[i], PWM_FREQ, PWM_RESOLUCAO, CANAIS_PWM_LEDC[i]);
    #else
      // Core ESP32 v2.x
      ledcSetup(CANAIS_PWM_LEDC[i], PWM_FREQ, PWM_RESOLUCAO);
      ledcAttachPin(PINOS_POSTES_INTELIGENTES[i], CANAIS_PWM_LEDC[i]);
    #endif
  }
}

/**
 * 6. Leitura analógica do LDR (0 a 4095 no ADC de 12 bits do ESP32).
 */
void lerLuminosidade() {
  // Faz média de algumas leituras rápidas para estabilidade do sinal analógico
  uint32_t soma = 0;
  for (int i = 0; i < 4; i++) {
    soma += analogRead(PINO_LDR);
  }
  valorLdrAtual = soma / 4;
}

/**
 * 6. Avalia se o ambiente é DIA ou NOITE com base no limiar configurável.
 * Nota: Circuitos comuns de divisor com LDR:
 * - Maior claridade -> Menor resistência do LDR -> Tensão analógica sobe ou desce
 *   conforme o arranjo (Pull-up ou Pull-down). Aqui, consideramos:
 *   valorLdrAtual >= LIMIAR_LDR_DIA_NOITE -> DIA
 *   valorLdrAtual <  LIMIAR_LDR_DIA_NOITE -> NOITE
 */
void verificarDiaNoite() {
  static bool estadoAnteriorDia = false;
  ehDia = (valorLdrAtual >= LIMIAR_LDR_DIA_NOITE);

  // Notifica no Serial quando houver transição de estado Dia <-> Noite
  if (ehDia != estadoAnteriorDia) {
    estadoAnteriorDia = ehDia;
    if (ehDia) {
      Serial.println("\n[TRANSICAO AMBIENTAL] >> DIA DETECTADO (Postes Inteligentes Apagados: 0%) <<");
    } else {
      Serial.println("\n[TRANSICAO AMBIENTAL] >> NOITE DETECTADA (Habilitando Iluminacao Inteligente) <<");
    }
  }
}

/**
 * 7. Leitura dos 6 sensores de presença PIR.
 */
void lerSensoresPIR() {
  uint32_t agora = millis();
  for (uint8_t i = 0; i < 6; i++) {
    bool leitura = (digitalRead(PINOS_SENSORES_PIR[i]) == HIGH);
    
    // Se detectou movimento neste ciclo, atualiza a marca de tempo
    if (leitura) {
      if (!estadoPIR[i]) {
        Serial.printf("[EVENTO PIR] Movimento iniciado na Regiao %d (Poste %d) em %lu ms\n", i + 1, i + 1, agora);
      }
      ultimoMovimentoMs[i] = agora;
    }
    estadoPIR[i] = leitura;
  }
}

/**
 * 10. Atualiza e avalia os temporizadores não-bloqueantes (sem delay).
 */
void atualizarTemporizadores() {
  uint32_t agora = millis();
  for (uint8_t i = 0; i < 6; i++) {
    if (ultimoMovimentoMs[i] > 0) {
      // Se o tempo de permanência expirou após o último sinal do sensor
      if ((agora - ultimoMovimentoMs[i]) >= TEMPO_PERMANENCIA_MS) {
        ultimoMovimentoMs[i] = 0; // Temporizador concluído
        Serial.printf("[TIMER PIR] Tempo de permanencia expirado na Regiao %d. Retornando a base.\n", i + 1);
      }
    }
  }
}

/**
 * 8 e 9. Regra principal de iluminação: 30% / 60% / 100% com vizinhança e múltiplos PIRs.
 * Conflitos entre níveis são resolvidos aplicando-se a maior intensidade (max).
 */
void calcularIntensidades() {
  // Inicia todos os 6 postes na intensidade base (30%)
  for (uint8_t i = 0; i < 6; i++) {
    intensidadeAlvo[i] = INTENSIDADE_BASE;
  }

  // Percorre cada sensor PIR para verificar se sua região está ativa (ou em contagem regressiva)
  for (uint8_t i = 0; i < 6; i++) {
    bool regiaoAtiva = (estadoPIR[i] || (ultimoMovimentoMs[i] > 0));

    if (regiaoAtiva) {
      // 1. Poste principal da região detectada vai a 100%
      intensidadeAlvo[i] = max(intensidadeAlvo[i], INTENSIDADE_PRINCIPAL);

      // 2. Vizinho à esquerda (se existir, protegendo índice 0)
      if (i > 0) {
        intensidadeAlvo[i - 1] = max(intensidadeAlvo[i - 1], INTENSIDADE_VIZINHO);
      }

      // 3. Vizinho à direita (se existir, protegendo índice 5)
      if (i < 5) {
        intensidadeAlvo[i + 1] = max(intensidadeAlvo[i + 1], INTENSIDADE_VIZINHO);
      }
    }
  }
}

/**
 * 11. Aplica os níveis calculados aos 6 postes inteligentes via PWM LEDC.
 */
void aplicarIntensidades() {
  for (uint8_t i = 0; i < 6; i++) {
    definirIntensidadePoste(i, intensidadeAlvo[i]);
  }
}

/**
 * 11. Converte percentual (0-100%) em valor de duty cycle (0-255) e escreve no canal LEDC.
 */
void definirIntensidadePoste(uint8_t indicePoste, uint8_t percentual) {
  if (indicePoste >= 6) return;

  // Garante limite entre 0% e 100%
  percentual = constrain(percentual, 0, 100);
  intensidadeAtual[indicePoste] = percentual;

  // Mapeia 0-100% para 0-255 (resolução de 8 bits)
  uint32_t dutyCycle = map(percentual, 0, 100, 0, 255);

  #if defined(ESP_IDF_VERSION_MAJOR) && (ESP_IDF_VERSION_MAJOR >= 5)
    ledcWrite(PINOS_POSTES_INTELIGENTES[indicePoste], dutyCycle);
  #else
    ledcWrite(CANAIS_PWM_LEDC[indicePoste], dutyCycle);
  #endif
}

/**
 * 15. Controle dos 6 postes convencionais para comparação visual e de consumo.
 * Durante a noite permanecem em 100% (ligados continuamente). Durante o dia, 0%.
 */
void controlarPostesConvencionais() {
  uint8_t estado = (intensidadeConvencional > 0) ? HIGH : LOW;
  for (uint8_t i = 0; i < 6; i++) {
    digitalWrite(PINOS_POSTES_CONVENCIONAIS[i], estado);
  }
}

/**
 * 14 e 17. Monitor Serial com formato legível e linha JSON para integração com Python.
 */
void enviarDadosSerial() {
  uint32_t agora = millis();
  if (agora - ultimoEnvioSerialMs < INTERVALO_SERIAL_MS) {
    return;
  }
  ultimoEnvioSerialMs = agora;

  // 1. Linha Legível para Usuário no Serial Monitor
  Serial.printf("[%06lu ms] Estado: %-5s | LDR: %4d | PIRs: [%d %d %d %d %d %d] | PWM: [%3d%% %3d%% %3d%% %3d%% %3d%% %3d%%] | Conv: %3d%%\n",
    agora,
    ehDia ? "DIA" : "NOITE",
    valorLdrAtual,
    estadoPIR[0], estadoPIR[1], estadoPIR[2], estadoPIR[3], estadoPIR[4], estadoPIR[5],
    intensidadeAtual[0], intensidadeAtual[1], intensidadeAtual[2],
    intensidadeAtual[3], intensidadeAtual[4], intensidadeAtual[5],
    intensidadeConvencional
  );

  // 2. Linha em formato JSON (descomente caso queira consumo direto por script Python)
  /*
  Serial.print("JSON:{\"millis\":");
  Serial.print(agora);
  Serial.print(",\"dia\":");
  Serial.print(ehDia ? "true" : "false");
  Serial.print(",\"ldr\":");
  Serial.print(valorLdrAtual);
  Serial.print(",\"pir\":[");
  for (int i=0; i<6; i++) { Serial.print(estadoPIR[i]); if(i<5) Serial.print(","); }
  Serial.print("],\"pwm_inteligente\":[");
  for (int i=0; i<6; i++) { Serial.print(intensidadeAtual[i]); if(i<5) Serial.print(","); }
  Serial.print("],\"convencional\":");
  Serial.print(intensidadeConvencional);
  Serial.println("}");
  */
}
