// Láminas 1–20: resumen, suspensiones, causas, evitabilidad, gestión, producción
const { C, txt, baseSlide, card, kpi, note, table, hbars, vbars, legend, footnote, darkChart, pchart, fmtP } = require('./lib');
const S = require('./stats.json');

const SRC = {
  mon: 'Fuente: 2025 Cirugía por rangos de fecha-15.xlsx, hoja1!A1:DO609. Serie homogénea de 608 fechas (enero de 2025 a agosto de 2026); agosto coincide con el archivo -16 en 31 fechas y 119 columnas. Hábil = lunes a viernes, sin filtro adicional de festivos. Tasa = suspendidas de programación normal de CME (N) / programadas normales (L). CME realizadas = normales + condicionales + agregadas (P + Q + R).',
  reg: 'Fuente: informe-suspensiones-usuarios-2026-09-05.xlsx (Informe de Suspensiones Mes Agosto 2026, correo del 2 de septiembre), Sheet1!A2:L39, agosto completo. 38 registros: 37 electivos y 1 urgencia. Sus conteos no comparten el denominador de programación normal del monitoreo.',
  enc: 'Fuente: export-830-encuentro-quirurgicos.xlsx, Sheet1!A2:AR642, agosto de 2026. 641 filas originales, 640 encuentros tras retirar una copia exacta de un encuentro de urgencia; 434 electivos y 206 urgencias. Sin datos personales.',
  pdf: 'Fuente: Informe de análisis "Evolución del proceso quirúrgico" (borrador para validación institucional, 6 de septiembre de 2026): recambio, primeros inicios, almuerzo, ocupación, prestaciones y evaluación local de algoritmos.',
  sit: 'Fuente: SITGEQ, escritorio consultado el 5 de septiembre de 2026 con filtro 1–31 de agosto y pabellones de tipo electivo 2–4. Variaciones copiadas del tablero; no se reconstruyen valores absolutos de julio desde porcentajes redondeados.',
  jul: 'Referencia: Comité Quirúrgico · Julio 2026 (estructura, clasificación de evitabilidad del analista y proyección HPMM) e Informe de suspensiones y producción CME HQPE (agosto 2026, ene-2025 a jul-2026).',
};

function heroRow(s, pres, x, y, w, h, { value, label, desc, color = C.TEAL2, border = C.BORDER, valueW = 1.85, valueSize = 26 }) {
  card(s, x, y, w, h, { pres, border, borderW: border === C.BORDER ? 0.75 : 1.25 });
  txt(s, value, x + 0.18, y, valueW, h, { fontSize: valueSize, bold: true, color, valign: 'middle' });
  txt(s, label, x + 0.18 + valueW, y + 0.13, w - valueW - 0.36, 0.26, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.2, valign: 'middle' });
  txt(s, desc, x + 0.18 + valueW, y + 0.42, w - valueW - 0.36, h - 0.5, { fontSize: 9.5, color: C.MUTED });
}

function statRow(s, pres, items, y, h = 0.78, x0 = 0.55, wTot = 12.22, gap = 0.14) {
  const w = (wTot - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const x = x0 + i * (w + gap);
    card(s, x, y, w, h, { pres, border: it.border || C.BORDER, borderW: it.border ? 1.25 : 0.75 });
    txt(s, it.value, x + 0.15, y + 0.08, w - 0.3, 0.36, { fontSize: it.valueSize || 18, bold: true, color: it.color || C.TEXT, valign: 'middle' });
    const lfs = (it.label.length * 0.078 + 0.1) > (w - 0.3) ? 6.5 : 7.5;
    txt(s, it.label, x + 0.15, y + 0.42, w - 0.3, 0.2, { fontSize: lfs, bold: true, color: C.TEXT2, charSpacing: lfs === 7.5 ? 1.2 : 0.6, valign: 'middle' });
    if (it.sub) txt(s, it.sub, x + 0.15, y + 0.6, w - 0.3, h - 0.62, { fontSize: 8.5, color: C.MUTED });
  });
}

const EVCOL = { evitable: C.RED, pot_evitable: C.AMBER, no_evitable: C.GREEN, sin_causal: C.GRAY };
const EVLBL = { evitable: 'Evitable', pot_evitable: 'Potencialmente evitable', no_evitable: 'No evitable', sin_causal: 'Sin causal registrada' };

// ─────────────────────────────────────────────────────────────
const slides = [];

// 01 · Portada / resumen ejecutivo
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  COMITÉ QUIRÚRGICO  ·  AGOSTO 2026', title: 'Resumen de Gestión Quirúrgica',
    subtitle: 'Hospital de Quilpué · SSVQ — Coordinación del Proceso Quirúrgico / UPPQ · Agosto 2026 y acumulado enero–agosto',
    notes: 'Abrir con la lectura serena del mes: 1,32 % de suspensión hábil (2 de 152 programadas normales L–V), un caso más que julio (0,65 %) y la segunda tasa más baja de la serie de 20 meses. El acumulado enero–agosto 2026 queda en 5,04 % frente a 9,83 % en 2025. El registro operativo amplía la mirada: 38 eventos, 18 sin causal. La producción hábil crece 13,5 % interanual en el acumulado.\n\n' + SRC.mon + '\n' + SRC.reg });
  card(s, 0.55, 1.85, 6.0, 2.8, { pres, border: C.TEAL, borderW: 1.25 });
  txt(s, 'TASA HÁBIL DE SUSPENSIÓN  ·  AGOSTO 2026', 0.75, 2.0, 5.6, 0.26, { fontSize: 9, bold: true, color: C.TEXT2, charSpacing: 2, valign: 'middle' });
  txt(s, [{ text: '1,32', options: { fontSize: 60, bold: true, color: C.TEAL2 } }, { text: ' %', options: { fontSize: 28, bold: true, color: C.TEAL2 } }], 0.75, 2.24, 5.6, 1.05, { valign: 'middle' });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 3.36, w: 4.1, h: 0.36, rectRadius: 0.18, fill: { color: C.CARD }, line: { color: C.AMBER, width: 1 } });
  txt(s, '▲  +0,67 pp vs julio (0,65 %)  ·  un caso más', 0.75, 3.36, 4.1, 0.36, { fontSize: 10.5, bold: true, color: C.AMBER, align: 'center', valign: 'middle' });
  txt(s, '2 suspensiones de 152 programadas normales · L–V · monitoreo homogéneo', 0.75, 3.84, 5.6, 0.28, { fontSize: 11, color: C.TEXT3 });
  txt(s, 'Agosto 2025 a la misma fecha: 12,11 % (23 / 190) · tasa bruta del mes, todas las fechas: 0,52 % (2 / 385)', 0.75, 4.16, 5.6, 0.4, { fontSize: 9.5, color: C.MUTED });
  card(s, 0.55, 4.8, 6.0, 1.6, { pres });
  txt(s, 'TASA HÁBIL · SERIE HOMOGÉNEA  ·  MAR → AGO 2026', 0.75, 4.9, 5.6, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  vbars(s, pres, [8.33, 5.75, 4.22, 1.68, 0.65, 1.32].map((v, k) => ({ value: v, label: ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'][k], color: k === 5 ? C.TEAL2 : C.TEAL })), 0.85, 5.12, 5.4, 1.22, { valueFmt: v => v.toFixed(2).replace('.', ','), fontSize: 9, labelH: 0.24, valueH: 0.22 });
  const rx = 6.75, rw = 6.03;
  heroRow(s, pres, rx, 1.85, rw, 1.02, { value: '+13,5 %', label: 'CME EN HORARIO HÁBIL · ENE–AGO', desc: '1.657 → 1.880 (2025 → 2026) · mismos 173 días L–V · de 9,6 a 10,9 CME por día hábil', color: C.GREEN });
  heroRow(s, pres, rx, 2.99, rw, 1.02, { value: '−44 %', label: 'SUSPENSIONES HÁBILES · ENE–AGO', desc: '133 → 74 · tasa 9,83 % → 5,04 % · diferencia significativa (Fisher p < 0,001)', color: C.GREEN });
  heroRow(s, pres, rx, 4.13, rw, 1.02, { value: '411', label: 'CME REALIZADAS · AGOSTO · TODAS LAS FECHAS', desc: '201 L–V + 210 fin de semana · +33,4 % vs julio (308) · −1,9 % vs agosto 2025 (419)' });
  heroRow(s, pres, rx, 5.27, rw, 1.13, { value: '38', label: 'EVENTOS · REGISTRO OPERATIVO', desc: 'Solo 2 (5,3 %) visibles para MINSAL · 18 sin causal (47 %) · 18 oftalmológicas de fin de semana · error de programación causa #1 (7)', color: C.RED, border: C.RED });
  footnote(s, 'Hábil = lunes a viernes. CME = cirugía mayor electiva. Cada indicador se lee con su denominador propio; las poblaciones de suspensión no se suman (lámina "Cuatro fuentes").', { y: 6.55, h: 0.4 });
  return s;
});

// 02 · El período en cifras
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  RESUMEN', title: 'El período en cifras', subtitle: 'Producción y suspensiones consolidadas · Agosto 2026 y enero–agosto 2026 · CME normal en día hábil',
    notes: 'Las tasas acumuladas usan la suma de suspendidas dividida por la suma de programadas, no el promedio de tasas mensuales. Julio 2026 se recalcula con la serie homogénea (1 / 155 = 0,65 %); el PPT de julio informó 1 / 141 = 0,71 % (ver anexo). La media mensual ene–ago 2026 se calcula sobre 8 meses.\n\n' + SRC.mon });
  statRow(s, pres, [
    { value: '1.469', label: 'PROG. HÁBIL ENE–AGO', sub: '1.353 en 2025 · +8,6 %' },
    { value: '74', label: 'SUSP. MINSAL ENE–AGO', sub: '133 en 2025 · −44,4 %' },
    { value: '5,04 %', label: 'TASA HÁBIL ENE–AGO', sub: '9,83 % en 2025 · −48,7 % relativo' },
    { value: '1,32 %', label: 'AGOSTO HÁBIL', sub: '2 de 152 · julio 0,65 %', color: C.TEAL2, border: C.TEAL },
    { value: '6.417', label: 'ACTIVIDAD TOTAL ENE–AGO', sub: '+17,9 % interanual · todas las fechas', color: C.TEAL2, border: C.TEAL },
  ], 1.85, 1.0);
  txt(s, 'FICHA DEL MES  ·  CME NORMAL DÍA HÁBIL', 0.55, 3.0, 8, 0.26, { fontSize: 9, bold: true, color: C.TEXT2, charSpacing: 2, valign: 'middle' });
  table(s, [
    ['Indicador', 'Ago 2026', 'Jul 2026', 'Ago 2025', 'Media mensual ene–ago 2026'],
    ['Programadas normales L–V', '152', '155', '190', '184'],
    ['Suspendidas', '2', '1', '23', '9,3'],
    ['Tasa de suspensión hábil', '1,32 %', '0,65 %', '12,11 %', '5,04 %'],
    ['CME realizadas L–V', '201', '214', '231', '235'],
    ['CME por día L–V', '9,57', '9,30', '11,00', '10,87'],
    ['Días lunes a viernes', '21', '23', '21', '21,6'],
  ], { x: 0.55, y: 3.3, w: 12.22, colW: [3.9, 2.0, 2.0, 2.0, 2.32], fontSize: 11.5, rowH: 0.38, highlightCol: 1 });
  footnote(s, 'Ene–ago 2026: 74 / 1.469 = 5,04 % · Media de 20 meses (ene-25 a ago-26): 7,61 % (274 / 3.601) · Actividad declarada = CME + urgencia mayor + cirugía menor + procedimientos del monitoreo (incluye el nuevo registro de procedimientos desde julio; ver "Producción comparada").', { y: 6.12, h: 0.55 });
  return s;
});

