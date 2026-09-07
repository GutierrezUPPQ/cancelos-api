// Láminas nuevas (v2): misma fecha 2025 vs 2026, CUSUM/EWMA, patrones estadísticos, producción 2025 vs 2026,
// pabellón menos, el día quirúrgico explicado y hoja de ruta de IA
const { C, txt, baseSlide, card, kpi, note, table, hbars, legend, footnote, darkChart } = require('./lib');
const { SRC, statRow } = require('./slides1');
const S = require('./stats.json');
const f1 = v => v.toFixed(1).replace('.', ',');
const f2 = v => v.toFixed(2).replace('.', ',');

// Gráfico de líneas múltiple dibujado con formas (permite trazo punteado por serie)
function multiLine(slide, pres, { labels, series, yMin = 0, yMax, yTicks = 4, yFmt = v => String(v), xEvery = 1, endLabels = true, hLines = [] }, x, y, w, h) {
  const padL = 0.55, padB = 0.36, padT = 0.2, padR = endLabels ? 0.8 : 0.2;
  const px = x + padL, py = y + padT, pw = w - padL - padR, ph = h - padT - padB;
  const n = labels.length;
  const X = i => px + pw * (n > 1 ? i / (n - 1) : 0.5);
  const Y = v => py + ph * (1 - (v - yMin) / (yMax - yMin));
  for (let g = 0; g <= yTicks; g++) {
    const v = yMin + (yMax - yMin) * g / yTicks;
    slide.addShape(pres.shapes.LINE, { x: px, y: Y(v), w: pw, h: 0, line: { color: C.BORDER, width: 0.5 } });
    txt(slide, yFmt(v), x, Y(v) - 0.11, padL - 0.08, 0.22, { fontSize: 8, color: C.MUTED, align: 'right', valign: 'middle' });
  }
  hLines.forEach(hl => {
    slide.addShape(pres.shapes.LINE, { x: px, y: Y(hl.value), w: pw, h: 0, line: { color: hl.color, width: 1, dashType: 'dash' } });
    if (hl.label) txt(slide, hl.label, px + 0.05, Y(hl.value) - 0.24, 3, 0.22, { fontSize: 8, color: hl.color, valign: 'middle' });
  });
  labels.forEach((l, i) => { if (i % xEvery === 0) txt(slide, l, X(i) - 0.4, y + h - padB + 0.06, 0.8, 0.22, { fontSize: 8, color: C.MUTED, align: 'center', valign: 'middle' }); });
  series.forEach(sr => {
    const pts = sr.values.map((v, i) => v == null ? null : [X(i), Y(Math.min(yMax, Math.max(yMin, v)))]);
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1]; if (!a || !b) continue;
      slide.addShape(pres.shapes.LINE, { x: a[0], y: Math.min(a[1], b[1]), w: b[0] - a[0], h: Math.abs(b[1] - a[1]), line: { color: sr.color, width: sr.width || 1.75, dashType: sr.dash || 'solid' }, flipV: b[1] < a[1] });
    }
    if (sr.marker !== false) pts.forEach(p => { if (p) slide.addShape(pres.shapes.OVAL, { x: p[0] - 0.05, y: p[1] - 0.05, w: 0.1, h: 0.1, fill: { color: sr.color }, line: { color: C.BG, width: 0.5 } }); });
    if (sr.labels) pts.forEach((p, i) => { if (p && sr.values[i] != null) txt(slide, sr.labelFmt ? sr.labelFmt(sr.values[i]) : String(sr.values[i]), p[0] - 0.3, p[1] + (sr.labelBelow ? 0.07 : -0.3), 0.6, 0.22, { fontSize: 7.5, color: sr.color, align: 'center', valign: 'middle', bold: !!sr.bold }); });
    if (endLabels && sr.endLabel !== false) {
      const last = [...pts].reverse().find(p => p); const lastV = [...sr.values].reverse().find(v => v != null);
      if (last) txt(slide, sr.endLabel || (sr.labelFmt ? sr.labelFmt(lastV) : String(lastV)), last[0] + 0.1, last[1] - 0.11, padR - 0.05, 0.22, { fontSize: 8.5, bold: true, color: sr.color, valign: 'middle' });
    }
    if (sr.special) sr.special.forEach(sp => { const p = pts[sp.i]; if (p) { slide.addShape(pres.shapes.OVAL, { x: p[0] - 0.09, y: p[1] - 0.09, w: 0.18, h: 0.18, fill: { color: sp.color, transparency: 20 }, line: { color: sp.color, width: 1 } }); if (sp.text) txt(slide, sp.text, p[0] - 1.0, p[1] - 0.42, 2.0, 0.22, { fontSize: 8, bold: true, color: sp.color, align: 'center', valign: 'middle' }); } });
  });
}

const N = {};

