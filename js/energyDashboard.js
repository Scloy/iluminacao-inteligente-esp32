/**
 * Dashboard de Energia & Economia
 * Mede em tempo real o gasto de energia dos postes inteligentes versus a
 * iluminação convencional (100% a noite toda), calcula energia poupada,
 * custo evitado, CO2 evitado, distribuição de níveis PWM por poste e
 * projeções (noite / mês / ano / escala de cidade).
 */

class EnergyDashboard {
  constructor(controller) {
    this.ctrl = controller;

    // Parâmetros editáveis (aba Projeções)
    // Valores de referência: São Sebastião do Paraíso - MG (concessionária Cemig)
    this.params = {
      tariff: 0.39,        // R$/kWh - Cemig B4a (Iluminação Pública) bandeira verde
                           // R$ 0,35663 (REH ANEEL 3.459/2025) + PIS/COFINS ~9,25%
      hoursPerNight: 12,   // média anual de noite a ~20,9°S (varia ~10h50 a ~13h10)
      cityPoles: 10000,    // estimativa de pontos de IP (~71 mil hab., Censo 2022)
      co2Factor: 0.0545,   // kg CO2/kWh - fator médio do SIN 2024 (MCTI)
      homeKwhMonth: 140,   // consumo médio residencial Cemig (~133-145 kWh/mês)
      treeKgCo2Year: 22    // CO2 absorvido por árvore/ano (referência usual)
    };

    this.HISTORY_SECONDS = 60;
    this.SAMPLE_INTERVAL = 0.25;
    this.maxSamples = Math.round(this.HISTORY_SECONDS / this.SAMPLE_INTERVAL);

    this.activeTab = 'overview';
    this.uiAccumulator = 0;
    this.sampleAccumulator = 0;

    this.resetSession();
    this.cacheDom();
    this.buildPoleRows();
    this.bindEvents();
    this.render(true);
  }

  resetSession() {
    this.history = [];
    this.nightSeconds = 0;
    this.poleEnergyJ = [0, 0, 0, 0, 0, 0];
    // Tempo (s) de cada poste em cada faixa: [desligado, base, vizinho, principal]
    this.poleLevelTime = Array.from({ length: 6 }, () => [0, 0, 0, 0]);
    this.ctrl.totalSmartEnergyJoules = 0;
    this.ctrl.totalConvEnergyJoules = 0;
  }