// 03 · Lectura del mes
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  LECTURA DEL MES', title: 'Agosto: un caso más, la segunda tasa más baja de 20 meses', subtitle: 'Tasa hábil y tasa bruta siguen bajo todos los umbrales de referencia · primer repunte tras cinco descensos consecutivos',
    notes: 'Presentar los numeradores junto a las tasas: el aumento equivale a una suspensión adicional con tres programadas normales menos. Es una descripción mensual; no demuestra un deterioro sostenido. Los umbrales (< 3 % internacional, < 6,5 % COMGES) son referencias comparativas, no metas automáticas.\n\n' + SRC.mon });
  card(s, 0.55, 1.85, 5.9, 1.75, { pres, border: C.TEAL, borderW: 1.25 });
  txt(s, '◆  EN LA TABLA HÁBIL', 0.75, 1.97, 5.5, 0.26, { fontSize: 9, bold: true, color: C.TEAL2, charSpacing: 2, valign: 'middle' });
  txt(s, '1,32 %', 0.75, 2.22, 5.5, 0.8, { fontSize: 44, bold: true, color: C.TEXT, valign: 'middle' });
  txt(s, [{ text: '2 suspensiones', options: { bold: true, color: C.TEXT } }, { text: ' / 152 CME normales L–V · excluye condicionales y fin de semana', options: { color: C.MUTED } }], 0.75, 3.05, 5.5, 0.45, { fontSize: 10 });
  card(s, 0.55, 3.72, 5.9, 1.75, { pres });
  txt(s, '◆  TASA BRUTA · TODAS LAS FECHAS', 0.75, 3.84, 5.5, 0.26, { fontSize: 9, bold: true, color: C.TEXT2, charSpacing: 2, valign: 'middle' });
  txt(s, '0,52 %', 0.75, 4.09, 5.5, 0.8, { fontSize: 44, bold: true, color: C.TEXT, valign: 'middle' });
  txt(s, [{ text: '2 suspensiones', options: { bold: true, color: C.TEXT } }, { text: ' / 385 programadas normales · fin de semana 0 / 233 en su campo', options: { color: C.MUTED } }], 0.75, 4.92, 5.5, 0.45, { fontSize: 10 });
  card(s, 6.65, 1.85, 6.12, 3.62, { pres });
  txt(s, '6 MESES · TASA HÁBIL 2026', 6.85, 1.97, 5.7, 0.26, { fontSize: 9, bold: true, color: C.TEXT2, charSpacing: 2, valign: 'middle' });
  vbars(s, pres, [8.33, 5.75, 4.22, 1.68, 0.65, 1.32].map((v, k) => ({ value: v, label: ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto'][k], color: k === 5 ? C.TEAL2 : C.TEAL })), 6.95, 2.3, 5.55, 3.05, { valueFmt: v => v.toFixed(2).replace('.', ','), fontSize: 10 });
  statRow(s, pres, [
    { value: '+0,67 pp', label: 'VS JULIO (0,65 %)', sub: 'un caso más · tres programadas menos', color: C.AMBER },
    { value: '−89 %', label: 'VS AGOSTO 2025 (12,11 %)', sub: '23 → 2 suspensiones · Fisher p < 0,001', color: C.GREEN },
    { value: '< 3 %', label: 'ESTÁNDAR INTERNACIONAL', sub: '3 meses consecutivos bajo el umbral (jun–ago)' },
    { value: '< 6,5 %', label: 'COMGES', sub: '5 meses consecutivos bajo el umbral (abr–ago)' },
  ], 5.62, 0.85);
  return s;
});

// 04 · Control estadístico (carta p)
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  CONTROL ESTADÍSTICO', title: 'La mejora se sostiene: tres meses bajo el límite inferior de control', subtitle: 'Carta p mensual · línea central 9,38 % (2025 completo) · límites ±3σ calculados con el denominador de cada mes · 20 meses',
    notes: `Carta p: p̄ = 200 / 2.132 = 9,38 % (2025). Límite inferior de cada mes = p̄ − 3·√(p̄(1−p̄)/n). Junio (1,68 % vs LCL 2,84 %), julio (0,65 % vs 2,36 %) y agosto (1,32 % vs 2,29 %) quedan bajo el límite inferior: causa especial favorable por tercer mes consecutivo. Trimestre jun–ago 2026: 6 / 486 = 1,23 % frente a 268 / 3.115 = 8,60 % del período ene-25–may-26 (RR 0,14; prueba exacta de Fisher p = 2,3·10⁻¹¹). Frente al mismo trimestre de 2025 (67 / 587 = 11,41 %): RR 0,11. Un mes con 1–2 casos varía por azar; la señal está en la secuencia y en el acumulado.\n\n` + SRC.mon });
  card(s, 0.55, 1.85, 8.35, 4.55, { pres });
  pchart(s, pres, { labels: S.meses.map(m => m.replace('-', '\n')), tasa: S.tasa, lcl: S.lcl, ucl: S.ucl, center: S.p_2025, flag: S.bajo_lcl }, 0.65, 1.95, 8.15, 4.35, { yMax: 16, fontSize: 7.5 });
  const x = 9.05, w = 3.72;
  kpi(s, pres, x, 1.85, w, 1.42, { value: '3 meses', label: 'BAJO −3σ · JUN, JUL Y AGO 2026', sub: '1,68 % · 0,65 % · 1,32 % frente a límites inferiores de 2,84 · 2,36 · 2,29 %', color: C.GREEN, border: C.GREEN, valueSize: 26 });
  kpi(s, pres, x, 3.39, w, 1.42, { value: '1,23 %', label: 'TRIMESTRE JUN–AGO 2026', sub: '6 / 486 · RR 0,14 vs ene-25–may-26 (8,60 %) · Fisher p < 0,0001', valueSize: 26 });
  kpi(s, pres, x, 4.93, w, 1.47, { value: 'RR 0,11', label: 'VS MISMO TRIMESTRE 2025', sub: 'jun–ago 2025: 67 / 587 = 11,41 % · el quiebre de enero 2026 (CUSUM, informe de julio) no se revierte', valueSize: 26 });
  footnote(s, 'Puntos verdes: meses bajo el límite inferior. Un mes con numerador de 1–2 casos varía por azar; la evidencia de mejora está en la secuencia jun–ago y en el acumulado. La carta usa la serie homogénea del monitoreo (L–V).', { y: 6.5, h: 0.45 });
  return s;
});

