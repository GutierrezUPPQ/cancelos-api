// Versión breve del Comité Quirúrgico · Agosto 2026: una idea por lámina, letra grande, lectura rápida
const path = require('path');
const { C, txt, card, hbars, newDeck } = require('./lib');
const S = require('./stats.json');
const ML = 0.6, CW = 12.13;
const f1 = v => v.toFixed(1).replace('.', ',');
const f2 = v => v.toFixed(2).replace('.', ',');
const FOOT = 'HQ  ·  COMITÉ QUIRÚRGICO  ·  SEPTIEMBRE 2026  ·  VERSIÓN BREVE';

function base(pres, { num, total, kicker, title, notes, titleSize }) {
  const s = pres.addSlide();
  s.background = { color: C.BG };
  s.addShape(pres.shapes.OVAL, { x: 9.17, y: -2.5, w: 6.39, h: 4.72, fill: { color: C.TEAL, transparency: 93 }, line: { type: 'none' } });
  s.addShape(pres.shapes.OVAL, { x: -2.22, y: 5.0, w: 6.11, h: 4.17, fill: { color: C.VIOLET, transparency: 94.5 }, line: { type: 'none' } });
  txt(s, kicker, ML, 0.38, 10, 0.34, { fontSize: 12, bold: true, color: C.TEAL2, charSpacing: 3, valign: 'middle' });
  txt(s, title, ML, 0.78, CW, 1.0, { fontSize: titleSize || (title.length > 52 ? 28 : 32), bold: true, color: C.WHITE, valign: 'middle' });
  txt(s, `${num}  /  ${total}`, ML, 7.05, 1.6, 0.3, { fontSize: 10, color: C.MUTED, charSpacing: 2, valign: 'middle' });
  txt(s, FOOT, 5.5, 7.05, 7.23, 0.3, { fontSize: 10, color: C.MUTED, charSpacing: 2, align: 'right', valign: 'middle' });
  if (notes) s.addNotes(notes);
  return s;
}
// número grande con etiqueta y línea de apoyo
function big(s, x, y, w, { value, label, sub, color = C.TEAL2, size = 60, labelSize = 14, subSize = 14, align = 'left', labelColor = C.TEXT }) {
  const vh = size / 72 * 1.3;
  txt(s, value, x, y, w, vh, { fontSize: size, bold: true, color, valign: 'middle', align });
  txt(s, label, x, y + vh + 0.02, w, 0.36, { fontSize: labelSize, bold: true, color: labelColor, valign: 'middle', align });
  if (sub) txt(s, sub, x, y + vh + 0.4, w, 0.8, { fontSize: subSize, color: C.MUTED, valign: 'top', align });
  return y + vh + 0.4;
}
function tile(s, pres, x, y, w, h, o) {
  const { value, label, sub, color = C.TEAL2, size = 44, labelSize = 13, subSize = 12.5 } = o;
  card(s, x, y, w, h, { pres, border: o.border || C.BORDER, borderW: o.border ? 1.5 : 0.75 });
  const vh = size / 72 * 1.2, px = x + 0.28, pw = w - 0.56;
  txt(s, value, px, y + 0.14, pw, vh, { fontSize: size, bold: true, color, valign: 'middle' });
  txt(s, label, px, y + 0.14 + vh, pw, 0.3, { fontSize: labelSize, bold: true, color: C.TEXT, valign: 'middle' });
  if (sub) txt(s, sub, px, y + 0.14 + vh + 0.3, pw, Math.max(0.3, h - (0.14 + vh + 0.36)), { fontSize: subSize, color: C.MUTED, valign: 'top' });
}
function bullet(s, x, y, w, text, { size = 17, color = C.TEXT, dot = C.TEAL } = {}) {
  s.addShape(s._pres.shapes.OVAL, { x, y: y + 0.17, w: 0.14, h: 0.14, fill: { color: dot }, line: { type: 'none' } });
  txt(s, text, x + 0.32, y, w - 0.32, 0.5, { fontSize: size, color, valign: 'top' });
}
function foot(s, text) { txt(s, text, ML, 6.5, CW, 0.45, { fontSize: 12, color: C.MUTED, valign: 'top' }); }
function lines(s, pres, { labels, series, yMin = 0, yMax, yTicks = 3, yFmt = v => String(v), xEvery = 1, hLines = [], fs = 12 }, x, y, w, h) {
  const padL = 0.75, padB = 0.55, padT = 0.25, padR = 1.0;
  const px = x + padL, py = y + padT, pw = w - padL - padR, ph = h - padT - padB, n = labels.length;
  const X = i => px + pw * (n > 1 ? i / (n - 1) : 0.5), Y = v => py + ph * (1 - (v - yMin) / (yMax - yMin));
  for (let g = 0; g <= yTicks; g++) {
    const v = yMin + (yMax - yMin) * g / yTicks;
    s.addShape(pres.shapes.LINE, { x: px, y: Y(v), w: pw, h: 0, line: { color: C.BORDER, width: 0.5 } });
    txt(s, yFmt(v), x, Y(v) - 0.15, padL - 0.1, 0.3, { fontSize: fs, color: C.MUTED, align: 'right', valign: 'middle' });
  }
  hLines.forEach(hl => {
    s.addShape(pres.shapes.LINE, { x: px, y: Y(hl.value), w: pw, h: 0, line: { color: hl.color, width: 1.25, dashType: 'dash' } });
    if (hl.label) txt(s, hl.label, px + 0.05, Y(hl.value) - 0.32, 4, 0.3, { fontSize: fs, color: hl.color, valign: 'middle' });
  });
  labels.forEach((l, i) => { if (i % xEvery === 0) txt(s, l, X(i) - 0.5, y + h - padB + 0.08, 1.0, 0.45, { fontSize: fs, color: C.MUTED, align: 'center', valign: 'top' }); });
  series.forEach(sr => {
    const pts = sr.values.map((v, i) => v == null ? null : [X(i), Y(Math.min(yMax, Math.max(yMin, v)))]);
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1]; if (!a || !b) continue;
      s.addShape(pres.shapes.LINE, { x: a[0], y: Math.min(a[1], b[1]), w: b[0] - a[0], h: Math.abs(b[1] - a[1]), line: { color: sr.color, width: sr.width || 2.5, dashType: sr.dash || 'solid' }, flipV: b[1] < a[1] });
    }
    if (sr.marker !== false) pts.forEach((p, i) => { if (p) { const col = (sr.special && sr.special[i]) || sr.color; s.addShape(pres.shapes.OVAL, { x: p[0] - 0.07, y: p[1] - 0.07, w: 0.14, h: 0.14, fill: { color: col }, line: { color: C.BG, width: 1 } }); } });
    if (sr.labels) pts.forEach((p, i) => { if (p && sr.values[i] != null && (!sr.labelIdx || sr.labelIdx.includes(i))) txt(s, sr.labelFmt ? sr.labelFmt(sr.values[i]) : String(sr.values[i]), p[0] - 0.5, p[1] + (sr.below ? 0.1 : -0.42), 1.0, 0.32, { fontSize: fs, bold: true, color: (sr.special && sr.special[i]) || sr.color, align: 'center', valign: 'middle' }); });
    if (sr.endLabel) { const last = [...pts].reverse().find(p => p); txt(s, sr.endLabel, last[0] + 0.14, last[1] - 0.18, padR - 0.1, 0.36, { fontSize: fs + 2, bold: true, color: sr.color, valign: 'middle' }); }
  });
}

