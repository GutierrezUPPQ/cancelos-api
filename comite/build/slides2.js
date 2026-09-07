// Láminas 21–41: interanual, productividad, especialidades, tiempos, recambio, IA, HPMM, cierre y anexos
const { C, txt, baseSlide, card, kpi, note, table, hbars, vbars, legend, footnote, darkChart } = require('./lib');
const { SRC, statRow } = require('./slides1');
const S = require('./stats.json');

const REC = [ // mes, pares, bruto med, neto med, media neta, P90 neto, almuerzo h
  ['nov-24', 108, 14.0, 11.0, 24.3, 69.6, 27.0], ['dic-24', 144, 11.0, 5.0, 17.0, 35.0, 27.6], ['ene-25', 94, 21.0, 15.0, 22.5, 42.9, 27.7],
  ['feb-25', 130, 21.5, 16.0, 22.6, 45.5, 30.1], ['mar-25', 131, 19.0, 14.0, 21.3, 39.0, 30.7], ['abr-25', 124, 23.5, 16.0, 23.2, 43.7, 35.2],
  ['may-25', 115, 21.0, 16.0, 26.4, 59.0, 30.9], ['jun-25', 155, 21.0, 17.0, 22.3, 46.8, 37.1], ['jul-25', 151, 19.0, 15.0, 20.4, 36.0, 41.3],
  ['ago-25', 135, 25.0, 16.0, 27.7, 68.2, 43.6], ['sep-25', 143, 22.0, 18.0, 27.3, 55.0, 38.9], ['oct-25', 176, 23.5, 19.0, 29.2, 66.0, 46.8],
  ['nov-25', 129, 21.0, 15.0, 20.9, 49.8, 32.6], ['dic-25', 117, 27.0, 21.0, 27.5, 58.8, 35.7], ['ene-26*', 49, 25.0, 19.0, 24.0, 46.4, 16.7],
  ['may-26*', 90, 25.5, 18.0, 23.4, 56.2, 28.1], ['jun-26', 158, 24.0, 19.0, 28.8, 63.0, 48.0], ['jul-26', 125, 25.0, 19.0, 29.5, 59.4, 32.7],
  ['ago-26', 141, 25.0, 18.0, 22.6, 43.0, 33.6],
];
const PRIM = [ // mes, n ingreso, ingreso, n incisión, incisión, %≤08:00, %≤09:00
  ['nov-24', 49, '07:57', 49, '08:43', 57.1, 71.4], ['dic-24', 53, '08:08', 52, '08:46', 35.8, 61.5], ['ene-25', 52, '07:54', 52, '08:46', 61.5, 73.1],
  ['feb-25', 57, '07:58', 57, '08:44', 56.1, 75.4], ['mar-25', 60, '07:58', 60, '08:44', 60.0, 78.3], ['abr-25', 56, '07:55', 56, '08:41', 69.6, 83.9],
  ['may-25', 53, '07:54', 52, '08:45', 66.0, 75.0], ['jun-25', 54, '07:55', 54, '08:42', 70.4, 79.6], ['jul-25', 65, '07:59', 65, '08:42', 60.0, 81.5],
  ['ago-25', 58, '07:56', 58, '08:43', 67.2, 84.5], ['sep-25', 59, '07:56', 59, '08:41', 66.1, 79.7], ['oct-25', 64, '07:56', 64, '08:42', 59.4, 81.2],
  ['nov-25', 56, '07:55', 56, '08:41', 64.3, 76.8], ['dic-25', 62, '07:55', 62, '08:45', 66.1, 72.6], ['ene-26*', 21, '08:04', 21, '08:43', 42.9, 71.4],
  ['may-26*', 44, '07:59', 44, '08:42', 72.7, 86.4], ['jun-26', 60, '07:58', 60, '08:46', 58.3, 68.3], ['jul-26', 52, '08:02', 52, '08:50', 42.3, 63.5],
  ['ago-26', 51, '07:55', 51, '08:45', 58.8, 62.7],
];
const f1 = v => v.toFixed(1).replace('.', ',');
const slides = [];

// 21 · Interanual
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  COMPARACIÓN INTERANUAL', title: 'La comparación interanual distingue mes y acumulado', subtitle: 'Cirugía mayor electiva y suspensión hábil · misma fórmula L–V · agosto y enero–agosto',
    notes: 'Agosto 2026 presenta menos CME L–V que agosto 2025: 231 a 201 (−13,0 %), ambos con 21 días. El total calendario pasa de 419 a 411 (−1,9 %) y el fin de semana de 188 a 210 (+11,7 %). También disminuye el número de suspensiones normales L–V (23 → 2). El acumulado enero–agosto 2026 registra 1.880 CME L–V frente a 1.657 (+13,5 %), con 173 días L–V en ambos períodos. Las lecturas mensual y acumulada se presentan juntas para evitar seleccionar solo una comparación favorable. Las tasas acumuladas usan la suma de suspendidas / la suma de programadas.\n\n' + SRC.mon });
  table(s, [
    ['Indicador', 'Agosto 2025', 'Agosto 2026', 'Variación', 'Ene–ago 2025', 'Ene–ago 2026', 'Variación'],
    ['Programadas normales L–V', '190', '152', '−20,0 %', '1.353', '1.469', '+8,6 %'],
    ['Suspendidas L–V', '23', '2', '−91,3 %', '133', '74', '−44,4 %'],
    ['Tasa de suspensión hábil', '12,11 %', '1,32 %', '−10,8 pp', '9,83 %', '5,04 %', '−4,8 pp'],
    ['CME realizadas L–V', '231', '201', '−13,0 %', '1.657', '1.880', '+13,5 %'],
    ['CME por día L–V', '11,00', '9,57', '−13,0 %', '9,58', '10,87', '+13,5 %'],
    ['CME fin de semana', '188', '210', '+11,7 %', '1.650', '1.506', '−8,7 %'],
    ['CME todas las fechas', '419', '411', '−1,9 %', '3.307', '3.386', '+2,4 %'],
    ['Días lunes a viernes', '21', '21', '=', '173', '173', '='],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [3.1, 1.45, 1.45, 1.35, 1.6, 1.6, 1.67], fontSize: 11, rowH: 0.42, highlightCol: 2 });
  statRow(s, pres, [
    { value: '−13,0 %', label: 'CME L–V · AGOSTO VS AGOSTO 2025', sub: '231 → 201 con los mismos 21 días · dos lunes sin tabla en Pabellón 2 y fin de semana en alza', color: C.AMBER },
    { value: '+13,5 %', label: 'CME L–V · ACUMULADO ENE–AGO', sub: '1.657 → 1.880 · 173 días L–V en ambos años', color: C.GREEN, border: C.GREEN },
    { value: '−44 %', label: 'SUSPENSIONES · ACUMULADO', sub: '133 → 74 · Fisher p < 0,001 · con +8,6 % de programadas', color: C.GREEN, border: C.GREEN },
  ], 5.75, 0.9);
  return s;
});