// 05 · Fuentes de suspensión
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  SUSPENSIONES', title: 'Cuatro fuentes, cuatro poblaciones: los indicadores no se suman', subtitle: 'Cada indicador se lee con su denominador y alcance propios',
    notes: 'Esta distinción debe permanecer visible. El total calendario del monitoreo no es el total de suspensiones hospitalarias. La tasa de 7,5 % pertenece a la cohorte y lógica de agenda del tablero SITGEQ; no se sustituye su denominador por el del monitoreo. No calcular 18 / 251 para Oftalmología: las cohortes no coinciden por identidad y fecha. El nuevo REM832 clasifica 4 suspensiones (1 hábil, 2 inhábil L–V, 1 fin de semana) con criterio propio y no reemplaza el criterio L–V solicitado.\n\n' + SRC.mon + '\n' + SRC.reg + '\n' + SRC.sit });
  table(s, [
    ['Fuente y población', 'Agosto 2026', 'Qué mide', 'Cómo se lee'],
    ['Monitoreo · hábil L–V', '2 / 152 = 1,32 %', 'Programación normal de CME, lunes a viernes', 'Indicador solicitado por el comité'],
    ['Monitoreo · total calendario', '2 / 385 = 0,52 %', 'El mismo campo, todas las fechas', 'Diluido por el fin de semana'],
    ['Monitoreo · fin de semana', '0 / 233', 'Su campo declara cero', 'No significa ausencia operativa'],
    ['Registro operativo (informe 5-sep)', '38 suspensiones', '19 L–V + 19 fin de semana · 37 electivas + 1 urgencia', 'Conteo; no es una tasa'],
    ['REM832 (nuevo sistema)', '4 suspensiones', '1 hábil · 2 inhábil L–V · 1 fin de semana', 'Clasificación propia; fuente diferenciada'],
    ['Tablero SITGEQ', '7,5 %', 'Cohorte de agenda confirmada · pabellones 2–4', 'Fórmula y cohorte del escritorio'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [3.1, 2.1, 4.0, 3.02], fontSize: 11, rowH: 0.5, highlightCol: 1 });
  note(s, pres, 0.55, 5.5, 5.95, 0.92, { title: '◆  LAS DOS DEL MONITOREO ESTÁN DENTRO DE LAS 38', body: 'No se suman: 3 y 17 de agosto, Traumatología, cirugía mayor directa. Las 18 oftalmológicas están dentro de las 22 condicionales.', border: C.TEAL, titleColor: C.TEAL2 });
  note(s, pres, 6.82, 5.5, 5.95, 0.92, { title: '◆  NO SE CALCULA UNA TASA OFTALMOLÓGICA', body: '18 / 251 queda descartada: las suspensiones no coinciden por identidad y fecha con las 251 programadas del REM.', border: C.AMBER, titleColor: C.AMBER });
  return s;
});

// 06 · Registro completo
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  REGISTRO COMPLETO', title: 'Registro total de suspensiones — agosto', subtitle: '38 eventos en el universo completo (informe operativo 1–31 ago) · solo 2 son CME normal hábil — los eventos MINSAL',
    notes: 'La jerarquía del registro: dos eventos MINSAL dentro de cinco mayores directas; cinco dentro de quince directas; quince directas más veintidós condicionales más una urgencia completan los 38. Los bloques se agrupan por clase de evitabilidad asignada por el analista a partir de la causal registrada (regla de julio); 18 registros no tienen causal y no se clasifican.\n\n' + SRC.reg });
  txt(s, 'UN BLOQUE = UN EVENTO  ·  AGRUPADO POR CLASE DE EVITABILIDAD (CAUSAL REGISTRADA)', 0.55, 1.88, 7.5, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  const order = ['evitable', 'pot_evitable', 'no_evitable', 'sin_causal'];
  const blocks = []; order.forEach(k => { for (let j = 0; j < S.evit[k]; j++) blocks.push(k); });
  const bw = 0.62, bh = 0.5, gx = 0.1, gy = 0.1, cols = 10;
  blocks.forEach((k, j) => {
    const r = Math.floor(j / cols), c = j % cols;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.55 + c * (bw + gx), y: 2.25 + r * (bh + gy), w: bw, h: bh, rectRadius: 0.06, fill: { color: EVCOL[k], transparency: 35 }, line: { color: EVCOL[k], width: 1 } });
  });
  legend(s, pres, order.map(k => ({ color: EVCOL[k], label: `${EVLBL[k]} (${S.evit[k]})` })), 0.55, 4.72, { fontSize: 9, gap: 0.22 });
  txt(s, '◆  15 de los 38 registros tienen causal evitable o potencialmente evitable; 18 no tienen causal y no se clasifican. Regla de evitabilidad: lámina "Evitabilidad".', 0.55, 5.05, 7.6, 0.4, { fontSize: 9.5, color: C.TEXT3 });
  txt(s, '38', 8.45, 1.85, 4.3, 0.8, { fontSize: 48, bold: true, color: C.AMBER, valign: 'middle' });
  txt(s, 'EVENTOS EN EL UNIVERSO COMPLETO', 8.45, 2.65, 4.3, 0.24, { fontSize: 9, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  txt(s, [{ text: '27 Cx Mayor · 4 Cx Menor · 7 Procedimientos · 15 directas · 22 condicionales · 1 urgencia · ' }, { text: 'solo 2 caen en el indicador oficial', options: { bold: true, color: C.TEXT } }], 8.45, 2.92, 4.3, 0.62, { fontSize: 10, color: C.TEXT3 });
  note(s, pres, 8.45, 3.6, 4.32, 1.35, { title: '◆  SOLO 2 SON VISIBLES PARA MINSAL', body: 'El monitoreo cuenta la CME normal de lunes a viernes: 5,3 % del registro. Los otros 36 eventos consumen preparación, agenda y pabellón reales, pero son invisibles para la tasa oficial.', border: C.TEAL, titleColor: C.TEAL2 });
  statRow(s, pres, [
    { value: '5,3 %', label: 'VISIBILIDAD MINSAL AGOSTO', sub: '2 de 38 eventos · julio: 3,4 % (1 de 29)' },
    { value: '13 / 21', label: 'DÍAS HÁBILES CON REGISTROS', sub: '61,9 % de los días L–V · julio: 16 / 22' },
    { value: '47 %', label: 'SIN CAUSAL REGISTRADA', sub: '18 de 38 · 17 oftalmológicas de fin de semana + 1', color: C.AMBER, border: C.AMBER },
    { value: '2 de 2', label: 'EVENTOS MINSAL EN LUNES', sub: '3 y 17 de agosto · Traumatología · mayor directa' },
  ], 5.55, 0.88);
  return s;
});

// 07 · Casuística: las cinco mayores directas
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  CASUÍSTICA', title: 'Las cinco cirugías mayores directas suspendidas en agosto', subtitle: 'Registro consolidado por fecha, especialidad y causal · sin datos de pacientes · las dos primeras son los eventos del monitoreo',
    notes: 'Registros agregados por fecha, especialidad y causal, sin información de pacientes. Las dos primeras coinciden con el consolidado mensual del monitoreo (correo del 2 de septiembre). Las otras tres mayores directas constan con error de programación en el reporte operativo y no aparecen en el campo de suspendidas del monitoreo: corresponde conciliar el criterio entre ambas fuentes antes de la próxima medición. La evitabilidad es la clasificación del analista y no reemplaza la validación clínica y operacional.\n\n' + SRC.reg + '\n' + SRC.mon });
  table(s, [
    ['Fecha', 'Día', 'Especialidad reportada', 'Tipo · modalidad', 'Causal registrada', 'Evitabilidad (analista)', 'Indicador MINSAL'],
    ['3 de agosto', 'Lunes', 'Traumatología', 'Mayor · Directa', 'Instrumental incompleto', { text: 'Evitable', options: { color: C.RED, bold: true } }, { text: 'Sí · 1 de 2', options: { color: C.TEAL2, bold: true } }],
    ['17 de agosto', 'Lunes', 'Traumatología', 'Mayor · Directa', 'No presentación', { text: 'Potencialmente evitable', options: { color: C.AMBER, bold: true } }, { text: 'Sí · 2 de 2', options: { color: C.TEAL2, bold: true } }],
    ['20 de agosto', 'Jueves', 'No consignada en el consolidado', 'Mayor · Directa', 'Error de programación', { text: 'Evitable', options: { color: C.RED, bold: true } }, 'No'],
    ['28 de agosto', 'Viernes', 'No consignada en el consolidado', 'Mayor · Directa', 'Error de programación', { text: 'Evitable', options: { color: C.RED, bold: true } }, 'No'],
    ['31 de agosto', 'Lunes', 'No consignada en el consolidado', 'Mayor · Directa', 'Error de programación', { text: 'Evitable', options: { color: C.RED, bold: true } }, 'No'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [1.35, 0.95, 2.55, 1.6, 2.15, 2.02, 1.6], fontSize: 10.5, rowH: 0.46 });
  statRow(s, pres, [
    { value: '2 de 5', label: 'EN EL INDICADOR MINSAL', sub: 'las 3 por error de programación no figuran en el monitoreo: conciliar criterio', color: C.TEAL2 },
    { value: '3 de 5', label: 'EN LUNES', sub: '3, 17 y 31 de agosto · el lunes concentra también 6 de los 19 registros L–V' },
    { value: '2 de 2', label: 'TRAUMATOLOGÍA', sub: 'ambos eventos MINSAL · instrumental incompleto y no presentación' },
    { value: '3', label: 'ERROR DE PROGRAMACIÓN', sub: 'mayores directas del 20, 28 y 31 · auditar ficha por ficha (agenda vs indicación o insumo)', color: C.RED, border: C.RED },
  ], 4.85, 1.05);
  footnote(s, 'No convertir la revisión de causas en una estimación de evitabilidad sin validación clínica y operacional. La tabla nominal desidentificada (iniciales, intervención) puede incorporarse desde el archivo "1.- Suspensiones 2026 - Usuarios.xlsx" en la revisión del comité.', { y: 6.05, h: 0.6 });
  return s;
});