const M = S.misma_fecha, A = M['2025'], B = M['2026'], P = S.pabellon;
const slides = [];

// 1 · Portada
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: 'COMITÉ QUIRÚRGICO  ·  AGOSTO 2026  ·  HOSPITAL DE QUILPUÉ', title: 'Agosto: 2 suspensiones en 152 cirugías programadas', titleSize: 34,
    notes: 'Versión breve del comité. Cifras: monitoreo diario (serie homogénea L–V), registro operativo de suspensiones (5-sep) y exports SITGEQ 787/830. La versión completa (49 láminas) contiene métodos, tablas y pruebas estadísticas.' });
  card(s, ML, 2.05, 5.6, 4.2, { pres, border: C.TEAL, borderW: 1.5 });
  big(s, 0.95, 2.35, 5, { value: '1,32 %', label: 'tasa hábil de suspensión · agosto 2026', sub: 'cirugía mayor electiva programada de lunes a viernes · misma fórmula y fuente de todos los meses', color: C.TEAL2, size: 88, labelSize: 16, subSize: 14 });
  const x = 6.6, w = 6.13;
  tile(s, pres, x, 2.05, w, 1.3, { value: '12,11 %', label: 'agosto 2025 a la misma fecha  ·  23 de 190', color: C.RED, size: 36 });
  tile(s, pres, x, 3.5, w, 1.3, { value: '+13,5 %', label: 'cirugía mayor hábil · enero–agosto vs 2025', color: C.GREEN, size: 36 });
  tile(s, pres, x, 4.95, w, 1.3, { value: '12 de 21 días', label: 'sin Pabellón 2 en agosto  ·  explica la menor producción del mes', color: C.AMBER, size: 36 });
  foot(s, 'Versión breve para el comité · la versión completa (49 láminas, métodos y tablas) queda como anexo.');
  return s;
});

