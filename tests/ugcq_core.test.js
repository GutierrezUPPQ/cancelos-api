// Pruebas del motor de cierre UGCQ (datos ficticios). Ejecutar con: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../ugcq_core.js');
const fixtureTabla = require('./fixtures/tabla_pdf_items.json');

const col = (h) => { const i = U.ENCABEZADOS.indexOf(h); assert.ok(i >= 0, 'encabezado inexistente: ' + h); return i; };

// ── Exportaciones SITGEQ ficticias (mismas columnas que las reales) ──
const ENC_HDR = ['Fecha intervención', 'Servicio clínico', 'Especialidad', 'Pabellón', 'Tipo de cirugía', 'Intervención propuesta', 'Intervención realizada', 'Códigos intervención', 'Tipo de Anestesia', 'Diagnóstico(s)', 'Cód Diagnóstico(s)', 'Previsión', 'Nombre paciente', 'RUN / Identificación', 'Tipo', 'Cirugía Mayor', 'Cirugía Menor', 'Procedimiento', 'CMA', 'Reintervención', 'Edad', 'Sexo', 'Protocolo', 'Medico Cirujano', 'Primer Ayudante', 'Segundo Ayudante', 'Anestesiólogo', 'Auxiliar Anestesiólogo', 'Arsenalero', 'Pabellonero', 'Hora Ingreso Serv. Pabellón', 'Hora Ingreso Quirófano'];
const enc = (fecha, pab, tipoCx, nombre, run, tipo, hora, interv) => {
  const f = new Array(ENC_HDR.length).fill(null);
  Object.assign(f, { 0: fecha, 1: 'SERVICIO X', 3: pab, 4: tipoCx, 6: '[0000000] ' + interv, 12: nombre, 13: run, 14: tipo,
    15: tipo === 'Cirugía Mayor' ? 1 : 0, 16: tipo === 'Cirugía Menor' ? 1 : 0, 17: tipo === 'Procedimiento' ? 1 : 1, 31: hora });
  return f;
};
const AOA_ENC = [
  ['Encuentros quirúrgicos'], [], // títulos sobre el encabezado
  ENC_HDR,
  enc('17-03-2026', 'Pabellón 2', 'Electivo Normal', 'ANA LUIS ROSA JUAN', '15234567-4', 'Cirugía Mayor', '08:03', 'Cirugía A'),
  enc('17-03-2026', 'Pabellón 4', 'Electivo Condicional', 'SALAS CORTES RIOS FUENTES', '20111222-2', 'Cirugía Mayor', '08:08', 'Cirugía B'),
  enc('17-03-2026', 'Pabellón 4', 'Electivo Normal', 'MOLINA TORO URIBE YAÑEZ ZUÑIGA', 'S/I', 'Cirugía Mayor', '13:20', 'Cirugía C'),
  enc('17-03-2026', 'Pabellón 4', 'Electivo Condicional', 'PABLO SONIA RAUL RAUL', '16777888-7', 'Cirugía Mayor', '14:40', 'Cirugía D'),
  enc('17-03-2026', 'Pabellón 1 / Urgencia', 'Urgencia', 'PACIENTE URGENCIA UNO', '11111111-1', 'Cirugía Mayor', '11:20', 'Cirugía E'),
  enc('17-03-2026', 'Pabellón 1 / Urgencia', 'Urgencia', 'PACIENTE PROCEDIMIENTO UNO', '22222222-2', 'Procedimiento', '16:00', 'Endoscopía'),
  enc('17-03-2026', 'Pabellón 3', 'Electivo Normal', 'PACIENTE AGREGADO UNO', '5555555-5', 'Cirugía Mayor', '12:00', 'Cirugía F'),
  enc('17-03-2026', 'Pabellón 3', 'Electivo Normal', 'PACIENTE MENOR UNO', '8888888-8', 'Cirugía Menor', '15:00', 'Cirugía G'),
  enc(46099, 'Pabellón 2', 'Electivo Normal', 'Vera Rojas Campos', '12345678-5', 'Cirugía Mayor', 0.375, 'Cirugía H'), // 18-03-2026 como serial Excel; 09:00 como fracción
];
const SUS_HDR = ['RUT', 'NOMBRE', 'FECHA CIRUGÍA', 'SERVICIO CLÍNICO', 'CAUSAL MINSAL', 'DESCRIPCIÓN CAUSAL', 'GES', 'TIPO SOLICITUD', 'COD. INTERVENCIÓN PROPUESTA', 'DESCRIPCIÓN INTERVENCIÓN PROPUESTA', 'CIRUGÍA MAYOR', 'TIPO DE AGENDAMIENTO'];
const AOA_SUS = [
  SUS_HDR,
  ['9876543-3', 'NORA DE IVAN OLGA TOMAS', '17-03-2026', 'SERVICIO X', 'Paciente', 'No se presenta / No se ubica', 'NO', 'Ambulatorio', '1', 'Cirugía', 'Cirugía Mayor', 'DIRECTO'],
  ['33333333-3', 'PACIENTE SUSP PROCEDIMIENTO', '17-03-2026', 'SERVICIO X', 'Equipo Quirúrgico', 'Reemplazo por urgencia', 'NO', 'Hospitalizado', '2', 'Endoscopía', 'Procedimiento', 'DIRECTO'],
  ['4444444-4', 'PACIENTE SUSP MAYOR', '17-03-2026', 'SERVICIO X', 'Unidades de Apoyo Logístico', 'Instrumental incompleto o no disponible', 'NO', 'Hospitalizado', '3', 'Amputación', 'Cirugía Mayor', 'DIRECTO'],
  ['6666666-6', 'PACIENTE SUSP RARO', '17-03-2026', 'SERVICIO X', 'Categoría inventada', 'Motivo que no existe en UGCQ', 'NO', 'Hospitalizado', '4', 'Hernia', 'Cirugía Mayor', 'DIRECTO'],
];