// 08 · Causas
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  CAUSAS', title: 'Causal registrada — los 38 eventos de agosto', subtitle: 'Error de programación es la causa #1 por segundo mes consecutivo · color = clasificación de evitabilidad del analista aplicada a la causal',
    notes: 'Agrupación por categoría MINSAL: Equipo quirúrgico = error de programación (7) + reemplazo por urgencia (3) + falta de cirujano (1) = 11 (28,9 %). Paciente = no presentación (3), ayuno / exámenes incompletos (2), enfermedad aguda (1), descompensación (1) = 7 (18,4 %). Apoyo e infraestructura = instrumental incompleto (1) e infraestructura (1) = 2 (5,3 %). Sin causal = 18 (47,4 %). Las 18 sin causal requieren completar el dato, no atribuir evitabilidad.\n\n' + SRC.reg });
  card(s, 0.55, 1.85, 7.35, 4.55, { pres });
  hbars(s, pres, S.causas.map(([label, n, k]) => ({ label, value: n, color: EVCOL[k] })), 0.7, 2.0, 7.05, 3.85, { labelW: 2.35, valueW: 0.5, max: 18, fontSize: 10.5 });
  legend(s, pres, ['evitable', 'pot_evitable', 'no_evitable', 'sin_causal'].map(k => ({ color: EVCOL[k], label: `${EVLBL[k]} (${S.evit[k]})` })), 0.75, 6.05, { fontSize: 8.5, gap: 0.16 });
  const x = 8.05, w = 4.72;
  note(s, pres, x, 1.85, w, 1.08, { title: 'EQUIPO QUIRÚRGICO · 11 (28,9 %)', body: 'Error de programación (7) + reemplazo por urgencia (3) + falta de cirujano (1). Sube de 10 a 11; el error de programación pasa de 5 a 7.', border: C.RED, titleColor: C.TEXT, bodySize: 9.5 });
  note(s, pres, x, 3.03, w, 1.08, { title: 'PACIENTE · 7 (18,4 %)', body: 'No presentación (3), ayuno / exámenes incompletos (2), enfermedad aguda (1), descompensación (1). La no presentación sube de 1 a 3.', border: C.AMBER, titleColor: C.TEXT, bodySize: 9.5 });
  note(s, pres, x, 4.21, w, 1.08, { title: 'APOYO E INFRAESTRUCTURA · 2 (5,3 %)', body: 'Instrumental incompleto (1; evento MINSAL del 3-ago) e infraestructura (1). Julio tuvo 10 por clima, desastres e infraestructura.', border: C.BORDER, titleColor: C.TEXT, bodySize: 9.5 });
  note(s, pres, x, 5.39, w, 1.01, { title: 'SIN CAUSAL · 18 (47,4 %)', body: '17 oftalmológicas condicionales de fin de semana + 1. Completar el dato antes de atribuir evitabilidad.', border: C.GRAY, titleColor: C.TEXT, bodySize: 9.5 });
  footnote(s, 'Conteos del informe operativo (5 de septiembre); julio proviene del archivo del 30 de julio (29 registros). Categorías MINSAL según el catálogo SSVQ vigente (la "prolongación de tabla" se absorbió en "error de programación").', { y: 6.5, h: 0.45 });
  return s;
});

// 09 · Julio vs agosto
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  CAUSAS', title: 'Julio y agosto: las causas cambian de composición', subtitle: 'Comparación descriptiva de los registros disponibles · los cortes no son idénticos y no se interpretan como cambio de tasa',
    notes: 'Julio proviene de informe-suspensiones-usuarios-2026-07-30.xlsx: 29 registros sin duplicados, con eventos entre el 1 y el 29; el archivo del día 30 no acredita cobertura del 31. Agosto cubre el mes completo. Se agrupan infraestructura / clima / desastres: julio 4 clima + 3 desastre + 3 infraestructura; agosto 1 infraestructura. Otras causas: julio 3 recuperación y 1 presentación tardía; agosto 1 instrumental, 1 descompensación, 1 falta de cirujano y 1 enfermedad aguda. No se interpreta 29 → 38 como cambio de tasa.\n\n' + SRC.reg });
  table(s, [
    ['Causa agrupada', 'Julio · archivo día 30', 'Agosto 1–31', 'Variación', 'Lectura'],
    ['Error de programación', '5', '7', '+2', 'Causa #1 dos meses seguidos'],
    ['Reemplazo por urgencia', '5', '3', '−2', 'Presión urgente menor en el registro'],
    ['No presentación', '1', '3', '+2', 'Incluye un evento MINSAL (17-ago, lunes)'],
    ['Ayuno / exámenes incompletos', '4', '2', '−2', 'Reunión del 4-sep sobre ayuno'],
    ['Infraestructura / clima / desastres', '10', '1', '−9', 'Sin clima ni desastres en agosto'],
    ['Otras causas consignadas', '4', '4', '0', 'Instrumental, descompensación, cirujano, enfermedad aguda'],
    ['Sin causal registrada', '0', '18', '+18', '17 oftalmológicas de fin de semana + 1'],
    ['Total de registros', '29', '38', '+9', 'Cobertura distinta (29 días vs 31)'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [3.2, 1.9, 1.6, 1.3, 4.22], fontSize: 11, rowH: 0.44, boldRows: [8], highlightCol: 2 });
  note(s, pres, 0.55, 5.95, 12.22, 0.7, { title: null, body: [{ text: 'Lo gestionable no cambió de lugar: ', options: { bold: true, color: C.TEXT } }, { text: 'equipo quirúrgico y paciente concentran 18 de los 20 registros con causal (90 %). Lo que cambió es el dato faltante: de 0 a 18 registros sin causal en un mes.' }], border: C.TEAL, bodySize: 11 });
  return s;
});

// 10 · Modalidad × tamaño
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  CLASIFICACIÓN', title: 'La clasificación separa tamaño de cirugía y programación', subtitle: '38 registros de agosto · cada registro aparece una sola vez · sin duplicar las suspensiones del monitoreo',
    notes: 'La jerarquía es dos dentro de cinco mayores directas; cinco dentro de quince directas; quince directas más veintidós condicionales más una urgencia completan los 38. Este cruce evita tratar "2", "18" y "38" como grupos independientes sumables.\n\n' + SRC.reg });
  table(s, [
    ['Modalidad', 'Mayores', 'Menores', 'Procedimientos', 'Total'],
    ['Directa', '5', '4', '6', '15'],
    ['Condicional', '22', '0', '0', '22'],
    ['Urgencia', '0', '0', '1', '1'],
    ['Total', '27', '4', '7', '38'],
  ], { x: 0.55, y: 1.88, w: 7.2, colW: [2.2, 1.25, 1.25, 1.5, 1.0], fontSize: 12, rowH: 0.5, boldRows: [4], highlightCol: 4 });
  const x = 8.0, w = 4.77;
  kpi(s, pres, x, 1.88, w, 1.05, { value: '2 ⊂ 5', label: 'MINSAL DENTRO DE MAYORES DIRECTAS', sub: 'las dos suspensiones consolidadas son 2 de las 5 mayores directas', valueSize: 24 });
  kpi(s, pres, x, 3.05, w, 1.05, { value: '5 ⊂ 15', label: 'MAYORES DENTRO DE DIRECTAS', sub: '15 directas = 5 mayores + 4 menores + 6 procedimientos', valueSize: 24 });
  kpi(s, pres, x, 4.22, w, 1.05, { value: '18 ⊂ 22', label: 'OFTALMOLOGÍA DENTRO DE CONDICIONALES', sub: 'las 22 condicionales son cirugías mayores; 18 son oftalmológicas de fin de semana', valueSize: 24 });
  note(s, pres, 0.55, 4.6, 7.2, 1.35, { title: '◆  15 + 22 + 1 = 38', body: 'El circuito de programación directa (15) es el que la UPPQ prepara y confirma; el condicional (22) depende de cupos que se liberan y explica el fin de semana oftalmológico; la urgencia (1) es un procedimiento.', border: C.TEAL, titleColor: C.TEAL2, bodySize: 10.5 });
  footnote(s, 'Mayores = cirugía mayor; Menores = cirugía menor; Procedimientos = actividad no quirúrgica de pabellón (endoscopías, curaciones, etc.). Clasificación literal del informe operativo.', { y: 6.2, h: 0.45 });
  return s;
});

