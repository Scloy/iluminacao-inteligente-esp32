/**
 * ESP32 Smart Street Lighting Controller
 * Implementação fiel da máquina de estados do firmware C++ para o ESP32.
 * Gerencia LDR, 6 PIRs, temporização não-bloqueante (estilo millis),
 * cálculo 30% / 60% / 100% com resolução max() para múltiplos acionamentos,
 * e telemetria para o Serial Monitor.
 */

class ESP32LightingController {
  constructor() {
    // Parâmetros de Configuração (Itens 4 e 8 do Roteiro)
    this.intensityBase = 30;         // 30% - Base de repouso à noite (luz guia de segurança)
    this.intensityNeighbor = 60;     // 60%
    this.intensityMain = 100;        // 100%
    this.intensityOff = 0;           // 0%
    this.holdTimeMs = 10000;         // 10 segundos
    this.ldrThreshold = 1800;        // Limiar Dia/Noite (0 a 4095)

    // Entradas do Sistema
    this.ldrValue = 450;             // Inicia em NOITE para testes imediatos
    this.isDay = false;

    // Fontes de ativação dos PIRs (presença física de atores e disparos manuais)
    this.actorPresence = [false, false, false, false, false, false];
    this.manualTrigger = [false, false, false, false, false, false];
    this.pirState = [false, false, false, false, false, false];

    // Temporizadores de cada sensor (estilo millis)
    this.lastMovementMs = [0, 0, 0, 0, 0, 0];

    // Saídas de Iluminação (0% a 100%) - Inicia em 30% no repouso noturno
    this.smartPolesPWM = [30, 30, 30, 30, 30, 30];       // 6 Postes Inteligentes
    this.conventionalPolesPWM = 100;                     // 6 Postes Convencionais (100% à noite)
    this.enableConventionalComparison = true;

    // Telemetria e Serial
    this.virtualMillis = 0;
    this.lastSerialSendMs = 0;
    this.serialIntervalMs = 500;
    this.serialLogs = [];
    this.maxLogs = 100;
    this.jsonMode = false;

    // Métricas de Consumo Energético
    this.powerNominalWattsPerPole = 60;  // Luminária LED 60 W (padrão da modernização de IP em São Sebastião do Paraíso - MG)
    this.totalSmartEnergyJoules = 0;
    this.totalConvEnergyJoules = 0;
    this.savedPercent = 100;
  }