const tabla = U.parsearTablaPDF(fixtureTabla.paginas, 'tabla.pdf');
const fuentes = {
  tabla: { cargada: true, filas: tabla.filas },
  encuentros: { cargado: true, filas: U.leerEncuentros(AOA_ENC, 'enc.xlsx') },
  suspensiones: { cargado: true, filas: U.leerSuspensiones(AOA_SUS, 'sus.xlsx') },
};
const DIA = '2026-03-17';
const pac = (r, run) => r.pacientes.find(p => p.run === run);

// ═══════════════ Utilidades ═══════════════
test('RUN: normaliza y valida dígito verificador', () => {
  assert.equal(U.runValido('15.234.567-4'), true);
  assert.equal(U.runValido('15234567-5'), false);
  assert.equal(U.runValido('17567375-K'), true);
  assert.equal(U.runValido('17567375-k'), true);
  assert.equal(U.fmtRun('015.234.567-4'), '15234567-4');
  assert.equal(U.identidad('15.234.567-4', 'X').key, U.identidad('15234567-4', 'Y').key);
  assert.equal(U.identidad('P123456', 'Juan Pérez').key, 'I:P123456');
  assert.equal(U.identidad('S/I', 'Juan Pérez').key, 'N:juan perez');
  assert.notEqual(U.identidad('S/I', 'Juan Pérez').key, U.identidad('S/I', 'Ana Soto').key);
});

test('Fechas: formatos de SITGEQ y Excel', () => {
  assert.equal(U.parseFecha('28-10-2026'), '2026-10-28');
  assert.equal(U.parseFecha('28/10/2026'), '2026-10-28');
  assert.equal(U.parseFecha('2026-10-28'), '2026-10-28');
  assert.equal(U.parseFecha(46323), '2026-10-28');
  assert.equal(U.parseFecha('31-02-2026'), null);
  assert.equal(U.parseFecha(''), null);
  assert.equal(U.fmtFecha('2026-03-07'), '07-03-2026');
  assert.equal(U.horaTexto(0.375), '09:00');
  assert.equal(U.horaTexto('15:40'), '15:40');
});