// Suspensiones 2025 vs 2026 a la misma fecha
N.mismaFecha = (pres, i, total) => {
  const M = S.misma_fecha, A = M['2025'], B = M['2026'];
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  MISMA FECHA · 2025 VS 2026', title: 'Enero a agosto: 2026 frente a 2025 a la misma fecha', subtitle: 'Tasa hábil mensual, media móvil de tres meses y acumulado a la fecha · misma fuente y fórmula L–V · el acumulado usa suma / suma',
    notes: `Comparación a la misma fecha (enero–agosto). Tasa mensual 2025: ${A.tasa.map(f2).join(' · ')}. Tasa mensual 2026: ${B.tasa.map(f2).join(' · ')}. Media móvil de 3 meses (suma de suspendidas / suma de programadas del trimestre móvil): 2025 termina en ${f2(A.ma3[7])} % (jun–ago) y 2026 en ${f2(B.ma3[7])} %. Acumulado a agosto: 2025 ${f2(A.ytd[7])} % (133 / 1.353), 2026 ${f2(B.ytd[7])} % (74 / 1.469). Contrafactual: al ritmo acumulado de 2025 a la misma fecha (9,83 %) las 1.469 programadas de 2026 habrían producido ${f1(S.esperadas_2026.reduce((a, b) => a + b, 0))} suspensiones; se registraron 74: ${S.evitadas_2026} suspensiones evitadas (pacientes operados a tiempo). En agosto, a la tasa 2025 (9,38 %) se esperaban ${f1(S.esperadas_ago_2025)} sobre 152 programadas; hubo 2.\n\n` + SRC.mon });
  card(s, 0.55, 1.85, 6.05, 3.55, { pres });
  txt(s, 'TASA HÁBIL MENSUAL Y MEDIA MÓVIL DE 3 MESES (LÍNEA PUNTEADA)', 0.75, 1.95, 5.7, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.2, valign: 'middle' });
  multiLine(s, pres, { labels: M.meses, yMax: 15, yTicks: 3, yFmt: v => v + '%', series: [
    { values: A.tasa, color: C.BLUE2, width: 1.5, labelFmt: f1, endLabel: '2025' },
    { values: A.ma3, color: C.BLUE2, width: 1.5, dash: 'dash', marker: false, endLabel: false },
    { values: B.tasa, color: C.TEAL, width: 2.25, labelFmt: f1, endLabel: '2026' },
    { values: B.ma3, color: C.TEAL, width: 1.5, dash: 'dash', marker: false, endLabel: false },
  ] }, 0.65, 2.2, 5.85, 3.1);
  card(s, 6.75, 1.85, 6.02, 3.55, { pres });
  txt(s, 'ACUMULADO A LA FECHA (SUMA / SUMA) · ENERO → AGOSTO', 6.95, 1.95, 5.7, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.2, valign: 'middle' });
  multiLine(s, pres, { labels: M.meses, yMax: 12, yTicks: 3, yFmt: v => v + '%', series: [
    { values: A.ytd, color: C.BLUE2, width: 2, labels: true, labelFmt: f2, endLabel: '2025' },
    { values: B.ytd, color: C.TEAL, width: 2.25, labels: true, labelFmt: f2, labelBelow: true, endLabel: '2026' },
  ] }, 6.85, 2.2, 5.82, 3.1);
  statRow(s, pres, [
    { value: '−4,8 pp', label: 'ACUMULADO A AGOSTO', sub: `9,83 % → 5,04 % · 133 → 74 suspensiones con +8,6 % de programadas · p < 0,001`, color: C.GREEN, border: C.GREEN },
    { value: `${f2(A.ma3[7])} → ${f2(B.ma3[7])} %`, label: 'MEDIA MÓVIL 3 M · JUN–AGO', sub: 'el trimestre móvil de 2026 cierra en su mínimo; el de 2025 cerraba en su máximo', color: C.TEAL2, valueSize: 16 },
    { value: String(S.evitadas_2026), label: 'SUSPENSIONES EVITADAS · ENE–AGO', sub: `${f1(S.esperadas_2026.reduce((a, b) => a + b, 0))} esperadas al ritmo 2025 a la misma fecha vs 74 observadas`, color: C.GREEN },
    { value: `${f1(S.esperadas_ago_2025)} → 2`, label: 'AGOSTO · ESPERADAS VS OBSERVADAS', sub: 'a la tasa 2025 (9,38 %) sobre 152 programadas · 12 pacientes que se habrían suspendido', color: C.TEAL2, valueSize: 16 },
  ], 5.55, 0.92);
  footnote(s, 'La media móvil suma suspendidas y programadas de tres meses consecutivos (no promedia tasas). "Suspensiones evitadas" es un contrafactual aritmético al ritmo de 2025; no atribuye causalidad a una medida específica.', { y: 6.55, h: 0.4 });
  return s;
};