// 22 · Productividad por día L–V
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  PRODUCTIVIDAD HÁBIL', title: 'La productividad por día L–V aumenta levemente en agosto', subtitle: 'CME realizadas por día de calendario L–V · enero a agosto de 2026 · denominador: todos los días L–V, incluidos días sin CME',
    notes: 'Este promedio no es cirugías por pabellón ni por jornada habilitada. Usa todos los días L–V de cada mes (ene 22, feb 20, mar 22, abr 22, may 21, jun 22, jul 23, ago 21). El análisis por calendario ofrece una comparación estable, pero no sustituye una medición de horas o pabellones efectivamente disponibles. Media ene–ago 2026: 1.880 / 173 = 10,87; 2025: 1.657 / 173 = 9,58.\n\n' + SRC.mon });
  card(s, 0.55, 1.85, 8.35, 4.55, { pres });
  const vals = S.cme_lv_26.map((v, k) => v / S.lv_dias_26[k]);
  vbars(s, pres, vals.map((v, k) => ({ value: v, label: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'][k], color: k === 7 ? C.TEAL2 : C.TEAL })), 0.75, 2.05, 8.0, 4.2, { valueFmt: v => f1(v), fontSize: 10.5, max: 14 });
  s.addShape(pres.shapes.LINE, { x: 0.75, y: 2.05 + 0.26 + (4.2 - 0.26 - 0.3) * (1 - 10.87 / 14), w: 8.0, h: 0, line: { color: C.AMBER, width: 1.25, dashType: 'dash' } });
  txt(s, 'media ene–ago 2026: 10,87', 6.3, 2.05 + 0.26 + (4.2 - 0.26 - 0.3) * (1 - 10.87 / 14) - 0.26, 2.4, 0.22, { fontSize: 8.5, color: C.AMBER, align: 'right', valign: 'middle' });
  const x = 9.05, w = 3.72;
  kpi(s, pres, x, 1.85, w, 1.42, { value: '9,57', label: 'CME POR DÍA L–V · AGOSTO', sub: '+2,9 % vs julio (9,30) · 201 CME en 21 días', valueSize: 26 });
  kpi(s, pres, x, 3.39, w, 1.42, { value: '10,87', label: 'MEDIA ENE–AGO 2026', sub: 'vs 9,58 en ene–ago 2025 (+13,5 %) · 173 días L–V en ambos', color: C.GREEN, border: C.GREEN, valueSize: 26 });
  kpi(s, pres, x, 4.93, w, 1.47, { value: '3,9 → 11,8', label: 'CME/DÍA · ESCENARIO P2 COMPLETO', sub: 'agosto tuvo 51 de 63 pabellón-días L–V (P2 solo 9 días): con P2 completo, ≈ 248 CME = 11,8 por día', color: C.AMBER, valueSize: 22 });
  footnote(s, 'Denominador: días L–V del calendario, incluidos días sin CME registradas; no días de pabellón disponible. Julio y agosto se recalcularon con la serie homogénea.', { y: 6.5, h: 0.45 });
  return s;
});

// 23 · Especialidades
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  ESPECIALIDADES', title: 'Especialidades de la cirugía mayor electiva realizada', subtitle: 'Agosto · 405 CME del export de encuentros · clasificación por cruce exacto con el detalle REM832',
    notes: 'Clasificación obtenida de la especialidad explícita del detalle REM832, vinculada al encuentro por nombre exacto normalizado, fecha y pabellón. Hay 403 correspondencias unívocas, una sin coincidencia y una discordante. Se preserva la base de 405 CME realizadas; no se usa el subtotal REM de 135 intervenidos. Otras especialidades (34) agrupa 23 Otras Especialidades, 5 Maxilofacial, 4 Neurocirugía, 1 Tórax y 1 Odontología, etiquetas literales. Se excluyen 29 electivas menores o procedimientos. No se infieren especialidades a partir de prefijos FONASA.\n\n' + SRC.enc });
  card(s, 0.55, 1.85, 7.6, 4.55, { pres });
  hbars(s, pres, [
    { label: 'Oftalmología', value: 232, color: C.BLUE }, { label: 'Cirugía General', value: 40 }, { label: 'Ginecología', value: 35 }, { label: 'Urología', value: 32 },
    { label: 'Traumatología', value: 30 }, { label: 'Otras especialidades', value: 34 }, { label: 'Por resolver', value: 2, color: C.GRAY },
  ], 0.7, 2.05, 7.3, 4.15, { labelW: 2.1, valueW: 0.5, max: 232, fontSize: 11 });
  const x = 8.3, w = 4.47;
  kpi(s, pres, x, 1.85, w, 1.42, { value: '403 / 405', label: 'CON ESPECIALIDAD EXPLÍCITA VINCULADA', sub: 'una sin coincidencia y una discordante permanecen por resolver', valueSize: 26 });
  kpi(s, pres, x, 3.39, w, 1.42, { value: '232 · 173', label: 'FIN DE SEMANA · LUNES A VIERNES', sub: 'Oftalmología ocupa el fin de semana; 173 CME L–V se reparten en cinco especialidades y otras', color: C.BLUE2, valueSize: 26 });
  kpi(s, pres, x, 4.93, w, 1.47, { value: '30', label: 'TRAUMATOLOGÍA', sub: 'especialidad de los dos eventos MINSAL del mes (3 y 17 de agosto)', color: C.AMBER, valueSize: 26 });
  footnote(s, 'Otras especialidades (34): 23 Otras Especialidades, 5 Maxilofacial, 4 Neurocirugía, 1 Tórax, 1 Odontología. En el export, 74,7 % de los encuentros de agosto no traen especialidad: la clasificación depende del cruce con REM832.', { y: 6.5, h: 0.45 });
  return s;
});

// 24 · Pabellones
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  PABELLONES', title: 'La actividad por pabellón muestra circuitos distintos', subtitle: 'Agosto · 640 encuentros depurados, electivos y urgencias · encuentros por pabellón y calendario',
    notes: 'El tablero de producción considera pabellones de tipo electivo 2–4, con 452 encuentros: 434 electivos y 18 urgencias. Divide por 31 días y muestra 14,6. Los 188 de Pabellón 1 se excluyen de ese universo. En Pabellón 2 se observan encuentros los días 3–7, 26–28 y 31; no inferir que todas las otras fechas estuvieron cerradas. Los lunes 10, 17 y 24 la tabla de Pabellón 2 se canceló por falta de enfermera (correo del 23-ago).\n\n' + SRC.enc + '\n' + SRC.sit });
  table(s, [
    ['Pabellón', 'L–V', 'Fin de semana', 'Total', 'Días L–V con electivas', 'Lectura'],
    ['1 · Urgencia', '141', '47', '188', '0', 'Circuito de urgencia; excluido del tablero electivo'],
    ['2', '36', '0', '36', '9', 'Actividad en 9 fechas L–V (3–7, 26–28 y 31)'],
    ['3', '98', '233', '331', '21', 'Concentra el fin de semana oftalmológico'],
    ['4', '80', '5', '85', '21', 'Electivo L–V todos los días'],
    ['Total', '355', '285', '640', '—', '452 en pabellones 2–4 · 14,6 por día de calendario'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [1.5, 1.0, 1.5, 1.0, 2.1, 5.12], fontSize: 11, rowH: 0.46, boldRows: [5], highlightCol: 3 });
  statRow(s, pres, [
    { value: '452', label: 'ENCUENTROS · PABELLONES 2–4', sub: '434 electivos + 18 urgencias · 14,6 por día de calendario en el escritorio SITGEQ' },
    { value: '9 de 21', label: 'DÍAS L–V CON ACTIVIDAD · PABELLÓN 2', sub: 'la ausencia de registros no acredita cierre; tres lunes sin tabla por dotación', color: C.AMBER, border: C.AMBER },
    { value: '233', label: 'FIN DE SEMANA · PABELLÓN 3', sub: 'toda la actividad oftalmológica de fin de semana pasa por un pabellón' },
  ], 4.85, 1.05);
  footnote(s, 'Encuentros realizados de cualquier modalidad. Los 188 de Pabellón 1 no forman parte del universo del tablero de producción (pabellones de tipo electivo 2–4).', { y: 6.1, h: 0.45 });
  return s;
});

// 25 · Inicio de jornada: hitos e intervalos
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  INICIO DE JORNADA', title: 'Los inicios se adelantan; la preparación hasta la incisión, no', subtitle: 'Primer encuentro real del pabellón, además electivo · L–V · julio n = 52, agosto n = 51 · medianas',
    notes: 'La cohorte exige que el caso sea el primer encuentro real de la fecha y pabellón, además electivo, en L–V, con ingreso desde las 06:00. Julio aporta 52 y agosto 51. Se calculan primero los intervalos de cada caso y luego la mediana: no restar 08:45 − 07:55 y presentar 50 min como mediana del intervalo (el resultado por pares es 45). La mejora en horario de ingreso convive con un intervalo de preparación levemente mayor. Agosto: 30 / 51 ingresos ≤ 08:00 (58,8 %); 32 / 51 incisiones ≤ 09:00 (62,7 %); P90 de ingreso 08:43, anestesia 09:04, incisión 09:34; ingreso → incisión mediana 45 min y P90 72 min.\n\n' + SRC.pdf + '\n' + SRC.enc });
  txt(s, 'MEDIANAS DE LOS HITOS', 0.55, 1.88, 6, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Hito', 'Julio · n = 52', 'Agosto · n = 51', 'Diferencia'],
    ['Ingreso a quirófano', '08:02', '07:55', '7 min antes'],
    ['Inicio de anestesia', '08:24', '08:23', '1 min antes'],
    ['Incisión quirúrgica', '08:50', '08:45', '5 min antes'],
  ], { x: 0.55, y: 2.16, w: 5.95, colW: [2.15, 1.3, 1.3, 1.2], fontSize: 11, rowH: 0.44, highlightCol: 2 });
  txt(s, 'MEDIANAS DE LOS INTERVALOS POR CASO', 6.82, 1.88, 6, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Intervalo', 'Julio · n = 52', 'Agosto · n = 51', 'Diferencia'],
    ['Ingreso → anestesia', '19 min', '23 min', '+4 min'],
    ['Anestesia → incisión', '20,5 min', '22 min', '+1,5 min'],
    ['Ingreso → incisión', '43,5 min', '45 min', '+1,5 min'],
  ], { x: 6.82, y: 2.16, w: 5.95, colW: [2.15, 1.3, 1.3, 1.2], fontSize: 11, rowH: 0.44, highlightCol: 2 });
  statRow(s, pres, [
    { value: '30 / 51', label: 'INGRESOS ≤ 08:00 · AGOSTO', sub: '58,8 % · julio 22 / 52 (42,3 %)', color: C.GREEN },
    { value: '32 / 51', label: 'INCISIONES ≤ 09:00 · AGOSTO', sub: '62,7 % · julio 34 / 52 (65,4 %) · agosto 2025 84,5 %', color: C.AMBER },
    { value: '45 · 72 min', label: 'INGRESO→INCISIÓN · MEDIANA · P90', sub: 'etapas con trabajo clínico necesario y posibles esperas que el registro no distingue' },
    { value: '09:34', label: 'P90 DE INCISIÓN · AGOSTO', sub: 'ingreso 08:43 · anestesia 09:04 · la dispersión sigue después de la mediana' },
  ], 4.25, 1.0);
  note(s, pres, 0.55, 5.4, 12.22, 1.0, { title: null, body: [{ text: 'Llegar antes a quirófano no garantiza una incisión más temprana. ', options: { bold: true, color: C.TEXT } }, { text: 'La observación propuesta empieza antes del ingreso: hora programada, paciente listo, traslado solicitado y completado, sala lista e inicio de preparación, para separar dificultades de llegada de las que ocurren dentro del quirófano. No corresponde llamar "tiempo perdido" a toda la fase anestésica.' }], border: C.TEAL, bodySize: 10.5 });
  footnote(s, 'Las 08:00 y 09:00 son referencias descriptivas, no metas ni horarios contractuales. Julio: export 683 (archivo local del 11-ago); agosto: export 830. Fórmulas iguales; cortes de extracción diferentes.', { y: 6.5, h: 0.45 });
  return s;
});

