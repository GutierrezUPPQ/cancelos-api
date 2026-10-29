// Reglas de conteo UGCQ y casos borde (datos sintéticos). Ejecutar con: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { U, run, filaTabla, filaEnc, fuentes, col, ENC_HDR } = require('./helpers/sitgeq_sintetico.js');

const MAR = '2026-03-17', D_MAR = '17-03-2026';   // martes
const VIE = '2026-03-20', D_VIE = '20-03-2026';   // viernes
const SAB = '2026-03-21', D_SAB = '21-03-2026';   // sábado
const FER = '2026-05-21', D_FER = '21-05-2026';   // feriado (jueves)
const conf = { sinTabla: true, sinEncuentros: true, sinSuspensiones: true };
const pac = (r, nombre) => r.pacientes.find(p => p.nombre === nombre);
const enc = (r, nombre) => r.encuentros.filter(e => e.nombre === nombre);
const pendientesDe = (r, tipo) => r.pendientes.filter(p => p.tipo === tipo);

// ═══════════════ Suspensión UGCQ: cirugía mayor electiva directa en horario hábil ═══════════════
function diaConSuspension(fecha, dmy, hora, extra = {}) {
  const f = fuentes({
    tabla: [filaTabla({ fecha, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora, agend: extra.agend || 'NORMAL' }),
      filaTabla({ fecha, nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '08:00' })],
    enc: [{ fecha: dmy, pab: 'Pabellón 2', nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '08:10' }],
    sus: [{ fecha: dmy, nombre: 'ANA SOTO PEREZ', run: run(15234567), cat: 'Paciente', desc: 'Rechaza operación', agend: extra.agend === 'CONDICIONAL' ? 'CONDICIONAL' : 'DIRECTO', clase: extra.clase || 'Cirugía Mayor' }],
  });
  return U.cotejarDia(fecha, f, {}, extra.opciones);
}

test('Suspensión en horario hábil (martes 11:20) va a UGCQ', () => {
  const r = diaConSuspension(MAR, D_MAR, '11:20');
  assert.equal(r.conteos.programados, 2);
  assert.equal(r.conteos.suspendidos, 1);
  assert.equal(r.conteos.pctSuspendidos, 50);
  assert.deepEqual(r.causas, { [col('(Paciente) Rechaza operación')]: 1 });
  assert.equal(r.pendientes.length, 0);
  assert.ok(r.controles.every(c => c.ok));
});

test('Suspensión fuera de horario hábil no va a UGCQ (queda en gestión)', () => {
  for (const [fecha, dmy, hora] of [[MAR, D_MAR, '17:30'], [VIE, D_VIE, '16:15'], [SAB, D_SAB, '09:00'], [FER, D_FER, '10:00'], [MAR, D_MAR, '07:30']]) {
    const r = diaConSuspension(fecha, dmy, hora);
    assert.equal(r.conteos.suspendidos, 0, fecha + ' ' + hora);
    assert.equal(r.conteos.programados, 2, fecha + ' ' + hora);
    assert.deepEqual(r.causas, {});
    assert.equal(r.gestion.suspendidos, 1);
    assert.equal(r.gestion.suspFueraHorario, 1);
    assert.match(pac(r, 'ANA SOTO PEREZ').motivoNoUGCQ, /fuera de horario/);
    assert.ok(r.controles.every(c => c.ok), JSON.stringify(r.controles));
  }
  assert.equal(diaConSuspension(VIE, D_VIE, '15:30').conteos.suspendidos, 1);
  // Horario y feriados configurables
  assert.equal(diaConSuspension(MAR, D_MAR, '17:30', { opciones: { finLunJue: '18:00' } }).conteos.suspendidos, 1);
  assert.equal(diaConSuspension(FER, D_FER, '10:00', { opciones: { feriados: [] } }).conteos.suspendidos, 1);
});

test('Condicional suspendido no es suspensión UGCQ', () => {
  const r = diaConSuspension(MAR, D_MAR, '11:20', { agend: 'CONDICIONAL' });
  assert.equal(r.conteos.condicionales, 1);
  assert.equal(r.conteos.suspendidos, 0);
  assert.equal(r.gestion.suspCondicionales, 1);
});

test('Suspensión de procedimiento o de agendamiento no electivo no va a UGCQ', () => {
  const r = diaConSuspension(MAR, D_MAR, '11:20', { clase: 'Procedimiento' });
  assert.equal(r.conteos.programados, 1);
  assert.equal(r.conteos.suspendidos, 0);
  assert.equal(r.gestion.suspNoMayor, 1);
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'LUIS ROJAS DIAZ', run: run(9876543) })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'LUIS ROJAS DIAZ', run: run(9876543) }],
    sus: [{ fecha: D_MAR, nombre: 'EVA MORA', run: run(7654321), agend: 'URGENCIA' }] });
  const r2 = U.cotejarDia(MAR, f, {});
  assert.equal(r2.conteos.programados, 1);
  assert.equal(r2.conteos.suspendidos, 0);
  assert.equal(r2.gestion.suspOtroAgend, 1);
});