// CUSUM y EWMA con pronóstico
N.cusum = (pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  ALGORITMOS · CUSUM Y EWMA', title: 'Dónde se quebró la serie y qué esperar en septiembre', subtitle: 'CUSUM: suspensiones acumuladas por debajo de lo esperado a la tasa 2025 · EWMA (λ = 0,3): tasa suavizada que pondera más los meses recientes',
    notes: `CUSUM sobre conteos: C_t = Σ (programadas_t × 9,38 % − suspendidas_t). Mientras el proceso se comporta como 2025, C_t oscila en torno a cero; cuando la tasa cae, C_t sube de forma sostenida. Valores: ${S.cusum.join(', ')}. Último mes en torno a cero: ${S.meses[S.meses.indexOf(S.cusum_quiebre) - 1]}; el ascenso sostenido comienza en ${S.cusum_quiebre} (enero 2026 queda en la media: 17 / 184 = 9,24 %). Desde el quiebre se acumulan ${S.cusum_exceso_post} suspensiones menos que las esperadas a tasa 2025. EWMA con λ = 0,3 partiendo de la media 2025: valores ${S.ewma.join(', ')}; agosto queda en ${f2(S.ewma[19])} % porque la EWMA reacciona con rezago (es una lectura prudente). Pronóstico de septiembre: ${f2(S.pron_sep.tasa_pct)} % sobre ${S.pron_sep.programadas_supuestas} programadas (media mensual 2026) = ${f1(S.pron_sep.esperadas)} suspensiones esperadas, intervalo binomial P5–P95 ${S.pron_sep.p5}–${S.pron_sep.p95}; si se sostiene el trimestre jun–ago (1,23 %): ≈ 2. Banda de la tasa con la desviación de los residuos (${f2(S.ewma_sd)} pp): ${f2(S.pron_sep.banda_tasa[0])}–${f2(S.pron_sep.banda_tasa[1])} %. El informe de julio ubicó el quiebre en enero 2026 con CUSUM sobre tasas; con conteos, enero está en la media y el despegue es febrero: la diferencia es de método, no de hallazgo.\n\n` + SRC.mon });
  const iq = S.meses.indexOf(S.cusum_quiebre);
  card(s, 0.55, 1.85, 6.05, 3.55, { pres });
  txt(s, 'CUSUM · SUSPENSIONES ACUMULADAS BAJO LO ESPERADO A TASA 2025', 0.75, 1.95, 5.7, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.2, valign: 'middle' });
  multiLine(s, pres, { labels: S.meses.map(m => m.replace('-', '\n')), yMin: -10, yMax: 70, yTicks: 4, yFmt: v => String(v), xEvery: 2, endLabels: false, hLines: [{ value: 0, color: C.MUTED }], series: [
    { values: S.cusum, color: C.TEAL, width: 2.25, special: [{ i: iq, color: C.AMBER, text: `quiebre ${S.cusum_quiebre}` }], endLabel: false },
  ] }, 0.65, 2.2, 5.85, 3.1);
  txt(s, f1(S.cusum[19]), 5.55, 2.25, 0.9, 0.3, { fontSize: 12, bold: true, color: C.TEAL2, align: 'right', valign: 'middle' });
  card(s, 6.75, 1.85, 6.02, 3.55, { pres });
  txt(s, 'EWMA (λ = 0,3) SOBRE LA TASA MENSUAL · PRONÓSTICO SEPTIEMBRE', 6.95, 1.95, 5.7, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.2, valign: 'middle' });
  const labs = S.meses.map(m => m.replace('-', '\n')).concat(['sep\n26']);
  multiLine(s, pres, { labels: labs, yMax: 15, yTicks: 3, yFmt: v => v + '%', xEvery: 2, endLabels: false, series: [
    { values: S.tasa.concat([null]), color: C.BLUE2, width: 1.25, endLabel: false },
    { values: S.ewma.concat([S.pron_sep.tasa_pct]), color: C.AMBER, width: 2.25, marker: false, endLabel: false, special: [{ i: 20, color: C.AMBER, text: `pronóstico ${f2(S.pron_sep.tasa_pct)} %` }] },
  ] }, 6.85, 2.2, 5.82, 3.1);
  legend(s, pres, [{ color: C.BLUE2, label: 'tasa mensual' }, { color: C.AMBER, label: 'EWMA' }], 9.9, 2.22, { fontSize: 8.5, gap: 0.2 });
  statRow(s, pres, [
    { value: S.cusum_quiebre, label: 'QUIEBRE DE LA SERIE (CUSUM)', sub: 'enero 2026 queda en la media (9,24 %); el descenso sostenido empieza en febrero', color: C.AMBER, border: C.AMBER, valueSize: 20 },
    { value: String(S.cusum_exceso_post), label: 'BAJO LO ESPERADO DESDE EL QUIEBRE', sub: 'suspensiones acumuladas por debajo de la tasa 2025 (9,38 %) entre el quiebre y agosto', color: C.GREEN, valueSize: 20 },
    { value: `${f1(S.pron_sep.esperadas)} (${S.pron_sep.p5}–${S.pron_sep.p95})`, label: 'SEPTIEMBRE · EWMA PRUDENTE', sub: `${f2(S.pron_sep.tasa_pct)} % sobre ${S.pron_sep.programadas_supuestas} programadas · más de 10 sería una señal de deterioro`, color: C.TEXT, valueSize: 18 },
    { value: '≈ 2', label: 'SEPTIEMBRE · SI SE SOSTIENE JUN–AGO', sub: '1,23 % sobre 184 programadas · entre 0 y 5 cae dentro del régimen actual', color: C.GREEN, border: C.GREEN, valueSize: 20 },
  ], 5.55, 0.92);
  footnote(s, 'Lectura simple: el CUSUM muestra cuándo el proceso dejó de comportarse como 2025; la EWMA suaviza el azar mes a mes y da un pronóstico prudente. Ambos usan solo la serie homogénea del monitoreo (L–V).', { y: 6.55, h: 0.4 });
  return s;
};