// 2 · La suspensión cayó a la décima parte
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '01  ·  SUSPENSIÓN', title: 'La suspensión de agosto cayó a la décima parte de la de 2025',
    notes: 'Agosto 2025: 23 suspendidas de 190 programadas normales L–V (12,11 %). Agosto 2026: 2 de 152 (1,32 %). Fisher exacto p < 0,001. A la tasa 2025 (9,38 % anual) se esperaban 14,3 suspensiones en agosto 2026; hubo 2.' });
  big(s, ML, 2.2, 4.6, { value: '12,11 %', label: 'agosto 2025', sub: '23 suspensiones de 190 programadas', color: C.RED, size: 80, labelSize: 18, subSize: 15 });
  txt(s, '→', 5.35, 2.2, 1.6, 1.5, { fontSize: 80, bold: true, color: C.MUTED, align: 'center', valign: 'middle' });
  big(s, 7.1, 2.2, 5.6, { value: '1,32 %', label: 'agosto 2026', sub: '2 suspensiones de 152 programadas', color: C.TEAL2, size: 80, labelSize: 18, subSize: 15 });
  card(s, ML, 4.75, CW, 1.45, { pres, border: C.GREEN, borderW: 1.5 });
  txt(s, '12 pacientes operados que, al ritmo de 2025, se habrían suspendido', ML + 0.35, 4.9, CW - 0.7, 0.6, { fontSize: 22, bold: true, color: C.GREEN, valign: 'middle' });
  txt(s, 'Con la tasa de 2025 se esperaban 14 suspensiones sobre 152 programadas; hubo 2. Diferencia estadísticamente significativa (p < 0,001).', ML + 0.35, 5.5, CW - 0.7, 0.55, { fontSize: 15, color: C.TEXT2, valign: 'top' });
  foot(s, 'Cirugía mayor electiva programada de lunes a viernes (monitoreo diario). Misma fórmula en ambos años.');
  return s;
});

// 3 · En el año: 70 pacientes
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '02  ·  ENERO A AGOSTO · MISMA FECHA', title: 'En el año llevamos 70 suspensiones menos que al ritmo de 2025',
    notes: `Acumulado enero–agosto: 2025 133 / 1.353 = 9,83 %; 2026 74 / 1.469 = 5,04 % (p < 0,001). Al ritmo 2025 se esperaban 144 suspensiones sobre las 1.469 programadas de 2026; hubo 74: 70 evitadas. Acumulado mes a mes 2025: ${A.ytd.map(f2).join(' · ')}; 2026: ${B.ytd.map(f2).join(' · ')}.` });
  card(s, ML, 1.95, 7.3, 4.35, { pres });
  txt(s, 'TASA ACUMULADA DESDE ENERO', ML + 0.25, 2.05, 6, 0.3, { fontSize: 11, bold: true, color: C.TEXT2, charSpacing: 2, valign: 'middle' });
  lines(s, pres, { labels: M.meses, yMax: 12, yTicks: 3, yFmt: v => v + ' %', fs: 12, series: [
    { values: A.ytd, color: C.RED, width: 3, endLabel: '2025', labels: true, labelIdx: [7], labelFmt: v => f2(v) + ' %' },
    { values: B.ytd, color: C.TEAL2, width: 3.5, endLabel: '2026', labels: true, labelIdx: [7], labelFmt: v => f2(v) + ' %', below: true },
  ] }, ML + 0.1, 2.3, 7.1, 3.9);
  const x = 8.2, w = 4.53;
  tile(s, pres, x, 1.95, w, 1.4, { value: '70', label: 'suspensiones evitadas', sub: '144 esperadas al ritmo 2025 · 74 reales', color: C.GREEN, border: C.GREEN, size: 36 });
  tile(s, pres, x, 3.45, w, 1.4, { value: '133 → 74', label: 'suspensiones enero–agosto', sub: 'con 8,6 % más cirugías programadas', color: C.TEAL2, size: 36 });
  tile(s, pres, x, 4.95, w, 1.4, { value: '9,83 → 5,04 %', label: 'tasa acumulada a agosto', sub: 'diferencia significativa (p < 0,001)', color: C.TEAL2, size: 32 });
  foot(s, 'Acumulado = suspendidas / programadas desde enero (suma sobre suma). "Evitadas" es un cálculo aritmético; no atribuye causa.');
  return s;
});

