/* ============================================================
   Casa Servicios — Lógica de la aplicación
   ============================================================ */

const STORAGE_KEY = 'casa_servicios_v1';

// ---------- Estado ----------
let state = null; // se inicializa en arrancarApp(), tras descifrar los datos

// Recibe los datos descifrados desde crypto.js y pone en marcha la app.
function arrancarApp(datos) {
  PERSONAS = datos.PERSONAS;
  TODOS = datos.TODOS;
  CONFIG_DEFAULT = datos.CONFIG_DEFAULT;
  SERVICIOS = datos.SERVICIOS;
  SERVICIOS_VARIABLES = SERVICIOS.filter(s => s.tipo === 'variable');
  MESES_SEMILLA = datos.MESES_SEMILLA;
  state = cargarEstado();
  init();
}

function cargarEstado() {
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (guardado) {
    try { return JSON.parse(guardado); } catch (e) { /* ignora y usa semilla */ }
  }
  return {
    config: structuredClone(CONFIG_DEFAULT),
    meses: structuredClone(MESES_SEMILLA),
  };
}

function guardarEstado() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nombrePersona(id) {
  const p = PERSONAS.find(x => x.id === id);
  return p ? p.nombre : id;
}
function colorPersona(id) {
  const p = PERSONAS.find(x => x.id === id);
  return p ? p.color : '#666';
}
const S = n => 'S/ ' + Math.round(n).toLocaleString('es-PE');

// ---------- Motor de cálculo ----------
// Devuelve el monto que le corresponde a 'personaId' por un servicio en un mes.
function montoServicio(servicio, personaId, mes, config) {
  if (!servicio.participantes.includes(personaId)) return null;

  if (servicio.tipo === 'variable') {
    const v = mes.vars[servicio.id];
    if (!v) return null;
    if (servicio.reparto === 'luz') {
      // Quien paga fijo (definido en el dato) usa el monto fijo; los demás, el 'share'
      if (personaId === servicio.fijoPersona) return config.luzFijo;
      return v.share || 0;
    }
    return v.share || 0; // iguales
  }

  // Fijos
  const total = config.fijos[servicio.fijoKey] ?? 0;
  const n = servicio.participantes.length;

  if (servicio.reparto === 'individual') return total;

  const cuota = Math.round(total / n);
  if (servicio.pagador === personaId) {
    // Quien adelanta la suscripción: paga su cuota pero cobra el resto → neto = cuota - total
    return cuota - total;
  }
  return cuota;
}

// Devuelve el desglose completo de una persona en un mes.
function desglosePersona(personaId, mes, config) {
  const lineas = [];
  let total = 0;
  for (const serv of SERVICIOS) {
    const monto = montoServicio(serv, personaId, mes, config);
    if (monto === null) continue;
    if (monto === 0 && serv.tipo === 'variable') continue; // omite variables en 0 (ej. gas SB algunos meses)
    lineas.push({
      id: serv.id, concepto: serv.nombre, icono: serv.icono, grupo: serv.grupo,
      monto, esCredito: monto < 0,
    });
    total += monto;
  }
  return { personaId, lineas, total };
}

function desgloseMes(mes, config) {
  return PERSONAS.map(p => desglosePersona(p.id, mes, config));
}

function mesActual() {
  return state.meses.find(m => m.id === state.mesSeleccionado) || state.meses[state.meses.length - 1];
}

// ---------- Navegación por pestañas ----------
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activarTab(btn.dataset.tab));
  });
}
function activarTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
  document.body.classList.toggle('resumen-activa', tab === 'resumen');
  if (tab === 'resumen') renderResumen();
  if (tab === 'registro') renderRegistro();
  if (tab === 'recibos') renderRecibos();
  if (tab === 'historico') renderHistorico();
  if (tab === 'graficos') renderGraficos();
}

// ---------- Selector de mes ----------
function renderSelectorMes(selectId, onChange) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '';
  [...state.meses].reverse().forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id; opt.textContent = m.etiqueta;
    sel.appendChild(opt);
  });
  sel.value = state.mesSeleccionado;
  sel.onchange = () => { state.mesSeleccionado = sel.value; onChange(); };
}

// ============================================================
//  DASHBOARD (inicio): progreso, cambios y alertas
// ============================================================
function cambioPct(cur, prev) {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return Math.round(((cur - prev) / prev) * 100);
}
function mesPrevio(mes) {
  const idx = state.meses.findIndex(m => m.id === mes.id);
  return idx > 0 ? state.meses[idx - 1] : null;
}

const RECOMENDACIONES = {
  luz:    'Revisa focos encendidos y aparatos en standby. Mira los tips de ahorro de luz.',
  agua:   'Puede haber una fuga o mayor uso. Revisa caños, la ducha y el inodoro.',
  gas:    'Mayor uso de cocina o terma. Verifica que no queden hornillas prendidas.',
  luz_sb: 'Subió la luz de San Bartolo. Verifica el consumo de esa casa.',
  agua_sb:'Subió el agua de San Bartolo. Revisa posibles fugas.',
  gas_sb: 'Subió el gas de San Bartolo.',
};