// 26 · Puntualidad por hito + por pabellón
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  INICIO DE JORNADA', title: 'La puntualidad se observa en cada hito y en cada pabellón', subtitle: 'Proporción acumulada hasta la hora indicada, inclusive · primeros casos electivos L–V · agosto por pabellón',
    notes: 'Conteos: ingreso hasta las 08:00, julio 22 / 52 y agosto 30 / 51; anestesia hasta las 08:30, 33 / 52 y 38 / 51; incisión hasta las 09:00, 34 / 52 y 32 / 51. Límites inclusivos. El porcentaje de incisiones hasta las 09:00 es ligeramente menor en agosto aunque la mediana se adelanta cinco minutos: un único resumen no describe toda la distribución. Por pabellón: Pabellón 2 tiene nueve días observados y Pabellones 3 y 4 veintiuno; las diferencias no permiten atribuir retrasos a un equipo o persona.\n\n' + SRC.pdf + '\n' + SRC.enc });
  card(s, 0.55, 1.85, 6.6, 4.55, { pres });
  s.addChart(pres.charts.BAR, [
    { name: 'Julio · n = 52', labels: ['Ingreso ≤ 08:00', 'Anestesia ≤ 08:30', 'Incisión ≤ 09:00'], values: [42.3, 63.5, 65.4] },
    { name: 'Agosto · n = 51', labels: ['Ingreso ≤ 08:00', 'Anestesia ≤ 08:30', 'Incisión ≤ 09:00'], values: [58.8, 74.5, 62.7] },
  ], darkChart({ x: 0.65, y: 1.95, w: 6.4, h: 4.35, barDir: 'col', barGrouping: 'clustered', chartColors: [C.BLUE, C.TEAL], showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0"%"', dataLabelFontSize: 9.5, showLegend: true, barGapWidthPct: 60, valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20, valAxisLabelFormatCode: '0"%"' }));
  txt(s, 'AGOSTO · PRIMEROS CASOS POR PABELLÓN', 7.4, 1.88, 5.3, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Pabellón', 'n', 'Ingreso', 'Anestesia', 'Incisión'],
    ['2', '9', '08:04', '08:25', '08:56'],
    ['3', '21', '07:57', '08:24', '08:46'],
    ['4', '21', '07:52', '08:20', '08:42'],
    ['Conjunto', '51', '07:55', '08:23', '08:45'],
  ], { x: 7.4, y: 2.16, w: 5.37, colW: [1.35, 0.7, 1.1, 1.12, 1.1], fontSize: 11, rowH: 0.44, boldRows: [4] });
  note(s, pres, 7.4, 4.5, 5.37, 1.9, { title: '◆  PABELLÓN 2 INCIDE 14 MINUTOS MÁS TARDE', body: 'Con nueve días observados y una mezcla de casos distinta, la diferencia orienta la revisión de preparación y disponibilidad; no constituye una clasificación de desempeño ni permite atribuir retrasos a personas. Los primeros casos de agosto fueron en todos los casos el primer encuentro real del pabellón.', border: C.AMBER, titleColor: C.AMBER, bodySize: 10 });
  footnote(s, 'Referencias descriptivas; no metas institucionales. Julio: cuatro primeros electivos precedidos por una urgencia se excluyen del principal (sensibilidad n = 56 en el anexo de métodos).', { y: 6.5, h: 0.45 });
  return s;
});

// 27 · Evolución de los primeros inicios
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  EVOLUCIÓN 2024–2026', title: 'Primeros inicios 2024–2026: ingreso estable, incisión más dispersa', subtitle: 'Primer encuentro real electivo de P2–P4, L–V, ingreso desde las 06:00 · proporción ≤ 08:00 (ingreso) y ≤ 09:00 (incisión) · nov-2024 a ago-2026',
    notes: 'Serie del informe del 6 de septiembre (anexo de primeros casos mensuales). En 2025 la mediana mensual del primer ingreso se mantuvo entre 07:54 y 07:59 y la incisión entre 08:41 y 08:46. En SITGEQ, julio 2026 registra 08:02 y 08:50; agosto 07:55 y 08:45. Frente a agosto de 2025 el ingreso mediano es similar (07:56 → 07:55), pero la proporción de incisiones hasta las 09:00 baja de 49 / 58 (84,5 %) a 32 / 51 (62,7 %). * Meses parciales: enero 2026 hasta el día 12; mayo 2026 desde el día 7. No hay serie de tiempos entre el 13 de enero y el 29 de abril de 2026. Comparación sin ajuste por mezcla; los resultados de anestesia se limitan a SITGEQ.\n\n' + SRC.pdf });
  card(s, 0.55, 1.85, 8.35, 4.55, { pres });
  s.addChart(pres.charts.LINE, [
    { name: 'Ingreso ≤ 08:00', labels: PRIM.map(r => r[0]), values: PRIM.map(r => r[5]) },
    { name: 'Incisión ≤ 09:00', labels: PRIM.map(r => r[0]), values: PRIM.map(r => r[6]) },
  ], darkChart({ x: 0.65, y: 1.95, w: 8.15, h: 4.35, chartColors: [C.BLUE2, C.TEAL], lineSize: 2, lineDataSymbol: 'circle', lineDataSymbolSize: 5, showLegend: true, valAxisMinVal: 30, valAxisMaxVal: 90, valAxisMajorUnit: 10, valAxisLabelFormatCode: '0"%"', catAxisLabelFontSize: 8, catAxisLabelRotate: -45 }));
  const x = 9.05, w = 3.72;
  kpi(s, pres, x, 1.85, w, 1.42, { value: '84,5 → 62,7 %', label: 'INCISIÓN ≤ 09:00 · AGO-25 → AGO-26', sub: '49 / 58 → 32 / 51 · la segunda proporción más baja de la serie (dic-24: 61,5 %)', color: C.AMBER, border: C.AMBER, valueSize: 20 });
  kpi(s, pres, x, 3.39, w, 1.42, { value: '07:54–08:08', label: 'INGRESO MEDIANO · TODA LA SERIE', sub: 'ago-26 07:55 · jul-26 08:02 · el ingreso no explica la caída de la incisión temprana', valueSize: 20 });
  kpi(s, pres, x, 4.93, w, 1.47, { value: '21–65', label: 'PRIMEROS CASOS POR MES', sub: 'ago-26 n = 51 · los meses con asterisco son parciales (ene-26 hasta el día 12, may-26 desde el 7)', valueSize: 20 });
  footnote(s, 'Sin serie de tiempos del 13-ene al 29-abr de 2026 (cambio de sistema). Cada mes usa su denominador válido; los porcentajes se calculan sobre cada hito válido, no sobre días teóricos de funcionamiento.', { y: 6.5, h: 0.45 });
  return s;
});

// 28 · Recambio jul vs ago + por pabellón
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  RECAMBIO', title: 'El recambio neto mejora en la media y en la cola, no en la mediana', subtitle: 'Pares electivos adyacentes L–V en P2–P4 · neto = bruto menos el solapamiento con 12:30–14:00 · julio n = 125, agosto n = 141',
    notes: 'Julio queda en 125 pares con el export 787 (el PPT comparativo usó el export 683 con 126 pares: mediana bruta 24,5, neta 19,0, media bruta 44,9, media neta 29,3, P90 59,0); es una revisión de fuente, sin evidencia de un cambio asistencial. La mediana neta baja un minuto, la media neta baja 6,9 minutos y el P90 pasa de 59,4 a 43. La lectura debe conservar estas diferencias, sin reducir toda la distribución a "recambio mejoró". Agosto por sala: P2 21 pares (mediana neta 25), P3 73 (16), P4 47 (18); P2 aporta solo 21 pares y nueve fechas con primeros casos: revisar su combinación de prestaciones antes de concluir un problema propio de la sala. Sensibilidad: 121 pares con minutos hábiles registrados en ambos casos, media neta 19,2 y mediana 15.\n\n' + SRC.pdf + '\n' + SRC.enc });
  txt(s, 'JULIO VS AGOSTO · SERIE REVISADA (EXPORTS 787 Y 830)', 0.55, 1.88, 6, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Medida', 'Julio · 125 pares', 'Agosto · 141 pares'],
    ['Mediana bruta', '25,0 min', '25,0 min'],
    ['Mediana neta', '19,0 min', '18,0 min'],
    ['Media neta', '29,5 min', '22,6 min'],
    ['P90 neto', '59,4 min', '43,0 min'],
    ['Solapamiento con almuerzo', '32 h 43 min', '33 h 35 min'],
  ], { x: 0.55, y: 2.16, w: 5.95, colW: [2.55, 1.7, 1.7], fontSize: 11, rowH: 0.44, highlightCol: 2 });
  txt(s, 'AGOSTO POR PABELLÓN', 6.82, 1.88, 6, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Pabellón', 'Pares', 'Mediana bruta', 'Mediana neta', 'P90 neto', 'Almuerzo'],
    ['2', '21', '33 min', '25 min', '47,0 min', '6 h 49 min'],
    ['3', '73', '21 min', '16 min', '39,8 min', '14 h 55 min'],
    ['4', '47', '22 min', '18 min', '43,8 min', '11 h 51 min'],
    ['Conjunto', '141', '25 min', '18 min', '43,0 min', '33 h 35 min'],
  ], { x: 6.82, y: 2.16, w: 5.95, colW: [1.0, 0.7, 1.15, 1.15, 0.95, 1.0], fontSize: 10.5, rowH: 0.44, boldRows: [4] });
  statRow(s, pres, [
    { value: '18 min', label: 'MEDIANA NETA · AGOSTO', sub: '19 en julio · 16 en agosto 2025', valueSize: 20 },
    { value: '22,6 min', label: 'MEDIA NETA · AGOSTO', sub: '29,5 en julio · 27,7 en agosto 2025 · la más baja de 2026', color: C.GREEN, border: C.GREEN, valueSize: 20 },
    { value: '43 min', label: 'P90 NETO · AGOSTO', sub: '59,4 en julio · 68,2 en agosto 2025 · menos intervalos muy largos', color: C.GREEN, valueSize: 20 },
    { value: '25 min', label: 'MEDIANA NETA · PABELLÓN 2', sub: '16 en P3 y 18 en P4 · solo 21 pares: revisar mezcla antes de concluir', color: C.AMBER, valueSize: 20 },
  ], 4.75, 1.0);
  footnote(s, 'La medición reúne el intervalo completo entre pacientes: limpieza, montaje, traslado y cualquier espera. Para intervenir se necesitan marcas de inicio y término de esas tareas y una razón de espera; reducir un componente puede no acortar el total si el siguiente sigue bloqueado.', { y: 5.9, h: 0.55 });
  return s;
});

