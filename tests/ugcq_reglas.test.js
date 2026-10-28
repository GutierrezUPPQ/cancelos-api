// Reglas de conteo UGCQ y casos borde (datos sintéticos). Ejecutar con: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { U, run, filaTabla, fuentes, col } = require('./helpers/sitgeq_sintetico.js');

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
  const r2 = U.cotejarDia(MAR, f, { pac: { [id]: { estado: 'SUSPENDIDA', causalCol: col('(Paciente) Rechaza operación'), confirmado: true } } });
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
  const r2 = U.cotejarDia(MAR, f, { vinc: { [p.candidatos[0].id]: p.id } });
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
  assert.equal(U.cotejarDia(MAR, f, { conf: { 'pab:4': true } }).pendientes.length, 0);
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