// 11 · Oftalmología
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  OFTALMOLOGÍA', title: 'Oftalmología: 232 CME y 18 suspensiones, dos cohortes que no se cruzan', subtitle: 'Toda la actividad electiva oftalmológica ocurre en fin de semana · encuentros realizados y suspensiones no cierran una misma cohorte',
    notes: 'Los 232 encuentros mayores electivos oftalmológicos realizados ocurren en fin de semana (229 facoéresis + 3 otras). Las 18 suspensiones oftalmológicas son condicionales, también de fin de semana, pero no coinciden por identidad y fecha con las 251 programadas del REM. No dividir 18 por 251 ni sumar 232 + 18 como si cerraran una cohorte. Diecisiete carecen de causal y una registra descompensación. Los 19 registros de fin de semana se concentran en dos fines de semana (8–9 y 22–23 de agosto: 16 registros), compatible con eventos de jornada más que con 18 fallas independientes; requiere completar la causal por jornada.\n\n' + SRC.enc + '\n' + SRC.reg });
  kpi(s, pres, 0.55, 1.88, 3.95, 1.75, { value: '232', label: 'CME REALIZADAS · OFTALMOLOGÍA', sub: '229 facoéresis + 3 otras · todas en fin de semana · 57 % de las 405 CME del export', valueSize: 40 });
  kpi(s, pres, 4.68, 1.88, 3.95, 1.75, { value: '18', label: 'SUSPENSIONES · CONDICIONALES', sub: 'fin de semana · 17 sin causal registrada · 1 descompensación', color: C.AMBER, border: C.AMBER, valueSize: 40 });
  kpi(s, pres, 8.81, 1.88, 3.96, 1.75, { value: '9 min', label: 'OCUPACIÓN MEDIANA · FIN DE SEMANA', sub: 'media 9,5 min (n = 231) · frente a 100,5 min en electivos L–V', valueSize: 40 });
  txt(s, 'REGISTROS DE SUSPENSIÓN EN FIN DE SEMANA  ·  POR JORNADA', 0.55, 3.85, 8, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  card(s, 0.55, 4.12, 7.4, 2.3, { pres });
  vbars(s, pres, [['S 1', 0], ['D 2', 0], ['S 8', 5], ['D 9', 4], ['S 15', 1], ['D 16', 2], ['S 22', 2], ['D 23', 5], ['S 29', 0], ['D 30', 0]].map(([l, v]) => ({ label: l, value: v, color: v >= 4 ? C.AMBER : C.TEAL })), 0.7, 4.22, 7.1, 2.1, { fontSize: 9 });
  note(s, pres, 8.15, 4.12, 4.62, 2.3, { title: '◆  DOS FINES DE SEMANA CONCENTRAN 16 DE 19', body: '8–9 de agosto (9 registros) y 22–23 de agosto (7). Es compatible con eventos de jornada (capacidad, dotación, insumos o ausencia de pacientes) más que con 18 fallas independientes. Sin la causal, el registro no permite decidir: completar por jornada, no por paciente.', border: C.AMBER, titleColor: C.AMBER, bodySize: 10 });
  footnote(s, 'No se calcula una tasa oftalmológica: 18 / 251 queda descartada por no compartir fechas de eventos. El fin de semana incluye además 1 urgencia (procedimiento) dentro de los 19 registros.', { y: 6.5, h: 0.45 });
  return s;
});

// 12 · Calendario
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  CALENDARIO', title: 'Calendario de suspensiones operativas — agosto 2026', subtitle: 'Cada casilla muestra el número de registros del informe operativo · fondo distinto en fin de semana · suma 38',
    notes: 'El calendario muestra el número de registros de suspensión operativa, no casos realizados ni una tasa diaria. La suma de todas las casillas es 38; las dos suspensiones del monitoreo ocurren el 3 y el 17 (lunes). Totales por día de la semana: lunes 6, martes 2, miércoles 2, jueves 3, viernes 6, sábado 8, domingo 11.\n\n' + SRC.reg });
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const cw = 1.65, gap = 0.11, ch = 0.5, gy = 0.09, x0 = 0.55, y0 = 2.2;
  days.forEach((d, c) => txt(s, d, x0 + c * (cw + gap), 1.88, cw, 0.26, { fontSize: 11, bold: true, color: C.TEXT2, valign: 'middle' }));
  // 1 de agosto de 2026 es sábado
  for (let d = 1; d <= 31; d++) {
    const idx = d + 4; // sábado=5 en la fila 0
    const r = Math.floor(idx / 7), c = idx % 7;
    const n = S.cal[String(d)];
    const x = x0 + c * (cw + gap), y = y0 + r * (ch + gy);
    const minsal = d === 3 || d === 17;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, rectRadius: 0.05, fill: { color: c >= 5 ? '142A39' : C.CARD }, line: { color: minsal ? C.TEAL : C.BORDER, width: minsal ? 1.5 : 0.75 } });
    txt(s, String(d), x + 0.08, y + 0.05, 0.5, 0.4, { fontSize: 10, color: C.MUTED, valign: 'middle' });
    txt(s, String(n), x + 0.6, y + 0.05, cw - 0.7, 0.4, { fontSize: 15, bold: true, color: n > 0 ? C.TEAL2 : C.MUTED, valign: 'middle', align: 'right' });
  }
  // fila de totales por día de semana
  const yT = y0 + 5 * (ch + gy) + 0.05;
  S.dow.forEach((n, c) => {
    const x = x0 + c * (cw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: yT, w: cw, h: 0.44, rectRadius: 0.05, fill: { color: C.CARD2 }, line: { color: c === 0 ? C.RED : C.BORDER, width: c === 0 ? 1.5 : 0.75 } });
    txt(s, 'total', x + 0.08, yT, 0.6, 0.44, { fontSize: 8.5, color: C.MUTED, valign: 'middle' });
    txt(s, String(n), x + 0.6, yT, cw - 0.7, 0.44, { fontSize: 14, bold: true, color: c === 0 ? C.RED : C.TEXT, valign: 'middle', align: 'right' });
  });
  footnote(s, 'Borde verde-agua: 3 y 17 de agosto, días con las dos suspensiones del monitoreo normal de CME (ambas lunes). Lunes a viernes: 19 registros en 13 de 21 días; fin de semana: 19 registros (sábado 8, domingo 11), circuito oftalmológico.', { y: 6.5, h: 0.45 });
  return s;
});

// 13 · El lunes
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  DÍA DE LA SEMANA', title: 'El lunes sigue siendo el día crítico de la tabla', subtitle: 'Registros operativos por día de la semana · lunes y viernes concentran 12 de los 19 registros L–V · los dos eventos MINSAL cayeron en lunes',
    notes: 'Lunes: 6 de 19 registros L–V (31,6 %) y los dos eventos MINSAL (3 y 17 de agosto). Correo del 23 de agosto: cancelación de la tabla del lunes 24 en Pabellón 2 por falta de enfermera del área, tercer lunes consecutivo (10, 17 y 24); se refiere a tablas, no a pacientes. Histórico SPC ene-25–abr-26: lunes 11,09 % de suspensión hábil (Z = 2,09, significativo al 5 %). La prioridad de julio "blindar las tablas del lunes" (confirmación telefónica y revisión de exámenes el viernes PM) sigue vigente.\n\n' + SRC.reg + '\nSPC_Suspensiones_HQ (Google Sheets, ene-2025 a abr-2026).' });
  card(s, 0.55, 1.85, 6.6, 4.55, { pres });
  txt(s, 'REGISTROS OPERATIVOS POR DÍA DE LA SEMANA  ·  AGOSTO 2026', 0.75, 1.97, 6.2, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  vbars(s, pres, ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((l, k) => ({ label: l, value: S.dow[k], color: k === 0 ? C.RED : (k >= 5 ? C.BLUE : C.TEAL) })), 0.8, 2.35, 6.1, 3.9, { fontSize: 10.5 });
  const x = 7.35, w = 5.42;
  kpi(s, pres, x, 1.85, w, 1.05, { value: '6 / 19', label: 'REGISTROS L–V EN LUNES (31,6 %)', sub: 'viernes 6 · jueves 3 · martes y miércoles 2 cada uno', color: C.RED, border: C.RED, valueSize: 24 });
  kpi(s, pres, x, 3.02, w, 1.05, { value: '2 / 2', label: 'EVENTOS MINSAL EN LUNES', sub: '3 y 17 de agosto · Traumatología · probabilidad 1 en 25 si el día fuera azar (p = 0,04)', valueSize: 24 });
  kpi(s, pres, x, 4.19, w, 1.05, { value: '3 tablas', label: 'LUNES SIN TABLA EN PABELLÓN 2', sub: '10, 17 y 24 de agosto por falta de enfermera del área (correo del 23-ago) · tablas, no pacientes', color: C.AMBER, border: C.AMBER, valueSize: 24 });
  kpi(s, pres, x, 5.36, w, 1.04, { value: '11,09 %', label: 'LUNES · HISTÓRICO ENE-25 → ABR-26 (SPC)', sub: 'Z = 2,09, significativo al 5 % · agosto solo no lo demuestra (6 de 19, p = 0,16) · "blindar el lunes" sigue vigente', valueSize: 24 });
  footnote(s, 'Fin de semana (sábado 8, domingo 11): circuito oftalmológico condicional, sin causal en 17 de 18. Los correos aportan contexto y pueden coincidir con registros: no se suman.', { y: 6.5, h: 0.45 });
  return s;
});