// Patrones que la estadística confirma (o no)
N.patrones = (pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  ALGORITMOS · PATRONES', title: 'Tres patrones puestos a prueba: lunes, jornadas y qué explica la suspensión', subtitle: 'Pruebas simples sobre los datos del mes y del histórico · lo que confirman, lo que no, y qué hacer con cada uno',
    notes: `Lunes: en agosto 6 de 19 registros L–V; si el día fuera azar (1/5 por día) la probabilidad de 6 o más es p = ${S.p_lunes.toFixed(2).replace('.', ',')} (binomial): agosto solo no lo demuestra. Los dos eventos MINSAL en lunes tienen probabilidad 1/25 (p = 0,04). El histórico SPC ene-25–abr-26 sí lo confirma: lunes 11,09 % (Z = 2,09, significativo al 5 %). Jornadas de fin de semana: 19 registros en cinco fines de semana; que los dos mayores concentren 16 o más ocurre en ${(S.p_finde * 100).toFixed(2).replace('.', ',')} % de 200.000 simulaciones con reparto uniforme (p < 0,001): la concentración no es azar, es compatible con eventos de jornada (capacidad, dotación, insumos o inasistencia masiva); la causal completa por jornada lo resolvería. Bosque aleatorio (informe de agosto, datos ene-25–jul-26, 400 árboles): importancia mes del año 42 %, régimen 2026 26 %, volumen programado 15 %, día de semana 11 %, invierno 4 %, lunes 2 %; correlación volumen–suspensión de Spearman 0,33 (débil-moderada). Conclusión operativa: no se puede predecir el día exacto; sí gestionar el sistema (régimen, estacionalidad, lunes).\n\n` + SRC.reg + '\n' + SRC.jul });
  const w = 3.95, h = 4.55, y = 1.85;
  const cards = [
    { t: 'EL LUNES', v: 'p = 0,16', vc: C.AMBER, b: 'Agosto solo no lo demuestra: 6 de 19 registros L–V en lunes tiene probabilidad 0,16 si el día fuera azar. Que los 2 eventos MINSAL cayeran en lunes: 1 en 25 (p = 0,04).', c: 'Lo confirma el histórico: lunes 11,09 % de suspensión hábil ene-25–abr-26 (Z = 2,09). Mantener la medida "blindar el lunes".', col: C.AMBER },
    { t: 'LAS JORNADAS DE FIN DE SEMANA', v: 'p < 0,001', vc: C.RED, b: '16 de 19 registros en dos fines de semana. Con reparto al azar entre los cinco fines de semana, eso ocurre en menos de 1 de cada 1.000 simulaciones (Monte Carlo, 200.000 repeticiones).', c: 'No son 18 fallas independientes: son 2–3 eventos de jornada. Registrar la causal por jornada, no por paciente.', col: C.RED },
    { t: 'QUÉ EXPLICA LA SUSPENSIÓN', v: '42 · 26 · 15 %', vc: C.TEAL2, b: 'Bosque aleatorio del informe de agosto: el mes del año (42 %), el régimen 2026 (26 %) y el volumen del día (15 %) pesan más que el día de la semana (11 %). Correlación volumen–suspensión 0,33.', c: 'No se predice el día exacto; se gestiona el sistema. Duplicar volumen no duplica suspensiones: base para escalar a HPMM.', col: C.TEAL },
  ];
  cards.forEach((cd, k) => {
    const x = 0.55 + k * (w + 0.185);
    card(s, x, y, w, h, { pres, border: cd.col, borderW: 1.25 });
    txt(s, cd.t, x + 0.2, y + 0.15, w - 0.4, 0.26, { fontSize: 9, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
    txt(s, cd.v, x + 0.2, y + 0.45, w - 0.4, 0.7, { fontSize: 30, bold: true, color: cd.vc, valign: 'middle' });
    txt(s, cd.b, x + 0.2, y + 1.25, w - 0.4, 1.7, { fontSize: 10.5, color: C.TEXT3 });
    s.addShape(pres.shapes.LINE, { x: x + 0.2, y: y + 3.0, w: w - 0.4, h: 0, line: { color: C.BORDER, width: 0.75 } });
    txt(s, '◆  QUÉ HACER', x + 0.2, y + 3.08, w - 0.4, 0.24, { fontSize: 8.5, bold: true, color: cd.col, charSpacing: 1.2, valign: 'middle' });
    txt(s, cd.c, x + 0.2, y + 3.34, w - 0.4, 1.15, { fontSize: 10.5, color: C.TEXT });
  });
  footnote(s, 'Prueba binomial y simulación con reparto uniforme; el bosque aleatorio proviene del informe de agosto (400 árboles, datos hasta julio). Las pruebas describen patrones; la decisión sigue siendo del comité.', { y: 6.55, h: 0.4 });
  return s;
};

// Producción 2025 vs 2026 mes a mes
N.produccion = (pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  PRODUCCIÓN · MISMA FECHA', title: 'CME realizada mes a mes: 2026 frente a 2025', subtitle: 'Cirugía mayor electiva realizada, todas las fechas (monitoreo) · enero a agosto · el acumulado y el horario hábil dicen más que el mes',
    notes: 'CME realizada todas las fechas, 2025: 358, 410, 486, 372, 400, 467, 395, 419 (ene–ago = 3.307); 2026: 381, 478, 467, 534, 425, 382, 308, 411 (3.386, +2,4 %). Lunes a viernes: 1.657 → 1.880 (+13,5 %) con 173 días L–V en ambos; fin de semana: 1.650 → 1.506 (−8,7 %). Julio y agosto de 2026 quedan bajo su par de 2025 (395 → 308; 419 → 411): coinciden con el período en que se operó una buena parte del tiempo con un pabellón menos (lámina siguiente).\n\n' + SRC.mon });
  card(s, 0.55, 1.85, 8.35, 4.55, { pres });
  const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
  s.addChart(pres.charts.BAR, [
    { name: '2025', labels, values: S.cme_tot_25.slice(0, 8) },
    { name: '2026', labels, values: S.cme_tot_26 },
  ], darkChart({ x: 0.65, y: 1.95, w: 8.15, h: 4.35, barDir: 'col', barGrouping: 'clustered', chartColors: [C.BLUE, C.TEAL], showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 8.5, showLegend: true, barGapWidthPct: 40, valAxisMinVal: 0, valAxisMaxVal: 600, valAxisMajorUnit: 100 }));
  const x = 9.05, w = 3.72;
  kpi(s, pres, x, 1.85, w, 1.05, { value: '+2,4 %', label: 'CME TODAS LAS FECHAS · ENE–AGO', sub: '3.307 → 3.386', valueSize: 24 });
  kpi(s, pres, x, 3.0, w, 1.05, { value: '+13,5 %', label: 'CME LUNES A VIERNES · ENE–AGO', sub: '1.657 → 1.880 · mismos 173 días', color: C.GREEN, border: C.GREEN, valueSize: 24 });
  kpi(s, pres, x, 4.15, w, 1.05, { value: '−8,7 %', label: 'FIN DE SEMANA · ENE–AGO', sub: '1.650 → 1.506 · oftalmología', color: C.AMBER, valueSize: 24 });
  kpi(s, pres, x, 5.3, w, 1.1, { value: '−87 · −8', label: 'JULIO Y AGOSTO VS 2025', sub: '395 → 308 y 419 → 411 · un pabellón menos', color: C.RED, border: C.RED, valueSize: 24 });
  footnote(s, 'Serie homogénea del monitoreo; julio 2026 actualizado a 308. El fin de semana depende de las jornadas oftalmológicas programadas, no de la capacidad L–V.', { y: 6.5, h: 0.45 });
  return s;
};

