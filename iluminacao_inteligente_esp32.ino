// ===================================================
// SISTEMA DE ILUMINAÇÃO PÚBLICA INTELIGENTE COM ESP32
// ===================================================

// Sensor LDR (Entrada Analógica - GPIO 36 / VP compatível com Wokwi e bancada)
const int PINO_LDR = 36;
const int LIMIAR_LDR = 1800; // >= 1800 é DIA (luz), < 1800 é NOITE (escuro)

// Resolução PWM (8 bits: 0 a 255)
const int PWM_0   = 0;
const int PWM_30  = 77;   // ~30% (Luz guia/repouso à noite)
const int PWM_60  = 153;  // ~60% (Postes vizinhos)
const int PWM_100 = 255;  // 100% (Poste com presença detectada)

// Tempo de iluminação após cessar movimento (10 segundos)
const unsigned long TEMPO_ATIVO = 10000;

// Postes Inteligentes (Saídas PWM)
const int postes[6] = { 23, 22, 21, 19, 18, 5 };

// Sensores de Presença PIR (Entradas Digitais)
const int pirs[6] = { 34, 35, 32, 33, 25, 26 };

// Postes Convencionais para comparação de consumo energético (LEDs Amarelos)
const int postesConvencionais[6] = { 17, 16, 4, 2, 15, 13 };

// Variáveis de controle de movimento e temporização
unsigned long ultimoMovimento[6] = { 0, 0, 0, 0, 0, 0 };
bool movimentoRegistrado[6]       = { false, false, false, false, false, false };

// Nível atual de cada poste para telemetria (0%, 30%, 60% ou 100%)
int intensidadeAtual[6] = { 0, 0, 0, 0, 0, 0 };

// Temporização não-bloqueante para o Serial Monitor
unsigned long ultimoPrintSerial = 0;

// Controla a intensidade de um poste inteligente via PWM
void controlarPoste(int poste, int intensidade) {
  intensidadeAtual[poste] = intensidade;
  int valorPWM = PWM_0;

  if (intensidade == 30) {
    valorPWM = PWM_30;
  } else if (intensidade == 60) {
    valorPWM = PWM_60;
  } else if (intensidade == 100) {
    valorPWM = PWM_100;
  } else {
    valorPWM = PWM_0;
  }

  analogWrite(postes[poste], valorPWM);
}

// Controla os 6 postes convencionais (100% à noite, 0% de dia)
void controlarPostesConvencionais(bool ligar) {
  int nivel = ligar ? HIGH : LOW;
  for (int i = 0; i < 6; i++) {
    digitalWrite(postesConvencionais[i], nivel);
  }
}

// FUNÇÃO QUE CALCULA A INTENSIDADE DE CADA POSTE
void atualizarPostes() {
  unsigned long agora = millis();

  // Verifica se algum PIR detectou movimento agora
  for (int i = 0; i < 6; i++) {
    if (digitalRead(pirs[i]) == HIGH) {
      ultimoMovimento[i] = agora;
      movimentoRegistrado[i] = true;
    }
  }

  // Todos os postes começam em 30% à noite (iluminação base de segurança)
  int intensidade[6] = { 30, 30, 30, 30, 30, 30 };

  // Verifica os movimentos que ainda estão dentro dos 10 segundos
  for (int i = 0; i < 6; i++) {
    if (movimentoRegistrado[i] && (agora - ultimoMovimento[i] < TEMPO_ATIVO)) {
      // Poste onde houve movimento = 100%
      intensidade[i] = 100;

      // Poste da esquerda = pelo menos 60%
      if (i > 0) {
        if (intensidade[i - 1] < 60) {
          intensidade[i - 1] = 60;
        }
      }

      // Poste da direita = pelo menos 60%
      if (i < 5) {
        if (intensidade[i + 1] < 60) {
          intensidade[i + 1] = 60;
        }
      }
    }
  }

  // Aplica as intensidades nos 6 postes inteligentes
  for (int i = 0; i < 6; i++) {
    controlarPoste(i, intensidade[i]);
  }
}

// Lê o valor do sensor de luminosidade LDR (0 a 4095)
int lerLuminosidade() {
  return analogRead(PINO_LDR);
}

// Verifica se é dia ou noite com base no limiar
bool verificarDiaNoite(int valorLDR) {
  return (valorLDR >= LIMIAR_LDR); // true = DIA, false = NOITE
}

void setup() {
  Serial.begin(115200);

  // Configura os postes inteligentes como saída
  for (int i = 0; i < 6; i++) {
    pinMode(postes[i], OUTPUT);
    analogWrite(postes[i], 0);
  }

  // Configura os postes convencionais como saída
  for (int i = 0; i < 6; i++) {
    pinMode(postesConvencionais[i], OUTPUT);
    digitalWrite(postesConvencionais[i], LOW);
  }

  // Configura os PIRs como entrada
  for (int i = 0; i < 6; i++) {
    pinMode(pirs[i], INPUT);
  }

  // Configura o pino do LDR
  pinMode(PINO_LDR, INPUT);

  Serial.println("\n==================================================");
  Serial.println("  SISTEMA DE ILUMINACAO PUBLICA INTELIGENTE");
  Serial.println("       ESP32 + LDR + 6x PIR + PWM");
  Serial.println("==================================================");
  Serial.println("Sistema iniciado e pronto para operacao!\n");
}

void loop() {
  // Lê o valor do LDR
  int valorLDR = lerLuminosidade();

  // Verifica se é dia ou noite
  bool dia = verificarDiaNoite(valorLDR);

  if (dia) {
    // Durante o dia: todos os postes ficam desligados (0%)
    for (int i = 0; i < 6; i++) {
      controlarPoste(i, 0);
      movimentoRegistrado[i] = false;
    }
    controlarPostesConvencionais(false);
  } else {
    // Durante a noite: convencionais em 100% e inteligentes com base 30% + dimerização
    controlarPostesConvencionais(true);
    atualizarPostes();
  }

  // Telemetria no Serial a cada 500ms
  if (millis() - ultimoPrintSerial >= 500) {
    ultimoPrintSerial = millis();

    Serial.print("LDR: ");
    Serial.print(valorLDR);
    if (dia) {
      Serial.print(" | DIA (0%) - Cubra o LDR para simular NOITE");
    } else {
      Serial.print(" | NOITE (Base 30%)");
    }

    Serial.print(" | PIRs: [");
    for (int i = 0; i < 6; i++) {
      Serial.print(digitalRead(pirs[i]));
      if (i < 5) Serial.print(" ");
    }
    Serial.print("] | Postes: [");
    for (int i = 0; i < 6; i++) {
      Serial.print(intensidadeAtual[i]);
      Serial.print("%");
      if (i < 5) Serial.print(" ");
    }
    Serial.println("]");
  }

  delay(20);
}