// 14 · Evitabilidad
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  EVITABILIDAD', title: 'Evitabilidad: la mitad de lo clasificable, y 18 registros sin clasificar', subtitle: 'Clasificación del analista sobre la causal registrada (regla de julio) · 20 eventos con causal · 18 sin causal',
    notes: 'Regla del analista (julio 2026): error de programación, ayuno / exámenes incompletos e instrumental incompleto = evitable; no presentación, infraestructura y falta de cirujano = potencialmente evitable; reemplazo por urgencia, enfermedad aguda y descompensación = no evitable. Entre los 20 clasificables: 10 evitables (50 %), 5 potencialmente (25 %), 5 no evitables (25 %); 15 de 20 con potencial de prevención (75 %). Julio: 34 % evitable (10 de 29) y 62 % con potencial (18 de 29). Los 18 sin causal no se clasifican: es el hallazgo principal del registro. Validación clínica y operacional pendiente.\n\n' + SRC.reg + '\n' + SRC.jul });
  card(s, 0.55, 1.85, 5.2, 4.55, { pres });
  s.addChart(pres.charts.DOUGHNUT, [{ name: 'Evitabilidad', labels: ['Evitable', 'Potencialmente evitable', 'No evitable', 'Sin causal'], values: [S.evit.evitable, S.evit.pot_evitable, S.evit.no_evitable, S.evit.sin_causal] }],
    darkChart({ x: 0.65, y: 1.95, w: 5.0, h: 3.5, holeSize: 58, chartColors: [C.RED, C.AMBER, C.GREEN, C.GRAY], showLegend: false, showPercent: false, showValue: true, dataLabelColor: C.TEXT, dataLabelFontSize: 11, dataLabelFontBold: true, dataBorder: { pt: 1, color: C.BG } }));
  txt(s, [{ text: '38', options: { fontSize: 22, bold: true, color: C.TEXT } }, { text: '\neventos', options: { fontSize: 9, color: C.MUTED } }], 2.2, 3.35, 1.9, 0.7, { align: 'center', valign: 'middle' });
  legend(s, pres, ['evitable', 'pot_evitable', 'no_evitable', 'sin_causal'].map(k => ({ color: EVCOL[k], label: `${EVLBL[k]} (${S.evit[k]})` })), 0.75, 5.55, { fontSize: 8.5, gap: 0.14, itemW: 1.05 });
  txt(s, '15 de 20 clasificables con potencial de prevención (75 %)', 0.75, 5.95, 4.8, 0.3, { fontSize: 10, color: C.TEXT3, bold: true });
  const x = 5.95, w = 6.82;
  statRow(s, pres, [
    { value: '50 %', label: 'EVITABLE · CLASIFICABLES', sub: '10 de 20 · julio: 34 % (10 de 29)', color: C.RED, border: C.RED, valueSize: 22 },
    { value: '75 %', label: 'PREVENIBLE (EVIT. + POT.)', sub: '15 de 20 · julio: 62 % (18 de 29)', color: C.AMBER, valueSize: 22 },
    { value: '47 %', label: 'SIN CAUSAL', sub: '18 de 38 · el hallazgo principal', color: C.GRAY, valueSize: 22 },
  ], 1.85, 1.1, x, w, 0.12);
  note(s, pres, x, 3.1, w, 1.55, { title: '◆  LO EVITABLE ES DE PROGRAMACIÓN', body: 'Error de programación (7), ayuno / exámenes (2) e instrumental (1): los diez evitables se resuelven antes del día de la cirugía, en la tabla y en la preparación. Ninguno depende de capacidad instalada.', border: C.RED, titleColor: C.RED, bodySize: 10.5 });
  note(s, pres, x, 4.8, w, 1.6, { title: '◆  EL DATO FALTANTE PESA MÁS QUE LO NO EVITABLE', body: 'Con 18 registros sin causal (17 de Oftalmología), la evitabilidad real del mes puede estar entre 26 % (10 / 38) y 74 % (28 / 38). Completar la causal por jornada es la acción con mayor rendimiento de septiembre.', border: C.AMBER, titleColor: C.AMBER, bodySize: 10.5 });
  footnote(s, 'Regla del analista: evitable = error de programación, ayuno / exámenes, instrumental · potencialmente evitable = no presentación, infraestructura, falta de cirujano · no evitable = urgencia, enfermedad aguda, descompensación. Validación clínica y operacional pendiente.', { y: 6.5, h: 0.45 });
  return s;
});

// 15 · Eventos raíz y alertas
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  EVENTOS RAÍZ Y ALERTAS', title: 'Seis focos explican la mayor parte del registro de agosto', subtitle: 'Agrupar registros por falla de origen evita sobreestimar la inestabilidad · los correos aportan contexto; no se suman a los registros',
    notes: 'Jornadas oftalmológicas: 8–9 de agosto (9 registros) y 22–23 (7): 16 de 19 registros de fin de semana; sin causal en 17 de 18. Error de programación: 7 registros, incluidas 3 mayores directas (20, 28 y 31). Pabellón 2: tablas de los lunes 10, 17 y 24 canceladas por falta de enfermera (correo del 23-ago). Equipos: restricción del equipo de histeroscopía / RTU bipolar (31-ago) e instrumental incompleto en Traumatología (3-ago, evento MINSAL). Ginecología en extensión horaria: segunda cirugía suspendida dos jueves consecutivos (20 y 27-ago) por transiciones > 30 min; acuerdo del 31-ago: 1 EQ + 1 rectoscopia por extensión. Infraestructura: infiltración por lluvias en cubierta de Pabellón 1 (correo del 11-ago), obras desde el 12-ago por 7 días hábiles, sin interrupción asistencial prevista; 1 registro por infraestructura en el mes.\n\nCorreos de agosto: 11, 23, 28, 31 de agosto.\n' + SRC.reg });
  const items = [
    { t: 'JORNADAS OFTALMOLÓGICAS · 8–9 Y 22–23 AGO · 16 REGISTROS', b: '16 de los 19 registros de fin de semana caen en dos fines de semana; 17 de 18 sin causal. Probables 2–3 eventos de jornada, no 18 fallas independientes.', tag: 'Sin clasificar — completar causal por jornada', col: C.GRAY },
    { t: 'ERROR DE PROGRAMACIÓN · 7 REGISTROS', b: 'Causa #1 por segundo mes (5 → 7). Incluye 3 cirugías mayores directas (20, 28 y 31 de agosto) que no figuran como suspendidas en el monitoreo.', tag: 'Evitable — auditoría ficha por ficha (UPPQ vs unidad quirúrgica)', col: C.RED },
    { t: 'PABELLÓN 2 · LUNES 10, 17 Y 24 · 3 TABLAS', b: 'Cancelación de la tabla del lunes por falta de enfermera del área, tercer lunes consecutivo (correo del 23-ago). Tablas, no pacientes: no equivale a un registro ni permite calcular horas sin agenda.', tag: 'Cobertura de personal — dotación del lunes', col: C.AMBER },
    { t: 'EQUIPOS E INSTRUMENTAL · 3-AGO Y 31-AGO', b: 'Instrumental incompleto suspende una mayor directa de Traumatología (evento MINSAL). El 31-ago se comunica la restricción del equipo de histeroscopía (RTU bipolar dañado): sin histeroscopias quirúrgicas hasta nuevo aviso.', tag: 'Evitable — checklist de insumos del día −1', col: C.RED },
    { t: 'GINECOLOGÍA EN EXTENSIÓN · JUEVES 20 Y 27', b: 'Segunda cirugía suspendida dos jueves consecutivos: dos ocupaciones estimadas de 90 min consumen 180 min antes de pausas, con transiciones > 30 min. Acuerdo del 31-ago: programar 1 EQ + 1 rectoscopia por extensión.', tag: 'Programación con tiempos de ocupación reales', col: C.AMBER },
    { t: 'INFRAESTRUCTURA · PABELLÓN 1 · LLUVIAS', b: 'Infiltración por colapso de canaleta estructural (correo del 11-ago); desenergización preventiva de iluminación y obras en cubierta desde el 12-ago (7 días hábiles), sin interrupción asistencial prevista. Un registro por infraestructura en el mes.', tag: 'Potencialmente evitable — mantenimiento preventivo', col: C.AMBER },
  ];
  const cwid = 5.98, chh = 1.42, gx = 0.26, gy = 0.13;
  items.forEach((it, k) => {
    const r = Math.floor(k / 2), c = k % 2;
    const x = 0.55 + c * (cwid + gx), y = 1.85 + r * (chh + gy);
    card(s, x, y, cwid, chh, { pres, border: it.col, borderW: 1.1 });
    txt(s, it.t, x + 0.16, y + 0.1, cwid - 0.32, 0.26, { fontSize: 10, bold: true, color: C.TEXT, valign: 'middle' });
    txt(s, it.b, x + 0.16, y + 0.37, cwid - 0.32, 0.72, { fontSize: 9.5, color: C.TEXT3 });
    txt(s, it.tag, x + 0.16, y + chh - 0.3, cwid - 0.32, 0.24, { fontSize: 9, bold: true, color: it.col, valign: 'middle' });
  });
  footnote(s, 'Acción pendiente desde julio: incorporar el campo "evento raíz" en el registro. Con ese campo, agosto se leería como ~12 fallas de origen, no 38 registros; hoy es una hipótesis que la causal faltante no permite confirmar.', { y: 6.55, h: 0.45 });
  return s;
});