// Un pabellón menos
N.pabellon = (pres, i, total) => {
  const P = S.pabellon;
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  CAPACIDAD · UN PABELLÓN MENOS', title: 'La caída de julio–agosto es de pabellón-días, no de rendimiento por pabellón', subtitle: 'Agosto: Pabellón 2 operó 9 de 21 días L–V · la producción por pabellón-día disponible se mantiene · estimación con la productividad observada',
    notes: `Encuentros electivos L–V de agosto (export 830): 202 en 51 pabellón-días disponibles (P2 9, P3 21, P4 21) = ${f2(P.por_pab_dia)} por pabellón-día. Con Pabellón 2 los 21 días (63 pabellón-días) y la misma productividad: ≈ ${P.electivos_si_p2_completo} electivos (+${P.delta_estimado}). En CME del monitoreo: 201 L–V = ${f2(P.cme_por_pab_dia)} por pabellón-día; con P2 completo ≈ ${P.cme_si_p2_completo} CME = ${f2(P.cme_por_dia_si_p2)} por día L–V, sobre la media 2026 (10,87) y sobre julio (9,30). Fechas con actividad en P2: 3–7, 26–28 y 31 de agosto; los lunes 10, 17 y 24 la tabla se canceló por falta de enfermera y hubo obras en cubierta desde el 12-ago. Julio: el pabellón menos afectó una parte del mes (climatización 1–6 de julio y otras restricciones); el número de días sin pabellón de julio debe confirmarse para completar la estimación. Supuesto: productividad por pabellón-día constante (no considera mezcla de casos ni horario).\n\n` + SRC.enc + '\n' + SRC.mon });
  table(s, [
    ['Agosto 2026 · L–V', 'Pabellón 2', 'Pabellón 3', 'Pabellón 4', 'Total'],
    ['Días con actividad electiva', '9', '21', '21', `${P.total_pab_dias} pabellón-días`],
    ['Días posibles', '21', '21', '21', `${P.posibles} pabellón-días`],
    ['Encuentros L–V (todos)', '36', '98', '80', '214'],
    ['Encuentros electivos L–V', '—', '—', '—', `${P.electivos_lv} · ${f2(P.por_pab_dia)} por pabellón-día`],
    ['CME L–V (monitoreo)', '—', '—', '—', `${P.cme_lv} · ${f2(P.cme_por_pab_dia)} por pabellón-día`],
  ], { x: 0.55, y: 1.88, w: 7.4, colW: [2.6, 1.1, 1.1, 1.1, 1.5], fontSize: 10.5, rowH: 0.42, highlightCol: 4 });
  const x = 8.15, w = 4.62;
  kpi(s, pres, x, 1.88, w, 1.3, { value: `${P.sin_p2} días`, label: 'SIN PABELLÓN 2 EN AGOSTO (L–V)', sub: '19 % de los pabellón-días posibles · tres lunes por dotación y obras en cubierta', color: C.RED, border: C.RED, valueSize: 26 });
  kpi(s, pres, x, 3.3, w, 1.3, { value: `≈ +${P.delta_estimado}`, label: 'ELECTIVOS L–V CON P2 COMPLETO', sub: `${P.electivos_lv} → ≈ ${P.electivos_si_p2_completo} a la productividad observada por pabellón-día`, color: C.TEAL2, valueSize: 26 });
  kpi(s, pres, x, 4.72, w, 1.3, { value: `${f2(P.cme_por_dia_si_p2)} / día`, label: 'CME L–V POR DÍA · ESCENARIO P2 COMPLETO', sub: `observado 9,57 · julio 9,30 · media 2026 10,87 · agosto 2025 11,00`, color: C.GREEN, border: C.GREEN, valueSize: 26 });
  note(s, pres, 0.55, 4.55, 7.4, 1.05, { title: '◆  LECTURA', body: 'Con un pabellón menos casi uno de cada cinco días, agosto produjo lo mismo por pabellón-día que el resto del año. La baja frente a agosto 2025 (231 → 201 CME L–V) cabe en los 12 pabellón-días perdidos; no hay evidencia de menor rendimiento del equipo.', border: C.TEAL, titleColor: C.TEAL2, bodySize: 10.5 });
  note(s, pres, 0.55, 5.7, 7.4, 0.72, { title: null, body: [{ text: 'Julio: ', options: { bold: true, color: C.TEXT } }, { text: 'también se operó parte del mes con un pabellón menos (climatización del 1 al 6 de julio y otras restricciones). Falta confirmar el número de días sin pabellón para estimar julio con la misma regla.' }], border: C.AMBER, bodySize: 10 });
  footnote(s, 'Supuesto: productividad por pabellón-día constante; no ajusta por mezcla de casos ni horario. "Días con actividad" viene del export de encuentros: la ausencia de registros no acredita cierre formal.', { y: 6.5, h: 0.45 });
  return s;
};