// 4 · Control estadístico
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '03  ·  CONTROL ESTADÍSTICO', title: 'Tres meses seguidos bajo el límite de control: la mejora es real',
    notes: 'Carta p con línea central 9,38 % (2025 completo) y límites ±3σ con el denominador de cada mes. Junio, julio y agosto de 2026 quedan bajo el límite inferior. CUSUM sobre conteos: el quiebre de la serie está en febrero 2026. Trimestre jun–ago 2026: 6 / 486 = 1,23 % frente a 8,60 % previo (riesgo relativo 0,14; p < 0,0001).' });
  card(s, ML, 1.95, 8.3, 4.35, { pres });
  txt(s, 'TASA HÁBIL MENSUAL · ENERO 2025 → AGOSTO 2026', ML + 0.25, 2.05, 7, 0.3, { fontSize: 11, bold: true, color: C.TEXT2, charSpacing: 2, valign: 'middle' });
  const special = {}; [17, 18, 19].forEach(k => special[k] = C.GREEN);
  lines(s, pres, { labels: S.meses.map(m => m.replace('-', '\n')), yMax: 16, yTicks: 4, yFmt: v => v + ' %', xEvery: 2, fs: 11, hLines: [{ value: S.p_2025, color: C.AMBER, label: 'media 2025 · 9,38 %' }], series: [
    { values: S.lcl, color: C.BLUE, width: 1.5, dash: 'dash', marker: false },
    { values: S.tasa, color: C.TEAL2, width: 3, special, labels: true, labelIdx: [17, 19], labelFmt: v => f2(v) },
  ] }, ML + 0.1, 2.3, 8.1, 3.9);
  txt(s, 'punteada: límite inferior de control (−3σ)', ML + 4.2, 2.36, 4.0, 0.28, { fontSize: 10.5, color: C.BLUE2, align: 'right', valign: 'middle' });
  const x = 9.2, w = 3.53;
  tile(s, pres, x, 1.95, w, 1.4, { value: '3 meses', label: 'bajo −3σ · jun, jul, ago', color: C.GREEN, border: C.GREEN, size: 36 });
  tile(s, pres, x, 3.45, w, 1.4, { value: '1,23 %', label: 'trimestre jun–ago 2026', sub: '6 de 486 · riesgo relativo 0,14', color: C.TEAL2, size: 36 });
  tile(s, pres, x, 4.95, w, 1.4, { value: 'feb-26', label: 'quiebre de la serie (CUSUM)', sub: 'desde entonces, 64 menos que lo esperado', color: C.AMBER, size: 36 });
  foot(s, 'Un mes con 1–2 casos varía por azar; la evidencia está en la secuencia de tres meses y en el acumulado.');
  return s;
});

// 5 · Producción
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '04  ·  PRODUCCIÓN', title: 'Producimos más cirugía mayor en horario hábil que en 2025',
    notes: 'CME realizada enero–agosto: lunes a viernes 1.657 → 1.880 (+13,5 %, mismos 173 días); todas las fechas 3.307 → 3.386 (+2,4 %); fin de semana 1.650 → 1.506 (−8,7 %, jornadas oftalmológicas); urgencia mayor 1.164 → 1.328 (+14,1 %). Agosto: 411 CME (201 L–V + 210 fin de semana) frente a 419 en agosto 2025.' });
  big(s, ML, 2.0, 5.8, { value: '+13,5 %', label: 'cirugía mayor electiva de lunes a viernes', sub: '1.657 → 1.880 operaciones entre enero y agosto · los mismos 173 días hábiles', color: C.GREEN, size: 84, labelSize: 18, subSize: 15 });
  const x = 6.9, w = 5.83;
  tile(s, pres, x, 2.0, w, 1.3, { value: '+2,4 %', label: 'todas las fechas · 3.307 → 3.386', color: C.TEAL2, size: 34 });
  tile(s, pres, x, 3.45, w, 1.3, { value: '−8,7 %', label: 'fin de semana · jornadas de oftalmología', color: C.AMBER, size: 34 });
  tile(s, pres, x, 4.9, w, 1.3, { value: '+14,1 %', label: 'cirugía mayor de urgencia', color: C.TEAL2, size: 34 });
  foot(s, 'Agosto: 411 cirugías mayores electivas (201 en horario hábil) frente a 419 en agosto 2025, con un pabellón menos parte del mes.');
  return s;
});

// 6 · Un pabellón menos
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '05  ·  CAPACIDAD', title: 'Julio y agosto se operaron con un pabellón menos',
    notes: `Agosto: Pabellón 2 con actividad electiva solo 9 de 21 días L–V (3–7, 26–28 y 31): tres lunes cancelados por falta de enfermera y obras en cubierta desde el 12-ago. 202 encuentros electivos L–V en 51 pabellón-días = ${f2(P.por_pab_dia)} por pabellón-día; con P2 completo (63) ≈ ${P.electivos_si_p2_completo} (+${P.delta_estimado}). CME L–V: 201 → ≈ ${P.cme_si_p2_completo} = ${f2(P.cme_por_dia_si_p2)} por día (agosto 2025: 11,0). Julio: climatización 1–6 de julio y otras restricciones; días exactos por confirmar.` });
  big(s, ML, 2.0, 5.8, { value: '9 de 21', label: 'días con Pabellón 2 en agosto', sub: 'tres lunes sin enfermera y obras en la cubierta desde el 12 de agosto', color: C.AMBER, size: 84, labelSize: 18, subSize: 15 });
  const x = 6.9, w = 5.83;
  tile(s, pres, x, 2.0, w, 1.3, { value: `≈ ${P.delta_estimado} cirugías`, label: 'electivas no realizadas por los 12 días perdidos', color: C.RED, border: C.RED, size: 34 });
  tile(s, pres, x, 3.45, w, 1.3, { value: '3,9 por pabellón-día', label: 'el rendimiento por pabellón se mantuvo', color: C.TEAL2, size: 30 });
  tile(s, pres, x, 4.9, w, 1.3, { value: '11,8 por día', label: 'cirugías mayores L–V con P2 completo · agosto 2025: 11,0', color: C.GREEN, size: 34 });
  foot(s, 'Estimación con la productividad observada por pabellón-día. Julio: falta confirmar los días sin pabellón para aplicar la misma regla.');
  return s;
});