// 29 · Evolución del recambio
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  EVOLUCIÓN 2024–2026', title: 'Recambio 2024–2026: la mediana se mueve poco; la cola, mucho', subtitle: 'Pares electivos consecutivos P2–P4, L–V · mediana neta, media neta y P90 neto por mes · nov-2024 a ago-2026',
    notes: 'Durante 2025 la mediana mensual del recambio neto se mueve entre 14 y 21 min. El 5 de diciembre de 2024 refleja 66 encuentros de oftalmología entre semana en P2–P4; al excluir los 64 pares que la incluyen quedan 80 pares y la mediana neta sube a 18 min: el valor global de 5 min no es una referencia de eficiencia para otras prestaciones. Agosto de 2026 mejora frente a julio en la media y en el P90, con un cambio menor en la mediana; frente a agosto de 2025 la mediana aumenta dos minutos y la media disminuye unos cinco: reducción de intervalos largos más que desplazamiento uniforme. Descripción sin ajuste por mezcla ni atribución causal; línea punteada en jul-25: cambio de esquema histórico; sin datos del 13-ene al 29-abr de 2026.\n\n' + SRC.pdf });
  card(s, 0.55, 1.85, 8.35, 4.55, { pres });
  s.addChart(pres.charts.LINE, [
    { name: 'P90 neto', labels: REC.map(r => r[0]), values: REC.map(r => r[5]) },
    { name: 'Media neta', labels: REC.map(r => r[0]), values: REC.map(r => r[4]) },
    { name: 'Mediana neta', labels: REC.map(r => r[0]), values: REC.map(r => r[3]) },
  ], darkChart({ x: 0.65, y: 1.95, w: 8.15, h: 4.35, chartColors: [C.AMBER, C.BLUE2, C.TEAL], lineSize: 2, lineDataSymbol: 'circle', lineDataSymbolSize: 5, showLegend: true, valAxisMinVal: 0, valAxisMaxVal: 80, valAxisMajorUnit: 10, valAxisLabelFormatCode: '0" min"', catAxisLabelFontSize: 8, catAxisLabelRotate: -45 }));
  const x = 9.05, w = 3.72;
  kpi(s, pres, x, 1.85, w, 1.42, { value: '14–21 min', label: 'MEDIANA NETA · RANGO 2025', sub: 'ago-26: 18 · ago-25: 16 · dic-24 (5) refleja oftalmología entre semana, no eficiencia', valueSize: 22 });
  kpi(s, pres, x, 3.39, w, 1.42, { value: '43 min', label: 'P90 NETO · AGOSTO 2026', sub: 'el más bajo desde jul-25 (36) · ago-25: 68,2 · oct-25: 66,0', color: C.GREEN, border: C.GREEN, valueSize: 22 });
  kpi(s, pres, x, 4.93, w, 1.47, { value: '22,6 min', label: 'MEDIA NETA · AGOSTO 2026', sub: 'jun-26 28,8 · jul-26 29,5 · centro y extremos evolucionan distinto; hay cambio de sistema y de mezcla', color: C.GREEN, valueSize: 22 });
  footnote(s, '* Meses parciales (ene-26 hasta el día 12; may-26 desde el día 7). Las horas de almuerzo del anexo son sumas descriptivas de intervalos, no horas de capacidad recuperable. No se aísla el efecto de una política ni del cambio de software.', { y: 6.5, h: 0.45 });
  return s;
});

// 30 · Almuerzo y capacidad potencial
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  CONTINUIDAD', title: 'El almuerzo concentra 33 horas de intervalos medibles entre casos', subtitle: 'Coincidencia del recambio con la franja 12:30–14:00 · agosto · hipótesis para diseñar un piloto de cobertura, no cupos liberados',
    notes: 'En agosto, 2.015 min del intervalo entre pacientes coinciden con 12:30–14:00: 33 h 35 min, 38,8 % de los 5.199 min brutos de la cohorte (141 pares; 40 pares con algún solapamiento; 39 combinaciones de pabellón y día con solapamiento positivo en 20 fechas; mediana 43 min por pabellón-día incluyendo cero, 58 min entre los que sí tienen). Tramo continuo ≥ 60 min: 16 jornadas de pabellón en 12 fechas; ≥ 90 min: 2 jornadas en 1 fecha. El caso siguiente de los 141 pares tiene ocupación mediana de 94 min: 60 min es una hipótesis para casos cortos elegibles, no producción esperable. No convertir 33 h 35 en un número de cirugías dividiendo el total sin respetar continuidad. Julio: 1.963 min en 38 pares.\n\n' + SRC.pdf });
  kpi(s, pres, 0.55, 1.88, 2.95, 1.45, { value: '33 h 35', label: 'SOLAPAMIENTO · AGOSTO', sub: '2.015 min · 40 pares · 39 días-pabellón · julio 32 h 43', valueSize: 28 });
  kpi(s, pres, 3.64, 1.88, 2.95, 1.45, { value: '38,8 %', label: 'DEL RECAMBIO BRUTO', sub: 'de los 5.199 min brutos de la cohorte de 141 pares', valueSize: 28 });
  kpi(s, pres, 6.73, 1.88, 2.95, 1.45, { value: '16', label: 'JORNADAS CON TRAMO ≥ 60 MIN', sub: 'en 12 fechas · ≥ 90 min: 2 jornadas en 1 fecha', color: C.AMBER, valueSize: 28 });
  kpi(s, pres, 9.82, 1.88, 2.95, 1.45, { value: '94 min', label: 'OCUPACIÓN MEDIANA DEL CASO SIGUIENTE', sub: 'un bloque de 60 min supone casos cortos elegibles', valueSize: 28 });
  txt(s, 'ESCENARIO DE CAPACIDAD · BLOQUES COMPLETOS POR INTERVALO CONTINUO', 0.55, 3.55, 7.2, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Bloque completo por caso', '50 % recuperable', '75 % recuperable', '100 % recuperable'],
    ['60 min', '0', '4', '16'],
    ['90 min', '0', '0', '2'],
    ['120 min', '0', '0', '0'],
  ], { x: 0.55, y: 3.83, w: 7.2, colW: [2.4, 1.6, 1.6, 1.6], fontSize: 11, rowH: 0.42, aligns: ['left', 'center', 'center', 'center'] });
  note(s, pres, 7.95, 3.55, 4.82, 2.0, { title: '◆  PILOTO DE COBERTURA ESCALONADA', body: 'Cuatro semanas en jornadas seleccionadas, manteniendo descansos efectivos. Registrar por intervalo: sala lista, paciente listo, disponibilidad del equipo, causa del bloqueo y hora de reanudación. Comparar hora final de tabla, carga de trabajo y casos completados, además del recambio bruto y neto.', border: C.TEAL, titleColor: C.TEAL2, bodySize: 10 });
  note(s, pres, 0.55, 5.62, 12.22, 0.8, { title: null, body: [{ text: 'Son escenarios teóricos, no cirugías comprometidas. ', options: { bold: true, color: C.TEXT } }, { text: 'Una intervención adicional necesita bloque continuo, paciente preparado, equipo, instrumental y recuperación disponibles. Los tramos de 60 o 90 min son ventanas observadas para explorar; no se suman fragmentos de salas o días distintos.' }], border: C.AMBER, bodySize: 10.5 });
  return s;
});