// ═══════════════ Menores y procedimientos por código ═══════════════
test('Cirugías menores y procedimientos se cuentan por código (incluida la anestesia)', () => {
  const f = fuentes({ enc: [
    { fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'A UNO', run: run(11000001), proc: 1 },                         // mayor + anestesia
    { fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'B DOS', run: run(11000002), tipo: 'Procedimiento', mayor: 0, proc: 2 }, // endoscopía + anestesia
    { fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Electivo Normal', nombre: 'C TRES', run: run(11000003), tipo: 'Cirugía Menor', mayor: 0, menor: 1, proc: 1 },
    { fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'D CUATRO', run: run(11000004), tipo: 'Cirugía Menor', mayor: 0, menor: 2, proc: 0 },
  ], sus: [] });
  const r = U.cotejarDia(MAR, f, { conf });
  assert.equal(r.conteos.urgencias, 1);
  assert.equal(r.conteos.menores, 3);
  assert.equal(r.conteos.procedimientos, 4);
  assert.equal(r.conteos.totalRealizado, 1 + 3 + 4);
  assert.equal(r.gestion.anestesias, 4);
  // Un registro marcado "no contar" no suma sus códigos
  const e = enc(r, 'B DOS')[0];
  const r2 = U.cotejarDia(MAR, f, { conf, enc: { [e.id]: { clase: 'NO_CONTAR' } } });
  assert.equal(r2.conteos.procedimientos, 2);
});

test('Export sin columnas de códigos: menores y procedimientos por registro, con aviso', () => {
  const H = ['Fecha intervención', 'Pabellón', 'Tipo de cirugía', 'Nombre paciente', 'RUN / Identificación', 'Tipo'];
  const filas = U.leerEncuentros([H, [D_MAR, 'P1', 'Urgencia', 'A', run(11000001), 'Procedimiento'], [D_MAR, 'P1', 'Urgencia', 'B', run(11000002), 'Cirugía Menor'], [D_MAR, 'P1', 'Urgencia', 'C', run(11000003), 'Cirugía Mayor']], 'e.xlsx');
  const r = U.cotejarDia(MAR, { encuentros: { cargado: true, filas }, suspensiones: { cargado: true, filas: [] } }, { conf });
  assert.equal(r.conteos.procedimientos, 1);
  assert.equal(r.conteos.menores, 1);
  assert.equal(r.conteos.urgencias, 1);
  assert.ok(r.avisos.some(a => a.includes('por registro, no por código')));
});

// ═══════════════ Casos borde del cotejo ═══════════════
test('Suspensión de cirugía mayor + procedimiento el mismo día: sigue siendo suspendido', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '10:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', tipoCx: 'Urgencia', nombre: 'ANA SOTO PEREZ', run: run(15234567), tipo: 'Procedimiento', mayor: 0, proc: 1 }],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), desc: 'Patología aguda' }] });
  const r = U.cotejarDia(MAR, f, {});
  assert.equal(pac(r, 'ANA SOTO PEREZ').estado, 'SUSPENDIDA');
  assert.equal(r.conteos.suspendidos, 1);
  assert.equal(r.conteos.procedimientos, 1);
  assert.deepEqual(r.causas, { [col('(Paciente) Patología aguda')]: 1 });
});

test('Dos suspensiones del mismo paciente: manda la de cirugía mayor', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '10:00' })], enc: [],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), clase: 'Procedimiento', desc: 'Falta de ayuno' },
      { fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), clase: 'Cirugía Mayor', desc: 'Rechaza operación' }] });
  const r = U.cotejarDia(MAR, f, { conf });
  assert.equal(r.conteos.suspendidos, 1);
  assert.deepEqual(r.causas, { [col('(Paciente) Rechaza operación')]: 1 });
});

test('Suspendido y luego operado de urgencia: suspensión + urgencia', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '10:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '20:00' }],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), desc: 'Patología aguda' }] });
  const r = U.cotejarDia(MAR, f, {});
  assert.equal(r.conteos.suspendidos, 1);
  assert.equal(r.conteos.urgencias, 1);
  assert.equal(r.conteos.progRealizadas, 0);
  assert.equal(r.conteos.totalRealizado, 1 + 1); // urgencia + su anestesia
});

test('Marcar "Suspendida" a un operado exige confirmar; confirmada, su cirugía se cuenta aparte', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '10:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '10:05' }], sus: [] });
  const id = U.cotejarDia(MAR, f, {}).pacientes[0].id;
  const r = U.cotejarDia(MAR, f, { pac: { [id]: { estado: 'SUSPENDIDA', causalCol: col('(Paciente) Rechaza operación') } } });
  assert.equal(pendientesDe(r, 'conflicto').length, 1);
  const r2 = U.cotejarDia(MAR, f, { pac: { [id]: { estado: 'SUSPENDIDA', causalCol: col('(Paciente) Rechaza operación'), confirmado: true } }, conf: { sinSuspensiones: true } });
  assert.equal(r2.pendientes.length, 0);
  assert.equal(r2.conteos.suspendidos, 1);
  assert.equal(r2.conteos.agregadas, 1);
});

