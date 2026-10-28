// Variantes de la tabla quirúrgica en PDF (datos sintéticos). Ejecutar con: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../ugcq_core.js');
const G = require('./helpers/generador_tabla.js');
const { fila, pagina, esperado, barajar } = G;

const T0 = { t: 'titulo', fecha: '17-03-2026' };
const E = { t: 'encab' };
const S = (n) => ({ t: 'seccion', txt: 'PABELLÓN ' + n });
const unaLinea = (p) => fila(Object.assign({
  nombre: ['ANA SOTO'], run: '15234567-4', diag: ['HERNIA'], op: ['HERNIOPLASTIA'], plano: 'No aplica', cir: 'Dr. EVA', ayud1: '-', ayud2: '-',
  anest: 'RAUL', tipoAnest: 'GENERAL', obs: ['CMA'],
}, p));
const nora = (p) => fila(Object.assign({ hora: '11:20', run: ['9876543-', '3'], nombre: ['NORA', 'DIAZ'] }, p));
const vera = (p) => fila(Object.assign({ hora: '14:00', run: ['12345678-', '5'], nombre: ['VERA', 'ROJAS'] }, p));

function comprobar(paginas, filasEsp, extra) {
  const r = U.parsearTablaPDF(paginas, 'prueba.pdf');
  assert.equal(r.fecha, '2026-03-17', 'fecha');
  const leidas = r.filas.map(f => ({ run: f.run, nombre: f.nombre, hora: f.hora, pabellon: f.pabellon, agend: f.agend, obs: f.obs }));
  const esperadas = filasEsp.map(e => Object.assign(e, extra || {}));
  assert.deepEqual(leidas, esperadas);
  return r;
}
const variante = (nombre, bloquesPorPagina, opciones = {}) => test('Tabla PDF: ' + nombre, () => {
  const semillas = opciones.semillas || [null];
  for (const s of semillas) {
    let paginas = bloquesPorPagina.map(b => pagina(b, opciones.geo || {}));
    if (s != null) paginas = paginas.map(p => ({ items: barajar(p.items, s) }));
    comprobar(paginas, bloquesPorPagina.flat().filter(b => b.t === 'fila').map(esperado));
  }
});

variante('filas de una sola línea', [[T0, E, S(2),
  unaLinea({ hora: '08:00' }), unaLinea({ hora: '09:00', run: '9876543-3', nombre: ['NORA DIAZ'] }), unaLinea({ hora: '10:00', run: '12345678-5', nombre: ['VERA ROJAS'] })]]);
variante('una línea con observaciones de 2 y 3 líneas', [[T0, E, S(2),
  unaLinea({ obs: ['CMA // SIN SINTOMATOLOGIA RESPIRATORIA // CAJA DE PRUEBA + INSUMO DE PRUEBA', 'CONTINUACION'] }),
  unaLinea({ hora: '09:00', run: '9876543-3', nombre: ['NORA DIAZ'], obs: ['CMA // TEXTO LARGO DE PRUEBA QUE OCUPA TODA LA LINEA', 'SEGUNDA', 'TERCERA'] })]]);