  /**
   * Atualiza o ciclo do controlador a cada quadro
   * @param {number} deltaSeconds Tempo transcorrido desde a última chamada
   */
  update(deltaSeconds) {
    this.virtualMillis += Math.round(deltaSeconds * 1000);
    const now = this.virtualMillis;

    // 1. Avalia condição Dia / Noite pelo LDR
    const previouslyDay = this.isDay;
    this.isDay = (this.ldrValue >= this.ldrThreshold);

    if (this.isDay !== previouslyDay) {
      if (this.isDay) {
        this.logMessage(`[TRANSICAO AMBIENTAL] >> DIA DETECTADO (Postes Inteligentes Apagados: 0%) <<`, 'dia');
      } else {
        this.logMessage(`[TRANSICAO AMBIENTAL] >> NOITE DETECTADA (Habilitando Iluminacao Inteligente) <<`, 'noite');
      }
    }

    if (this.isDay) {
      // DIA: Todos os postes desligados (0%)
      for (let i = 0; i < 6; i++) {
        this.smartPolesPWM[i] = this.intensityOff;
        this.lastMovementMs[i] = 0;
      }
      this.conventionalPolesPWM = 0;
    } else {
      // NOITE: Postes convencionais só ligam se modo de comparação estiver ativo (evita ficar aceso sem apertar)
      this.conventionalPolesPWM = this.enableConventionalComparison ? 100 : 0;

      // 2. Atualiza estado composto dos sensores PIR (atores ou gatilhos manuais)
      for (let i = 0; i < 6; i++) {
        const isDetectingNow = this.actorPresence[i] || this.manualTrigger[i];
        const wasDetecting = this.pirState[i];
        this.pirState[i] = isDetectingNow;

        if (isDetectingNow) {
          // Enquanto o sensor estiver ativamente detectando movimento, o timestamp é continuamente atualizado
          this.lastMovementMs[i] = now;
          if (!wasDetecting) {
            this.logMessage(`[EVENTO PIR] Movimento iniciado na Regiao ${i + 1} (Poste ${i + 1}) em ${now} ms`, 'pir');
          }
        } else {
          // Quando o movimento cessa:
          if (wasDetecting) {
            this.lastMovementMs[i] = now; // Marca o instante exato em que o movimento terminou!
            this.logMessage(`[EVENTO PIR] Movimento cessou na Regiao ${i + 1}. Temporizador de permanencia iniciado (${this.holdTimeMs / 1000}s).`, 'timer');
          } else if (this.lastMovementMs[i] > 0) {
            // Conta os 10 segundos sem travar o processamento
            const elapsed = now - this.lastMovementMs[i];
            if (elapsed >= this.holdTimeMs) {
              this.lastMovementMs[i] = 0; // Temporizador expirado com sucesso!
              this.logMessage(`[TIMER PIR] Tempo de permanencia expirado na Regiao ${i + 1}. Retornando a ${this.intensityBase}%.`, 'timer');
            }
          }
        }
      }

      // 3. Regra de Iluminação: Começa na intensidade base (30%) em todos os 6 postes
      const targetIntensities = [this.intensityBase, this.intensityBase, this.intensityBase,
                                 this.intensityBase, this.intensityBase, this.intensityBase];

      // 4. Aplica regras de 100% e 60% com base nos PIRs ativos ou em contagem regressiva
      for (let i = 0; i < 6; i++) {
        const regionActive = this.pirState[i] || (this.lastMovementMs[i] > 0);

        if (regionActive) {
          // Poste principal = 100%
          targetIntensities[i] = Math.max(targetIntensities[i], this.intensityMain);

          // Vizinho à esquerda = 60%
          if (i > 0) {
            targetIntensities[i - 1] = Math.max(targetIntensities[i - 1], this.intensityNeighbor);
          }

          // Vizinho à direita = 60%
          if (i < 5) {
            targetIntensities[i + 1] = Math.max(targetIntensities[i + 1], this.intensityNeighbor);
          }
        }
      }

      this.smartPolesPWM = targetIntensities;
    }

    // Calcula Acúmulo de Energia
    this.calculateEnergyConsumption(deltaSeconds);

    // Envio periódico para o Serial Monitor Virtual
    if (now - this.lastSerialSendMs >= this.serialIntervalMs) {
      this.lastSerialSendMs = now;
      this.emitSerialTelemetry();
    }
  }

  /**
   * Atualiza a presença de pedestres ou veículos na zona de um PIR específico
   */
  setActorPresence(index, isPresent) {
    if (index >= 0 && index < 6) {
      this.actorPresence[index] = isPresent;
    }
  }

  /**
   * Acionamento manual via clique na interface
   * @param {number} index Índice do PIR (0 a 5)
   * @param {boolean} pulse Se true, simula uma passagem de 2 segundos e solta
   */
  triggerManualPIR(index, pulse = true) {
    if (index < 0 || index >= 6) return;

    if (pulse) {
      this.manualTrigger[index] = true;
      this.lastMovementMs[index] = this.virtualMillis;

      // Desliga a detecção física após 2 segundos para o temporizador de 10s rodar perfeitamente
      setTimeout(() => {
        this.manualTrigger[index] = false;
      }, 2000);
    } else {
      // Alterna modo contínuo
      this.manualTrigger[index] = !this.manualTrigger[index];
    }
  }

  /**
   * Obtém o tempo restante de permanência para a barra de progresso (em segundos)
   */
  getPirTimeRemaining(index) {
    if (this.pirState[index]) {
      return this.holdTimeMs / 1000; // Sensor ativo no momento
    }
    if (this.lastMovementMs[index] === 0) return 0;

    const elapsed = this.virtualMillis - this.lastMovementMs[index];
    const remaining = Math.max(0, this.holdTimeMs - elapsed);
    return remaining / 1000;
  }