test('Urgencia temprana y electiva programada del mismo paciente: la electiva es la del programado', () => {
  for (const [hU, hE] of [['07:00', '14:00'], ['16:00', '9:00']]) {
    const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '09:00' })],
      enc: [{ fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: hU },
        { fecha: D_MAR, pab: 'Pabellón 2', tipoCx: 'Electivo Normal', nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: hE }], sus: [] });
    const r = U.cotejarDia(MAR, f, {});
    assert.equal(r.conteos.progRealizadas, 1);
    assert.equal(r.conteos.urgencias, 1);
    assert.deepEqual(enc(r, 'ANA SOTO PEREZ').map(e => [e.tipoCirugia, e.claseFinal]).sort(), [['ELECT', 'PROG'], ['URG', 'URG']]);
  }
});

test('Elegir a mano la cirugía del programado deja una sola', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '09:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '09:00' },
      { fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '13:00', interv: 'Cirugía Y' }], sus: [] });
  const r = U.cotejarDia(MAR, f, {});
  const segunda = enc(r, 'ANA SOTO PEREZ').find(e => e.horaN === '13:00');
  assert.equal(segunda.claseFinal, 'NO_CONTAR');
  const r2 = U.cotejarDia(MAR, f, { enc: { [segunda.id]: { clase: 'PROG' } } });
  assert.deepEqual(enc(r2, 'ANA SOTO PEREZ').map(e => e.claseFinal).sort(), ['NO_CONTAR', 'PROG']);
  assert.equal(r2.conteos.progRealizadas, 1);
});

test('Enlace por nombre estricto: un segundo apellido distinto no es la misma persona', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'MARIA JOSE SOTO PEREZ', run: '15234567-5', hora: '09:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'MARIA JOSE SOTO DIAZ', run: run(19876543), hora: '10:00' }], sus: [] });
  const r = U.cotejarDia(MAR, f, {});
  assert.equal(r.conteos.progRealizadas, 0);
  assert.equal(r.conteos.urgencias, 1);
  assert.equal(pac(r, 'MARIA JOSE SOTO PEREZ').estado, 'SIN_REGISTRO');
  // pero se ofrece como candidato para vincular a mano
  assert.equal(pac(r, 'MARIA JOSE SOTO PEREZ').candidatos.length, 1);
});

test('Mismo paciente con RUN distinto en tabla y SITGEQ: se vincula a mano y no se cuenta doble', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '09:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: run(15234576), hora: '09:10' }], sus: [] });
  const r = U.cotejarDia(MAR, f, {});
  const p = pac(r, 'ANA SOTO PEREZ');
  assert.equal(p.estado, 'SIN_REGISTRO');
  assert.equal(r.conteos.agregadas, 1);
  assert.equal(p.candidatos.length, 1);
  const r2 = U.cotejarDia(MAR, f, { vinc: { [p.candidatos[0].id]: p.id }, conf: { sinSuspensiones: true } });
  assert.equal(pac(r2, 'ANA SOTO PEREZ').estado, 'REALIZADA');
  assert.equal(r2.conteos.progRealizadas, 1);
  assert.equal(r2.conteos.agregadas, 0);
  assert.equal(r2.pendientes.length, 0);
});

test('Suspensión con RUN distinto: se vincula a mano y no crea un segundo programado', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '09:00' })], enc: [],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234576), desc: 'Rechaza operación' }] });
  const r = U.cotejarDia(MAR, f, { conf });
  assert.equal(r.conteos.programados, 2);
  const p = r.pacientes.find(x => x.origen === 'tabla');
  const cand = p.candidatos.find(c => c.tipo === 'sus');
  const r2 = U.cotejarDia(MAR, f, { conf, vinc: { [cand.id]: p.id } });
  assert.equal(r2.conteos.programados, 1);
  assert.equal(r2.conteos.suspendidos, 1);
  assert.equal(r2.pendientes.length, 0);
});

test('Desvincular un enlace por nombre', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: 'S/I', hora: '09:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '09:10' }], sus: [] });
  const r = U.cotejarDia(MAR, f, {});
  const e = r.encuentros[0];
  assert.equal(e.enlace, 'nombre');
  const r2 = U.cotejarDia(MAR, f, { vinc: { [e.id]: '_ninguno' } });
  assert.equal(r2.encuentros[0].paciente, null);
  assert.equal(r2.conteos.agregadas, 1);
});

test('Faltan archivos del día: pendientes que se pueden confirmar', () => {
  const soloSus = fuentes({ sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567) }] });
  const r = U.cotejarDia(MAR, soloSus, {});
  assert.deepEqual(pendientesDe(r, 'fuente').map(p => p.clave).sort(), ['sinEncuentros', 'sinTabla']);
  const r2 = U.cotejarDia(MAR, soloSus, { conf: { sinTabla: true, sinEncuentros: true } });
  assert.equal(pendientesDe(r2, 'fuente').length, 0);
  const sinSus = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'LUIS', run: run(9876543) })], enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'LUIS', run: run(9876543) }] });
  assert.deepEqual(pendientesDe(U.cotejarDia(MAR, sinSus, {}), 'fuente').map(p => p.clave), ['sinSuspensiones']);
});

