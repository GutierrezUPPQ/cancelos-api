// Generador de tablas quirúrgicas SINTÉTICAS en el formato que entrega pdf.js ({str,x,y,w}), con la geometría
// de la tabla SITGEQ/dompdf real (tests/fixtures/tabla_pdf_items.json). Sirve para probar variantes del PDF.
// Medidas tomadas del fixture:
//   interlineado dentro de una celda 11.235; última línea de un bloque -> primera del siguiente 14.98;
//   celdas centradas verticalmente; la celda "Pabellón" abarca (rowspan) la fila de datos + la fila "Obs:";
//   "Obs:" en x=97.26 (columna Hora), texto en x=116.71, líneas de continuación en x=97.26.
'use strict';

const LS = 11.235;
const GAP = 14.98;
const FS = 7.68;

// Anchos Helvetica (1/1000 em) para estimar w como lo haría pdf.js
const HV = {' ':278,'!':278,'"':355,'#':556,'$':556,'%':889,'&':667,"'":191,'(':333,')':333,'*':389,'+':584,',':278,'-':333,'.':278,'/':278,
  '0':556,'1':556,'2':556,'3':556,'4':556,'5':556,'6':556,'7':556,'8':556,'9':556,':':278,';':278,'<':584,'=':584,'>':584,'?':556,'@':1015,
  A:667,B:667,C:722,D:722,E:667,F:611,G:778,H:722,I:278,J:500,K:667,L:556,M:833,N:722,O:778,P:667,Q:778,R:722,S:667,T:611,U:722,V:667,W:944,X:667,Y:667,Z:611,
  '[':278,'\\':278,']':278,'^':469,'_':556,'`':333,a:556,b:556,c:500,d:556,e:556,f:278,g:556,h:556,i:222,j:222,k:500,l:222,m:833,n:556,o:556,p:556,q:556,r:333,s:500,t:278,u:556,v:500,w:722,x:500,y:500,z:500,
  '{':334,'|':260,'}':334,'~':584};
