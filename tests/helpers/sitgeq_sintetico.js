// Exportaciones SITGEQ SINTÉTICAS (nombres y RUN inventados) para probar el motor de cotejo.
'use strict';
const U = require('../../ugcq_core.js');

function dv(cuerpo) {
  let s = 0, m = 2;
  const c = String(cuerpo);
  for (let i = c.length - 1; i >= 0; i--) { s += Number(c[i]) * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
const run = (cuerpo) => cuerpo + '-' + dv(cuerpo);

// Mismas columnas que el export real de encuentros quirúrgicos
const ENC_HDR = ['Fecha intervención', 'Servicio clínico', 'Especialidad', 'Pabellón', 'Tipo de cirugía', 'Intervención propuesta', 'Intervención realizada', 'Códigos intervención', 'Tipo de Anestesia', 'Diagnóstico(s)', 'Cód Diagnóstico(s)', 'Previsión', 'Nombre paciente', 'RUN / Identificación', 'Tipo', 'Cirugía Mayor', 'Cirugía Menor', 'Procedimiento', 'CMA', 'Reintervención', 'Edad', 'Sexo', 'Protocolo', 'Medico Cirujano', 'Primer Ayudante', 'Segundo Ayudante', 'Anestesiólogo', 'Auxiliar Anestesiólogo', 'Arsenalero', 'Pabellonero', 'Hora Ingreso Serv. Pabellón', 'Hora Ingreso Quirófano'];
// Por defecto cada cirugía trae su código de anestesia (2201001), que UGCQ cuenta como procedimiento
function filaEnc({ fecha, pab = 'Pabellón 1', tipoCx = 'Electivo Normal', nombre, run: r, tipo = 'Cirugía Mayor', hora = '', interv = 'Cirugía X', propuesta = null, mayor, menor, proc, codigos }) {
  const f = new Array(ENC_HDR.length).fill(null);
  const nMayor = mayor != null ? mayor : tipo === 'Cirugía Mayor' ? 1 : 0;
  const nMenor = menor != null ? menor : tipo === 'Cirugía Menor' ? 1 : 0;
  const nProc = proc != null ? proc : (tipo === 'Procedimiento' ? 1 : 0) + 1;
  Object.assign(f, { 0: fecha, 1: 'SERVICIO X', 3: pab, 4: tipoCx, 5: propuesta, 6: interv, 7: codigos || '0000000\n2201001', 12: nombre, 13: r, 14: tipo,
    15: nMayor, 16: nMenor, 17: nProc, 31: hora });
  return f;
}
const SUS_HDR = ['RUT', 'NOMBRE', 'FECHA CIRUGÍA', 'SERVICIO CLÍNICO', 'CAUSAL MINSAL', 'DESCRIPCIÓN CAUSAL', 'GES', 'TIPO SOLICITUD', 'COD. INTERVENCIÓN PROPUESTA', 'DESCRIPCIÓN INTERVENCIÓN PROPUESTA', 'CIRUGÍA MAYOR', 'TIPO DE AGENDAMIENTO'];
function filaSus({ fecha, nombre, run: r, cat = 'Paciente', desc = 'No se presenta', clase = 'Cirugía Mayor', agend = 'DIRECTO', interv = 'Cirugía X' }) {
  return [r, nombre, fecha, 'SERVICIO X', cat, desc, 'NO', 'Hospitalizado', '1', interv, clase, agend];
}
// Fila de tabla con la forma que entrega parsearTablaPDF
let nT = 0;
function filaTabla({ fecha, nombre, run: r, agend = 'NORMAL', pab = 'Pabellón 2', hora = '08:00', op = 'Cirugía X', obs = '' }) {
  nT++;
  return { id: 'tabla.pdf#' + nT, archivo: 'tabla.pdf', fecha, nombre, run: r, pabellon: pab, hora, operacion: op, obs,
    agend, agendamiento: agend === 'CONDICIONAL' ? 'Electivo Condicional' : agend === 'NORMAL' ? 'Electivo Normal' : 'Urgencia', avisos: [] };
}
function fuentes({ tabla = null, enc = null, sus = null }) {
  return {
    tabla: tabla ? { cargada: true, filas: tabla } : { cargada: false, filas: [] },
    encuentros: enc ? { cargado: true, filas: U.leerEncuentros([ENC_HDR, ...enc.map(filaEnc)], 'enc.xlsx') } : { cargado: false, filas: [] },
    suspensiones: sus ? { cargado: true, filas: U.leerSuspensiones([SUS_HDR, ...sus.map(filaSus)], 'sus.xlsx') } : { cargado: false, filas: [] },
  };
}
const col = (h) => { const i = U.ENCABEZADOS.indexOf(h); if (i < 0) throw new Error('no existe ' + h); return i; };
module.exports = { U, dv, run, filaEnc, filaSus, filaTabla, fuentes, col, ENC_HDR, SUS_HDR };