test('Electivas en un pabellón sin tabla: pendiente hasta confirmar que son agregadas', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), pab: 'Pabellón 2' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: run(15234567) },
      { fecha: D_MAR, pab: 'Pabellón 4', nombre: 'LUIS ROJAS DIAZ', run: run(9876543) },
      { fecha: D_MAR, pab: 'Pabellón 4', nombre: 'EVA MORA LARA', run: run(7654321) }], sus: [] });
  const r = U.cotejarDia(MAR, f, {});
  const p = pendientesDe(r, 'pabellon');
  assert.equal(p.length, 1);
  assert.equal(p[0].clave, 'pab:4');
  assert.match(p[0].texto, /2 cirugías electivas en Pabellón 4/);
  assert.equal(U.cotejarDia(MAR, f, { conf: { 'pab:4': true, sinSuspensiones: true } }).pendientes.length, 0);
});

test('Paciente repetido en la tabla como Normal y Condicional: se usa Normal con aviso', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), agend: 'CONDICIONAL' }),
    filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), agend: 'NORMAL', hora: '15:00' })], enc: [], sus: [] });
  const r = U.cotejarDia(MAR, f, { conf });
  assert.equal(r.pacientes.length, 1);
  assert.equal(r.pacientes[0].agend, 'NORMAL');
  assert.ok(r.pacientes[0].avisos.some(a => a.includes('dos agendamientos')));
});

test('RUN comodín (11.111.111-1) no junta a personas distintas', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'JEAN PIERRE DUBOIS', run: '11.111.111-1' }), filaTabla({ fecha: MAR, nombre: 'MARIE CLAIRE LEROY', run: '11.111.111-1', hora: '10:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'JEAN PIERRE DUBOIS', run: '11.111.111-1' }],
    sus: [{ fecha: D_MAR, nombre: 'MARIE CLAIRE LEROY', run: '11.111.111-1' }] });
  const r = U.cotejarDia(MAR, f, {});
  assert.equal(r.conteos.programados, 2);
  assert.equal(r.conteos.progRealizadas, 1);
  assert.equal(r.conteos.suspendidos, 1);
});

test('Dos registros electivos del mismo paciente fuera de tabla: una agregada', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567) })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: run(15234567) },
      { fecha: D_MAR, pab: 'Pabellón 2', nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '10:00' },
      { fecha: D_MAR, pab: 'Pabellón 2', nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '15:00', interv: 'Cirugía Y' }], sus: [] });
  const r = U.cotejarDia(MAR, f, {});
  assert.equal(r.conteos.agregadas, 1);
  assert.deepEqual(enc(r, 'LUIS ROJAS DIAZ').map(e => e.claseFinal), ['AGREG', 'NO_CONTAR']);
});