variante('filas muy altas', [[T0, E, S(2),
  fila({ nombre: ['MARIA', 'JOSE', 'DE LOS', 'ANGELES', 'PEREZ', 'SOTO'], diag: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'], op: ['O1', 'O2', 'O3', 'O4', 'O5'] }),
  nora({ hora: '13:00' }),
  fila({ hora: '15:00', nombre: ['VERA', 'ROJAS', 'CAMPOS', 'LUNA', 'MAR', 'SOL'], run: '12345678-5', agend: ['Electivo', 'Condicional'], cond: 'Sí' })]]);
variante('filas sin línea "Obs:"', [[T0, E, S(2),
  fila({ obs: null, nombre: ['MARIA', 'JOSE', 'DE LOS', 'ANGELES', 'PEREZ', 'SOTO'], diag: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'] }),
  unaLinea({ obs: null, hora: '11:00', run: '9876543-3', nombre: ['NORA DIAZ'] }),
  vera({ obs: null, hora: '13:00' })]]);
variante('"Obs:" vacío', [[T0, E, S(2), fila({ obs: [] }), nora({ obs: [] }), unaLinea({ hora: '12:00', run: '12345678-5', nombre: ['VERA ROJAS'], obs: [] })]]);
variante('observaciones con varias líneas de continuación', [[T0, E, S(2),
  fila({ obs: ['LINEA UNO DE OBSERVACIONES', 'LINEA DOS', 'LINEA TRES'] }), nora({ obs: ['L1', 'L2', 'L3', 'L4'] }), vera({ hora: '13:00' })]]);
variante('observación que empieza con una hora', [[T0, E, S(2), fila({ obs: ['08:00 HRS INGRESO A CMA // AYUNO 8 HRS'] }), nora()]]);
variante('continuación de observación que es solo una hora', [[T0, E, S(2),
  fila({ obs: ['CMA // PACIENTE DEBE PRESENTARSE EN ADMISION A LAS', '07:30'] }), nora({ nombre: ['NORA', 'DIAZ', 'PEREZ', 'SOTO'] })]]);
variante('observaciones con "PABELLON ..." y "FECHA: ..."', [[T0, E, S(2),
  fila({ obs: ['PABELLON LIBRE DE LATEX // SIN SINTOMATOLOGIA RESPIRATORIA', 'SUSPENDIDO 03/03/26 POR FALTA DE CAMA'] }),
  fila({ hora: '09:00', run: ['9876543-', '3'], nombre: ['NORA', 'DIAZ'], obs: ['CMA // REPROGRAMADA', 'FECHA: 03-03-2026 SUSPENDIDA POR FALTA DE CAMA', 'PABELLON LIBRE DE LATEX // INSUMOS'] }),
  vera()]]);
variante('observación con fecha y orden de textos mezclado', [[T0, E, S(2),
  fila({ obs: ['REPROGRAMADO // FECHA: 03-03-2026 SUSPENDIDO POR FALTA DE CAMA'] }), nora()]], { semillas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
variante('"Obs:" pegado al texto', [[T0, E, S(2),
  fila({ obsPegado: true, obs: ['CMA // SIN LATEX'] }), nora({ obsPegado: true, obs: ['MQ2 // PABELLON LIBRE DE LATEX'] }),
  unaLinea({ obsPegado: true, hora: '13:00', run: '12345678-5', nombre: ['VERA ROJAS'], obs: ['CMA'] })]]);
variante('tres secciones en una página', [[T0, E, S(1), fila({ pab: ['Pabellón', '1'] }), E, S(2), nora({ hora: '09:00' }),
  E, S(3), vera({ pab: ['Pabellón', '3'], hora: '10:00' }), E, S(4), fila({ pab: ['Pabellón', '4'], hora: '10:30', run: ['7654321-', '6'], nombre: ['MORA', 'PINTO'] })]]);
variante('encabezado repetido', [[T0, E, E, S(2), fila({}), E, nora()]]);
variante('página sin encabezado', [[T0, E, S(2), fila({}), nora()], [vera(), fila({ hora: '15:30', run: '7654321-6', nombre: ['MORA', 'PINTO'] })]]);
variante('RUN con K, con puntos y pasaporte', [[T0, E, S(2),
  fila({ run: '15234567-4' }), fila({ hora: '09:00', run: ['17567375-', 'K'], nombre: ['KARLA', 'KAST'] }),
  fila({ hora: '10:00', run: ['15.234.567-', '4'], nombre: ['PEDRO', 'PUNTO'] }), fila({ hora: '11:00', run: ['PASAPORTE', 'AB123456'], nombre: ['JEAN', 'PIERRE'] })]]);
variante('hora vacía, con y sin observaciones', [[T0, E, S(2), fila({}), nora({ hora: '' }), vera(), fila({ obs: null, hora: '15:00', run: '7654321-6', nombre: ['MORA'] }),
  fila({ obs: null, hora: '', run: '6543210-2', nombre: ['TORO'] }), fila({ obs: null, hora: '16:00', run: '16777888-7', nombre: ['URIBE'] })]]);
variante('sin columna Tipo Agendamiento (Condicionalidad Si/Sí/SI)', [[T0, { t: 'encab', o: { sinAgend: true } }, S(2),
  fila({ agend: [], cond: 'Si' }), nora({ agend: [], cond: 'Sí' }), vera({ agend: [], cond: 'No' })]]);
variante('rótulo "Tipo Agendamiento" en una línea', [[T0, { t: 'encab', o: { agendUnaLinea: true } }, S(2), fila({ agend: ['Electivo', 'Condicional'], cond: 'Sí' }), nora()]]);
const base = () => [[T0, E, S(2), fila({}), nora({ agend: ['Electivo', 'Condicional'], cond: 'Sí' }), E, S(4), fila({ pab: ['Pabellón', '4'], hora: '15:00', run: '12345678-5', nombre: ['VERA', 'ROJAS'] })]];
variante('tabla desplazada', base(), { geo: { dx: 35, dy: -45 } });
variante('columnas más anchas', base(), { geo: { sx: 1.12 } });
variante('columnas más angostas', base(), { geo: { sx: 0.93 } });
variante('orden de textos mezclado', base(), { semillas: [1, 2, 3, 7] });
variante('hora con texto ("08:00 hrs") y sin observaciones', [[T0, E, S(2), fila({ obs: null, hora: '08:00 hrs' }), nora({ obs: null, hora: '11:20 hrs' })]]);

test('Tabla PDF: otra escala (zoom o fuente distinta)', () => {
  const filas = [fila({ obs: ['CMA // CAJA DE PRUEBA', 'CONTINUACION DE OBSERVACIONES'] }), nora({ agend: ['Electivo', 'Condicional'], cond: 'Sí' }),
    unaLinea({ hora: '13:00', run: '12345678-5', nombre: ['VERA ROJAS'] })];
  const b = pagina([T0, E, S(2), ...filas]);
  for (const s of [0.8, 0.9, 1.1, 1.25, 1.5]) {
    const items = b.items.map(i => ({ str: i.str, x: 30 + (i.x - 30) * s, y: 560 + (i.y - 560) * s, w: i.w * s }));
    comprobar([{ items }], filas.map(esperado));
  }
});

// Filas cortadas entre páginas: se mueve a una página nueva todo lo que queda bajo yCorte
function partir(bloques, yCorte, conEncabezado) {
  const p1 = pagina(bloques).items;
  const arriba = p1.filter(i => i.y >= yCorte), abajo = p1.filter(i => i.y < yCorte);
  const yTop = Math.max(...abajo.map(i => i.y));
  const destino = conEncabezado ? 537.91 - 21.36 : 530;
  return [{ items: arriba }, { items: (conEncabezado ? pagina([E]).items : []).concat(abajo.map(i => Object.assign({}, i, { y: i.y - yTop + destino }))) }];
}
test('Tabla PDF: observaciones de una fila en la página siguiente', () => {
  const filas = [fila({}), nora({ obs: ['SUSPENDIDO 03/03/26 // CMA'] }), vera()];
  const bloques = [T0, E, S(2), ...filas];
  const yObs = pagina(bloques).items.filter(i => i.str === 'Obs:')[1].y;
  comprobar(partir(bloques, yObs + 0.5, true), filas.map(esperado));
});
test('Tabla PDF: fila alta partida a la mitad entre páginas', () => {
  const filas = [fila({}), nora({ nombre: ['NORA', 'DE', 'LAS', 'MERCEDES', 'DIAZ', 'SOTO'], agend: ['Electivo', 'Condicional'], cond: 'Sí' }), vera()];
  const bloques = [T0, E, S(2), ...filas];
  const it = pagina(bloques).items;
  const r = comprobar(partir(bloques, (it.find(i => i.str === 'LAS').y + it.find(i => i.str === 'MERCEDES').y) / 2, true), filas.map(esperado));
  assert.ok(r.filas[1].avisos.some(a => a.includes('cortada entre páginas')));
});
test('Tabla PDF: página siguiente sin encabezado', () => {
  const filas = [fila({}), nora({ nombre: ['NORA', 'DE', 'LAS', 'MERCEDES', 'DIAZ', 'SOTO'] }), vera()];
  const bloques = [T0, E, S(2), ...filas];
  const yObs = pagina(bloques).items.filter(i => i.str === 'Obs:')[0].y;
  comprobar(partir(bloques, yObs - 1, false), filas.map(esperado));
});
test('Tabla PDF: título de sección en minúsculas y celda Pabellón vacía', () => {
  const filas = [fila({ pab: [] }), nora({ pab: [] })];
  comprobar([pagina([T0, E, { t: 'seccion', txt: 'Pabellón 2' }, ...filas])], filas.map(esperado).map(e => Object.assign(e, { pabellon: 'Pabellón 2' })));
});
test('Tabla PDF: "Fecha:" y la fecha en textos separados', () => {
  const p = pagina([T0, E, S(2), fila({})]);
  p.items = p.items.flatMap(i => i.str.startsWith('Fecha: ') ? [{ str: 'Fecha:', x: i.x, y: i.y, w: 24 }, { str: i.str.slice(7), x: i.x + 27, y: i.y, w: 45 }] : [i]);
  comprobar([p], [esperado(fila({}))]);
});