// 7 · Registro completo
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '06  ·  REGISTRO COMPLETO DE SUSPENSIONES', title: 'Hubo 38 suspensiones en total; solo 2 cuentan para el indicador',
    notes: 'Informe operativo de agosto: 38 registros (27 cirugía mayor, 4 menor, 7 procedimientos; 37 electivas, 1 urgencia). 19 de lunes a viernes y 19 de fin de semana. 18 sin causal registrada (17 oftalmológicas de fin de semana + 1). 16 de 19 registros de fin de semana caen en dos fines de semana (8–9 y 22–23 de agosto): 2–3 eventos de jornada, no 18 fallas independientes (p < 0,001). El indicador MINSAL cuenta solo la cirugía mayor electiva normal de lunes a viernes: 2.' });
  const w = 3.9, y = 2.0, h = 2.3;
  [[ '38', 'suspensiones registradas', 'todas las modalidades y días', C.TEXT ], [ '19 + 19', 'lunes a viernes + fin de semana', '18 son oftalmológicas de dos jornadas', C.AMBER ], [ '18', 'sin causa registrada', 'casi la mitad del registro', C.RED ]].forEach(([v, l, sub, col], k) => {
    tile(s, pres, ML + k * (w + 0.215), y, w, h, { value: v, label: l, sub, color: col, size: 54 });
  });
  card(s, ML, 4.55, CW, 1.65, { pres, border: C.TEAL, borderW: 1.5 });
  txt(s, 'Las 18 oftalmológicas no son 18 fallas: son dos jornadas (8–9 y 22–23 de agosto)', ML + 0.35, 4.7, CW - 0.7, 0.6, { fontSize: 20, bold: true, color: C.TEAL2, valign: 'middle' });
  txt(s, 'Concentración imposible por azar (p < 0,001). Falta registrar la causa por jornada: capacidad, dotación, insumos o inasistencia.', ML + 0.35, 5.32, CW - 0.7, 0.7, { fontSize: 15, color: C.TEXT2, valign: 'top' });
  foot(s, 'El indicador oficial cuenta solo la cirugía mayor electiva de lunes a viernes; el resto consume preparación, agenda y pabellón igual, pero no se ve.');
  return s;
});

// 8 · Causas
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '07  ·  CAUSAS', title: 'La causa número uno es el error de programación',
    notes: 'Causal registrada en 20 de 38: error de programación 7 (incluye 3 cirugías mayores directas: 20, 28 y 31 de agosto), reemplazo por urgencia 3, no presentación 3, ayuno o exámenes 2, instrumental 1, infraestructura 1, falta de cirujano 1, enfermedad aguda 1, descompensación 1. Evitables 10, potencialmente evitables 5, no evitables 5, sin causal 18. Julio: error de programación 5.' });
  card(s, ML, 1.95, 7.6, 4.35, { pres });
  hbars(s, pres, [
    { label: 'Error de programación', value: 7, color: C.RED }, { label: 'Reemplazo por urgencia', value: 3, color: C.BLUE }, { label: 'No presentación', value: 3, color: C.AMBER },
    { label: 'Ayuno / exámenes', value: 2, color: C.RED }, { label: 'Instrumental', value: 1, color: C.RED }, { label: 'Infraestructura', value: 1, color: C.AMBER },
    { label: 'Falta de cirujano', value: 1, color: C.AMBER }, { label: 'Clínicas (2 causas)', value: 2, color: C.BLUE },
  ], ML + 0.3, 2.15, 7.0, 3.95, { labelW: 2.9, valueW: 0.5, max: 7, fontSize: 14, barH: 0.3 });
  const x = 8.5, w = 4.23;
  tile(s, pres, x, 1.95, w, 1.4, { value: '10', label: 'evitables', sub: 'programación, ayuno, exámenes, instrumental', color: C.RED, border: C.RED, size: 36 });
  tile(s, pres, x, 3.45, w, 1.4, { value: '5 + 5', label: 'potencialmente evitables + no evitables', color: C.AMBER, size: 36 });
  tile(s, pres, x, 4.95, w, 1.4, { value: '18', label: 'sin causa registrada', sub: 'no se clasifican', color: C.MUTED, size: 36 });
  foot(s, 'Rojo: evitable · ámbar: potencialmente evitable · azul: no evitable. Julio tuvo 5 errores de programación; agosto 7.');
  return s;
});