test('Gestión de pabellón: resume todo lo programado, vaya o no a UGCQ', () => {
  const f = fuentes({
    tabla: [filaTabla({ fecha: MAR, nombre: 'A UNO', run: run(11000001), hora: '08:00' }), filaTabla({ fecha: MAR, nombre: 'B DOS', run: run(11000002), hora: '10:00' }),
      filaTabla({ fecha: MAR, nombre: 'C TRES', run: run(11000003), hora: '12:00', agend: 'CONDICIONAL' }), filaTabla({ fecha: MAR, nombre: 'D CUATRO', run: run(11000004), hora: '15:00', agend: 'CONDICIONAL' }),
      filaTabla({ fecha: MAR, nombre: 'E CINCO', run: run(11000005), hora: '17:30' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'A UNO', run: run(11000001) }],
    sus: [{ fecha: D_MAR, nombre: 'B DOS', run: run(11000002), desc: 'Rechaza operación' }, { fecha: D_MAR, nombre: 'C TRES', run: run(11000003), agend: 'CONDICIONAL', desc: 'Falta de ayuno' },
      { fecha: D_MAR, nombre: 'E CINCO', run: run(11000005), desc: 'No se presenta' }],
  });
  const r = U.cotejarDia(MAR, f, {});
  assert.equal(r.conteos.suspendidos, 1);
  assert.deepEqual(
    { prog: r.gestion.programados, op: r.gestion.operados, susp: r.gestion.suspendidos, ugcq: r.gestion.suspUGCQ, cond: r.gestion.suspCondicionales,
      fuera: r.gestion.suspFueraHorario, condNo: r.gestion.condNoOperados, pct: r.gestion.pctSuspension },
    { prog: 5, op: 1, susp: 3, ugcq: 1, cond: 1, fuera: 1, condNo: 1, pct: 60 });
  assert.equal(r.gestion.causales.reduce((s, c) => s + c.n, 0), 3);
});

test('Horario hábil: días, horas y feriados', () => {
  assert.equal(U.diaHabil('2026-10-12'), false); // feriado
  assert.equal(U.diaHabil('2026-10-13'), true);
  assert.equal(U.diaHabil('2026-10-10'), false); // sábado
  assert.equal(U.enHorarioHabil('2026-10-13', '08:00'), true);
  assert.equal(U.enHorarioHabil('2026-10-13', '16:59'), true);
  assert.equal(U.enHorarioHabil('2026-10-13', '17:00'), false);
  assert.equal(U.enHorarioHabil('2026-10-16', '15:59'), true);  // viernes
  assert.equal(U.enHorarioHabil('2026-10-16', '16:00'), false);
  assert.equal(U.enHorarioHabil('2026-10-13', ''), null);
});

test('% de suspensión solo sobre programados en horario hábil', () => {
  // Martes: 2 programados en horario hábil (uno suspendido) y 1 programado a las 18:00 (operado)
  const f = fuentes({
    tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '09:00' }), filaTabla({ fecha: MAR, nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '11:00' }),
      filaTabla({ fecha: MAR, nombre: 'EVA MORA LARA', run: run(7654321), hora: '18:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '11:10' }, { fecha: D_MAR, pab: 'Pabellón 2', nombre: 'EVA MORA LARA', run: run(7654321), hora: '18:05' }],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), desc: 'Rechaza operación' }],
  });
  const r = U.cotejarDia(MAR, f, {});
  assert.equal(r.conteos.programados, 3);
  assert.equal(r.conteos.programadosHabiles, 2);
  assert.equal(r.conteos.suspendidos, 1);
  assert.equal(r.conteos.pctSuspendidos, 50);
  assert.ok(r.controles.every(c => c.ok));
  // Sábado con operativo: se cuentan como programados, pero el % es 0 (no hay horario hábil)
  const sab = fuentes({ tabla: [filaTabla({ fecha: SAB, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '09:00' }), filaTabla({ fecha: SAB, nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '10:00' })],
    enc: [{ fecha: D_SAB, pab: 'Pabellón 2', nombre: 'LUIS ROJAS DIAZ', run: run(9876543) }], sus: [{ fecha: D_SAB, nombre: 'ANA SOTO PEREZ', run: run(15234567) }] });
  const r2 = U.cotejarDia(SAB, sab, {});
  assert.equal(r2.conteos.programados, 2);
  assert.equal(r2.conteos.programadosHabiles, 0);
  assert.equal(r2.conteos.suspendidos, 0);
  assert.equal(r2.conteos.pctSuspendidos, 0);
  assert.equal(r2.gestion.suspFueraHorario, 1);
});

// ═══════════════ Regresiones de la revisión de la v1.1 ═══════════════
test('Vincular un candidato arrastra todos los registros de esa persona en SITGEQ', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '08:00' }), filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '09:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '08:10' },
      { fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'ANA SOTO PEREZ', run: run(15234576), hora: '20:00' }],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234576), desc: 'Patología aguda' }] });
  const r = U.cotejarDia(MAR, f, {});
  const ana = r.pacientes.find(p => p.origen === 'tabla' && p.nombre === 'ANA SOTO PEREZ');
  const cand = ana.candidatos.find(c => c.tipo === 'sus');
  const r2 = U.cotejarDia(MAR, f, { vinc: { [cand.id]: ana.id } });
  assert.equal(r2.pacientes.length, 2);
  assert.equal(r2.conteos.programados, 2);
  assert.equal(r2.conteos.suspendidos, 1);
  assert.equal(r2.conteos.urgencias, 1);
  assert.equal(r2.conteos.progRealizadas, 1);
  assert.equal(r2.pendientes.length, 0);
});

test('Con varios días cargados, un día sin filas de suspensiones pide confirmación', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567) })], enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: run(15234567) }],
    sus: [{ fecha: '16-03-2026', nombre: 'EVA MORA LARA', run: run(7654321) }] });
  const r = U.cotejarDia(MAR, f, {});
  assert.equal(pendientesDe(r, 'fuente').map(p => p.texto).join(), 'Los informes de suspensiones cargados no traen este día');
});

test('"Suspendida" a mano no convierte en suspensión UGCQ la de un procedimiento', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '11:20' })], enc: [],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), clase: 'Procedimiento', desc: 'Rechaza operación' }] });
  const id = U.cotejarDia(MAR, f, {}).pacientes[0].id;
  const r = U.cotejarDia(MAR, f, { pac: { [id]: { estado: 'SUSPENDIDA' } }, conf });
  assert.equal(r.conteos.suspendidos, 0);
  assert.equal(r.gestion.suspNoMayor, 1);
});