test('Semana UGCQ: calza con el reporte de octubre 2026 (sábado a viernes)', () => {
  const esperado = { '01': 39, '02': 39, '03': 40, '04': 40, '05': 40, '06': 40, '07': 40, '08': 40, '09': 40, 10: 41, 11: 41, 12: 41, 13: 41, 14: 41, 15: 41 };
  for (const [d, s] of Object.entries(esperado)) assert.equal(U.semanaUGCQ('2026-10-' + String(d).padStart(2, '0')), s, 'día ' + d);
});

// ═══════════════ Causales ═══════════════
test('Causales: cada columna UGCQ se reconoce a sí misma', () => {
  for (const c of U.CAUSAS) {
    const r = U.mapearCausal(c.categoria, c.encabezado.replace(/^\([^)]*\)\s*/, ''));
    assert.ok(r, c.encabezado);
    assert.equal(r.col, c.col, c.encabezado);
  }
});

test('Causales: textos de SITGEQ (completos) van a la columna truncada correcta', () => {
  assert.deepEqual(U.mapearCausal('Equipo Quirúrgico', 'Reemplazo por urgencia'), { col: col('(Equipo quirúrgico) Reemplazo por urgencia'), confianza: 'exacta' });
  assert.equal(U.mapearCausal('Unidades de Apoyo Logístico', 'Instrumental incompleto o no disponible').col, col('(Unidades de apoyo logístico) Instrumental incompleto o no dis'));
  assert.equal(U.mapearCausal('Equipo Quirúrgico', 'Falta / Disponibilidad de Técnico de enfermería').col, col('(Equipo quirúrgico) Falta / Disponibilidad de Técnico de enfe'));
  assert.equal(U.mapearCausal('Paciente', 'No se presenta / No se ubica').col, col('(Paciente) No se presenta / No se ubica'));
  assert.equal(U.mapearCausal('Paciente', 'No se presenta').col, col('(Paciente) No se presenta'));
  assert.equal(U.mapearCausal('Administrativas', 'No se presenta').col, col('(Administrativas) No se presenta'));
  assert.equal(U.mapearCausal('Paciente', 'Atraso en el ingreso').col, col('(Paciente) Atraso en el ingreso '));
  assert.equal(U.mapearCausal('Categoría inventada', 'Motivo que no existe en UGCQ'), null);
});

// ═══════════════ Tabla quirúrgica (PDF) ═══════════════
test('Tabla PDF: lee fecha, pacientes, RUN partido en dos líneas y agendamiento', () => {
  assert.equal(tabla.fecha, DIA);
  assert.deepEqual(tabla.avisos, []);
  assert.equal(tabla.filas.length, 7);
  assert.deepEqual(tabla.filas.map(f => f.run), ['15234567-4', '9876543-3', '12345678-5', '7654321-6', '20111222-2', '6543210-2', '16777888-7']);
  assert.deepEqual(tabla.filas.map(f => f.agend), ['NORMAL', 'NORMAL', 'NORMAL', 'CONDICIONAL', 'NORMAL', 'NORMAL', 'CONDICIONAL']);
  assert.deepEqual(tabla.filas.map(f => f.pabellon), ['Pabellón 2', 'Pabellón 2', 'Pabellón 2', 'Pabellón 2', 'Pabellón 4', 'Pabellón 4', 'Pabellón 4']);
  assert.deepEqual(tabla.filas.map(f => f.hora), ['08:00', '11:20', '14:00', '15:30', '08:00', '14:00', '15:45']);
  assert.equal(tabla.filas[0].nombre, 'ANA LUIS ROSA JUAN');
  assert.equal(tabla.filas[3].agendamiento, 'Electivo Condicional');
  assert.equal(tabla.filas[0].tiempo, 180);
  for (const f of tabla.filas) assert.ok(U.runValido(f.run), f.run);
});