// 9 · Lunes
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '08  ·  EL LUNES', title: 'El lunes sigue siendo el día frágil de la semana',
    notes: 'Agosto: 6 de los 19 registros de lunes a viernes fueron en lunes; los 2 eventos MINSAL (3 y 17 de agosto, Traumatología) fueron lunes; Pabellón 2 sin tabla los lunes 10, 17 y 24 por falta de enfermera. Histórico ene-25–abr-26: lunes 11,09 % de suspensión hábil, significativo (Z = 2,09). Agosto por sí solo no lo demuestra (p = 0,16); el histórico sí.' });
  const w = 3.9, y = 2.0, h = 2.3;
  [[ '6 de 19', 'registros de lunes a viernes fueron en lunes', C.AMBER ], [ '2 de 2', 'eventos del indicador cayeron en lunes', C.RED ], [ '3 lunes', 'sin tabla en Pabellón 2 por falta de enfermera', C.RED ]].forEach(([v, l, col], k) => {
    tile(s, pres, ML + k * (w + 0.215), y, w, h, { value: v, label: l, color: col, size: 54 });
  });
  card(s, ML, 4.55, CW, 1.65, { pres, border: C.AMBER, borderW: 1.5 });
  txt(s, 'Histórico: el lunes suspende 11,09 %, más que cualquier otro día (significativo)', ML + 0.35, 4.7, CW - 0.7, 0.6, { fontSize: 20, bold: true, color: C.AMBER, valign: 'middle' });
  txt(s, 'Medida: confirmar pacientes y exámenes el viernes en la tarde, y asegurar la dotación de enfermería del lunes en Pabellón 2.', ML + 0.35, 5.32, CW - 0.7, 0.7, { fontSize: 15, color: C.TEXT2, valign: 'top' });
  foot(s, 'Agosto solo no alcanza para demostrarlo (p = 0,16); el histórico de 16 meses sí (Z = 2,09).');
  return s;
});

// 10 · El día quirúrgico
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '09  ·  TIEMPOS', title: 'El día quirúrgico de agosto, en un solo caso',
    notes: 'Medianas de agosto para un caso electivo de lunes a viernes: ingreso a anestesia 12 min, anestesia a incisión 18, incisión a término 54, término a salida 13; ocupación total 100,5 min; recambio neto 18 min (descontando 12:30–14:00). Primer caso del día: ingreso 07:55, anestesia 08:23, incisión 08:45 (n = 51). Las medianas de los tramos no suman la ocupación total.' });
  const segs = [{ l: 'Ingreso → anestesia', v: 12, c: C.BLUE2 }, { l: 'Anestesia → incisión', v: 18, c: C.VIOLET }, { l: 'Operación', v: 54, c: C.TEAL }, { l: 'Término → salida', v: 13, c: C.BLUE2 }, { l: 'Recambio', v: 18, c: C.AMBER }];
  const tot = segs.reduce((a, b) => a + b.v, 0); let cx = ML; const y0 = 2.1, H = 0.95;
  txt(s, 'UN CASO ELECTIVO TÍPICO DE LUNES A VIERNES · MINUTOS (MEDIANAS)', ML, 1.78, 10, 0.3, { fontSize: 11, bold: true, color: C.TEXT2, charSpacing: 2, valign: 'middle' });
  segs.forEach(sg => {
    const ww = CW * sg.v / tot;
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: y0, w: ww, h: H, fill: { color: sg.c, transparency: 20 }, line: { color: C.BG, width: 1.5 } });
    txt(s, `${sg.v}`, cx, y0, ww, H, { fontSize: 26, bold: true, color: C.BG, align: 'center', valign: 'middle' });
    txt(s, sg.l, cx, y0 + H + 0.06, ww, 0.5, { fontSize: 12.5, color: C.TEXT2, align: 'center' });
    cx += ww;
  });
  txt(s, 'De la entrada a la salida del quirófano: 100 minutos de mediana. Luego 18 minutos de recambio y entra el siguiente.', ML, 3.7, CW, 0.4, { fontSize: 15, color: C.TEXT2, valign: 'middle' });
  const w = 3.9, y = 4.3, h = 1.9;
  [[ '07:55', 'entra el primer paciente', '7 minutos antes que en julio', C.TEAL2 ], [ '08:45', 'primera incisión', '45 minutos después de entrar', C.TEAL2 ], [ '18 min', 'recambio entre pacientes', 'igual que en julio (19)', C.AMBER ]].forEach(([v, l, sub, col], k) => {
    tile(s, pres, ML + k * (w + 0.215), y, w, h, { value: v, label: l, sub, color: col, size: 40 });
  });
  foot(s, 'Medianas del export SITGEQ 830 (agosto, lunes a viernes, electivos). Las 08:00 y 09:00 son referencias, no metas.');
  return s;
});