test('"Realizada" a mano y luego llega la suspensión: conflicto que hay que confirmar', () => {
  const tabla = [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '10:00' })];
  const id = U.cotejarDia(MAR, fuentes({ tabla, enc: [] }), {}).pacientes[0].id;
  const f = fuentes({ tabla, enc: [], sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), desc: 'Rechaza operación' }] });
  const r = U.cotejarDia(MAR, f, { pac: { [id]: { estado: 'REALIZADA' } }, conf });
  assert.equal(pendientesDe(r, 'conflicto').length, 1);
  assert.match(pendientesDe(r, 'conflicto')[0].texto, /su suspensión/);
});

test('Las decisiones sobre cirugías sobreviven a un re-export con hora e intervención completadas', () => {
  const base = { fecha: D_MAR, pab: 'Pabellón 2', nombre: 'PEDRO TAPIA LARA', run: run(12345678) };
  const f1 = fuentes({ enc: [Object.assign({}, base, { hora: '', interv: 'APENDICECTOMIA' })], sus: [] });
  const f2 = fuentes({ enc: [Object.assign({}, base, { hora: '10:35', interv: '[1802081] Apendicectomía' })], sus: [] });
  const id = U.cotejarDia(MAR, f1, { conf }).encuentros[0].id;
  assert.equal(U.cotejarDia(MAR, f2, { conf }).encuentros[0].id, id);
  assert.equal(U.cotejarDia(MAR, f2, { conf, enc: { [id]: { clase: 'URG' } } }).conteos.urgencias, 1);
});

test('Una decisión que ya no calza con ningún registro queda como pendiente', () => {
  const f = fuentes({ enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'PEDRO TAPIA LARA', run: run(12345678) }], sus: [] });
  const r = U.cotejarDia(MAR, f, { conf, enc: { 'e-no-existe': { clase: 'URG' } }, desc: { 'e-no-existe': 'cirugía de prueba' } });
  assert.equal(pendientesDe(r, 'huerfana').length, 1);
  assert.match(pendientesDe(r, 'huerfana')[0].texto, /cirugía de prueba/);
});

test('Filas idénticas repetidas (urgencia, menor o procedimiento) se cuentan una vez', () => {
  const urg = { fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'PEDRO TAPIA LARA', run: run(12345678), hora: '22:00' };
  const proc = { fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'EVA MORA', run: run(7654321), tipo: 'Procedimiento', mayor: 0, proc: 2, hora: '23:00' };
  const r = U.cotejarDia(MAR, fuentes({ enc: [urg, urg, proc, proc], sus: [] }), { conf });
  assert.equal(r.conteos.urgencias, 1);
  assert.equal(r.conteos.procedimientos, 1 + 2);
  assert.ok(r.encuentros.some(e => e.avisos.some(a => a.includes('Fila repetida'))));
});

test('"No es este paciente" en dos suspensiones de la misma persona: un solo programado aparte', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: 'S/I', hora: '09:00' })], enc: [],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), desc: 'Rechaza operación' }, { fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), desc: 'Falta de ayuno' }] });
  const r = U.cotejarDia(MAR, f, {});
  const ids = r.suspensiones.map(s => s.id);
  const r2 = U.cotejarDia(MAR, f, { vinc: { [ids[0]]: '_ninguno', [ids[1]]: '_ninguno' } });
  const ids2 = r2.pacientes.map(p => p.id);
  assert.equal(new Set(ids2).size, ids2.length);
  assert.equal(r2.pacientes.filter(p => p.origen === 'suspension').length, 1);
  assert.ok(r2.suspensiones.every(s => s.desvinculado));
});

test('Gestión: el desglose de suspensiones es excluyente y suma el total', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '10:00', agend: 'CONDICIONAL' }), filaTabla({ fecha: MAR, nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '08:00' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'LUIS ROJAS DIAZ', run: run(9876543) }],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: run(15234567), agend: 'CONDICIONAL', clase: 'Procedimiento', desc: 'Falta de ayuno' }] });
  const g = U.cotejarDia(MAR, f, {}).gestion;
  assert.equal(g.suspendidos, 1);
  assert.equal(g.suspUGCQ + g.suspCondicionales + g.suspNoMayor + g.suspFueraHorario + g.suspOtroAgend, g.suspendidos);
});

test('Horas: "17:30hrs", "1:30 PM" y "12:15 AM"', () => {
  assert.equal(U.horaDe('17:30hrs'), '17:30');
  assert.equal(U.horaDe('17:30 hrs'), '17:30');
  assert.equal(U.horaDe('8:05'), '08:05');
  assert.equal(U.horaDe('1:30 PM'), '13:30');
  assert.equal(U.horaDe('12:15 AM'), '00:15');
  assert.equal(U.horaDe('17.30'), '17:30');
  assert.equal(U.horaDe('123:45'), '');
});

test('Sin tabla: la hora real de quirófano no saca a nadie del % de suspensión', () => {
  const f = fuentes({ enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'A UNO', run: run(11000001), hora: '08:10' }, { fecha: D_MAR, pab: 'Pabellón 2', nombre: 'B DOS', run: run(11000002), hora: '17:40' }],
    sus: [{ fecha: D_MAR, nombre: 'C TRES', run: run(11000003) }] });
  const r = U.cotejarDia(MAR, f, { conf });
  assert.equal(r.conteos.programados, 3);
  assert.equal(r.conteos.programadosHabiles, 3);
  assert.equal(r.conteos.pctSuspendidos, 33);
});