// El día quirúrgico explicado
N.dia = (pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  TIEMPOS · EL DÍA QUIRÚRGICO', title: 'Los tiempos de pabellón, explicados en un solo caso', subtitle: 'Medianas de agosto para un caso electivo de lunes a viernes · qué mide cada tramo, cuánto dura y dónde está la oportunidad',
    notes: 'Medianas de agosto (encuentros electivos L–V, export 830): ingreso a anestesia 12 min (n 198), anestesia a incisión 18 (n 198), incisión a término quirúrgico 54 (n 196), término a salida 13 (n 197); ocupación total de quirófano 100,5 min (n 202): las medianas de los tramos no suman la mediana total porque cada una se calcula sobre su propia cohorte. Recambio neto (salida del anterior a ingreso del siguiente, descontando 12:30–14:00) mediana 18 min, bruto 25. Primer caso del día: ingreso 07:55, anestesia 08:23, incisión 08:45 (n 51); del ingreso a la incisión, 45 min (P90 72). Fin de semana (oftalmología): ocupación mediana 9 min, otro circuito. Oportunidades: preparación hasta la incisión (45 min del primer caso, 30 del caso típico), cola del recambio (P90 43 min) y continuidad al mediodía (33 h 35 en agosto).\n\n' + SRC.pdf + '\n' + SRC.enc });
  // línea de tiempo del caso típico
  const segs = [
    { l: 'Ingreso → anestesia', v: 12, c: C.BLUE2 }, { l: 'Anestesia → incisión', v: 18, c: C.VIOLET }, { l: 'Incisión → término (IQ)', v: 54, c: C.TEAL },
    { l: 'Término → salida', v: 13, c: C.BLUE2 }, { l: 'Recambio neto', v: 18, c: C.AMBER },
  ];
  const totalMin = segs.reduce((a, b) => a + b.v, 0);
  const x0 = 0.55, y0 = 2.15, W = 12.22, H = 0.62;
  txt(s, 'UN CASO ELECTIVO TÍPICO DE LUNES A VIERNES · MEDIANAS DE AGOSTO (MINUTOS)', 0.55, 1.85, 9, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  let cx = x0;
  segs.forEach(sg => {
    const ww = W * sg.v / totalMin;
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: y0, w: ww, h: H, fill: { color: sg.c, transparency: 25 }, line: { color: C.BG, width: 1 } });
    txt(s, `${sg.v} min`, cx, y0, ww, H, { fontSize: 13, bold: true, color: C.BG, align: 'center', valign: 'middle' });
    txt(s, sg.l, cx, y0 + H + 0.05, ww, 0.42, { fontSize: 9, color: C.TEXT2, align: 'center' });
    cx += ww;
  });
  s.addShape(pres.shapes.LINE, { x: x0, y: y0 + H + 0.5, w: W * 97 / totalMin, h: 0, line: { color: C.TEAL, width: 1.25 } });
  txt(s, 'ocupación de quirófano (ingreso a salida): mediana 100,5 min · el siguiente paciente entra tras el recambio', x0, y0 + H + 0.54, W, 0.24, { fontSize: 9, color: C.TEAL2 });
  // primer caso del día
  txt(s, 'EL PRIMER CASO DEL DÍA · MEDIANAS DE AGOSTO (n = 51) · REFERENCIAS 08:00 / 09:00', 0.55, 3.75, 9, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  const tl = [{ h: '07:55', l: 'Ingreso a quirófano', c: C.BLUE2 }, { h: '08:23', l: 'Inicio de anestesia', c: C.VIOLET }, { h: '08:45', l: 'Incisión', c: C.TEAL }, { h: '09:34', l: 'P90 de la incisión', c: C.AMBER }];
  const tx = 0.55, tw = 7.4, ty = 4.05;
  const mins = t => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3), 10);
  const t0 = mins('07:40'), t1 = mins('09:45');
  s.addShape(pres.shapes.LINE, { x: tx, y: ty + 0.45, w: tw, h: 0, line: { color: C.BORDER2, width: 1.5 } });
  [['08:00', C.MUTED], ['09:00', C.MUTED]].forEach(([t, c]) => { const px = tx + tw * (mins(t) - t0) / (t1 - t0); s.addShape(pres.shapes.LINE, { x: px, y: ty + 0.25, w: 0, h: 0.4, line: { color: c, width: 1, dashType: 'dash' } }); txt(s, t, px - 0.3, ty + 0.66, 0.6, 0.2, { fontSize: 8, color: C.MUTED, align: 'center' }); });
  tl.forEach((p, k) => {
    const px = tx + tw * (mins(p.h) - t0) / (t1 - t0);
    s.addShape(pres.shapes.OVAL, { x: px - 0.09, y: ty + 0.36, w: 0.18, h: 0.18, fill: { color: p.c }, line: { color: C.BG, width: 1 } });
    txt(s, p.h, px - 0.45, ty + (k % 2 ? 0.9 : -0.05), 0.9, 0.24, { fontSize: 11, bold: true, color: p.c, align: 'center', valign: 'middle' });
    txt(s, p.l, px - 0.8, ty + (k % 2 ? 1.12 : 0.15), 1.6, 0.22, { fontSize: 8.5, color: C.TEXT2, align: 'center', valign: 'middle' });
  });
  txt(s, 'Del ingreso a la incisión: 45 min de mediana (P90 72). 30 de 51 ingresos antes de las 08:00; 32 de 51 incisiones antes de las 09:00 (62,7 %; agosto 2025: 84,5 %).', tx, ty + 1.42, tw, 0.5, { fontSize: 9.5, color: C.TEXT3 });
  // lectura simple
  const x = 8.15, w = 4.62;
  note(s, pres, x, 3.75, w, 0.88, { title: 'RECAMBIO BRUTO Y NETO', body: 'Bruto: de la salida de un paciente al ingreso del siguiente (25 min). Neto: lo mismo descontando lo que cae en el almuerzo 12:30–14:00 (18 min).', border: C.AMBER, titleColor: C.AMBER, bodySize: 9, titleSize: 10 });
  note(s, pres, x, 4.71, w, 0.88, { title: 'MEDIANA, MEDIA Y P90', body: 'Mediana: el caso del medio. Media: sube con pocos casos muy largos. P90: 9 de cada 10 casos quedan por debajo. Agosto mejoró media y P90, no la mediana.', border: C.TEAL, titleColor: C.TEAL2, bodySize: 9, titleSize: 10 });
  note(s, pres, x, 5.67, w, 0.8, { title: 'DÓNDE ESTÁ LA OPORTUNIDAD', body: 'Preparación hasta la incisión (45 min del primer caso), cola del recambio (P90 43 min) y continuidad al mediodía (33 h 35 en agosto).', border: C.RED, titleColor: C.RED, bodySize: 9, titleSize: 10 });
  footnote(s, 'Las medianas de cada tramo se calculan sobre su propia cohorte y no suman la ocupación total. Las 08:00 y 09:00 son referencias descriptivas, no metas.', { y: 6.55, h: 0.4 });
  return s;
};