function ancho(s, fs = FS) {
  let t = 0;
  for (const ch of String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')) t += HV[ch] || 556;
  return +(t * fs / 1000).toFixed(2);
}

// Encabezado de la tabla 1 de la página 1 del fixture: [texto, x, dy respecto del centro, w]
const ENCAB = [
  ['Pabellón', 59.77, 0, 33.23], ['Hora', 97.89, 0, 18.31], ['Nombre', 128.7, 0, 30.28], ['Run', 181.92, 0, 14.92],
  ['Edad', 214.22, 0, 18.97], ['Diagnóstico', 243.19, 0, 45.28], ['Op. Propuesta', 308.66, 0, 54.81],
  ['Plano/Extremidad', 379.04, 0, 67.89], ['Cirujano', 460.58, 0, 31.95], ['Ayud. 1', 517.77, 0, 29.09],
  ['Ayud.', 562.01, 5.62, 21.99], ['2', 570.58, -5.61, 4.73], ['Anest.', 597.53, 0, 24.6], ['Tipo Anest.', 640.23, 0, 43.47],
  ['GES', 692.02, 0, 15.12], ['Tiempo', 716.63, 5.62, 28.21], ['Ocupación ', 710.78, -5.61, 43.45],
  ['Condicionalidad', 754.23, 0, 61.17], ['Tipo', 838.99, 5.62, 16.51], ['Agendamiento', 819.47, -5.61, 55.83],
];
// Centro de cada columna de datos (= centro del rótulo) y alineación
const COLS = {
  pab: 76.38, hora: 107.05, nombre: 143.84, run: 189.38, edad: 223.7, diag: null /* izq 239.39 */, op: 336.07,
  plano: 412.99, cir: 476.56, ayud1: 532.3, ayud2: 573.0, anest: 609.83, tipoAnest: 661.97, ges: 699.58,
  tiempo: 730.7, cond: 784.8, agend: 847.2,
};
const DIAG_X = 239.39, OBS_X = 97.26, OBS_W = 17.41, OBS_TXT_X = 116.71;

/* opciones geométricas: { sx: escala de columnas en x (alrededor de 57.5), dx, dy, sinAgend, sinCond, agendUnaLinea,
   encabMod: fn(listaEncab) } */
function X(x, o) { return +(((x - 57.5) * (o.sx || 1) + 57.5 + (o.dx || 0))).toFixed(2); }
function Y(y, o) { return +((y + (o.dy || 0))).toFixed(2); }

function itemsEncabezado(yc, o) {
  let lista = ENCAB.map(([s, x, dy, w]) => ({ s, x: x + w / 2, dy, w }));
  if (o.sinAgend) lista = lista.filter(e => e.s !== 'Tipo' && e.s !== 'Agendamiento');
  if (o.agendUnaLinea) lista = lista.filter(e => e.s !== 'Tipo' && e.s !== 'Agendamiento').concat([{ s: 'Tipo Agendamiento', x: 847.2, dy: 0, w: ancho('Tipo Agendamiento') }]);
  if (o.encabMod) lista = o.encabMod(lista);
  return lista.map(e => ({ str: e.s, x: +(X(e.x, o) - e.w / 2).toFixed(2), y: Y(yc + e.dy, o), w: e.w }));
}

function lineasCelda(lineas, centro, campo, o) {
  const k = lineas.length;
  return lineas.map((s, i) => {
    const y = centro + (k - 1) / 2 * LS - i * LS;
    const w = ancho(s);
    const x = campo === 'diag' ? X(DIAG_X, o) : +(X(COLS[campo], o) - w / 2).toFixed(2);
    return { str: s, x, y: Y(y, o), w };
  });
}

const CAMPOS_DATOS = ['hora', 'nombre', 'run', 'edad', 'diag', 'op', 'plano', 'cir', 'ayud1', 'ayud2', 'anest', 'tipoAnest', 'ges', 'tiempo', 'cond', 'agend'];
const arr = (v) => v == null ? [] : Array.isArray(v) ? v.filter(s => s !== '') : (String(v) === '' ? [] : [String(v)]);

// Devuelve { items, ultimaY } para una fila cuya primera línea de datos está en T
function itemsFila(f, T, o) {
  const celdas = {};
  for (const c of CAMPOS_DATOS) celdas[c] = arr(f[c]);
  const n = Math.max(1, ...CAMPOS_DATOS.map(c => celdas[c].length));
  const C = T - (n - 1) / 2 * LS;
  const B = T - (n - 1) * LS;
  const out = [];
  for (const c of CAMPOS_DATOS) out.push(...lineasCelda(celdas[c], C, c, o));
  let ultima = B;
  if (f.obs != null) {
    const Y0 = B - GAP;
    const lineas = Array.isArray(f.obs) ? f.obs : [f.obs];
    out.push({ str: 'Obs:', x: X(OBS_X, o), y: Y(Y0, o), w: OBS_W });
    if (f.obsPegado) { // "Obs:" y el texto en un mismo item
      out.pop();
      out.push({ str: 'Obs: ' + (lineas[0] || ''), x: X(OBS_X, o), y: Y(Y0, o), w: ancho('Obs: ' + (lineas[0] || '')) });
    } else if (lineas[0]) out.push({ str: lineas[0], x: X(OBS_TXT_X, o), y: Y(Y0, o), w: ancho(lineas[0]) });
    for (let j = 1; j < lineas.length; j++) out.push({ str: lineas[j], x: X(OBS_X, o), y: Y(Y0 - j * LS, o), w: ancho(lineas[j]) });
    ultima = Y0 - (Math.max(1, lineas.length) - 1) * LS;
  }
  const pab = arr(f.pab);
  const P = f.obs != null ? (T + ultima) / 2 : C;
  out.push(...lineasCelda(pab, P, 'pab', o));
  return { items: out, ultima };
}

/* Página: lista de bloques, de arriba hacia abajo.
   {t:'titulo', fecha:'17-03-2026'} | {t:'encab'} | {t:'seccion', txt:'PABELLÓN 2'} | {t:'fila', ...fila} | {t:'texto', str, x, gap} */
function pagina(bloques, o = {}, y0 = 537.91) {
  const items = [];
  let y = null, prev = null; // y = línea base de referencia del bloque anterior
  for (const b of bloques) {
    if (b.t === 'titulo') {
      const yt = y == null ? 536.36 : y - 28;
      items.push({ str: 'TABLA QUIRÚRGICA', x: X(394.78, o), y: Y(yt, o), w: 145.5 });
      items.push({ str: 'Fecha: ' + b.fecha, x: X(57.52, o), y: Y(yt - 21.46, o), w: ancho('Fecha: ' + b.fecha) });
      y = yt - 21.46; prev = 'fecha';
    } else if (b.t === 'encab') {
      const yc = y == null ? y0 : prev === 'fecha' ? y - 19.85 : prev === 'encab' ? y - 28 : y - 28.85;
      items.push(...itemsEncabezado(yc, Object.assign({}, o, b.o || {})));
      y = yc; prev = 'encab';
    } else if (b.t === 'seccion') {
      const ys = y == null ? 536 : prev === 'encab' ? y - 22.35 : y - 20;
      items.push({ str: b.txt, x: X(441.63, o), y: Y(ys, o), w: ancho(b.txt) });
      y = ys; prev = 'seccion';
    } else if (b.t === 'fila') {
      const T = y == null ? 520 : prev === 'encab' ? y - 21.36 : prev === 'seccion' ? y - 15.24 : y - GAP;
      const r = itemsFila(b, T, o);
      items.push(...r.items);
      y = r.ultima; prev = 'fila';
    } else if (b.t === 'texto') {
      const yt = y == null ? 540 : y - (b.gap || 20);
      items.push({ str: b.str, x: X(b.x, o), y: Y(yt, o), w: ancho(b.str) });
      y = yt; prev = 'texto';
    }
  }
  return { items };
}

// Fila "típica" (como las del fixture) a partir de pocos datos
function fila(p) {
  return Object.assign({
    t: 'fila', pab: ['Pabellón', '2'], hora: '08:00', nombre: ['ANA', 'LUIS', 'ROSA', 'JUAN'], run: ['15234567-', '4'], edad: '59',
    diag: ['TEXTO CLINICO 1', 'TEXTO CLINICO 2'], op: ['TEXTO CLINICO 3', 'TEXTO CLINICO 4'], plano: ['No aplica', '/ No aplica'],
    cir: ['Dr. EVA', 'CARMEN', 'DIEGO'], ayud1: ['Dr.', 'LAURA', 'PABLO SONIA'], ayud2: '-', anest: ['RAUL', 'IRENE', 'HUGO'],
    tipoAnest: ['ANESTESIA', 'GENERAL'], ges: 'No', tiempo: '120', cond: 'No', agend: ['Electivo Normal'],
    obs: ['CMA // SIN SINTOMATOLOGIA RESPIRATORIA'],
  }, p);
}

// Lo que se espera leer de una fila
function esperado(f) {
  const agTxt = arr(f.agend).join(' ');
  const nAg = agTxt.toLowerCase();
  let agend = 'NORMAL';
  if (nAg.includes('condicional')) agend = 'CONDICIONAL';
  else if (!nAg && /^s/i.test(String(f.cond || ''))) agend = 'CONDICIONAL';
  return {
    run: arr(f.run).join(''), nombre: arr(f.nombre).join(' '), hora: (String(f.hora || '').match(/^(\d{1,2})[:.](\d{2})/) || []).slice(1).map((v, i) => i ? v : v.padStart(2, '0')).join(':'),
    pabellon: arr(f.pab).join(' '), agend, obs: f.obs == null ? '' : arr(f.obs).join(' '),
  };
}

function barajar(items, semilla = 7) {
  const a = items.slice();
  let s = semilla;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

module.exports = { LS, GAP, FS, ancho, pagina, fila, esperado, barajar, itemsFila, ENCAB, COLS };