test('Causal: categoría en plural se reconoce; descripción ambigua sin categoría se elige a mano', () => {
  assert.equal(U.mapearCausal('Pacientes', 'No se presenta').col, col('(Paciente) No se presenta'));
  assert.equal(U.mapearCausal('Equipo quirúrgico', 'Reemplazo por urgencia').col, col('(Equipo quirúrgico) Reemplazo por urgencia'));
  assert.equal(U.mapearCausal('Categoría rara', 'No se presenta'), null);
});

// ═══════════════ Tercera revisión: decisiones por persona de SITGEQ, ids estables, filas repetidas y controles ═══════════════
const RT = run(15234567), RS = run(15234576);   // RUN de la tabla y el mismo con dígitos traspuestos en SITGEQ (ambos válidos)
const LUIS = { fecha: D_MAR, pab: 'Pabellón 2', nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '08:10' };
const tablaAnaLuis = () => [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: RT, hora: '09:00' }), filaTabla({ fecha: MAR, nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '08:00' })];
const resumen = (r) => { const c = r.conteos; return { prog: c.programados, susp: c.suspendidos, pct: c.pctSuspendidos, progR: c.progRealizadas, agreg: c.agregadas, urg: c.urgencias }; };

test('Vincular un candidato arrastra todos los registros de esa persona de SITGEQ, en cualquier orden de clic', () => {
  const casos = [
    ['suspendida y operada de urgencia', {
      enc: [LUIS, { fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'ANA SOTO PEREZ', run: RS, hora: '20:00' }],
      sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: RS, desc: 'Patología aguda' }] }, { prog: 2, susp: 1, pct: 50, progR: 1, agreg: 0, urg: 1 }],
    ['suspendida en la mañana y operada electiva en la tarde', {
      enc: [LUIS, { fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: RS, hora: '15:00' }],
      sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: RS, desc: 'Falta de ayuno' }] }, { prog: 2, susp: 0, pct: 0, progR: 2, agreg: 0, urg: 0 }],
    ['electiva y urgencia el mismo día, sin suspensión', {
      enc: [LUIS, { fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: RS, hora: '09:10' },
        { fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'ANA SOTO PEREZ', run: RS, hora: '21:00' }] }, { prog: 2, susp: 0, pct: 0, progR: 2, agreg: 0, urg: 1 }],
  ];
  for (const [nombre, datos, esperado] of casos) {
    const f = fuentes(Object.assign({ tabla: tablaAnaLuis() }, datos));
    const ana = U.cotejarDia(MAR, f, {}).pacientes.find(p => p.origen === 'tabla' && p.nombre === 'ANA SOTO PEREZ');
    assert.ok(ana.candidatos.length >= 2, nombre);
    for (const c of ana.candidatos) {
      const r = U.cotejarDia(MAR, f, { vinc: { [c.id]: ana.id } });
      assert.deepEqual(resumen(r), esperado, nombre + ' · clic en ' + c.texto);
      assert.equal(r.pacientes.length, 2, nombre);
      assert.equal(r.pendientes.filter(p => p.tipo === 'estado').length, 0, nombre);
    }
  }
});

test('"No es este paciente" vale para todos los registros de esa persona de SITGEQ', () => {
  // ANA en la tabla sin RUN; en SITGEQ, dos suspensiones de ANA con RUN, enlazadas por nombre
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: 'S/I', hora: '09:00' })], enc: [],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: RT, desc: 'Rechaza operación' }, { fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: RT, desc: 'Falta de ayuno' }] });
  const r0 = U.cotejarDia(MAR, f, {});
  assert.deepEqual(r0.suspensiones.map(s => s.enlace), ['nombre', 'nombre']);
  assert.deepEqual(resumen(r0), { prog: 1, susp: 1, pct: 100, progR: 0, agreg: 0, urg: 0 });
  for (const s of r0.suspensiones) {
    const r = U.cotejarDia(MAR, f, { vinc: { [s.id]: '_ninguno' } });
    assert.deepEqual(r.suspensiones.map(x => x.desvinculado), [true, true]);
    assert.equal(new Set(r.suspensiones.map(x => x.paciente.id)).size, 1, 'las dos suspensiones quedan en el mismo paciente');
    assert.deepEqual(resumen(r), { prog: 2, susp: 1, pct: 50, progR: 0, agreg: 0, urg: 0 });
    assert.equal(pac(r, 'ANA SOTO PEREZ').estado, 'SIN_REGISTRO');
    assert.equal(pac(r, 'ANA SOTO PEREZ').candidatos.length, 0, 'no vuelve a ofrecer lo que se marcó "no es este paciente"');
    assert.equal(r.pendientes.filter(p => p.tipo === 'estado').length, 1);
  }
});