// 16 · Gestión de agosto
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  GESTIÓN', title: 'Medidas y hechos de gestión del mes', subtitle: 'Cronología de agosto y primeros días de septiembre · contexto para contrastar con las mediciones',
    notes: 'Fuentes: correos del 11-ago (obras en cubierta de Pabellón 1), 23-ago (Pabellón 2, lunes sin enfermera), 24-ago (solicitud de uso de camas CMA y Corta Estadía como salas mixtas; solicitud de cifras 2025 con la misma metodología: REM hábil 2025 = 6,9 %, con discrepancia respecto de UGCQ), 28–31-ago (extensión horaria de ginecología; equipo RTU bipolar), 31-ago (medida: sin consentimiento informado completo y firmado no se incorpora a tabla; aprobada por la SDM el 2-sep), 2-sep (informe de suspensiones de agosto: usuarios, especialidad, cirugías y quirófanos por rango de fecha, REM 21, dashboard), 4-sep (reunión de evaluación de procesos de la Unidad Prequirúrgica y suspensiones evitables por ayuno).' });
  const items = [
    ['11 ago', 'Infraestructura', 'Diagnóstico de infiltración en cubierta de Pabellón 1; obras desde el 12-ago (7 días hábiles) sin interrupción asistencial prevista.'],
    ['23 ago', 'Dotación', 'Cancelación de la tabla del lunes 24 en Pabellón 2 por falta de enfermera del área: tercer lunes consecutivo.'],
    ['24 ago', 'Camas', 'Solicitud a SDM y SDGC: uso de camillas de CMA y Corta Estadía como salas mixtas ante la falta de camas, con criterio institucional y no caso a caso.'],
    ['24 ago', 'Línea base 2025', 'Cifras 2025 con la misma metodología (base REM, hábil): 200 suspensiones / 2.872 programadas = 6,96 % (informado 6,9 %); mismo numerador que el monitoreo (9,38 %) con distinto denominador, en revisión con Estadística.'],
    ['28–31 ago', 'Extensión horaria', 'Ginecología: 2.º caso suspendido dos jueves seguidos; acuerdo de 1 EQ + 1 rectoscopia por extensión. Restricción de histeroscopía por daño del RTU bipolar.'],
    ['31 ago', 'Medida UPPQ', 'No se incorporan a la tabla pacientes sin consentimiento informado completo y firmado; verificación por el equipo tratante antes de solicitar programación. Aprobada por la SDM el 2-sep.'],
    ['2 sep', 'Datos', 'Informe de suspensiones de agosto recibido: por usuario, por especialidad, cirugías y quirófanos por rango de fecha, REM 21 y dashboard.'],
    ['4 sep', 'Reunión', 'Evaluación de procesos de la Unidad Prequirúrgica y de las suspensiones evitables por incumplimiento de ayuno en pacientes programados.'],
  ];
  const cwid = 5.98, chh = 1.0, gx = 0.26, gy = 0.1;
  items.forEach((it, k) => {
    const r = Math.floor(k / 2), c = k % 2;
    const x = 0.55 + c * (cwid + gx), y = 1.85 + r * (chh + gy);
    card(s, x, y, cwid, chh, { pres });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.14, y: y + 0.14, w: 0.95, h: 0.3, rectRadius: 0.15, fill: { color: '142A39' }, line: { color: C.TEAL, width: 0.75 } });
    txt(s, it[0], x + 0.14, y + 0.14, 0.95, 0.3, { fontSize: 9, bold: true, color: C.TEAL2, align: 'center', valign: 'middle' });
    txt(s, it[1].toUpperCase(), x + 1.2, y + 0.14, cwid - 1.35, 0.3, { fontSize: 9, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
    txt(s, it[2], x + 0.14, y + 0.48, cwid - 0.28, chh - 0.52, { fontSize: 9.5, color: C.TEXT3 });
  });
  footnote(s, 'Los correos aportan contexto. Una tabla cancelada no equivale a un paciente ni permite calcular horas sin agenda; los relatos pueden coincidir con registros del informe operativo y no se suman.', { y: 6.35, h: 0.45 });
  return s;
});

// 17 · Programación y realización
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  PROGRAMACIÓN', title: 'Programación y realización conservan sus categorías', subtitle: 'Cirugía mayor electiva L–V · monitoreo homogéneo · julio y agosto de 2026',
    notes: 'Mantener el rótulo exacto de cada columna. Las realizadas normales superan a las programadas normales en ambos meses; sin cruce individual, su división no es una tasa de cumplimiento validada (el "cumplimiento de tabla" del PPT de julio no se reproduce). No existe columna de agregadas programadas. La comparación describe los agregados del mismo archivo y criterio de calendario.\n\n' + SRC.mon });
  table(s, [
    ['Categoría (L–V)', 'Julio', 'Agosto', 'Diferencia', 'Lectura'],
    ['Programadas normales', '155', '152', '−3', 'Dos días L–V menos (23 → 21)'],
    ['Programadas condicionales', '27', '18', '−9', 'Menor uso del circuito condicional'],
    ['Suspendidas (normales)', '1', '2', '+1', '0,65 % → 1,32 %'],
    ['Realizadas normales', '195', '177', '−18', 'Superan a las programadas en ambos meses'],
    ['Realizadas condicionales', '17', '17', '0', ''],
    ['Realizadas agregadas', '2', '7', '+5', 'Casos sumados a la tabla del día'],
    ['Total CME realizadas L–V', '214', '201', '−13', '−6,1 % en volumen · +2,9 % por día'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [3.3, 1.5, 1.5, 1.5, 4.42], fontSize: 11.5, rowH: 0.44, boldRows: [7], highlightCol: 2 });
  note(s, pres, 0.55, 5.55, 12.22, 0.85, { title: null, body: [{ text: 'Las columnas son agregados declarados: ', options: { bold: true, color: C.TEXT } }, { text: 'no reconstruyen una cohorte individual ni una tasa de cumplimiento de tabla. Realizadas normales (177) sobre programadas normales (152) refleja agregados y reprogramaciones dentro del mes, no un 116 % de cumplimiento.' }], border: C.TEAL, bodySize: 10.5 });
  return s;
});

// 18 · Producción del mes: dos tablas
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  PRODUCCIÓN DEL MES', title: 'La actividad declarada crece +46 % en un mes; los encuentros, no', subtitle: 'Monitoreo (total calendario) frente a encuentros depurados del nuevo sistema · dos fuentes con funciones distintas',
    notes: 'El monitoreo es una fuente agregada que declara 620 procedimientos en agosto, mientras el export de encuentros contiene 63 procedimientos. No deben mezclarse ni interpretarse como un error por defecto: sus coberturas y reglas de registro difieren (desde julio se registran procedimientos de anestesiología en el nuevo sistema). Para producción julio–agosto se conserva la fuente histórica; los encuentros aportan especialidad, pabellón, hitos y recambios. La diferencia 411 frente a 405 CME no es la eliminación del duplicado (la copia exacta era una urgencia).\n\n' + SRC.mon + '\n' + SRC.enc });
  txt(s, 'ACTIVIDAD DECLARADA · MONITOREO · TODO EL MES · CON AGOSTO 2025', 0.55, 1.88, 6, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Actividad declarada', 'Julio', 'Agosto', 'Dif.', 'Ago 2025'],
    ['Cirugía mayor electiva', '308', '411', '+103', '419'],
    ['Cirugía mayor de urgencia', '160', '145', '−15', '148'],
    ['Cirugía menor', '53', '61', '+8', '34'],
    ['Procedimientos', '324', '620', '+296', '76'],
    ['Total de actividad declarada', '845', '1.237', '+392', '677'],
  ], { x: 0.55, y: 2.16, w: 5.95, colW: [2.35, 0.85, 0.95, 0.85, 0.95], fontSize: 10.5, rowH: 0.44, boldRows: [5], highlightCol: 2 });
  txt(s, 'AGOSTO · MONITOREO VS ENCUENTROS DEPURADOS', 6.82, 1.88, 6, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Categoría', 'Monitoreo', 'Encuentros'],
    ['Mayor electiva', '411', '405'],
    ['Mayor de urgencia', '145', '140'],
    ['Menor', '61', '32'],
    ['Procedimientos', '620', '63'],
    ['Total declarado / encuentros', '1.237', '640'],
  ], { x: 6.82, y: 2.16, w: 5.95, colW: [2.95, 1.5, 1.5], fontSize: 11, rowH: 0.44, boldRows: [5] });
  note(s, pres, 0.55, 5.0, 5.95, 1.45, { title: '◆  EL SALTO ES DE PROCEDIMIENTOS DECLARADOS (+296)', body: 'Frente a agosto 2025: CME −1,9 % (419 → 411), urgencia −2,0 % (148 → 145), cirugía menor +79 % (34 → 61). Los procedimientos (76 → 620) se registran en el nuevo sistema desde julio: no son comparables. 1.237 actividades no equivalen a 1.237 cirugías ni a pacientes únicos.', border: C.AMBER, titleColor: C.AMBER, bodySize: 9.5 });
  note(s, pres, 6.82, 5.0, 5.95, 1.45, { title: '◆  CADA FUENTE CUMPLE UNA FUNCIÓN', body: 'Monitoreo para la serie histórica homogénea (producción y suspensión). Encuentros del nuevo sistema para especialidad, pabellón, hitos de inicio, ocupación y recambio.', border: C.TEAL, titleColor: C.TEAL2, bodySize: 10 });
  return s;
});