test('Tabla PDF: observaciones con línea de continuación y fila en la página 2', () => {
  const urrea = tabla.filas[4];
  assert.match(urrea.obs, /^PREPARACION EN CMA/);
  assert.match(urrea.obs, /CONTINUACION DE OBSERVACIONES DE PRUEBA/);
  assert.equal(tabla.filas[5].pagina, 2);
  assert.match(tabla.filas[5].obs, /SUSPENDIDO 03\/03\/26/);
});

test('Tabla PDF: un archivo que no es tabla no inventa pacientes', () => {
  const r = U.parsearTablaPDF([{ items: [{ str: 'Otro documento', x: 10, y: 500, w: 80 }] }], 'otro.pdf');
  assert.equal(r.filas.length, 0);
  assert.ok(r.avisos.length >= 1);
});

// ═══════════════ Planillas ═══════════════
test('Planillas: detecta el tipo y lee encuentros con títulos sobre el encabezado', () => {
  assert.equal(U.detectarTipoPlanilla(AOA_ENC), 'encuentros');
  assert.equal(U.detectarTipoPlanilla(AOA_SUS), 'suspensiones');
  assert.equal(U.detectarTipoPlanilla([U.ENCABEZADOS]), 'ugcq');
  assert.equal(U.detectarTipoPlanilla([['a', 'b'], [1, 2]]), null);
  const e = fuentes.encuentros.filas;
  assert.equal(e.length, 9);
  assert.equal(e[8].fecha, '2026-03-18');
  assert.equal(e[8].hora, '09:00');
  assert.deepEqual(e.map(x => x.interv), ['MAYOR', 'MAYOR', 'MAYOR', 'MAYOR', 'MAYOR', 'PROC', 'MAYOR', 'MENOR', 'MAYOR']);
  assert.equal(e[4].tipoCirugia, 'URG');
  assert.equal(e[1].tipoCirugia, 'COND');
  assert.equal(e[0].intervencion, '[0000000] Cirugía A');
});

// ═══════════════ Cotejo del día ═══════════════
test('Cotejo automático: conteos UGCQ del día', () => {
  const r = U.cotejarDia(DIA, fuentes, {});
  assert.equal(r.conTabla, true);
  assert.deepEqual(r.conteos, {
    programados: 7,          // 5 normales de tabla + 2 suspendidos mayores fuera de tabla
    condicionales: 2,
    suspendidos: 3,          // no se presenta + instrumental + causal desconocida
    pctSuspendidos: 43,      // 3/7
    progRealizadas: 3,       // ANA, SALAS (registrada condicional en SITGEQ), MOLINA (enlazada por nombre)
    condRealizadas: 1,       // PABLO
    agregadas: 1, urgencias: 1,
    menores: 1, procedimientos: 8,   // por código: la cirugía menor y un código de procedimiento por cirugía
    totalMayoresElectivas: 5, totalRealizado: 15,
    programadosHabiles: 7,   // denominador del %: todos en horario hábil (martes, horas de 08:00 a 15:45)
  });
  assert.deepEqual(r.causas, { [col('(Paciente) No se presenta / No se ubica')]: 1, [col('(Unidades de apoyo logístico) Instrumental incompleto o no dis')]: 1 });
  // Pendientes: Vera (sin registro), la causal desconocida y el Pabellón 3, que no tiene tabla
  assert.deepEqual(r.pendientes.map(x => x.tipo).sort(), ['causal', 'estado', 'pabellon']);
  assert.equal(pac(r, '12345678-5').estado, 'SIN_REGISTRO');
  assert.ok(pac(r, '12345678-5').avisos.some(a => a.includes('18-03-2026')), 'pista: operado otro día');
  assert.equal(pac(r, '7654321-6').estado, 'NO_REALIZADA'); // condicional no operado: no es suspensión
  assert.ok(pac(r, '20111222-2').avisos.some(a => a.includes('Manda la tabla')));
  assert.equal(pac(r, '6543210-2').estado, 'REALIZADA');
  assert.ok(r.encuentros.find(e => e.nombre.startsWith('MOLINA')).avisos.some(a => a.includes('por nombre')));
  assert.ok(pac(r, '6543210-2').avisos.some(a => a.includes('Reprogramado')));
  const proc = r.pacientes.find(p => p.nombre === 'PACIENTE SUSP PROCEDIMIENTO');
  assert.equal(proc.cuenta, false);
  assert.equal(r.controles.every(c => c.ok), false);
});