  /**
   * Atualiza a leitura do LDR
   */
  setLdrValue(val) {
    this.ldrValue = Math.max(0, Math.min(4095, Math.round(val)));
  }

  /**
   * Reseta todos os sensores e temporizadores
   */
  resetAllPIRs() {
    for (let i = 0; i < 6; i++) {
      this.actorPresence[i] = false;
      this.manualTrigger[i] = false;
      this.pirState[i] = false;
      this.lastMovementMs[i] = 0;
    }
    this.logMessage(`[SISTEMA] Todos os sensores e temporizadores foram resetados.`, 'info');
  }

  /**
   * Dispara cenário de teste específico
   */
  runTestScenario(scenarioName) {
    this.resetAllPIRs();
    switch (scenarioName) {
      case 'center': // Teste PIR 3
        this.logMessage(`[CENARIO TESTE] Executando Teste Centro: PIR 3 ativado`, 'pir');
        this.triggerManualPIR(2, true); // índice 2 = PIR 3
        break;
      case 'edge': // Teste PIR 1 (borda)
        this.logMessage(`[CENARIO TESTE] Executando Teste Borda: PIR 1 ativado`, 'pir');
        this.triggerManualPIR(0, true); // índice 0 = PIR 1
        break;
      case 'multi': // Teste PIR 2 e PIR 5 simultâneos
        this.logMessage(`[CENARIO TESTE] Executando Teste Multiplo: PIR 2 e PIR 5 ativados`, 'pir');
        this.triggerManualPIR(1, true); // PIR 2
        this.triggerManualPIR(4, true); // PIR 5
        break;
    }
  }

  /**
   * Cálculo de Potência e Economia em Tempo Real
   */
  calculateEnergyConsumption(deltaSeconds) {
    const convPowerWatts = (this.conventionalPolesPWM / 100) * (this.powerNominalWattsPerPole * 6);
    let smartPowerWatts = 0;
    for (let i = 0; i < 6; i++) {
      smartPowerWatts += (this.smartPolesPWM[i] / 100) * this.powerNominalWattsPerPole;
    }

    this.totalConvEnergyJoules += convPowerWatts * deltaSeconds;
    this.totalSmartEnergyJoules += smartPowerWatts * deltaSeconds;

    if (convPowerWatts > 0) {
      this.savedPercent = Math.max(0, ((convPowerWatts - smartPowerWatts) / convPowerWatts) * 100);
    } else {
      this.savedPercent = 0;
    }
  }

  /**
   * Registra log no terminal virtual
   */
  logMessage(text, type = 'info') {
    const timestamp = `[${String(Math.floor(this.virtualMillis)).padStart(6, '0')} ms]`;
    this.serialLogs.unshift({ timestamp, text, type });
    if (this.serialLogs.length > this.maxLogs) {
      this.serialLogs.pop();
    }
  }

  /**
   * Emite linha de telemetria para o Serial Monitor Virtual
   */
  emitSerialTelemetry() {
    const timeStr = String(this.virtualMillis).padStart(6, '0');
    const estadoStr = this.isDay ? "DIA" : "NOITE";
    const pirsStr = this.pirState.map(p => p ? 1 : 0).join(' ');
    const pwmStr = this.smartPolesPWM.map(p => `${String(p).padStart(3, ' ')}%`).join(' ');

    let line = '';
    if (this.jsonMode) {
      line = JSON.stringify({
        millis: this.virtualMillis,
        dia: this.isDay,
        ldr: this.ldrValue,
        pir: this.pirState.map(p => p ? 1 : 0),
        pwm_inteligente: this.smartPolesPWM,
        convencional: this.conventionalPolesPWM
      });
    } else {
      line = `[${timeStr} ms] Estado: ${estadoStr.padEnd(5, ' ')} | LDR: ${String(this.ldrValue).padStart(4, ' ')} | PIRs: [${pirsStr}] | PWM: [${pwmStr}] | Conv: ${this.conventionalPolesPWM}%`;
    }

    this.logMessage(line, 'telemetry');
  }
}

window.ESP32LightingController = ESP32LightingController;