// 31 · Ocupación por etapas
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  OCUPACIÓN', title: 'Ocupación completa: lo que importa para programar', subtitle: 'Encuentros electivos L–V de agosto · minutos por etapa · cada etapa se calcula por encuentro con su denominador válido',
    notes: 'En agosto, los encuentros electivos de lunes a viernes tienen mediana de ocupación de 100,5 min; la mediana de IQ de la subcohorte válida es 54 min. La diferencia entre medianas no debe interpretarse como la mediana de preparación y salida. El fin de semana concentra encuentros mucho más breves (mediana 9 min): mezclarlos con la actividad habitual puede reducir la media mensual sin que cambie la eficiencia de una cirugía comparable. La hora del último caso no equivale al cierre de la jornada disponible; no se estima utilización de capacidad instalada dividiendo por un horario supuesto. Recuperación: 484 de 640 encuentros con ambos horarios; 157 intervalos iguales a cero y 13 negativos; 312 positivos con mediana 62,5 min (subcohorte descriptiva).\n\n' + SRC.pdf });
  table(s, [
    ['Etapa · agosto electivo L–V', 'n válido', 'Mediana', 'Media', 'P90'],
    ['Ocupación de quirófano (ingreso a salida)', '202', '100,5 min', '116,3 min', '208,4 min'],
    ['Incisión a término quirúrgico (IQ)', '196', '54,0 min', '66,6 min', '136,0 min'],
    ['Ingreso a anestesia', '198', '12,0 min', '15,7 min', '29,0 min'],
    ['Anestesia a incisión', '198', '18,0 min', '20,5 min', '33,6 min'],
    ['Término de IQ a salida', '197', '13,0 min', '14,8 min', '23,4 min'],
  ], { x: 0.55, y: 1.88, w: 7.6, colW: [3.4, 0.95, 1.05, 1.05, 1.15], fontSize: 10.5, rowH: 0.46, highlightCol: 2 });
  txt(s, 'EL PROMEDIO GLOBAL CAMBIA CON LA MEZCLA', 0.55, 4.8, 7, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Agosto · electivos', 'Encuentros', 'Ocupación válida', 'Mediana', 'Media'],
    ['Lunes a viernes', '202', '202', '100,5 min', '116,3 min'],
    ['Fin de semana', '232', '231', '9,0 min', '9,5 min'],
  ], { x: 0.55, y: 5.08, w: 7.6, colW: [2.2, 1.2, 1.5, 1.35, 1.35], fontSize: 10.5, rowH: 0.42 });
  const x = 8.35, w = 4.42;
  kpi(s, pres, x, 1.88, w, 1.35, { value: '100,5 min', label: 'OCUPACIÓN MEDIANA · L–V', sub: 'incluye preparación y salida; la IQ mediana es 54 min y su diferencia no es la mediana de las etapas', valueSize: 24 });
  kpi(s, pres, x, 3.35, w, 1.35, { value: '62,5 min', label: 'RECUPERACIÓN · MEDIANA (n = 312)', sub: '484 de 640 con ambos horarios; 157 en cero y 13 negativos: cohorte por definir antes de programar con ella', color: C.AMBER, valueSize: 24 });
  note(s, pres, x, 4.82, w, 1.6, { title: '◆  SIN BLOQUE DOTADO NO HAY UTILIZACIÓN', body: 'Para medir utilización y sobretiempo falta reconstruir el bloque efectivamente dotado y la hora final programada. No se estima ocupación de capacidad instalada dividiendo por un horario supuesto.', border: C.TEAL, titleColor: C.TEAL2, bodySize: 9.5 });
  footnote(s, 'Los denominadores varían por hitos ausentes o incoherentes. La ocupación histórica informada excedía en exactamente 20 min el intervalo ingreso–salida en 8.713 de 8.714 encuentros; el informe recalcula desde los relojes de quirófano.', { y: 6.5, h: 0.45 });
  return s;
});

// 32 · Prestaciones y especialidad
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  PRESTACIONES', title: 'Las prestaciones muestran necesidades de pabellón muy diferentes', subtitle: 'Junio a agosto de 2026 · electivos y urgencias · minutos de ingreso a salida · diez propuestas más frecuentes del nuevo sistema',
    notes: 'El cuadro conserva la intervención propuesta del nuevo sistema y resume junio a agosto de 2026; describe encuentros registrados y no constituye una recomendación de duración para una persona. Una propuesta puede agrupar variación de técnica, complejidad o procedimientos asociados; el P90 no es un tiempo garantizado ni compara equipos. La ausencia del campo especialidad (jun 79,8 %, jul 67,9 %, ago 74,7 % sin especialidad) impide un ranking longitudinal fiable por especialidad; servicio clínico del sistema antiguo y especialidad del nuevo no se equiparan automáticamente. Para el tablero definitivo se necesita una clasificación institucional versionada de prestación y especialidad.\n\n' + SRC.pdf });
  table(s, [
    ['Propuesta de intervención', 'n total', 'n con tiempo', 'Ocupación mediana', 'P90'],
    ['Facoéresis con lente intraocular', '442', '439', '11,0 min', '14,0 min'],
    ['Cesárea', '114', '113', '75,0 min', '96,4 min'],
    ['Colecistectomía videolaparoscópica', '90', '89', '107,0 min', '155,2 min'],
    ['Apendicectomía o drenaje apendicular', '68', '68', '90,5 min', '128,6 min'],
    ['Laparotomía exploradora y variantes', '47', '47', '132,0 min', '240,0 min'],
    ['Drenaje percutáneo o endoscópico de hidronefrosis', '38', '38', '70,0 min', '109,3 min'],
    ['Aspiración manual endouterina', '37', '36', '31,5 min', '48,0 min'],
    ['Gastroduodenoscopía', '28', '28', '47,5 min', '98,4 min'],
    ['Colangiopancreatografía retrógrada', '26', '26', '83,0 min', '126,0 min'],
    ['Osteosíntesis metacarpiana o falángica', '22', '22', '81,5 min', '128,7 min'],
  ], { x: 0.55, y: 1.88, w: 8.1, colW: [3.9, 0.9, 1.15, 1.2, 0.95], fontSize: 10, rowH: 0.385, highlightCol: 3 });
  const x = 8.85, w = 3.92;
  kpi(s, pres, x, 1.88, w, 1.5, { value: '11 → 132', label: 'MINUTOS MEDIANOS · FACO A LAPAROTOMÍA', sub: 'doce veces de diferencia entre la prestación más breve y la más larga del top-10', valueSize: 24 });
  kpi(s, pres, x, 3.5, w, 1.5, { value: '74,7 %', label: 'ENCUENTROS SIN ESPECIALIDAD · AGOSTO', sub: 'jun 79,8 % · jul 67,9 % · el campo no permite un ranking longitudinal por especialidad', color: C.AMBER, border: C.AMBER, valueSize: 24 });
  note(s, pres, x, 5.12, w, 1.3, { title: '◆  CLASIFICACIÓN VERSIONADA', body: 'El tablero definitivo necesita una clasificación institucional de prestación y especialidad, preservando los casos sin clasificación.', border: C.TEAL, titleColor: C.TEAL2, bodySize: 9.5 });
  footnote(s, 'Una propuesta puede agrupar variación de técnica, complejidad o procedimientos asociados. No se interpreta el P90 como tiempo garantizado ni se comparan equipos. Sin recomendación de duración para una persona.', { y: 6.5, h: 0.45 });
  return s;
});

// 33 · Tablero SITGEQ
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  TABLERO', title: 'Indicadores del escritorio SITGEQ de agosto frente a julio', subtitle: 'Valores y variaciones mostrados por el tablero · pabellones de tipo electivo 2–4 · sus cohortes y fórmulas difieren de este análisis',
    notes: 'Valores observados en el escritorio, no recalculados aquí. No reconstruir valores absolutos de julio con porcentajes redondeados. El recambio de 14 minutos usa la definición del tablero; el neto de 22,6 minutos (media) y 18 (mediana) de este análisis descuenta solo 12:30–14:00 a los pares L–V. El retraso observado de 12 minutos concuerda con 11,76 minutos de diferencia positiva de ingreso respecto de las 08:00 en los primeros casos de agosto. La ocupación cae en la comparación relativa; el título no afirma una mejora uniforme. No se adoptan umbrales de la interfaz como metas institucionales.\n\n' + SRC.sit });
  table(s, [
    ['Indicador del escritorio', 'Agosto', 'Variación vs julio', 'Equivalente en este análisis'],
    ['Ocupación', '91,7 %', '−3,7 %', 'Sin bloque dotado no se calcula utilización'],
    ['Producción por día', '14,6', '+53,7 %', '452 encuentros / 31 días (pabellones 2–4)'],
    ['Suspensión de agenda', '7,5 %', '−45,7 %', 'Monitoreo hábil 1,32 % · registro operativo 38'],
    ['Retraso de primer ingreso', '12 min', '−53,2 %', 'Diferencia media positiva vs 08:00: 11,8 min'],
    ['Recambio según tablero', '14 min', '−58,8 %', 'Neto L–V: mediana 18 · media 22,6 min'],
    ['Programadas normales + condicionales', '491', '+27,5 %', 'Monitoreo L–V: 152 normales + 18 condicionales'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [3.3, 1.3, 1.9, 5.72], fontSize: 11, rowH: 0.46, highlightCol: 1 });
  note(s, pres, 0.55, 5.35, 12.22, 1.05, { title: null, body: [{ text: 'Las variaciones son relativas de la interfaz. ', options: { bold: true, color: C.TEXT } }, { text: 'Producción, suspensión, recambio y retraso aplican filtros y definiciones propias del tablero (encuentros finalizados de cualquier modalidad; filtros electivos para suspensión, recambio y retraso). No se adoptan sus umbrales como metas institucionales ni se mezclan sus cohortes con las del monitoreo.' }], border: C.AMBER, bodySize: 10.5 });
  return s;
});