test('Cotejo con decisiones manuales: queda listo y cuadra', () => {
  const sinReg = U.cotejarDia(DIA, fuentes, {}).pacientes.find(p => p.run === '12345678-5');
  const raro = U.cotejarDia(DIA, fuentes, {}).pacientes.find(p => p.nombre === 'PACIENTE SUSP RARO');
  const ajustes = { pac: {
    [sinReg.id]: { estado: 'SUSPENDIDA', causalCol: col('(Paciente) Rechaza operación') },
    [raro.id]: { causalCol: col('(otros) otros') },
  }, enc: {}, conf: { 'pab:3': true } };
  const r = U.cotejarDia(DIA, fuentes, ajustes);
  assert.equal(r.pendientes.length, 0);
  assert.equal(r.conteos.suspendidos, 4);
  assert.equal(r.conteos.pctSuspendidos, 57);
  assert.ok(r.controles.every(c => c.ok), JSON.stringify(r.controles));
  assert.equal(Object.values(r.causas).reduce((a, b) => a + b, 0), 4);
});

test('Cotejo: "no contar" un programado pasa su cirugía a agregada', () => {
  const p = U.cotejarDia(DIA, fuentes, {}).pacientes.find(x => x.run === '6543210-2');
  const r = U.cotejarDia(DIA, fuentes, { pac: { [p.id]: { estado: 'NO_CONTAR' } } });
  assert.equal(r.conteos.programados, 6);
  assert.equal(r.conteos.progRealizadas, 2);
  assert.equal(r.conteos.agregadas, 2);
  assert.equal(r.conteos.totalRealizado, 15);
});

test('Cotejo: una agregada marcada como "faltaba en la tabla" pasa a programada', () => {
  const e = U.cotejarDia(DIA, fuentes, {}).encuentros.find(x => x.nombre === 'PACIENTE AGREGADO UNO');
  const r = U.cotejarDia(DIA, fuentes, { enc: { [e.id]: { clase: 'NUEVO_NORMAL' } } });
  assert.equal(r.conteos.programados, 8);
  assert.equal(r.conteos.progRealizadas, 4);
  assert.equal(r.conteos.agregadas, 0);
  assert.equal(r.conteos.totalMayoresElectivas, 5);
});

test('Cotejo: condicional cambiado a normal y no operado queda pendiente', () => {
  const p = U.cotejarDia(DIA, fuentes, {}).pacientes.find(x => x.run === '7654321-6');
  const r = U.cotejarDia(DIA, fuentes, { pac: { [p.id]: { agend: 'NORMAL' } } });
  assert.equal(r.conteos.condicionales, 1);
  assert.equal(r.conteos.programados, 8);
  assert.ok(r.pendientes.some(x => x.pacienteId === p.id && x.tipo === 'estado'));
});