  cacheDom() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      window: $('win-energy'),
      powerSmart: $('ed-power-smart'),
      powerConv: $('ed-power-conv'),
      energySmart: $('ed-energy-smart'),
      energyConv: $('ed-energy-conv'),
      energySaved: $('ed-energy-saved'),
      co2Saved: $('ed-co2-saved'),
      moneySaved: $('ed-money-saved'),
      tariffLabel: $('ed-tariff-label'),
      chart: $('ed-power-chart'),
      gaugeFill: $('ed-gauge-fill'),
      gaugeValue: $('ed-gauge-value'),
      sessionPercent: $('ed-session-percent'),
      nightTime: $('ed-night-time'),
      poleList: $('ed-pole-list'),
      levelLegend: $('ed-level-legend'),
      cmpConv: $('ed-cmp-conv'),
      cmpSmart: $('ed-cmp-smart'),
      cmpConvVal: $('ed-cmp-conv-val'),
      cmpSmartVal: $('ed-cmp-smart-val'),
      projRatio: $('ed-proj-ratio'),
      projCityLabel: $('ed-proj-city-label'),
      eqHomes: $('ed-eq-homes'),
      eqCo2: $('ed-eq-co2'),
      eqTrees: $('ed-eq-trees'),
      eqMoney: $('ed-eq-money'),
      paramWatts: $('ed-param-watts'),
      paramTariff: $('ed-param-tariff'),
      paramHours: $('ed-param-hours'),
      paramCity: $('ed-param-city'),
      paramCo2: $('ed-param-co2'),
      btnReset: $('btn-energy-reset')
    };
    this.gaugeCircumference = 2 * Math.PI * 40;
  }

  buildPoleRows() {
    if (!this.el.poleList) return;
    this.poleRowEls = [];
    let html = '';
    for (let i = 0; i < 6; i++) {
      html += `
        <div class="ed-pole-row">
          <span class="ed-pole-name">P${i + 1}</span>
          <div class="ed-stack" title="Distribuição do tempo noturno">
            <div class="seg lvl-0" id="ed-seg-${i}-0"></div>
            <div class="seg lvl-1" id="ed-seg-${i}-1"></div>
            <div class="seg lvl-2" id="ed-seg-${i}-2"></div>
            <div class="seg lvl-3" id="ed-seg-${i}-3"></div>
          </div>
          <span class="ed-pole-energy" id="ed-pole-energy-${i}">0.00 Wh</span>
          <span class="ed-pole-saving" id="ed-pole-saving-${i}">--</span>
        </div>`;
    }
    this.el.poleList.innerHTML = html;
    for (let i = 0; i < 6; i++) {
      this.poleRowEls.push({
        segs: [0, 1, 2, 3].map(l => document.getElementById(`ed-seg-${i}-${l}`)),
        energy: document.getElementById(`ed-pole-energy-${i}`),
        saving: document.getElementById(`ed-pole-saving-${i}`)
      });
    }
  }

  bindEvents() {
    document.querySelectorAll('#win-energy .ed-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        document.querySelectorAll('#win-energy .ed-tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('#win-energy .ed-panel').forEach(p => {
          p.classList.toggle('active', p.dataset.panel === this.activeTab);
        });
        this.render(true);
        if (this.activeTab === 'overview') this.drawChart();
      });
    });

    if (this.el.btnReset) {
      this.el.btnReset.addEventListener('click', () => {
        this.resetSession();
        this.render(true);
      });
    }

    const bindParam = (input, apply) => {
      if (!input) return;
      input.addEventListener('input', () => {
        const v = parseFloat(String(input.value).replace(',', '.'));
        if (!isNaN(v) && v >= 0) {
          apply(v);
          this.render(true);
        }
      });
    };

    if (this.el.paramWatts) this.el.paramWatts.value = this.ctrl.powerNominalWattsPerPole;
    bindParam(this.el.paramWatts, v => { this.ctrl.powerNominalWattsPerPole = v; });
    bindParam(this.el.paramTariff, v => { this.params.tariff = v; });
    bindParam(this.el.paramHours, v => { this.params.hoursPerNight = Math.min(24, v); });
    bindParam(this.el.paramCity, v => { this.params.cityPoles = Math.round(v); });
    bindParam(this.el.paramCo2, v => { this.params.co2Factor = v; });

    window.addEventListener('resize', () => this.drawChart());
  }

  /** Faixa de PWM: 0 = desligado, 1 = base, 2 = vizinho, 3 = principal */
  levelIndex(pwm) {
    const c = this.ctrl;
    if (pwm <= 0) return 0;
    if (pwm >= c.intensityMain) return 3;
    if (pwm >= c.intensityNeighbor) return 2;
    return 1;
  }

  getInstantPower() {
    const nominal = this.ctrl.powerNominalWattsPerPole;
    const conv = (this.ctrl.conventionalPolesPWM / 100) * nominal * 6;
    const smart = this.ctrl.smartPolesPWM.reduce((acc, p) => acc + (p / 100) * nominal, 0);
    return { conv, smart };
  }

  /** Chamado a cada quadro pelo loop principal */
  update(delta) {
    const nominal = this.ctrl.powerNominalWattsPerPole;
    const isNight = !this.ctrl.isDay;

    if (isNight) {
      this.nightSeconds += delta;
      for (let i = 0; i < 6; i++) {
        const pwm = this.ctrl.smartPolesPWM[i];
        this.poleEnergyJ[i] += (pwm / 100) * nominal * delta;
        this.poleLevelTime[i][this.levelIndex(pwm)] += delta;
      }
    }

    this.sampleAccumulator += delta;
    if (this.sampleAccumulator >= this.SAMPLE_INTERVAL) {
      this.sampleAccumulator = 0;
      this.history.push(this.getInstantPower());
      if (this.history.length > this.maxSamples) this.history.shift();
      if (this.isVisible() && this.activeTab === 'overview') this.drawChart();
    }

    this.uiAccumulator += delta;
    if (this.uiAccumulator >= 0.1) {
      this.uiAccumulator = 0;
      this.render(false);
    }
  }

  isVisible() {
    const w = this.el.window;
    return w && !w.classList.contains('hidden') && !w.classList.contains('collapsed');
  }

  /** Razão de economia observada na sessão (fallback: instantânea) */
  getSavingsRatio() {
    const conv = this.ctrl.totalConvEnergyJoules;
    const smart = this.ctrl.totalSmartEnergyJoules;
    if (conv > 1) return Math.max(0, (conv - smart) / conv);
    const p = this.getInstantPower();
    if (p.conv > 0) return Math.max(0, (p.conv - p.smart) / p.conv);
    const c = this.ctrl;
    return Math.max(0, 1 - c.intensityBase / 100);
  }

  render(force) {
    if (!force && !this.isVisible()) return;

    const p = this.getInstantPower();
    const convWh = this.ctrl.totalConvEnergyJoules / 3600;
    const smartWh = this.ctrl.totalSmartEnergyJoules / 3600;
    const savedWh = Math.max(0, convWh - smartWh);
    const savedKwh = savedWh / 1000;

    // ---- Visão Geral ----
    this.setText(this.el.powerSmart, `${Math.round(p.smart)} W`);
    this.setText(this.el.powerConv, `${Math.round(p.conv)} W`);
    this.setText(this.el.energySmart, this.fmtWh(smartWh));
    this.setText(this.el.energyConv, this.fmtWh(convWh));
    this.setText(this.el.energySaved, this.fmtWh(savedWh));
    this.setText(this.el.co2Saved, this.fmtMass(savedKwh * this.params.co2Factor));
    this.setText(this.el.moneySaved, this.fmtMoney(savedKwh * this.params.tariff, true));
    this.setText(this.el.tariffLabel, this.fmtMoney(this.params.tariff));

    const instant = p.conv > 0 ? Math.max(0, (p.conv - p.smart) / p.conv) : 0;
    if (this.el.gaugeFill) {
      this.el.gaugeFill.style.strokeDasharray = `${this.gaugeCircumference}`;
      this.el.gaugeFill.style.strokeDashoffset = `${this.gaugeCircumference * (1 - instant)}`;
      this.el.gaugeFill.style.stroke = instant >= 0.5 ? '#10b981' : instant >= 0.25 ? '#f59e0b' : '#f43f5e';
    }
    this.setText(this.el.gaugeValue, p.conv > 0 ? `${(instant * 100).toFixed(0)}%` : '—');
    this.setText(this.el.sessionPercent, convWh > 0.0003 ? `${((savedWh / convWh) * 100).toFixed(1)}%` : '--');
    this.setText(this.el.nightTime, this.fmtDuration(this.nightSeconds));

    // ---- Por Poste ----
    if (force || this.activeTab === 'poles') this.renderPoles(convWh, smartWh);

    // ---- Projeções ----
    if (force || this.activeTab === 'projection') this.renderProjections();
  }

  renderPoles(convWh, smartWh) {
    const c = this.ctrl;
    const nominal = c.powerNominalWattsPerPole;
    if (this.el.levelLegend) {
      const labels = [`0%`, `${c.intensityBase}%`, `${c.intensityNeighbor}%`, `${c.intensityMain}%`];
      const html = labels.map((l, idx) => `<i class="lvl-${idx}"></i>${l}`).join(' ');
      if (this.el.levelLegend.dataset.cache !== html) {
        this.el.levelLegend.innerHTML = html;
        this.el.levelLegend.dataset.cache = html;
      }
    }

    for (let i = 0; i < 6; i++) {
      const row = this.poleRowEls && this.poleRowEls[i];
      if (!row) continue;
      const times = this.poleLevelTime[i];
      const total = times.reduce((a, b) => a + b, 0);
      times.forEach((t, l) => {
        if (row.segs[l]) row.segs[l].style.width = total > 0 ? `${(t / total) * 100}%` : (l === 0 ? '100%' : '0%');
      });
      const wh = this.poleEnergyJ[i] / 3600;
      const convPoleWh = (nominal * this.nightSeconds) / 3600;
      this.setText(row.energy, this.fmtWh(wh));
      this.setText(row.saving, convPoleWh > 0.0001 ? `-${Math.max(0, (1 - wh / convPoleWh) * 100).toFixed(0)}%` : '--');
    }

    const max = Math.max(convWh, smartWh, 0.000001);
    if (this.el.cmpConv) this.el.cmpConv.style.width = `${(convWh / max) * 100}%`;
    if (this.el.cmpSmart) this.el.cmpSmart.style.width = `${(smartWh / max) * 100}%`;
    this.setText(this.el.cmpConvVal, this.fmtWh(convWh));
    this.setText(this.el.cmpSmartVal, this.fmtWh(smartWh));
  }

  renderProjections() {
    const ratio = this.getSavingsRatio();
    const nominal = this.ctrl.powerNominalWattsPerPole;
    const { hoursPerNight, tariff, cityPoles, co2Factor } = this.params;

    this.setText(this.el.projRatio, `${(ratio * 100).toFixed(1)}%`);
    this.setText(this.el.projCityLabel, `Cidade (${cityPoles.toLocaleString('pt-BR')} postes) / ano`);

    const perPoleNightConvKwh = (nominal * hoursPerNight) / 1000;
    const scopes = {
      night: { poles: 6, nights: 1 },
      month: { poles: 6, nights: 30 },
      year: { poles: 6, nights: 365 },
      city: { poles: cityPoles, nights: 365 }
    };

    let cityResult = null;
    Object.entries(scopes).forEach(([key, s]) => {
      const conv = perPoleNightConvKwh * s.poles * s.nights;
      const smart = conv * (1 - ratio);
      const saved = conv - smart;
      const money = saved * tariff;
      this.setCell(`ed-proj-${key}-conv`, this.fmtKwh(conv));
      this.setCell(`ed-proj-${key}-smart`, this.fmtKwh(smart));
      this.setCell(`ed-proj-${key}-saved`, this.fmtKwh(saved));
      this.setCell(`ed-proj-${key}-money`, this.fmtMoney(money));
      if (key === 'city') cityResult = { saved, money };
    });

    if (cityResult) {
      const homes = cityResult.saved / (this.params.homeKwhMonth * 12);
      const co2Kg = cityResult.saved * co2Factor;
      const trees = co2Kg / this.params.treeKgCo2Year;
      this.setText(this.el.eqHomes, Math.round(homes).toLocaleString('pt-BR'));
      this.setText(this.el.eqCo2, this.fmtMass(co2Kg));
      this.setText(this.el.eqTrees, Math.round(trees).toLocaleString('pt-BR'));
      this.setText(this.el.eqMoney, this.fmtMoney(cityResult.money));
    }
  }

  drawChart() {
    const canvas = this.el.chart;
    if (!canvas || !canvas.clientWidth) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padL = 34, padR = 6, padT = 6, padB = 14;
    const cw = w - padL - padR;
    const ch = h - padT - padB;
    const maxW = Math.max(this.ctrl.powerNominalWattsPerPole * 6, 1);

    // Grade e eixo Y
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let g = 0; g <= 4; g++) {
      const y = padT + ch - (g / 4) * ch;
      ctx.beginPath();
      ctx.moveTo(padL, y + 0.5);
      ctx.lineTo(padL + cw, y + 0.5);
      ctx.stroke();
      ctx.fillText(`${Math.round((g / 4) * maxW)}W`, padL - 4, y);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`-${this.HISTORY_SECONDS}s`, padL, h - 2);
    ctx.textAlign = 'right';
    ctx.fillText('agora', padL + cw, h - 2);

    const data = this.history;
    if (data.length < 2) return;

    const xAt = (idx) => padL + cw - ((data.length - 1 - idx) / (this.maxSamples - 1)) * cw;
    const yAt = (v) => padT + ch - Math.min(1, v / maxW) * ch;

    // Área de economia (entre convencional e inteligente)
    ctx.beginPath();
    data.forEach((d, i) => { const x = xAt(i), y = yAt(d.conv); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    for (let i = data.length - 1; i >= 0; i--) ctx.lineTo(xAt(i), yAt(data[i].smart));
    ctx.closePath();
    ctx.fillStyle = 'rgba(16,185,129,0.22)';
    ctx.fill();

    // Área sob o consumo inteligente
    ctx.beginPath();
    data.forEach((d, i) => { const x = xAt(i), y = yAt(d.smart); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.lineTo(xAt(data.length - 1), padT + ch);
    ctx.lineTo(xAt(0), padT + ch);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
    grad.addColorStop(0, 'rgba(6,182,212,0.28)');
    grad.addColorStop(1, 'rgba(6,182,212,0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    const line = (key, color, dash) => {
      ctx.beginPath();
      data.forEach((d, i) => { const x = xAt(i), y = yAt(d[key]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.setLineDash(dash || []);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    line('conv', '#f59e0b', [4, 3]);
    line('smart', '#06b6d4');
  }

  // ---------- Helpers ----------
  setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  setCell(id, text) {
    this.setText(document.getElementById(id), text);
  }

  fmtWh(wh) {
    if (wh >= 1000) return `${(wh / 1000).toFixed(3)} kWh`;
    if (wh >= 100) return `${wh.toFixed(1)} Wh`;
    return `${wh.toFixed(2)} Wh`;
  }

  fmtKwh(kwh) {
    if (kwh >= 1e6) return `${(kwh / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GWh`;
    if (kwh >= 1e3) return `${(kwh / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MWh`;
    return `${kwh.toLocaleString('pt-BR', { maximumFractionDigits: kwh < 10 ? 2 : 1 })} kWh`;
  }

  fmtMass(kg) {
    if (kg >= 1000) return `${(kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} t`;
    if (kg >= 1) return `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
    const g = kg * 1000;
    return `${g.toLocaleString('pt-BR', { maximumFractionDigits: g < 1 ? 3 : 1 })} g`;
  }

  fmtMoney(value, allowTiny = false) {
    const digits = allowTiny && value > 0 && value < 0.01 ? 4 : 2;
    return value.toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL',
      minimumFractionDigits: digits, maximumFractionDigits: digits
    });
  }

  fmtDuration(sec) {
    const s = Math.floor(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(r).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
}

window.EnergyDashboard = EnergyDashboard;