// 34 · Evaluación local de algoritmos
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  INTELIGENCIA ARTIFICIAL', title: 'Algoritmos: útiles para ocupación, no para recambio', subtitle: 'Entrenamiento mayo–junio · validación julio · prueba agosto · error absoluto medio (MAE) en minutos · sin uso operativo',
    notes: 'Comparación retrospectiva con datos de SITGEQ; la serie antigua queda fuera del entrenamiento. Objetivos: ocupación electiva (799 / 231 / 433), duración IQ (769 / 225 / 427) y recambio neto P2–P4 L–V (248 / 125 / 141). Julio selecciona Ridge para ocupación (MAE 36,3); en agosto su MAE es 21,8 min frente a 23,1 de la mediana por propuesta: diferencia −1,3 min con intervalo exploratorio de −4,7 a +1,2. La MLP obtiene 20,3 en agosto, pero ese resultado descriptivo no autoriza a sustituir la selección hecha con julio. Ridge en L–V: MAE 41,8 (referencia 46,1); fin de semana 4,3 (3,1): la mezcla de prestaciones breves mejora el indicador global. 68 de 433 propuestas no estaban en el entrenamiento y 73 tenían 1–4 ejemplos; 20,3 % de subestimación > 30 min en L–V. Para recambio gana la mediana global (14,1) en julio y agosto: las características de la prestación no capturan sala lista, paciente listo, traslado, instrumental o cobertura. Semilla 20260906; Ridge α = 10; bosque 200 árboles; MLP 32–16.\n\n' + SRC.pdf });
  txt(s, 'PREDICCIÓN DE OCUPACIÓN DE PABELLÓN · MAE EN MINUTOS', 0.55, 1.88, 7, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Método', 'MAE julio', 'MAE agosto', 'P90 error ago', 'Sesgo ago'],
    ['Mediana global', '73,7', '52,5', '100,8', '−17,3'],
    ['Mediana por propuesta', '43,0', '23,1', '62,3', '−12,9'],
    ['Ridge (seleccionado en julio)', '36,3', '21,8', '58,2', '+2,0'],
    ['Bosque aleatorio', '39,9', '22,5', '65,0', '+4,4'],
    ['Potenciación de árboles', '40,8', '22,8', '65,3', '+4,2'],
    ['Red neuronal MLP', '37,3', '20,3', '48,6', '−5,2'],
  ], { x: 0.55, y: 2.16, w: 7.35, colW: [2.75, 1.1, 1.2, 1.2, 1.1], fontSize: 10.5, rowH: 0.4, boldRows: [3], highlightCol: 2 });
  txt(s, 'DURACIÓN IQ Y RECAMBIO · MAE AGOSTO', 0.55, 5.02, 7, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Método', 'IQ (n = 427)', 'Recambio (n = 141)'],
    ['Mediana global', '27,2', { text: '14,1', options: { color: C.GREEN, bold: true } }],
    ['Mediana por propuesta', '17,7', '14,7'],
    ['Ridge · MLP', '17,5 · 16,2', '15,7 · 17,9'],
  ], { x: 0.55, y: 5.3, w: 7.35, colW: [2.75, 2.3, 2.3], fontSize: 10, rowH: 0.3 });
  const x = 8.1, w = 4.67;
  note(s, pres, x, 1.88, w, 1.42, { title: 'OCUPACIÓN · RIDGE 21,8 VS 23,1 MIN', body: 'Ventaja de −1,3 min sobre la mediana por propuesta, con intervalo exploratorio de −4,7 a +1,2: la superioridad no está establecida. En L–V el MAE llega a 41,8 min; el fin de semana (4,3) mejora el promedio.', border: C.TEAL, titleColor: C.TEAL2, bodySize: 9.5 });
  note(s, pres, x, 3.42, w, 1.42, { title: 'RECAMBIO · GANA LA CONSTANTE DE 19 MIN', body: 'Una predicción constante obtiene MAE 14,1; red neuronal, árboles y Ridge rinden peor. Las características de la prestación no capturan sala lista, paciente listo, traslado, instrumental ni cobertura efectiva.', border: C.AMBER, titleColor: C.AMBER, bodySize: 9.5 });
  note(s, pres, x, 4.96, w, 1.46, { title: 'LÍMITE DECISIVO', body: 'El export muestra el estado final de las categorías, no la agenda congelada al programar; 68 de 433 propuestas no estaban en el entrenamiento. Prueba exploratoria: repetir con capturas prospectivas de agenda.', border: C.GRAY, titleColor: C.TEXT2, bodySize: 9.5 });
  footnote(s, 'Menor MAE es mejor. Sesgo = predicción menos tiempo real (negativo = subestimación). Con Ridge, 20,3 % de los casos L–V se subestima por más de 30 min. Sin uso operativo ni aplicación a decisiones clínicas.', { y: 6.5, h: 0.45 });
  return s;
});

// 35 · Información que falta
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  REGISTRO OPERABLE', title: 'Lo que falta registrar para explicar esperas y suspensiones', subtitle: 'Datos nuevos por momento del proceso · registro breve, ligado a tareas observables, con "sin causa determinada" disponible',
    notes: 'El registro debe ser breve y ligado a tareas observables. Se propone un catálogo reducido de motivos, con "sin causa determinada" disponible, y marcas de tiempo que no se modifiquen retroactivamente sin conservar la versión. La ausencia de un dato debe permanecer diferenciada de un valor cero. Prioridad de julio (registro operable): campos evento raíz, anticipación (día previo vs mismo día), pabellón, especialidad y reprogramación efectiva; en agosto el registro llegó con 18 causales vacías y sin esos campos. Una captura consistente de hitos puede aportar más valor inicial que añadir capas a la red neuronal.\n\n' + SRC.pdf });
  table(s, [
    ['Momento', 'Dato nuevo', 'Qué pregunta resuelve'],
    ['Cierre de tabla', 'Versión de agenda, orden previsto, ocupación estimada y hora de inicio acordada', 'Distinguir desviación real de horario de una comparación contra 08:00'],
    ['Antes del primer caso', 'Paciente listo, sala lista, traslado solicitado y llegada', 'Separar preparación y transporte de la fase dentro de quirófano'],
    ['Entre pacientes', 'Inicio y fin de limpieza, montaje completo y autorización de ingreso', 'Localizar la etapa que determina el recambio total'],
    ['Durante almuerzo', 'Cobertura efectiva por función, descanso, bloqueo y reanudación', 'Cuantificar cuánto cambia el flujo al disponer de relevo'],
    ['Salida y recuperación', 'Criterios de egreso, cama disponible y traslado completado', 'Distinguir recuperación clínica de espera de salida'],
    ['Programación y resultado', 'ID de episodio, altas y bajas de agenda, causal, momento de suspensión, evento raíz, anticipación, pabellón, especialidad y reprogramación efectiva', 'Denominadores por calendario y por causa sin sumar fuentes incompatibles'],
    ['Disponibilidad del pabellón', 'Bloques dotados, restricciones de equipo e instrumental y capacidad URPA', 'Calcular utilización y simular agenda dentro de límites reales'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [2.3, 5.4, 4.52], fontSize: 10, rowH: 0.5, boldFirstCol: true });
  footnote(s, 'La propuesta no requiere empezar por vídeo ni por un sistema complejo. El registro de suspensiones de agosto llegó con 18 causales vacías y sin evento raíz, anticipación, pabellón ni reprogramación: son los campos comprometidos en julio.', { y: 6.15, h: 0.5 });
  return s;
});