function generarAlertas(mes, prev) {
  if (!prev) {
    return [{ tipo: 'info', icono: '📋', titulo: 'Primer mes registrado',
      texto: 'Desde el próximo mes verás aquí las comparaciones y alertas de consumo.' }];
  }
  const out = [];
  SERVICIOS_VARIABLES.forEach(s => {
    const cur = (mes.vars[s.id] && mes.vars[s.id].total) || 0;
    const pv = (prev.vars[s.id] && prev.vars[s.id].total) || 0;
    if (cur === 0 && pv === 0) return;
    const pct = cambioPct(cur, pv);
    if (pct >= 8) {
      out.push({ tipo: 'up', icono: s.icono, prioridad: pct,
        titulo: `${s.nombre} subió ${pct}%`,
        texto: `Pasó de ${S(pv)} a ${S(cur)}. ${RECOMENDACIONES[s.id] || 'Revisa el consumo de este servicio.'}` });
    } else if (pct <= -8) {
      out.push({ tipo: 'down', icono: s.icono, prioridad: -pct,
        titulo: `${s.nombre} bajó ${Math.abs(pct)}%`,
        texto: `Bajó de ${S(pv)} a ${S(cur)}. ¡Buen trabajo! 👏` });
    }
  });
  // Primero las subidas (más importantes), luego las bajadas
  out.sort((a, b) => (a.tipo === b.tipo ? (b.prioridad || 0) - (a.prioridad || 0) : a.tipo === 'up' ? -1 : 1));
  if (out.length === 0) {
    out.push({ tipo: 'info', icono: '✅', titulo: 'Consumo estable',
      texto: 'No hay cambios importantes respecto al mes anterior.' });
  }
  return out;
}