// 19 · CME por mes 2026 (L–V vs fin de semana)
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  PRODUCCIÓN', title: 'Producción quirúrgica — CME realizada por mes en 2026', subtitle: 'Cirugía mayor electiva realizada · barras apiladas: lunes a viernes + fin de semana (oftalmología) · agosto: 411 CME',
    notes: 'CME L–V 2026 por mes (serie homogénea): 256, 245, 255, 286, 186, 237, 214, 201 = 1.880. Fin de semana = total mensual − L–V: 125, 233, 212, 248, 239, 145, 94, 210 = 1.506. Totales mensuales: 381, 478, 467, 534, 425, 382, 308, 411. Julio se actualizó de 285 (PPT de julio, L–V estimado en 191) a 308 (214 L–V). El crecimiento neto de agosto (+103) se explica por +116 en fin de semana y −13 en L–V; julio tuvo ocho días de fin de semana y agosto diez.\n\n' + SRC.mon });
  card(s, 0.55, 1.85, 8.35, 4.55, { pres });
  s.addChart(pres.charts.BAR, [
    { name: 'Lunes a viernes', labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'], values: S.cme_lv_26 },
    { name: 'Fin de semana', labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'], values: S.cme_fds_26 },
  ], darkChart({ x: 0.65, y: 1.95, w: 8.15, h: 4.35, barDir: 'col', barGrouping: 'stacked', chartColors: [C.TEAL, C.BLUE], showValue: true, dataLabelPosition: 'ctr', dataLabelColor: C.BG, dataLabelFontSize: 9, dataLabelFontBold: true, showLegend: true, barGapWidthPct: 45, valAxisMinVal: 0, valAxisMaxVal: 600, valAxisMajorUnit: 100 }));
  const x = 9.05, w = 3.72;
  kpi(s, pres, x, 1.85, w, 1.05, { value: '201', label: 'CME L–V · AGOSTO', sub: '9,57 por día L–V · 21 días', valueSize: 24 });
  kpi(s, pres, x, 3.0, w, 1.05, { value: '1.880', label: 'CME L–V · ENE–AGO 2026', sub: '+13,5 % vs 2025 (1.657) · 173 días L–V en ambos', color: C.GREEN, border: C.GREEN, valueSize: 24 });
  kpi(s, pres, x, 4.15, w, 1.05, { value: '210', label: 'FIN DE SEMANA · AGOSTO', sub: '+116 vs julio (94) · diez días de fin de semana', valueSize: 24 });
  kpi(s, pres, x, 5.3, w, 1.1, { value: '−8,7 %', label: 'FIN DE SEMANA · ENE–AGO', sub: '1.650 → 1.506 · el crecimiento del año es del horario hábil', color: C.AMBER, valueSize: 24 });
  footnote(s, 'Serie homogénea del monitoreo; julio actualizado a 308 (214 L–V) respecto del PPT de julio (285, con 191 L–V estimadas). La distribución no prueba por sí sola un aumento de capacidad instalada.', { y: 6.5, h: 0.45 });
  return s;
});

// 20 · Producción comparada ene–ago 2025 vs 2026
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  PRODUCCIÓN VS 2025', title: 'Producción quirúrgica comparada — enero a agosto', subtitle: 'Variación por indicador · ene–ago 2026 vs mismo período 2025 · monitoreo, todas las fechas salvo donde se indica L–V',
    notes: 'Ene–ago 2025 vs 2026 (monitoreo): CME realizada todas las fechas 3.307 → 3.386 (+2,4 %); CME L–V 1.657 → 1.880 (+13,5 %); fin de semana 1.650 → 1.506 (−8,7 %); urgencia mayor 1.164 → 1.328 (+14,1 %); cirugía menor 459 → 331 (−27,9 %); procedimientos 515 → 1.372 (+166 %, no comparable por el registro de procedimientos de anestesiología en el nuevo sistema desde julio); total actividad declarada 5.445 → 6.417 (+17,9 %); suspendidas hábiles 133 → 74 (−44,4 %). 2026 = ene–jun del informe de agosto + julio y agosto de la serie actualizada.\n\n' + SRC.mon + '\n' + SRC.jul });
  card(s, 0.55, 1.85, 7.0, 4.55, { pres });
  const items = [
    { label: 'Procedimientos*', value: 166.4, color: C.GRAY, valueColor: C.MUTED },
    { label: 'Total actividad declarada', value: 17.9, color: C.TEAL },
    { label: 'Urgencia mayor', value: 14.1, color: C.TEAL },
    { label: 'CME realizada L–V', value: 13.5, color: C.GREEN },
    { label: 'CME realizada (todas las fechas)', value: 2.4, color: C.TEAL },
    { label: 'CME fin de semana', value: -8.7, color: C.RED },
    { label: 'Cirugía menor', value: -27.9, color: C.RED },
    { label: 'Suspensiones hábiles', value: -44.4, color: C.GREEN },
  ];
  // barras divergentes dibujadas a mano
  const x0 = 0.7, labelW = 2.6, bx = x0 + labelW, bw = 3.9, mid = bx + bw * (44.4 / (44.4 + 60));
  const scale = bw / (44.4 + 60);
  slide_divergent(s, pres, items, x0, 2.0, labelW, bx, mid, scale, 3.9);
  legend(s, pres, [{ color: C.GREEN, label: 'Mejora' }, { color: C.TEAL, label: 'Aumenta' }, { color: C.RED, label: 'Cae' }, { color: C.GRAY, label: 'No comparable' }], 0.75, 6.05, { fontSize: 9, gap: 0.25 });
  const x = 7.7, w = 5.07;
  note(s, pres, x, 1.85, w, 1.08, { title: '+13,5 %  CME EN DÍAS HÁBILES', body: '1.657 → 1.880 con los mismos 173 días L–V: de 9,6 a 10,9 CME por día hábil. El crecimiento real es de la actividad núcleo; la oftalmología de fin de semana cae −8,7 %.', border: C.GREEN, titleColor: C.GREEN, bodySize: 9.5 });
  note(s, pres, x, 3.03, w, 1.08, { title: '−44 %  SUSPENSIONES HÁBILES', body: '133 → 74 con +8,6 % de programadas normales (1.353 → 1.469): se programa más y se suspende menos. Tasa 9,83 % → 5,04 %.', border: C.GREEN, titleColor: C.GREEN, bodySize: 9.5 });
  note(s, pres, x, 4.21, w, 1.08, { title: '+14,1 %  URGENCIA MAYOR', body: '1.164 → 1.328: presión creciente sobre el pabellón electivo. Refuerza proteger la tabla electiva y el pabellón de urgencia separado en el HPMM.', border: C.AMBER, titleColor: C.AMBER, bodySize: 9.5 });
  note(s, pres, x, 5.39, w, 1.01, { title: '* PROCEDIMIENTOS +166 %: NO COMPARABLE', body: '515 → 1.372. Desde julio el nuevo sistema registra procedimientos de anestesiología (285 en julio, 620 en agosto). No es producción quirúrgica nueva.', border: C.GRAY, titleColor: C.TEXT2, bodySize: 9.5 });
  footnote(s, 'Ene–ago 2026 = ene–jun del informe de agosto + julio y agosto de la serie actualizada. Cx menor: 459 → 331. CME todas las fechas: 3.307 → 3.386. Total actividad: 5.445 → 6.417.', { y: 6.5, h: 0.45 });
  return s;
});

function slide_divergent(s, pres, items, x0, y0, labelW, bx, mid, scale, bw) {
  const rowH = 0.46, bh = 0.3;
  // eje cero
  s.addShape(pres.shapes.LINE, { x: mid, y: y0 - 0.05, w: 0, h: rowH * items.length + 0.05, line: { color: C.BORDER2, width: 1 } });
  items.forEach((it, k) => {
    const y = y0 + k * rowH + (rowH - bh) / 2;
    txt(s, it.label, x0, y - 0.03, labelW - 0.12, bh + 0.06, { fontSize: 10, color: C.TEXT2, align: 'right', valign: 'middle' });
    const cap = it.value > 0 ? (bx + bw - mid) : (mid - bx);
    const clipped = Math.abs(it.value) * scale > cap;
    const len = Math.min(Math.abs(it.value) * scale, cap);
    const bxx = it.value >= 0 ? mid : mid - len;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bxx, y, w: Math.max(0.03, len), h: bh, rectRadius: 0.03, fill: { color: it.color }, line: { type: 'none' } });
    const label = (it.value > 0 ? '+' : '−') + Math.abs(it.value).toFixed(1).replace('.', ',') + ' %';
    if (it.value >= 0) {
      if (clipped) txt(s, label, mid + len - 1.0, y - 0.03, 0.92, bh + 0.06, { fontSize: 10.5, bold: true, color: C.BG, valign: 'middle', align: 'right' });
      else txt(s, label, mid + len + 0.08, y - 0.03, 1.2, bh + 0.06, { fontSize: 10.5, bold: true, color: it.valueColor || C.TEXT, valign: 'middle' });
    } else if (len > 0.9) txt(s, label, bxx + 0.08, y - 0.03, 1.0, bh + 0.06, { fontSize: 10.5, bold: true, color: C.BG, valign: 'middle' });
    else txt(s, label, bxx - 1.05, y - 0.03, 0.97, bh + 0.06, { fontSize: 10.5, bold: true, color: it.valueColor || C.TEXT, valign: 'middle', align: 'right' });
  });
  txt(s, '−50 %', mid - 44.4 * scale - 0.3, y0 + rowH * items.length + 0.02, 0.6, 0.2, { fontSize: 8, color: C.MUTED, align: 'center' });
  txt(s, '0', mid - 0.3, y0 + rowH * items.length + 0.02, 0.6, 0.2, { fontSize: 8, color: C.MUTED, align: 'center' });
  txt(s, '+50 %', mid + 50 * scale - 0.3, y0 + rowH * items.length + 0.02, 0.6, 0.2, { fontSize: 8, color: C.MUTED, align: 'center' });
}

module.exports = { slides, SRC, heroRow, statRow, EVCOL, EVLBL };