// 36 · Traspaso HPMM
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  TRASPASO HPMM', title: 'El traspaso amplifica la tasa que se sostenga', subtitle: 'Escalamiento de 3 a 7 pabellones electivos sobre 250 jornadas hábiles/año · suspensiones esperadas por escenario · distribución binomial',
    notes: `Proyección binomial con el volumen de programadas normales L–V por año de cada escenario (2.308 con 3 pabellones; 5.387 con 7, mismos volúmenes que la simulación de julio) y la tasa de cada escenario: 2025 (9,38 %), histórica de 20 meses ene-25–ago-26 (7,61 %), ene–ago 2026 (5,04 %) y trimestre jun–ago 2026 (1,23 %). P5–P95 = percentiles 5 y 95 de la binomial. No incorpora estacionalidad ni cambio de mezcla. Sep–dic 2026: 734 programadas hábiles (media mensual 2026 de 184 × 4). Condiciones del escalamiento: capacidad de URPA y camas (solicitud del 24-ago de uso de camas CMA y Corta Estadía como salas mixtas) y pabellón de urgencia separado (urgencia mayor +14,1 % interanual).\n\n` + SRC.mon + '\n' + SRC.jul });
  const P = S.proy;
  const row = (k, label) => [label, P[k].n.toLocaleString('de-DE'), String(P[k].esperado), `${P[k].p5} – ${P[k].p95}`];
  table(s, [
    ['Escenario', 'Prog./año', 'Susp./año', 'P5 – P95'],
    row('actual_3pab|2025_9.38', 'Actual · 3 pab., tasa 2025 (9,38 %)'),
    row('actual_3pab|jun_ago_2026', 'Actual · 3 pab., tasa jun–ago 2026 (1,23 %)'),
    row('hpmm_7pab|2025_9.38', 'HPMM · 7 pab., tasa 2025 sin intervención'),
    row('hpmm_7pab|hist_ene25_ago26', 'HPMM · 7 pab., tasa histórica 20 m (7,61 %)'),
    row('hpmm_7pab|2026_ene_ago', 'HPMM · 7 pab., tasa ene–ago 2026 (5,04 %)'),
    row('hpmm_7pab|jun_ago_2026', 'HPMM · 7 pab., desempeño jun–ago sostenido (1,23 %)'),
  ], { x: 0.55, y: 1.88, w: 7.5, colW: [3.9, 1.2, 1.2, 1.2], fontSize: 10.5, rowH: 0.44, boldRows: [6], highlightCol: 2 });
  const x = 8.25, w = 4.52;
  kpi(s, pres, x, 1.88, w, 1.5, { value: String(P['hpmm_7pab|2025_9.38'].esperado - P['hpmm_7pab|jun_ago_2026'].esperado), label: 'PACIENTES EVITADOS / AÑO', sub: `frente al escenario sin intervención (${P['hpmm_7pab|2025_9.38'].esperado} → ${P['hpmm_7pab|jun_ago_2026'].esperado} suspensiones esperadas al sostener 1,23 %)`, color: C.TEAL2, border: C.TEAL, valueSize: 32 });
  const E = S.esp_sep_dic;
  txt(s, `SUSPENSIONES ESPERADAS SEP–DIC 2026 · ${S.n_sep_dic} PROGRAMADAS HÁBILES · SEGÚN LO QUE SE CONSOLIDE`, x, 3.55, w, 0.4, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1, valign: 'middle' });
  statRow(s, pres, [
    { value: String(E.jun_ago['0.5']), label: 'OPTIMISTA', sub: `se sostiene 1,23 % · ${E.jun_ago['0.05']}–${E.jun_ago['0.95']}`, color: C.GREEN, border: C.GREEN },
    { value: String(E.planificar_4['0.5']), label: 'CENTRAL', sub: `regresión a 4,0 % · ${E.planificar_4['0.05']}–${E.planificar_4['0.95']}`, color: C.AMBER, border: C.AMBER },
    { value: String(E['2025']['0.5']), label: 'CONSERVADOR', sub: `retorno a 9,38 % · ${E['2025']['0.05']}–${E['2025']['0.95']}`, color: C.RED, border: C.RED },
  ], 4.0, 1.0, x, w, 0.1);
  note(s, pres, 0.55, 5.15, 7.5, 1.27, { title: '◆  CON LA TASA HISTÓRICA, HPMM PRODUCIRÍA 410 SUSPENSIONES AL AÑO', body: `Más que las 274 acumuladas en los 20 meses analizados. Sostener el régimen jun–ago (66 esperadas) o incluso el de 2026 (${P['hpmm_7pab|2026_ene_ago'].esperado}) depende de lo que se institucionalice antes del traslado, no del edificio.`, border: C.RED, titleColor: C.RED, bodySize: 10 });
  note(s, pres, x, 5.15, w, 1.27, { title: '◆  CONDICIONES DEL ESCALAMIENTO', body: 'Capacidad de URPA y camas (solicitud del 24-ago: salas mixtas en CMA y Corta Estadía), pabellón de urgencia separado (urgencia +14,1 %) y dotación de enfermería de los lunes.', border: C.AMBER, titleColor: C.AMBER, bodySize: 10 });
  footnote(s, 'Distribución binomial con el volumen del escenario; P5–P95 = percentiles 5 y 95. No incorpora estacionalidad ni cambio de mezcla. Volúmenes por pabellón iguales a la simulación de julio.', { y: 6.55, h: 0.4 });
  return s;
});

// 37 · Cierre
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  CIERRE', title: 'Resumen agosto · Plan operativo septiembre', subtitle: 'Línea base enero–agosto y prioridades para sostener el régimen bajo y cerrar el dato antes del traslado al HPMM',
    notes: 'Agosto sostiene el régimen bajo (1,32 %, tercer mes bajo el límite inferior de control) con un registro operativo que aún no explica la mitad de sus eventos. Prioridades: completar la causal (18 sin causal, por jornada oftalmológica); blindar las tablas del lunes (6 de 19 registros L–V, 2 de 2 MINSAL, tres lunes sin enfermera en Pabellón 2); auditar el error de programación (7, con 3 mayores directas que no figuran en el monitoreo); consentimiento y ayuno antes de la tabla (medida del 31-ago aprobada el 2-sep; reunión del 4-sep); registro operable y piloto de continuidad (campos comprometidos en julio; piloto de cobertura de almuerzo de cuatro semanas con hitos de sala, paciente y URPA). Cada prioridad requiere responsable y plazo acordados en el comité.' });
  txt(s, 'ENE–AGO 2026  ·  LÍNEA BASE', 0.55, 1.88, 5.5, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  table(s, [
    ['Programadas Cx mayor hábil', '1.469'],
    ['Suspensiones MINSAL · tasa hábil', '74 · 5,04 % (2025: 133 · 9,83 %)'],
    ['Agosto — tasa hábil', '1,32 % · agosto 2025: 12,11 %'],
    ['Control estadístico', '3 meses bajo −3σ · quiebre feb-26 · 70 evitadas vs 2025'],
    ['Registro completo agosto', '38 eventos · 18 sin causal · 10 evitables'],
    ['CME hábil ene–ago · interanual', '1.880 · +13,5 % · urgencia +14,1 %'],
    ['Pabellón-días L–V agosto', '51 de 63 (P2 solo 9 días) · 3,9 CME por pabellón-día'],
    ['Recambio neto agosto', 'mediana 18 · media 22,6 · P90 43 min'],
    ['Primer caso agosto', 'ingreso 07:55 · incisión 08:45 · 62,7 % ≤ 09:00'],
  ], { x: 0.55, y: 2.16, w: 5.5, colW: [2.85, 2.65], fontSize: 10.5, rowH: 0.42, boldFirstCol: false, highlightCol: 1 });
  txt(s, 'PRIORIDADES SEPTIEMBRE  ·  RESPONSABLE Y PLAZO A ACORDAR EN EL COMITÉ', 6.35, 1.88, 6.4, 0.24, { fontSize: 8.5, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  const pr = [
    ['01  COMPLETAR LA CAUSAL DEL REGISTRO', '18 de 38 sin causal (17 oftalmológicas de fin de semana): registrar por jornada, con "sin causa determinada" disponible y evento raíz.', C.AMBER],
    ['02  BLINDAR EL LUNES Y RECUPERAR EL PABELLÓN-DÍA', '6 de 19 registros L–V y 2 de 2 MINSAL en lunes; Pabellón 2 operó 9 de 21 días (12 pabellón-días perdidos ≈ 48 electivos). Confirmación el viernes PM y dotación de enfermería asegurada.', C.RED],
    ['03  AUDITAR EL ERROR DE PROGRAMACIÓN', '7 registros (3 mayores directas: 20, 28 y 31). Separar error de agenda (UPPQ) de indicación o insumo (unidad quirúrgica) y conciliar con el monitoreo.', C.RED],
    ['04  CONSENTIMIENTO Y AYUNO ANTES DE LA TABLA', 'Medida del 31-ago vigente (sin consentimiento firmado no hay tabla; aprobada el 2-sep). Cerrar el flujo de ayuno acordado el 4-sep.', C.TEAL],
    ['05  REGISTRO OPERABLE Y PILOTO DE CONTINUIDAD', 'Campos comprometidos en julio (evento raíz, anticipación, pabellón, especialidad, reprogramación) y piloto de cobertura de almuerzo de 4 semanas con hitos de sala, paciente y URPA.', C.TEAL],
  ];
  pr.forEach((p, k) => {
    const y = 2.16 + k * 0.84;
    card(s, 6.35, y, 6.42, 0.76, { pres, border: p[2], borderW: 1.1 });
    txt(s, p[0], 6.5, y + 0.07, 6.15, 0.24, { fontSize: 10, bold: true, color: C.TEXT, valign: 'middle' });
    txt(s, p[1], 6.5, y + 0.31, 6.15, 0.44, { fontSize: 8.8, color: C.TEXT3 });
  });
  footnote(s, 'Agosto sostiene el régimen bajo (1,32 %; 70 suspensiones menos que al ritmo de 2025) con un pabellón menos casi uno de cada cinco días y un registro que aún no explica la mitad de sus eventos: la tarea de septiembre es cerrar el dato, proteger el lunes y recuperar el pabellón-día antes del traslado al HPMM.', { y: 6.42, h: 0.55, fontSize: 10.5, color: C.TEXT3 });
  return s;
});

// 38 · Anexo · puente con julio
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  ANEXO · FUENTES', title: 'Anexo · puente con la presentación de julio', subtitle: 'La comparación principal se actualiza con la serie diaria homogénea y los exports revisados · las cifras de julio se recalculan desde las fuentes',
    notes: 'El PPT de julio es una referencia de estructura y estilo, pero sus cifras no se copian cuando existe una base homogénea actualizada. Su cifra de 191 CME L–V estaba expresada como estimación. El histórico actual registra 155 programadas y 214 CME L–V en julio. No explicar la diferencia por festivos: el 16 de julio tiene cero programadas y cero CME y no explica los 14 programados adicionales. El antiguo "cumplimiento de tabla" no se reproduce, porque numerador y cohorte no están homologados. Recambio de julio: 126 pares con el export 683 y 125 con el 787 (revisión de fuente). Agosto -15 y -16 coinciden en todas sus celdas verificadas.\n\n' + SRC.mon + '\n' + SRC.pdf });
  table(s, [
    ['Julio 2026', 'PPT de julio', 'Serie actual', 'Explicación'],
    ['Programadas normales de CME L–V', '141', '155', 'Archivo histórico diario -15 (serie homogénea)'],
    ['Suspendidas', '1', '1', 'Sin cambio'],
    ['Tasa hábil correspondiente', '0,71 %', '0,65 %', 'Mismo numerador, denominador actualizado'],
    ['CME realizadas L–V', '191 · estimadas', '214', 'La estimación se reemplaza por el dato'],
    ['CME realizadas todas las fechas', '285', '308', 'Julio completo en el archivo -15'],
    ['Cumplimiento de tabla', '124,1 %', 'No se reproduce', 'Numerador y cohorte no homologados'],
    ['Recambio · pares electivos L–V', '126 (export 683)', '125 (export 787)', 'Revisión de fuente; mediana neta 19 en ambos'],
    ['Media 18 meses previa (tasa hábil)', '8,23 % (promedio de tasas)', '7,89 % (suma / suma, 19 m)', 'Cambio de método: pooled en vez de promedio'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [3.3, 2.2, 2.4, 4.32], fontSize: 10.5, rowH: 0.44, highlightCol: 2 });
  footnote(s, 'No se atribuye la diferencia a una causa no demostrada. El informe de julio (docx) y el PPT de julio comparten las cifras 141 / 1 / 0,71 %; este comité usa la serie homogénea para todos los meses.', { y: 6.1, h: 0.5 });
  return s;
});