test('Dos cirugías del mismo paciente, pabellón y tipo: cada decisión sigue a su cirugía aunque el re-export cambie el orden', () => {
  const aseo = { fecha: D_MAR, pab: 'Pabellón 1', tipoCx: 'Urgencia', nombre: 'PEDRO TAPIA LARA', run: run(12345678), hora: '10:00', propuesta: 'ASEO QUIRURGICO', interv: 'ASEO QUIRURGICO' };
  const lapa = Object.assign({}, aseo, { hora: '', propuesta: 'LAPAROTOMIA', interv: '' });
  const ids = (lista) => Object.fromEntries(U.leerEncuentros([ENC_HDR, ...lista.map(filaEnc)], 'enc.xlsx').map(e => [e.propuesta, e.id]));
  const antes = ids([aseo, lapa]);
  const despues = ids([Object.assign({}, lapa, { hora: '18:00', interv: 'LAPAROTOMIA EXPLORADORA' }), aseo]);
  assert.ok(antes['ASEO QUIRURGICO'] && antes.LAPAROTOMIA && antes['ASEO QUIRURGICO'] !== antes.LAPAROTOMIA);
  assert.deepEqual(despues, antes);
});

test('Fila repetida de cirugía menor: no se suma, pero se puede volver a contar a mano', () => {
  const menor = { fecha: D_MAR, pab: 'Pabellón 1', nombre: 'C TRES', run: run(11000003), tipo: 'Cirugía Menor', mayor: 0, menor: 1, proc: 1, hora: '10:00' };
  const f = fuentes({ enc: [menor, menor] });
  const r = U.cotejarDia(MAR, f, { conf });
  assert.equal(r.conteos.menores, 1);
  const rep = r.encuentros.find(e => e.repetida);
  assert.equal(rep.claseFinal, 'NO_CONTAR');
  const r2 = U.cotejarDia(MAR, f, { conf, enc: { [rep.id]: { clase: 'NO_MAYOR' } } });
  assert.equal(r2.conteos.menores, 2);
  assert.equal(r2.conteos.procedimientos, 2);
});

test('Con varios días cargados, el día sin informe de suspensiones lo sigue pidiendo', () => {
  const LUN = '2026-03-16', D_LUN = '16-03-2026';
  const f = fuentes({
    tabla: [filaTabla({ fecha: LUN, nombre: 'LUIS ROJAS DIAZ', run: run(9876543) }), filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: RT, hora: '09:00' })],
    enc: [{ fecha: D_LUN, pab: 'Pabellón 2', nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '08:10' }, { fecha: D_MAR, pab: 'Pabellón 2', nombre: 'ANA SOTO PEREZ', run: RT, hora: '09:05' }],
    sus: [{ fecha: D_LUN, nombre: 'EVA MORA LARA', run: run(7654321), desc: 'Rechaza operación' }] });
  const pend = U.cotejarDia(MAR, f, {}).pendientes.filter(p => p.clave === 'sinSuspensiones');
  assert.equal(pend.length, 1);
  assert.match(pend[0].texto, /no traen este día/);
  assert.equal(U.cotejarDia(LUN, f, {}).pendientes.filter(p => p.clave === 'sinSuspensiones').length, 0);
});

test('Controles: el desglose de suspensiones por tipo suma el total; aviso si el % usa programados sin hora conocida', () => {
  const f = fuentes({ tabla: [filaTabla({ fecha: MAR, nombre: 'ANA SOTO PEREZ', run: RT, hora: '11:00' }), filaTabla({ fecha: MAR, nombre: 'EVA MORA LARA', run: run(7654321), hora: '17:30' }),
      filaTabla({ fecha: MAR, nombre: 'LUIS ROJAS DIAZ', run: run(9876543), hora: '08:00', agend: 'CONDICIONAL' })],
    enc: [{ fecha: D_MAR, pab: 'Pabellón 2', nombre: 'OTRO PACIENTE', run: run(11000009), hora: '10:00' }],
    sus: [{ fecha: D_MAR, nombre: 'ANA SOTO PEREZ', run: RT }, { fecha: D_MAR, nombre: 'EVA MORA LARA', run: run(7654321) },
      { fecha: D_MAR, nombre: 'LUIS ROJAS DIAZ', run: run(9876543), agend: 'CONDICIONAL', clase: 'Procedimiento' }] });
  const r = U.cotejarDia(MAR, f, {});
  const ctl = r.controles.find(c => /Suspensiones por tipo/.test(c.texto));
  assert.ok(ctl && ctl.ok, JSON.stringify(ctl));
  assert.match(ctl.texto, /1 UGCQ \+ 1 condicionales \+ 1 fuera de horario\) = suspendidos \(3\)/);
  assert.ok(!r.avisos.some(a => /sin hora programada conocida/.test(a)));
  const sinTabla = U.cotejarDia(MAR, fuentes({ enc: [LUIS] }), { conf });
  assert.ok(sinTabla.avisos.some(a => /1 programado sin hora programada conocida/.test(a)), JSON.stringify(sinTabla.avisos));
});