// 11 · Los tiempos mejoran en los extremos
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '10  ·  TIEMPOS · QUÉ CAMBIÓ', title: 'Los recambios largos se acortaron; el caso típico no cambió',
    notes: 'Recambio neto L–V: mediana 19 → 18 min, media 29,5 → 22,6, P90 59 → 43 (julio → agosto). Primer ingreso 08:02 → 07:55; primera incisión 08:50 → 08:45. Incisión antes de las 09:00: 62,7 % en agosto 2026 frente a 84,5 % en agosto 2025. Almuerzo: 33 h 35 sin actividad en 12:30–14:00 (julio 32 h 43).' });
  const w = 3.9, y = 2.0, h = 2.2;
  [[ '18 min', 'recambio · mediana', 'julio 19 · sin cambio', C.TEXT ], [ '22,6 min', 'recambio · media', 'julio 29,5 · −7 min', C.GREEN ], [ '43 min', 'recambio · uno de cada diez supera', 'julio 59 · −16 min', C.GREEN ]].forEach(([v, l, sub, col], k) => {
    tile(s, pres, ML + k * (w + 0.215), y, w, h, { value: v, label: l, sub, color: col, size: 48 });
  });
  card(s, ML, 4.45, 5.95, 1.75, { pres, border: C.GREEN, borderW: 1.5 });
  txt(s, 'Mejor', ML + 0.3, 4.55, 5.3, 0.4, { fontSize: 13, bold: true, color: C.GREEN, charSpacing: 2, valign: 'middle' });
  txt(s, 'El primer paciente entra a las 07:55 (julio 08:02) y la primera incisión es a las 08:45 (julio 08:50).', ML + 0.3, 4.95, 5.35, 1.1, { fontSize: 15.5, color: C.TEXT, valign: 'top' });
  card(s, 6.78, 4.45, 5.95, 1.75, { pres, border: C.RED, borderW: 1.5 });
  txt(s, 'Pendiente', 7.08, 4.55, 5.3, 0.4, { fontSize: 13, bold: true, color: C.RED, charSpacing: 2, valign: 'middle' });
  txt(s, 'Solo 63 % de las primeras incisiones ocurre antes de las 09:00 (agosto 2025: 85 %). El mediodía suma 33 horas sin actividad.', 7.08, 4.95, 5.35, 1.1, { fontSize: 15.5, color: C.TEXT, valign: 'top' });
  foot(s, 'Recambio neto: de la salida de un paciente al ingreso del siguiente, descontando el almuerzo (12:30–14:00).');
  return s;
});

// 12 · Qué esperar
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '11  ·  PROYECCIÓN', title: 'Qué esperar si el régimen se sostiene, y qué pasa si no',
    notes: `Septiembre (184 programadas): pronóstico EWMA prudente ${f2(S.pron_sep.tasa_pct)} % = ${f1(S.pron_sep.esperadas)} suspensiones (P5–P95 ${S.pron_sep.p5}–${S.pron_sep.p95}); si se sostiene el trimestre (1,23 %) ≈ 2. Septiembre–diciembre (734 programadas): 9 al 1,23 %, 29 al 4 %, 69 al 9,38 %. HPMM con 7 pabellones (5.387 programadas al año): 66 suspensiones al año al 1,23 % frente a 505 a la tasa 2025: 439 pacientes evitados. Distribución binomial.` });
  const w = 3.9, y = 2.0, h = 2.35;
  [[ '2 a 10', 'suspensiones en septiembre', 'pronóstico prudente · más de 10 es señal de deterioro', C.TEAL2 ], [ '9 · 29 · 69', 'septiembre a diciembre', 'si se sostiene · si sube a 4 % · si vuelve 2025', C.AMBER ], [ '66 vs 505', 'al año en el HPMM (7 pabellones)', 'régimen actual vs tasa 2025 · 439 pacientes de diferencia', C.GREEN ]].forEach(([v, l, sub, col], k) => {
    tile(s, pres, ML + k * (w + 0.215), y, w, h, { value: v, label: l, sub, color: col, size: 44 });
  });
  card(s, ML, 4.6, CW, 1.6, { pres, border: C.TEAL, borderW: 1.5 });
  txt(s, 'El traslado al Marga Marga multiplica por 2,3 la exposición: amplifica la tasa que llevemos', ML + 0.35, 4.72, CW - 0.7, 0.6, { fontSize: 18, bold: true, color: C.TEAL2, valign: 'middle' });
  txt(s, 'Sostener el régimen depende de lo que se institucionalice antes del traslado: causal completa, lunes blindado, dotación y camas de rescate.', ML + 0.35, 5.35, CW - 0.7, 0.7, { fontSize: 15, color: C.TEXT2, valign: 'top' });
  foot(s, 'Escenarios binomiales con el volumen de cada período; no incorporan estacionalidad ni cambio de mezcla.');
  return s;
});