// Hoja de ruta de IA
N.hojaIA = (pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  ALGORITMOS · HOJA DE RUTA', title: 'Qué puede hacer la IA con estos datos, y qué le falta', subtitle: 'Aplicaciones pertinentes según el informe del 6 de septiembre · método razonable, estado actual y siguiente paso · la decisión sigue en el equipo',
    notes: 'Aplicaciones de inteligencia artificial pertinentes (informe del 6 de septiembre): ocupación al cerrar la tabla (mediana jerárquica, Ridge, árboles y MLP como comparadores; hay prueba local exploratoria; falta agenda congelada, estimación humana e intervalos calibrados); variantes del flujo y esperas (minería de procesos y reglas temporales; agregar sala lista, paciente listo, limpieza, montaje y traslado); escenarios de almuerzo y agenda (simulación de eventos discretos y optimización con restricciones; usar ventanas continuas y disponibilidad observada); suspensión por causa (reglas y regresión; árboles solo si mejora la evaluación; se necesita agenda completa de realizados y suspendidos enlazada por episodio con variables previas; Sharabi et al. predicen inasistencia y excluyen cancelaciones del hospital); tiempo restante intraoperatorio (red secuencial o de vídeo; proyecto posterior con señales sincronizadas); modelos tabulares preentrenados (TabPFN como comparador opcional). Evidencia externa: Bartek 2019 (46.986 operaciones), Strömblad 2021 (ensayo aleatorizado, error 59,3 → 49,5 min), Jiao 2020 (redes probabilísticas), Lex 2026 (simulación de artroplastia), Goldhaber 2023 (Surgical Pit Crew). Las herramientas orientan la revisión del equipo; la priorización clínica, la confirmación de agenda y la decisión de suspender permanecen bajo responsabilidad profesional.\n\n' + SRC.pdf });
  table(s, [
    ['Aplicación', 'Método razonable', 'Estado hoy', 'Siguiente paso'],
    ['Ocupación al cerrar la tabla', 'Mediana por prestación, Ridge, árboles y MLP como comparadores', 'Prueba local exploratoria: Ridge 21,8 min vs 23,1 de la mediana (no concluyente)', 'Agenda congelada al cerrar la tabla, estimación del equipo e intervalos calibrados'],
    ['Suspensión por causa', 'Reglas y regresión; árboles solo si mejoran', 'Registro operable en marcha (CancelOS /suspensiones); 18 de 38 sin causal en agosto', 'Agenda completa de realizados y suspendidos por episodio, con variables previas'],
    ['Esperas y variantes del flujo', 'Minería de procesos y reglas temporales', 'Los hitos actuales describen parte de la ruta', 'Registrar sala lista, paciente listo, limpieza, montaje y traslado'],
    ['Almuerzo y agenda', 'Simulación de eventos discretos y optimización con restricciones', 'Ventanas observadas: 16 jornadas con ≥ 60 min continuos', 'Piloto de cobertura de 4 semanas con comparación concurrente'],
    ['Tiempo restante intraoperatorio', 'Red secuencial o de vídeo', 'No iniciado: los exports no sostienen ese entrenamiento', 'Proyecto posterior con señales sincronizadas'],
    ['Control del indicador', 'Carta p, CUSUM, EWMA y pruebas exactas', 'Operativo en este comité (láminas de control estadístico)', 'Automatizar en CancelOS con la serie diaria y alertas'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [2.3, 3.1, 3.4, 3.42], fontSize: 9.5, rowH: 0.56, boldFirstCol: true });
  note(s, pres, 0.55, 5.9, 12.22, 0.6, { title: null, body: [{ text: 'Regla del informe: ', options: { bold: true, color: C.TEXT } }, { text: 'una captura consistente de hitos aporta más valor inicial que añadir capas a la red neuronal. Para suspensiones no basta una lista de suspendidos: se necesita conocer todas las programaciones expuestas al riesgo.' }], border: C.TEAL, bodySize: 10 });
  return s;
};