// ---------- Componentes del Resumen ----------
function donutChartSVG(items) {
  // items: [{label, valor, color}] — anillo tipo dona con leyenda
  const total = items.reduce((a, x) => a + x.valor, 0) || 1;
  const R = 42, C = 2 * Math.PI * R;
  let offset = 0;
  const segs = items.map(x => {
    const frac = x.valor / total;
    const seg = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${x.color}" stroke-width="20"
      stroke-dasharray="${(frac * C).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-offset * C).toFixed(2)}"
      transform="rotate(-90 60 60)"><title>${x.label}: ${(frac * 100).toFixed(1)}%</title></circle>`;
    offset += frac;
    return seg;
  }).join('');
  const leyenda = items.map(x => `
    <div class="donut-leg-row">
      <span class="leg-dot" style="background:${x.color}"></span>
      <span class="donut-leg-lbl">${x.label}</span>
      <span class="donut-leg-val">${((x.valor / total) * 100).toFixed(1)}%</span>
    </div>`).join('');
  return `<div class="donut-wrap">
    <svg viewBox="0 0 120 120" class="donut">${segs}</svg>
    <div class="donut-leg">${leyenda}</div>
  </div>`;
}

function miniBarChartHTML(mesSel) {
  const meses = state.meses;
  const totales = meses.map(m => desgloseMes(m, state.config).reduce((a, d) => a + d.total, 0));
  const maxV = Math.max(1, ...totales);
  return `<div class="minibars">` + meses.map((m, i) => `
    <div class="minibar-col" title="${m.etiqueta}: ${S(totales[i])}">
      <div class="minibar ${m.id === mesSel.id ? 'cur' : ''}" style="height:${Math.max(6, (totales[i] / maxV) * 100)}%;--i:${i}"></div>
      <span class="minibar-lbl">${m.etiqueta.split(' ')[0].slice(0, 3)}</span>
    </div>`).join('') + `</div>`;
}

function calculadoraHTML() {
  const opts = ELECTRODOMESTICOS.map(e =>
    `<option value="${e.id}">${e.nombre} (${e.watts} W)</option>`).join('');
  return `
    <div class="card side-card calc-card">
      <h3>⚡ Calculadora de consumo</h3>
      <p class="calc-nota">Estilo calculadora de eficiencia energética del MINEM.</p>
      <label class="calc-lbl">Electrodoméstico</label>
      <select id="calc-aparato">${opts}</select>
      <div class="calc-row">
        <div><label class="calc-lbl">Cantidad</label><input type="number" id="calc-cant" min="1" value="1"></div>
        <div><label class="calc-lbl">Horas al día</label><input type="number" id="calc-horas" min="0" step="0.1" value="5"></div>
      </div>
      <div class="calc-result" id="calc-result"></div>
    </div>`;
}

function calcularConsumo() {
  const ap = ELECTRODOMESTICOS.find(e => e.id === document.getElementById('calc-aparato').value);
  if (!ap) return;
  const cant = parseFloat(document.getElementById('calc-cant').value) || 1;
  const horas = parseFloat(document.getElementById('calc-horas').value) || 0;
  const kwhMes = (ap.watts * horas * 30 * cant) / 1000;
  const costo = kwhMes * TARIFAS.luz.efectivoKwh;
  document.getElementById('calc-result').innerHTML = `
    <div class="calc-kwh">${kwhMes.toFixed(1)} kWh/mes</div>
    <div class="calc-soles">≈ ${S(costo)} al mes</div>
    <div class="calc-det">Tarifa ${TARIFAS.luz.proveedor} ≈ S/ ${TARIFAS.luz.efectivoKwh.toFixed(2)}/kWh (incl. IGV y alumbrado)</div>`;
}

function tarifasHTML() {
  const t = TARIFAS;
  const luzTramos = t.luz.tramos.map(x =>
    x.hasta === Infinity ? `S/ ${x.precio.toFixed(2)} (+140 kWh)` : `S/ ${x.precio.toFixed(2)} (≤${x.hasta})`).join(' · ');
  const aguaFmt = a => a.tramos.map(x =>
    x.hasta === Infinity ? `S/ ${x.precio.toFixed(2)}` : `S/ ${x.precio.toFixed(2)} (≤${x.hasta} m³)`).slice(0, 2).join(' · ');
  return `
    <div class="card side-card tarifas-card">
      <h3>💲 Tarifas de referencia</h3>
      <div class="tarifa-item"><span class="tarifa-ico">⚡</span>
        <div><strong>Luz — ${t.luz.proveedor}</strong><span>Ambas casas · por kWh: ${luzTramos}</span></div></div>
      <div class="tarifa-item"><span class="tarifa-ico">💧</span>
        <div><strong>Agua Lima — ${t.agua.lima.proveedor}</strong><span>${aguaFmt(t.agua.lima)} y más por tramo</span></div></div>
      <div class="tarifa-item"><span class="tarifa-ico">💧</span>
        <div><strong>Agua San Bartolo — ${t.agua.sb.proveedor}</strong><span>${aguaFmt(t.agua.sb)} y más por tramo</span></div></div>
      <p class="calc-nota">Valores aproximados 2026. El recibo final agrega IGV y cargos fijos.</p>
    </div>`;
}

// ============================================================
//  PESTAÑA: RESUMEN (inicio)
// ============================================================
function renderResumen() {
  const cont = document.getElementById('resumen-content');
  const mes = mesActual();
  const prev = mesPrevio(mes);
  const desg = desgloseMes(mes, state.config);
  const totalCasa = desg.reduce((a, d) => a + d.total, 0);
  const prevTotalCasa = prev ? desgloseMes(prev, state.config).reduce((a, d) => a + d.total, 0) : 0;

  const g = id => (mes.vars[id] && mes.vars[id].total) || 0;
  const gp = id => prev ? ((prev.vars[id] && prev.vars[id].total) || 0) : 0;

  const metrica = (icono, label, cur, pv, color, i) => {
    const pct = prev ? cambioPct(cur, pv) : null;
    const cls = pct === null || pct === 0 ? 'flat' : pct > 0 ? 'up' : 'down';
    const arrow = pct === null ? '' : pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
    const delta = pct === null ? '<span class="metric-delta flat">nuevo</span>'
      : `<span class="metric-delta ${cls}">${arrow} ${Math.abs(pct)}%</span><span class="metric-prev">${S(pv)}</span>`;
    return `<div class="metric" style="--c:${color};--i:${i}">
      <div class="metric-ico" style="--c:${color}">${icono}</div>
      <div class="metric-body">
        <span class="metric-label">${label}</span>
        <span class="metric-val" data-count="${cur}">${S(cur)}</span>
        <span class="metric-foot">${delta}</span>
      </div></div>`;
  };

  const metricas = [
    metrica('🧾', 'Total del mes', totalCasa, prevTotalCasa, '#0ea5e9', 0),
    metrica('💡', 'Luz (casa)', g('luz'), gp('luz'), '#f59e0b', 1),
    metrica('💧', 'Agua (casa)', g('agua'), gp('agua'), '#2563eb', 2),
    metrica('🔥', 'Gas Cálidda', g('gas'), gp('gas'), '#dc2626', 3),
  ].join('');

  const alertas = generarAlertas(mes, prev);
  const alertasHTML = alertas.map((a, i) => `
    <div class="alerta alerta-${a.tipo}" style="--i:${i}">
      <div class="alerta-ico">${a.icono}</div>
      <div class="alerta-txt"><strong>${a.titulo}</strong><span>${a.texto}</span></div>
      <button class="alerta-link" data-goto="tips">Ver tips</button>
    </div>`).join('');

  const heroHTML = TIP_CARDS.map((c, i) => `
    <button class="tip-hero" data-goto="${c.tab}" style="--grad:${c.grad};--i:${i}">
      <span class="tip-hero-ico">${c.icono}</span>
      <span class="tip-hero-txt"><strong>${c.titulo}</strong><span>${c.desc}</span></span>
      <span class="tip-hero-arrow">→</span>
    </button>`).join('');

  // Distribución del total (con base en los recibos variables vs el resto)
  const distribucion = donutChartSVG([
    { label: 'Luz (casa)', valor: g('luz'), color: '#2563eb' },
    { label: 'Agua (casa)', valor: g('agua'), color: '#38bdf8' },
    { label: 'Gas Cálidda', valor: g('gas'), color: '#f59e0b' },
    { label: 'Otros servicios', valor: Math.max(0, totalCasa - g('luz') - g('agua') - g('gas')), color: '#4ade80' },
  ]);

  const porPersona = desg.map(d => `
    <div class="pp-row">
      <span class="pp-avatar" style="background:${colorPersona(d.personaId)}">${nombrePersona(d.personaId).charAt(0)}</span>
      <span class="pp-nombre">${nombrePersona(d.personaId)}</span>
      <span class="pp-monto" data-count="${d.total}">${S(d.total)}</span>
    </div>`).join('');

  const pctTotal = prev ? cambioPct(totalCasa, prevTotalCasa) : null;
  const badgeTotal = pctTotal === null ? '' :
    `<span class="metric-delta ${pctTotal > 0 ? 'up' : pctTotal < 0 ? 'down' : 'flat'}">${pctTotal > 0 ? '▲' : pctTotal < 0 ? '▼' : '—'} ${Math.abs(pctTotal)}% vs ${prev.etiqueta.split(' ')[0]}</span>`;

  cont.innerHTML = `
    <div class="dash-fit">
      <div class="dash-head">
        <h2>📊 Resumen — ${mes.etiqueta}</h2>
        <div class="dash-head-right">${badgeTotal}<select id="sel-mes-resumen"></select></div>
      </div>
      <div class="metrics">${metricas}</div>
      <div class="dash-grid">
        <div class="dash-col col-a">
          <div class="card side-card alertas-card">
            <h3 class="alertas-title">🔔 Sugerencias y alertas</h3>
            <div class="alertas alertas-grid">${alertasHTML}</div>
          </div>
        </div>
        <div class="dash-col col-b">
          <div class="card side-card">
            <h3>Distribución del total</h3>
            ${distribucion}
          </div>
          <div class="card side-card">
            <h3>Evolución mensual (total)</h3>
            ${miniBarChartHTML(mes)}
          </div>
          ${tarifasHTML()}
        </div>
        <div class="dash-col col-c">
          <div class="card side-card">
            <h3>Por persona</h3>
            ${porPersona}
            <div class="pp-total suave"><span>👥 Promedio</span><span>${S(totalCasa / PERSONAS.length)}</span></div>
            <div class="pp-total"><span>Total ${PERSONAS.length} personas</span><span data-count="${totalCasa}">${S(totalCasa)}</span></div>
          </div>
          ${calculadoraHTML()}
        </div>
      </div>
      <div class="hero-tips">${heroHTML}</div>
    </div>`;

  renderSelectorMes('sel-mes-resumen', renderResumen);
  cont.querySelectorAll('.tip-hero, .alerta-link').forEach(b => {
    b.addEventListener('click', () => activarTab(b.dataset.goto));
  });
  ['calc-aparato', 'calc-cant', 'calc-horas'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      if (id === 'calc-aparato') {
        const ap = ELECTRODOMESTICOS.find(e => e.id === document.getElementById('calc-aparato').value);
        if (ap) document.getElementById('calc-horas').value = ap.horasDef;
      }
      calcularConsumo();
    });
  });
  calcularConsumo();
  animarNumeros(cont);
}

// Cuenta los montos desde 0 hasta su valor (animación visible al abrir el resumen)
function animarNumeros(root) {
  root.querySelectorAll('[data-count]').forEach(el => {
    const objetivo = parseFloat(el.dataset.count) || 0;
    const dur = 750, t0 = performance.now();
    const paso = t => {
      const p = Math.min(1, (t - t0) / dur);
      const suave = 1 - Math.pow(1 - p, 3); // ease-out
      el.textContent = S(objetivo * suave);
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

// ============================================================
//  PESTAÑA: REGISTRO (inicio)
// ============================================================
function renderRegistro() {
  const mes = mesActual();
  const cont = document.getElementById('registro-content');

  const filasVar = SERVICIOS_VARIABLES.map(s => {
    const v = mes.vars[s.id] || { total: 0, share: 0 };
    const nResto = s.participantes.length - 1;
    const nParticipantes = s.reparto === 'luz' ? nResto : s.participantes.length;
    const ayuda = s.reparto === 'luz'
      ? `${nombrePersona(s.fijoPersona)} paga fijo S/${state.config.luzFijo}; el resto ÷ ${nResto}`
      : `÷ ${nParticipantes}`;
    return `
      <tr>
        <td class="serv-nombre">${s.icono} ${s.nombre}</td>
        <td><input type="number" min="0" step="1" class="inp-total" data-serv="${s.id}" value="${v.total || ''}" placeholder="Total recibo"></td>
        <td class="reparto-hint">${ayuda}</td>
        <td><input type="number" min="0" step="1" class="inp-share" data-serv="${s.id}" value="${v.share || ''}" placeholder="por persona"></td>
      </tr>`;
  }).join('');

  cont.innerHTML = `
    <div class="card">
      <div class="card-head">
        <h2>📝 Registro del mes</h2>
        <div class="row-controls">
          <select id="sel-mes-registro"></select>
          <button class="btn btn-ghost" id="btn-nuevo-mes">+ Nuevo mes</button>
          <button class="btn btn-ghost danger" id="btn-borrar-mes">Eliminar mes</button>
        </div>
      </div>
      <p class="muted">Escribe el <strong>total del recibo</strong> y el sistema calcula el monto por persona (puedes ajustarlo a mano). Los servicios fijos se configuran más abajo.</p>
      <div class="tabla-wrap">
        <table class="tabla-registro">
          <thead><tr><th>Servicio variable</th><th>Total recibo (S/)</th><th>Reparto</th><th>Por persona (S/)</th></tr></thead>
          <tbody>${filasVar}</tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Servicios fijos</h2></div>
      <p class="muted">Estos casi no cambian. Se guardan para todos los meses. Edítalos solo si sube el precio.</p>
      <div class="grid-fijos" id="grid-fijos"></div>
    </div>

    <div class="card resumen-vivo">
      <div class="card-head"><h2>Vista previa — total por hermano</h2></div>
      <div class="chips-total" id="preview-totales"></div>
    </div>
  `;

  renderSelectorMes('sel-mes-registro', renderRegistro);
  renderFijos();
  renderPreviewTotales();

  // Listeners: total -> autocalcula share
  cont.querySelectorAll('.inp-total').forEach(inp => {
    inp.addEventListener('input', () => {
      const s = SERVICIOS_VARIABLES.find(x => x.id === inp.dataset.serv);
      const n = s.reparto === 'luz' ? (s.participantes.length - 1) : s.participantes.length;
      const total = parseFloat(inp.value) || 0;
      const share = s.reparto === 'luz'
        ? Math.round((total - state.config.luzFijo) / n)
        : Math.round(total / n);
      const shareInp = cont.querySelector(`.inp-share[data-serv="${s.id}"]`);
      shareInp.value = total ? Math.max(0, share) : '';
      commitVar(s.id, total, total ? Math.max(0, share) : 0);
    });
  });
  cont.querySelectorAll('.inp-share').forEach(inp => {
    inp.addEventListener('input', () => {
      const totalInp = cont.querySelector(`.inp-total[data-serv="${inp.dataset.serv}"]`);
      commitVar(inp.dataset.serv, parseFloat(totalInp.value) || 0, parseFloat(inp.value) || 0);
    });
  });

  document.getElementById('btn-nuevo-mes').onclick = nuevoMes;
  document.getElementById('btn-borrar-mes').onclick = borrarMes;
}

function commitVar(servId, total, share) {
  const mes = mesActual();
  mes.vars[servId] = { total, share };
  guardarEstado();
  renderPreviewTotales();
}

function renderFijos() {
  const grid = document.getElementById('grid-fijos');
  const etiquetas = {
    internet: 'Internet + teléfono (÷4)', cable: 'Cable Movistar (÷2)',
    seguro_papas: 'Seguro papás (÷4)', cel_papa: 'Celular papá (÷4)', cel_mama: 'Celular mamá (÷4)',
    netflix: 'Netflix (÷4)', internet_sb: 'Internet San Bartolo (÷4)', youtube: 'YouTube + Google One (÷2)',
    seguro_individual: 'Seguro individual (personal)', seguro_bebe: 'Seguro bebé (personal)',
  };
  let html = `
    <div class="fijo-item">
      <label>Luz — monto fijo (casa)</label>
      <input type="number" min="0" data-fijo="luzFijo" value="${state.config.luzFijo}">
    </div>`;
  for (const key of Object.keys(state.config.fijos)) {
    html += `
      <div class="fijo-item">
        <label>${etiquetas[key] || key}</label>
        <input type="number" min="0" data-fijo-key="${key}" value="${state.config.fijos[key]}">
      </div>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('input[data-fijo="luzFijo"]').forEach(inp => {
    inp.addEventListener('input', () => { state.config.luzFijo = parseFloat(inp.value) || 0; guardarEstado(); renderPreviewTotales(); });
  });
  grid.querySelectorAll('input[data-fijo-key]').forEach(inp => {
    inp.addEventListener('input', () => { state.config.fijos[inp.dataset.fijoKey] = parseFloat(inp.value) || 0; guardarEstado(); renderPreviewTotales(); });
  });
}

function renderPreviewTotales() {
  const mes = mesActual();
  const desg = desgloseMes(mes, state.config);
  const cont = document.getElementById('preview-totales');
  if (!cont) return;
  cont.innerHTML = desg.map(d => `
    <div class="chip-total" style="--c:${colorPersona(d.personaId)}">
      <span class="chip-nombre">${nombrePersona(d.personaId)}</span>
      <span class="chip-monto">${S(d.total)}</span>
    </div>`).join('');
}

function nuevoMes() {
  const ultimo = state.meses[state.meses.length - 1];
  let anio = ultimo ? ultimo.anio : 2026;
  let mes = ultimo ? ultimo.mes + 1 : 1;
  if (mes > 12) { mes = 1; anio++; }
  const nombresMes = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const id = `${anio}-${String(mes).padStart(2, '0')}`;
  if (state.meses.some(m => m.id === id)) { alert('Ese mes ya existe.'); return; }
  const vars = {};
  SERVICIOS_VARIABLES.forEach(s => { vars[s.id] = { total: 0, share: 0 }; });
  state.meses.push({ id, etiqueta: `${nombresMes[mes]} ${anio}`, anio, mes, vars });
  state.mesSeleccionado = id;
  guardarEstado();
  renderRegistro();
}

function borrarMes() {
  if (state.meses.length <= 1) { alert('Debe quedar al menos un mes.'); return; }
  const mes = mesActual();
  if (!confirm(`¿Eliminar ${mes.etiqueta}? Esta acción no se puede deshacer.`)) return;
  state.meses = state.meses.filter(m => m.id !== mes.id);
  state.mesSeleccionado = state.meses[state.meses.length - 1].id;
  guardarEstado();
  renderRegistro();
}

// ============================================================
//  PESTAÑA: RECIBOS (imprimibles / PDF)
// ============================================================
function renderRecibos() {
  const mes = mesActual();
  const desg = desgloseMes(mes, state.config);
  const totalGeneral = desg.reduce((a, d) => a + d.total, 0);

  const cont = document.getElementById('recibos-content');
  cont.innerHTML = `
    <div class="card no-print">
      <div class="card-head">
        <h2>Recibos del mes</h2>
        <div class="row-controls">
          <select id="sel-mes-recibos"></select>
          <button class="btn btn-primary" id="btn-imprimir">🖨️ Generar PDF / Imprimir</button>
        </div>
      </div>
      <p class="muted">Se genera una hoja con el detalle de pago de los cuatro hermanos. Usa "Guardar como PDF" en el diálogo de impresión.</p>
    </div>

    <div class="hoja-print" id="hoja-print">
      <div class="hoja-header">
        <h1>🏠 Pago de servicios — ${mes.etiqueta}</h1>
        <div class="hoja-sub">Total de la casa: <strong>${S(totalGeneral)}</strong> · Generado el ${new Date().toLocaleDateString('es-PE')}</div>
      </div>
      <div class="recibos-grid">
        ${desg.map(d => reciboHTML(d, mes)).join('')}
      </div>
      <div class="hoja-footer">Distribución transparente de gastos del hogar.</div>
    </div>
  `;
  renderSelectorMes('sel-mes-recibos', renderRecibos);
  document.getElementById('btn-imprimir').onclick = () => window.print();
}

function reciboHTML(d, mes) {
  const grupos = {};
  d.lineas.forEach(l => { (grupos[l.grupo] = grupos[l.grupo] || []).push(l); });
  const cuerpo = Object.entries(grupos).map(([grupo, lineas]) => `
    <div class="recibo-grupo">${grupo}</div>
    ${lineas.map(l => `
      <div class="recibo-linea ${l.esCredito ? 'credito' : ''}">
        <span>${l.icono} ${l.concepto}${l.esCredito ? ' <em>(paga suscripción y cobra al resto)</em>' : ''}</span>
        <span class="monto">${S(l.monto)}</span>
      </div>`).join('')}
  `).join('');

  return `
    <div class="recibo" style="--c:${colorPersona(d.personaId)}">
      <div class="recibo-head">
        <span class="recibo-nombre">${nombrePersona(d.personaId)}</span>
        <span class="recibo-mes">${mes.etiqueta}</span>
      </div>
      <div class="recibo-body">${cuerpo}</div>
      <div class="recibo-total"><span>TOTAL A PAGAR</span><span>${S(d.total)}</span></div>
    </div>`;
}

// ============================================================
//  PESTAÑA: HISTÓRICO
// ============================================================
function renderHistorico() {
  const cont = document.getElementById('historico-content');
  const meses = state.meses;

  // Totales por persona por mes
  const filas = meses.map(m => {
    const desg = desgloseMes(m, state.config);
    const totales = {};
    desg.forEach(d => totales[d.personaId] = d.total);
    const totalMes = desg.reduce((a, d) => a + d.total, 0);
    return { etiqueta: m.etiqueta, totales, totalMes };
  });

  const promedio = {};
  PERSONAS.forEach(p => {
    promedio[p.id] = Math.round(filas.reduce((a, f) => a + (f.totales[p.id] || 0), 0) / (filas.length || 1));
  });

  cont.innerHTML = `
    <div class="card">
      <div class="card-head"><h2>Histórico de pagos por hermano</h2></div>
      <div class="tabla-wrap">
        <table class="tabla-historico">
          <thead>
            <tr><th>Mes</th>${PERSONAS.map(p => `<th style="color:${p.color}">${p.nombre}</th>`).join('')}<th>Total casa</th></tr>
          </thead>
          <tbody>
            ${filas.map(f => `
              <tr>
                <td class="mes-col">${f.etiqueta}</td>
                ${PERSONAS.map(p => `<td>${S(f.totales[p.id] || 0)}</td>`).join('')}
                <td class="total-col">${S(f.totalMes)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td>Promedio</td>${PERSONAS.map(p => `<td>${S(promedio[p.id])}</td>`).join('')}<td>—</td></tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Consumo variable por mes (S/)</h2></div>
      <div class="tabla-wrap">
        <table class="tabla-historico">
          <thead><tr><th>Mes</th>${SERVICIOS_VARIABLES.map(s => `<th>${s.icono}<br>${s.nombre.replace(' (casa)','').replace(' San Bartolo',' SB')}</th>`).join('')}</tr></thead>
          <tbody>
            ${meses.map(m => `
              <tr><td class="mes-col">${m.etiqueta}</td>
                ${SERVICIOS_VARIABLES.map(s => `<td>${(m.vars[s.id] && m.vars[s.id].total) ? S(m.vars[s.id].total) : '—'}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================
//  PESTAÑA: GRÁFICOS
// ============================================================
function renderGraficos() {
  const cont = document.getElementById('graficos-content');
  const meses = state.meses;

  // Series de consumo (totales de recibo) para agua y luz de la casa
  const labels = meses.map(m => m.etiqueta.split(' ')[0].slice(0, 3));
  const serieAgua = meses.map(m => (m.vars.agua && m.vars.agua.total) || 0);
  const serieLuz = meses.map(m => (m.vars.luz && m.vars.luz.total) || 0);
  const serieGas = meses.map(m => (m.vars.gas && m.vars.gas.total) || 0);

  // Ranking: total pagado acumulado por persona
  const acumulado = PERSONAS.map(p => {
    const total = meses.reduce((a, m) => a + desglosePersona(p.id, m, state.config).total, 0);
    return { id: p.id, nombre: p.nombre, color: p.color, total };
  }).sort((a, b) => b.total - a.total);

  // Último mes por persona (ranking del mes)
  const ultimo = meses[meses.length - 1];
  const rankingMes = PERSONAS.map(p => ({
    id: p.id, nombre: p.nombre, color: p.color,
    total: desglosePersona(p.id, ultimo, state.config).total
  })).sort((a, b) => b.total - a.total);

  cont.innerHTML = `
    <div class="card">
      <div class="card-head"><h2>Evolución del consumo — casa (S/)</h2></div>
      ${lineChartSVG([
        { nombre: 'Luz', color: '#f59e0b', datos: serieLuz },
        { nombre: 'Agua', color: '#2563eb', datos: serieAgua },
        { nombre: 'Gas', color: '#dc2626', datos: serieGas },
      ], labels)}
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-head"><h2>Ranking — ${ultimo.etiqueta}</h2></div>
        ${barChartSVG(rankingMes)}
      </div>
      <div class="card">
        <div class="card-head"><h2>Total pagado (histórico)</h2></div>
        ${barChartSVG(acumulado)}
      </div>
    </div>
  `;
}

// --- Gráfico de líneas en SVG ---
function lineChartSVG(series, labels) {
  const W = 720, H = 280, pad = { l: 44, r: 16, t: 20, b: 34 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const allVals = series.flatMap(s => s.datos);
  const maxV = Math.max(10, ...allVals) * 1.1;
  const n = labels.length;
  const x = i => pad.l + (n <= 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = v => pad.t + ih - (v / maxV) * ih;

  const gridY = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const val = Math.round(maxV * f), yy = y(val);
    return `<line x1="${pad.l}" y1="${yy}" x2="${W - pad.r}" y2="${yy}" class="grid"/>
            <text x="${pad.l - 6}" y="${yy + 4}" class="axis-lbl" text-anchor="end">${val}</text>`;
  }).join('');

  const xlabels = labels.map((l, i) => `<text x="${x(i)}" y="${H - 10}" class="axis-lbl" text-anchor="middle">${l}</text>`).join('');

  const paths = series.map(s => {
    const d = s.datos.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const dots = s.datos.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" fill="${s.color}"><title>${s.nombre}: ${S(v)}</title></circle>`).join('');
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5"/>${dots}`;
  }).join('');

  const leyenda = series.map(s => `<span class="leg-item"><span class="leg-dot" style="background:${s.color}"></span>${s.nombre}</span>`).join('');

  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" class="chart">${gridY}${xlabels}${paths}</svg></div>
          <div class="leyenda">${leyenda}</div>`;
}

// --- Gráfico de barras horizontales ---
function barChartSVG(items) {
  const maxV = Math.max(1, ...items.map(i => i.total));
  return `<div class="barras">` + items.map((it, idx) => `
    <div class="barra-row">
      <span class="barra-lbl">${idx === 0 ? '🏆 ' : ''}${it.nombre}</span>
      <div class="barra-track"><div class="barra-fill" style="width:${(it.total / maxV * 100).toFixed(1)}%;background:${it.color}"></div></div>
      <span class="barra-val">${S(it.total)}</span>
    </div>`).join('') + `</div>`;
}

// ============================================================
//  PESTAÑA: TIPS
// ============================================================
function renderTips() {
  const cont = document.getElementById('tab-tips');
  const secciones = CATEGORIAS_TIPS.map(cat => {
    const tips = TIPS_DETALLADOS.filter(t => t.cat === cat.id);
    const tarjetas = tips.map((t, i) => `
      <div class="tipd" style="--c:${cat.color};--i:${i}">
        <div class="tipd-head">
          <span class="tipd-ico">${t.icono}</span>
          <div class="tipd-titulos">
            <strong>${t.titulo}</strong>
            <div class="tipd-badges">
              <span class="tipd-badge ahorro">💰 ${t.ahorro}</span>
              <span class="tipd-badge dif">${t.dificultad}</span>
            </div>
          </div>
        </div>
        <ol class="tipd-pasos">${t.pasos.map(p => `<li>${p}</li>`).join('')}</ol>
      </div>`).join('');
    return `
      <section class="tips-seccion">
        <h2 class="tips-sec-title" style="--c:${cat.color}">${cat.icono} ${cat.nombre}</h2>
        <div class="tipd-grid">${tarjetas}</div>
      </section>`;
  }).join('');
  cont.innerHTML = secciones;
}

// ============================================================
//  Datos: exportar / importar / reset
// ============================================================
function descargar(contenido, nombre, mime) {
  const blob = new Blob([contenido], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
}

function exportarJSON() {
  descargar(JSON.stringify(state, null, 2), 'casa-servicios-datos.json', 'application/json');
}

// Exporta el histórico a Excel (.xls que Excel/LibreOffice abren con formato)
function exportarExcel() {
  const meses = state.meses;
  const num = n => Math.round(n); // Excel interpreta números sin "S/"

  // Tabla 1: totales por hermano
  const cab1 = `<tr class="hdr">${['Mes', ...PERSONAS.map(p => p.nombre), 'Total casa']
    .map(h => `<th>${h}</th>`).join('')}</tr>`;
  let f1 = '';
  meses.forEach(m => {
    const desg = desgloseMes(m, state.config);
    const tot = {}; desg.forEach(d => tot[d.personaId] = d.total);
    const totalMes = desg.reduce((a, d) => a + d.total, 0);
    f1 += `<tr><td class="mes">${m.etiqueta}</td>${PERSONAS.map(p => `<td>${num(tot[p.id] || 0)}</td>`).join('')}<td class="tot">${num(totalMes)}</td></tr>`;
  });

  // Tabla 2: consumo variable (total de recibo) por mes
  const cab2 = `<tr class="hdr">${['Mes', ...SERVICIOS_VARIABLES.map(s => s.nombre)]
    .map(h => `<th>${h}</th>`).join('')}</tr>`;
  let f2 = '';
  meses.forEach(m => {
    f2 += `<tr><td class="mes">${m.etiqueta}</td>${SERVICIOS_VARIABLES.map(s => {
      const t = m.vars[s.id] && m.vars[s.id].total;
      return `<td>${t ? num(t) : ''}</td>`;
    }).join('')}</tr>`;
  });

  const estilos = `
    table{border-collapse:collapse;font-family:Calibri,Arial;margin-bottom:24px}
    th,td{border:1px solid #b7c3d0;padding:6px 10px;text-align:right}
    td.mes{text-align:left;font-weight:bold}
    tr.hdr th{background:#0ea5e9;color:#fff;text-align:center}
    td.tot{font-weight:bold;background:#e0f2fe}
    h2{font-family:Calibri,Arial;color:#0369a1}`;

  const html =
`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>${estilos}</style>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Casa Servicios</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body>
<h2>Casa Servicios — Pagos por hermano (S/)</h2>
<table>${cab1}${f1}</table>
<h2>Consumo variable por mes (S/)</h2>
<table>${cab2}${f2}</table>
</body></html>`;

  descargar('﻿' + html, 'casa-servicios-historico.xls', 'application/vnd.ms-excel');
}

// Exporta los recibos a PDF (abre el diálogo de impresión en la hoja de recibos)
function exportarPDF() {
  activarTab('recibos');
  setTimeout(() => window.print(), 350);
}
function importarJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.meses || !data.config) throw new Error('Formato inválido');
      state = data;
      if (!state.mesSeleccionado) state.mesSeleccionado = state.meses[state.meses.length - 1].id;
      guardarEstado(); renderRegistro();
      alert('Datos importados correctamente.');
    } catch (err) { alert('No se pudo importar: ' + err.message); }
  };
  reader.readAsText(file);
}
function resetDatos() {
  if (!confirm('¿Restaurar los datos originales (dic 2025 – jun 2026)? Se perderán tus cambios locales.')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = cargarEstado();
  state.mesSeleccionado = state.meses[state.meses.length - 1].id;
  guardarEstado(); renderRegistro();
}

// Genera un payload.js cifrado con los datos actuales, para actualizar el repositorio
async function publicarCifrado() {
  let pass = CasaCrypto.getPassword();
  if (!pass) { pass = prompt('Ingresa la contraseña para cifrar los datos:'); if (!pass) return; }
  const obj = {
    PERSONAS, TODOS,
    CONFIG_DEFAULT: state.config,   // publica también la configuración fija actual
    SERVICIOS,
    MESES_SEMILLA: state.meses,     // publica todos los meses registrados
  };
  const payload = await CasaCrypto.encryptData(pass, obj);
  const contenido =
`/* Datos de la familia CIFRADOS (AES-256-GCM). Ilegibles sin la contraseña. */
const PAYLOAD_CIFRADO = ${JSON.stringify(payload)};
`;
  const blob = new Blob([contenido], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'payload.js';
  a.click();
  alert('✅ Se descargó "payload.js" con tus datos actuales cifrados.\n\nPara que tus hermanos vean los cambios al abrir el enlace, reemplaza el archivo js/payload.js en el repositorio (o envíamelo y yo lo subo).');
}

// ============================================================
//  Inicio
// ============================================================
function init() {
  if (!state.mesSeleccionado || !state.meses.some(m => m.id === state.mesSeleccionado)) {
    state.mesSeleccionado = state.meses[state.meses.length - 1].id;
  }
  initTabs();
  activarTab('resumen');
  renderTips();
  document.getElementById('btn-reset').onclick = resetDatos;
  document.getElementById('btn-publicar').onclick = publicarCifrado;
  document.getElementById('inp-import').onchange = e => { if (e.target.files[0]) importarJSON(e.target.files[0]); };
  initExportMenu();
}

function initExportMenu() {
  const dd = document.getElementById('export-dd');
  const btn = document.getElementById('btn-export-menu');
  const menu = document.getElementById('export-menu');
  const acciones = { pdf: exportarPDF, excel: exportarExcel, json: exportarJSON };

  btn.onclick = e => { e.stopPropagation(); dd.classList.toggle('open'); };
  menu.querySelectorAll('button[data-exp]').forEach(b => {
    b.onclick = () => { dd.classList.remove('open'); (acciones[b.dataset.exp] || (() => {}))(); };
  });
  document.addEventListener('click', () => dd.classList.remove('open'));
}
// El arranque lo dispara crypto.js -> arrancarApp(datos) tras validar la contraseña.