// 13 · Decisiones
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '12  ·  SEPTIEMBRE', title: 'Cinco decisiones para septiembre',
    notes: 'Prioridades con responsable y plazo a acordar en el comité. Corresponden a las láminas de gestión, lunes, causas, registro operable y almuerzo de la versión completa.' });
  const items = [
    ['1', 'Completar la causa de las 38 suspensiones', 'por jornada en el fin de semana; "sin causa determinada" disponible', C.RED],
    ['2', 'Blindar el lunes y recuperar el pabellón-día', 'confirmación el viernes en la tarde · enfermería asegurada en Pabellón 2', C.RED],
    ['3', 'Auditar el error de programación', '7 casos, 3 cirugías mayores directas · separar error de agenda de indicación o insumo', C.AMBER],
    ['4', 'Consentimiento y ayuno antes de la tabla', 'medida del 31 de agosto: sin consentimiento firmado no hay tabla', C.AMBER],
    ['5', 'Registro operable y piloto de almuerzo', 'campos de julio en CancelOS · cobertura de 4 semanas con hitos de sala, paciente y URPA', C.TEAL],
  ];
  items.forEach(([n, tt, sub, col], k) => {
    const y = 1.95 + k * 0.92;
    card(s, ML, y, CW, 0.82, { pres, border: col, borderW: 1.5 });
    txt(s, n, ML + 0.25, y, 0.6, 0.82, { fontSize: 30, bold: true, color: col, valign: 'middle' });
    txt(s, tt, ML + 0.95, y + 0.08, 8.5, 0.4, { fontSize: 18, bold: true, color: C.WHITE, valign: 'middle' });
    txt(s, sub, ML + 0.95, y + 0.46, CW - 1.2, 0.34, { fontSize: 13, color: C.MUTED, valign: 'middle' });
  });
  return s;
});

// 14 · Fuentes y anexo
slides.push((pres, i, t) => {
  const s = base(pres, { num: i, total: t, kicker: '13  ·  FUENTES Y ANEXO', title: 'De dónde salen las cifras',
    notes: 'Fuentes: monitoreo diario -15/-16 (serie homogénea ene-2025 a ago-2026, criterio L–V); informe de suspensiones de agosto (correo del 2-sep); exports SITGEQ 787 y 830; informe "Evolución del proceso quirúrgico" (6-sep); REM832; escritorio SITGEQ (5-sep); Comité de julio; SPC_Suspensiones_HQ. Sin datos personales.' });
  const rows = [
    ['Monitoreo diario (ene-2025 → ago-2026)', 'tasa de suspensión, producción, comparación con 2025 y control estadístico'],
    ['Informe de suspensiones de agosto (2-sep)', 'las 38 suspensiones: causas, día, modalidad y evitabilidad'],
    ['Exports SITGEQ 787 y 830', 'tiempos: primer caso, recambio, ocupación, pabellón y especialidad'],
    ['Informe "Evolución del proceso quirúrgico" (6-sep)', 'series de recambio y primeros casos 2024–2026; evaluación de algoritmos'],
    ['Comité de julio y SPC histórico', 'regla de evitabilidad, línea base 2025, efecto lunes y proyección HPMM'],
  ];
  rows.forEach(([a, b], k) => {
    const y = 1.95 + k * 0.7;
    txt(s, a, ML, y, 5.3, 0.6, { fontSize: 15, bold: true, color: C.WHITE, valign: 'middle' });
    txt(s, b, 6.0, y, 6.73, 0.6, { fontSize: 14, color: C.TEXT2, valign: 'middle' });
    s.addShape(pres.shapes.LINE, { x: ML, y: y + 0.66, w: CW, h: 0, line: { color: C.BORDER, width: 0.5 } });
  });
  card(s, ML, 5.55, CW, 0.85, { pres, border: C.TEAL, borderW: 1.25 });
  txt(s, 'Anexo: la versión completa (49 láminas) tiene los métodos, las tablas, las pruebas estadísticas y las notas de cada cifra.', ML + 0.3, 5.55, CW - 0.6, 0.85, { fontSize: 15, color: C.TEXT, valign: 'middle' });
  foot(s, 'Información agregada, sin datos personales. Los identificadores se usan solo para conciliar fuentes.');
  return s;
});

const pres = newDeck();
pres.title = 'Comité Quirúrgico · Agosto 2026 · versión breve';
slides.forEach((fn, k) => { const s = fn(pres, k + 1, slides.length); s._pres = pres; });
const out = path.join(__dirname, 'Comite_Agosto_2026_breve.pptx');
pres.writeFile({ fileName: out }).then(f => console.log('escrito', f, 'láminas', slides.length));