// Anexo · métodos II (algoritmos de esta versión)
N.metodos2 = (pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  ANEXO · MÉTODOS II', title: 'Anexo · métodos de las láminas de algoritmos', subtitle: 'Misma fecha, contrafactual, CUSUM, EWMA, pruebas del lunes y de jornadas, pabellón-día · reproducibles desde la serie del monitoreo',
    notes: 'Todos los cálculos usan la serie homogénea del monitoreo (L–V) y el registro operativo de agosto; el bosque aleatorio proviene del informe de agosto. Sin scipy: Fisher exacto, binomial y cuantiles se calculan con funciones gamma; Monte Carlo con semilla fija 20260907.' });
  table(s, [
    ['Método', 'Regla aplicada en esta presentación'],
    ['Misma fecha', 'Se comparan enero–agosto de cada año con la misma fuente y fórmula. Media móvil de 3 meses = suma de suspendidas / suma de programadas del trimestre móvil. Acumulado = suma / suma desde enero.'],
    ['Contrafactual', 'Esperadas 2026 = programadas de cada mes × 9,83 % (tasa ene–ago 2025). Evitadas = esperadas − observadas (144 − 74 = 70). Agosto: 152 × 9,38 % = 14,3 esperadas vs 2. Aritmético; no atribuye causalidad.'],
    ['CUSUM', 'Sobre conteos: C_t = Σ (programadas_t × 9,38 % − suspendidas_t). Quiebre = primer mes del ascenso sostenido tras el último valor en torno a cero (dic-25 / ene-26 → feb-26). Exceso desde el quiebre: 64.'],
    ['EWMA', 'λ = 0,3 desde la media 2025 (9,38 %): EWMA_t = 0,3 × tasa_t + 0,7 × EWMA_(t−1). Pronóstico de septiembre = EWMA de agosto (3,06 %); intervalo binomial con 184 programadas (P5–P95: 2–10); banda de tasa ± 1,645 × desviación de residuos (1,9 pp).'],
    ['Prueba del lunes', 'Binomial con p = 1/5 por día hábil: P(X ≥ 6 | n = 19) = 0,16 (no concluyente en agosto). P(2 de 2 eventos MINSAL en lunes) = 0,04. Histórico SPC ene-25–abr-26: lunes 11,09 %, Z = 2,09.'],
    ['Jornadas de fin de semana', 'Monte Carlo: 200.000 repartos uniformes de 19 registros entre los 5 fines de semana de agosto; frecuencia de que los dos mayores sumen ≥ 16: < 0,1 % (p < 0,001). Supone independencia entre registros.'],
    ['Pabellón-día', 'Productividad = encuentros electivos L–V (202) / pabellón-días con actividad (P2 9 + P3 21 + P4 21 = 51) = 3,96. Escenario P2 completo = 63 pabellón-días a la misma productividad (≈ 250; CME ≈ 248 = 11,8 por día).'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [2.3, 9.92], fontSize: 9.8, rowH: 0.56, boldFirstCol: true });
  return s;
};

module.exports = { N, multiLine };