test('Cotejo: RUN válidos distintos con el mismo nombre no se enlazan', () => {
  const f = {
    tabla: { cargada: true, filas: [{ fecha: DIA, id: 't1', run: '15234567-4', nombre: 'JUAN PEREZ SOTO', agend: 'NORMAL', pabellon: 'P1', hora: '08:00' }] },
    encuentros: { cargado: true, filas: [{ id: 'e1', fecha: DIA, run: '9876543-3', nombre: 'JUAN PEREZ SOTO', tipoCirugia: 'ELECT', tipoCirugiaTxt: 'Electivo Normal', interv: 'MAYOR', hora: '09:00' }] },
    suspensiones: { cargado: true, filas: [] },
  };
  const r = U.cotejarDia(DIA, f, { conf: { sinSuspensiones: true } });
  assert.equal(r.conteos.progRealizadas, 0);
  assert.equal(r.conteos.agregadas, 1);
  assert.equal(r.pendientes.length, 1);
});

test('Cotejo: registros sin RUN ni nombre no se fusionan', () => {
  const vacio = (id) => ({ id, fecha: DIA, run: '', nombre: '', tipoCirugia: 'URG', tipoCirugiaTxt: 'Urgencia', interv: 'MAYOR', hora: '10:00' });
  const r = U.cotejarDia(DIA, { encuentros: { cargado: true, filas: [vacio('a'), vacio('b')] } }, {});
  assert.equal(r.conteos.urgencias, 2);
});

test('Sin tabla: pendiente hasta confirmar; luego lo programado se reconstruye desde SITGEQ', () => {
  const r = U.cotejarDia('2026-03-18', fuentes, {});
  assert.equal(r.conTabla, false);
  assert.ok(r.pendientes.some(x => x.clave === 'sinTabla'));
  const r2 = U.cotejarDia('2026-03-18', fuentes, { conf: { sinTabla: true, sinSuspensiones: true } });
  assert.equal(r2.pendientes.length, 0);
  assert.equal(r2.conteos.programados, 1);
  assert.equal(r2.conteos.progRealizadas, 1);
  assert.equal(r2.conteos.agregadas, 0);
  assert.ok(r2.avisos.some(a => a.includes('no se distinguen agregadas')));
});

// ═══════════════ Fila UGCQ ═══════════════
test('Fila UGCQ: 119 columnas, tipos y datos fijos como el reporte', () => {
  const r = U.cotejarDia(DIA, fuentes, {});
  const fila = U.filaUGCQ(DIA, r.conteos, r.causas, {});
  assert.equal(fila.length, 119);
  assert.deepEqual(fila.slice(0, 11), ['17-03-2026', '17', '3', '2026', U.semanaUGCQ(DIA), 'Macrocentro Norte', '              V', 'Servicio de Salud Viña del Mar Quillota', 'Hospital de Quilpué', 'Alta', 'EAR']);
  assert.deepEqual(fila.slice(11, 23), [7, 2, 3, 43, 3, 1, 1, 1, 1, 8, 5, 15]);
  assert.equal(fila[col('(Paciente) No se presenta / No se ubica')], 1);
  assert.equal(fila[col('(Paciente) Rechaza operación')], null);
  const otro = U.filaUGCQ(DIA, r.conteos, r.causas, { hospital: 'Hospital Marga Marga' });
  assert.equal(otro[8], 'Hospital Marga Marga');
});

test('Reporte UGCQ: se lee y se compara con lo calculado', () => {
  const r = U.cotejarDia(DIA, fuentes, {});
  const fila = U.filaUGCQ(DIA, r.conteos, r.causas, {});
  const subida = fila.slice();
  subida[col('Cx Mayores de Urgencia realizadas')] = 4;
  const leidas = U.leerUGCQ([U.ENCABEZADOS, subida]);
  assert.equal(leidas.length, 1);
  assert.equal(leidas[0].fecha, DIA);
  const dif = U.compararFilas(fila, leidas[0].fila);
  assert.deepEqual(dif.map(d => [d.encabezado, d.calculado, d.ugcq]), [['Cx Mayores de Urgencia realizadas', 1, 4]]);
});