// 39 · Anexo · denominadores
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  ANEXO · SUSPENSIONES', title: 'Anexo · denominadores y cobertura de suspensión', subtitle: 'Resumen de poblaciones que no deben intercambiarse · agosto 2026',
    notes: 'El reporte operativo registra 19 suspensiones en fin de semana aunque el campo de monitoreo declare cero. El nuevo REM832 tiene otra clasificación de suspensiones: 1 hábil, 2 inhábil L–V y 1 fin de semana; se conserva como fuente diferenciada y no se utiliza para reemplazar el criterio L–V solicitado. No se presenta una tasa oficial MINSAL nueva. La tasa 18 / 251 queda descartada por no compartir fechas de eventos. La línea base REM 2025 (Estadística, 24-ago): 200 suspensiones / 2.872 programadas hábiles = 6,9 %, frente a 200 / 2.132 = 9,38 % del monitoreo: mismo numerador, distinto denominador; discrepancia en revisión.\n\n' + SRC.mon + '\n' + SRC.reg + '\n' + SRC.sit });
  table(s, [
    ['Medida', 'Valor', 'Denominador / alcance'],
    ['Hábil del monitoreo', '2', '152 normales CME · L–V'],
    ['Total calendario del monitoreo', '2', '385 normales CME · todo agosto'],
    ['Fin de semana del monitoreo', '0', '233 normales CME · su campo'],
    ['Reporte de suspensiones (5-sep)', '38', 'Conteo: 19 L–V + 19 fin de semana'],
    ['Oftalmología del reporte', '18', 'Conteo; sin cohorte de tasa validada'],
    ['REM832 nuevo', '4', '1 hábil · 2 inhábil L–V · 1 fin de semana'],
    ['Escritorio SITGEQ', '7,5 %', 'Tasa de su cohorte de agenda'],
    ['Línea base 2025 · monitoreo', '200 / 2.132 = 9,38 %', 'Programación normal L–V · serie homogénea'],
    ['Línea base 2025 · REM (Estadística)', '200 / 2.872 = 6,9 %', 'Horario hábil base REM · discrepancia en revisión'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [3.6, 2.6, 6.02], fontSize: 10.5, rowH: 0.42, highlightCol: 1 });
  footnote(s, 'El mismo numerador de 2025 (200) produce 9,38 % o 6,9 % según el denominador: la conciliación de programadas entre monitoreo y REM es previa a cualquier meta.', { y: 6.25, h: 0.45 });
  return s;
});

// 40 · Anexo · métodos
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  ANEXO · MÉTODOS', title: 'Anexo · métodos, sensibilidad y definiciones', subtitle: 'Reglas de cálculo de esta presentación · reproducibles desde las fuentes citadas en cada lámina',
    notes: 'Carta p: línea central 200 / 2.132 = 9,38 % (2025); límites p̄ ± 3·√(p̄(1−p̄)/n) con n = programadas normales L–V de cada mes. Fisher: prueba exacta bilateral sobre tablas 2×2 de suspendidas / no suspendidas. Binomial: percentiles 5, 50 y 95 de Bin(n, p). Evitabilidad: regla del analista de julio aplicada a la causal registrada. Sensibilidades temporales: julio tiene cuatro primeros electivos precedidos por urgencia (n = 56: ingreso 08:02, incisión 08:50, anestesia 08:25; incisión ≤ 09:00 35 / 56); agosto recambio con minutos hábiles en ambos casos n = 121, media 19,2, mediana 15.\n\n' + SRC.mon + '\n' + SRC.pdf });
  table(s, [
    ['Regla / definición', 'Aplicación en esta presentación'],
    ['Día hábil', 'Lunes a viernes por fecha del evento, sin descontar festivos. No equivale a turno contractual.'],
    ['Tasa hábil de suspensión', 'Suspendidas de programación normal de CME (N) / programadas normales (L), L–V. Acumulados: suma / suma, no promedio de tasas.'],
    ['Carta p', 'Línea central 9,38 % (2025). Límites ±3·√(p̄(1−p̄)/n) con el n de cada mes. Bajo el LCL: jun, jul y ago 2026.'],
    ['Pruebas estadísticas', 'Fisher exacta bilateral (2×2): jun–ago 2026 vs ene-25–may-26 p = 2,3·10⁻¹¹; ago-26 vs ago-25 p = 8,4·10⁻⁵; ene–ago 2026 vs 2025 p = 1,1·10⁻⁶.'],
    ['Evitabilidad (analista)', 'Evitable: error de programación, ayuno / exámenes, instrumental. Potencialmente: no presentación, infraestructura, falta de cirujano. No evitable: urgencia, enfermedad aguda, descompensación. Sin causal: no se clasifica.'],
    ['Primer caso principal', 'Primer encuentro real del día en P2–P4, electivo, L–V, ingreso desde 06:00. Julio n = 52 (sensibilidad n = 56 con urgencia previa); agosto n = 51.'],
    ['Recambio bruto y neto', 'Salida del anterior a ingreso del siguiente, misma fecha y pabellón, ambos electivos L–V; se excluyen negativos. Neto = bruto − intersección exacta con 12:30–14:00.'],
    ['Proyección HPMM', 'Binomial con 2.308 (3 pab.) y 5.387 (7 pab.) programadas/año; P5–P95. Sin estacionalidad ni cambio de mezcla.'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [2.6, 9.62], fontSize: 9.8, rowH: 0.5, boldFirstCol: true });
  return s;
});

// 41 · Anexo · fuentes
slides.push((pres, i, total) => {
  const s = baseSlide(pres, { num: i, total, kicker: '◆  NN  ·  ANEXO · FUENTES', title: 'Anexo · fuentes y trazabilidad', subtitle: 'Información agregada · notas de cada diapositiva con método y referencias · sin datos personales',
    notes: 'El archivo mantiene gráficos y tablas nativos editables. Se reutilizó el tema, tamaño y marco visual del comité de julio; el contenido corresponde a agosto de 2026 con la evidencia verificada de cada fuente. Presentado en el comité de septiembre de 2026.\n\n' + SRC.mon + '\n' + SRC.enc + '\n' + SRC.reg + '\n' + SRC.pdf + '\n' + SRC.sit + '\n' + SRC.jul });
  table(s, [
    ['Fuente', 'Uso en la presentación'],
    ['Monitoreo diario -15 (ene-2025 a ago-2026) y -16 (agosto)', 'Serie histórica homogénea de producción y suspensión L–V; carta p; interanual; agosto contrastado en 31 fechas × 119 columnas'],
    ['Informe de Suspensiones Mes Agosto 2026 (correo 2-sep): usuarios, especialidad, cirugías y quirófanos por rango, REM 21, dashboard', '38 registros operativos de agosto: causas, modalidad, calendario, evitabilidad'],
    ['Exports SITGEQ 787 y 830 (encuentros)', 'Tiempos de julio y agosto: primeros inicios, recambio, almuerzo, ocupación, especialidad y pabellón'],
    ['Informe "Evolución del proceso quirúrgico" (6-sep-2026)', 'Series 2024–2026 de recambio y primeros casos; ocupación por etapas; prestaciones; evaluación de algoritmos; información faltante'],
    ['REM832 · detalle de especialidad', 'Clasificación explícita de 403 / 405 CME realizadas'],
    ['Escritorio SITGEQ (5-sep) y correos de agosto', 'Indicadores del tablero y contexto de gestión (dotación, equipos, camas, consentimiento, ayuno)'],
    ['Comité Quirúrgico · Julio 2026 e informe de agosto (ene-25 a jul-26)', 'Estructura, regla de evitabilidad, línea base 2025, volúmenes de la proyección HPMM y puente de cifras'],
    ['SPC_Suspensiones_HQ (ene-2025 a abr-2026)', 'Referencia histórica del día de la semana (lunes 11,09 %)'],
  ], { x: 0.55, y: 1.88, w: 12.22, colW: [5.2, 7.02], fontSize: 9.8, rowH: 0.48, boldFirstCol: true });
  footnote(s, 'Preparado para discusión del comité. Validación institucional de clasificaciones y acuerdos en la instancia correspondiente. Los identificadores se usan solo para conciliar y no se incluyen en la presentación.', { y: 6.35, h: 0.5 });
  return s;
});

module.exports = { slides };
