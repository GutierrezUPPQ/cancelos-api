// Pruebas del lector/escritor de Excel propio y de la versión portátil. Ejecutar con: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const X = require('../ugcq_xlsx.js');
const U = require('../ugcq_core.js');

const enc = new TextEncoder();
const UNO = [{ nombre: 'hoja1', filas: [['Texto', 'Número', 'Vacío', 'Bool'], ['  con espacios', 42, null, true], ['<&> "comillas"', 3.5, '', false]] }];

test('Excel: lo que se escribe se vuelve a leer igual', async () => {
  const bytes = X.escribirXlsx(UNO.concat([{ nombre: 'Otra: hoja/rara*', filas: [['x']] }]));
  assert.equal(bytes[0], 0x50); assert.equal(bytes[1], 0x4B);
  const hojas = await X.leerPlanilla(bytes, 'a.xlsx');
  assert.deepEqual(hojas.map(h => h.nombre), ['hoja1', 'Otra  hoja rara']);
  assert.deepEqual(hojas[0].filas, [['Texto', 'Número', 'Vacío', 'Bool'], ['  con espacios', 42, null, true], ['<&> "comillas"', 3.5, null, false]]);
});

test('Excel: fila UGCQ con 119 columnas, tipos como el reporte', async () => {
  const c = { programados: 9, condicionales: 1, suspendidos: 1, pctSuspendidos: 11, progRealizadas: 8, condRealizadas: 1, agregadas: 0, urgencias: 4, menores: 3, procedimientos: 27, totalMayoresElectivas: 9, totalRealizado: 43 };
  const fila = U.filaUGCQ('2026-10-05', c, { 103: 1 }, {});
  const [h] = await X.leerPlanilla(X.escribirXlsx([{ nombre: 'hoja1', filas: [U.ENCABEZADOS, fila] }]), 'u.xlsx');
  assert.deepEqual(h.filas[0], U.ENCABEZADOS);
  assert.equal(h.filas[1].length, 104);
  assert.deepEqual(h.filas[1].slice(0, 23), fila.slice(0, 23));
  assert.equal(typeof h.filas[1][1], 'string');
  assert.equal(typeof h.filas[1][4], 'number');
  assert.equal(h.filas[1][6], '              V');
  assert.equal(h.filas[1][103], 1);
  const leidas = U.leerUGCQ(h.filas);
  assert.equal(leidas[0].fecha, '2026-10-05');
  assert.deepEqual(U.compararFilas(fila, leidas[0].fila), []);
});

test('Excel: texto compartido, texto en línea, prefijos y celdas sin referencia', async () => {
  // Libro armado a mano como lo haría otro generador (sharedStrings con texto enriquecido, prefijo x:)
  const archivos = {
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    'xl/workbook.xml': '<?xml version="1.0"?><x:workbook xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><x:sheets><x:sheet name="Datos" sheetId="1" r:id="rId7"/></x:sheets></x:workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/hoja.xml"/><Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="strs.xml"/></Relationships>',
    'xl/strs.xml': '<?xml version="1.0"?><x:sst xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:si><x:t>Fecha intervención</x:t></x:si><x:si><x:r><x:t>Tipo de </x:t></x:r><x:r><x:rPr/><x:t>cirugía</x:t></x:r><x:rPh><x:t>NO</x:t></x:rPh></x:si><x:si><x:t>A &amp; B &#233;</x:t></x:si></x:sst>',
    'xl/worksheets/hoja.xml': '<?xml version="1.0"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData><x:row r="2"><x:c r="B2" t="s"><x:v>0</x:v></x:c><x:c t="s"><x:v>1</x:v></x:c></x:row><x:row><x:c t="inlineStr"><x:is><x:t>en línea</x:t></x:is></x:c><x:c t="s"><x:v>2</x:v></x:c><x:c r="D3"><x:v>46323</x:v></x:c><x:c r="E3" t="str"><x:f>A1</x:f><x:v>fórmula</x:v></x:c></x:row></x:sheetData></x:worksheet>',
  };
  const zip = crearZipPrueba(archivos);
  const hojas = await X.leerPlanilla(zip, 'raro.xlsx');
  assert.equal(hojas.length, 1);
  assert.equal(hojas[0].nombre, 'Datos');
  assert.deepEqual(hojas[0].filas, [[], [null, 'Fecha intervención', 'Tipo de cirugía'], ['en línea', 'A & B é', null, 46323, 'fórmula']]);
});

test('CSV (; y latin-1) y tablas HTML con extensión .xls', async () => {
  const latin1 = Uint8Array.from([...'Fecha;Nombre;Edad\r\n28-10-2026;"Muñoz; José";056\r\n'].map(ch => ch.charCodeAt(0)));
  const [csv] = await X.leerPlanilla(latin1, 'a.csv');
  assert.deepEqual(csv.filas, [['Fecha', 'Nombre', 'Edad'], ['28-10-2026', 'Muñoz; José', '056']]);
  const html = enc.encode('<html><body><table><tr><th>RUT</th><th>NOMBRE</th></tr><tr><td>1-9</td><td>Ana &amp; <b>Luis</b></td></tr></table></body></html>');
  const [t] = await X.leerPlanilla(html, 'export.xls');
  assert.deepEqual(t.filas, [['RUT', 'NOMBRE'], ['1-9', 'Ana & Luis']]);
});

test('Excel antiguo .xls: mensaje claro', async () => {
  await assert.rejects(X.leerPlanilla(Uint8Array.from([0xD0, 0xCF, 0x11, 0xE0, 0, 0, 0, 0]), 'viejo.xls'), /\.xlsx/);
});

test('Versión portátil: un solo archivo, sin recursos externos', () => {
  const html = execFileSync('python3', ['-c', 'import ugcq_portable,sys; sys.stdout.write(ugcq_portable.armar())'], { cwd: path.join(__dirname, '..'), maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
  assert.ok(html.length > 1500000, 'incluye pdf.js');
  assert.ok(!/<script[^>]+src=/i.test(html), 'no carga scripts externos');
  assert.ok(!/<link[^>]+href="https?:/i.test(html), 'no carga hojas de estilo externas');
  assert.ok(html.includes('window.UGCQ_PORTABLE = true'));
  assert.ok(html.includes('function cotejarDia'));
  assert.ok(html.includes('function escribirXlsx'));
  assert.ok(!html.includes('<!--PORTATIL-->'));
});

// ZIP mínimo (sin compresión) para armar libros de prueba a mano
function crearZipPrueba(archivos) {
  const nombres = Object.keys(archivos);
  const partes = [], centrales = [];
  let off = 0;
  for (const n of nombres) {
    const nom = enc.encode(n), d = enc.encode(archivos[n]), crc = X.crc32(d);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(crc, 14); h.writeUInt32LE(d.length, 18); h.writeUInt32LE(d.length, 22); h.writeUInt16LE(nom.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt32LE(crc, 16); c.writeUInt32LE(d.length, 20); c.writeUInt32LE(d.length, 24); c.writeUInt16LE(nom.length, 28); c.writeUInt32LE(off, 42);
    partes.push(h, nom, d); centrales.push(c, nom);
    off += 30 + nom.length + d.length;
  }
  const tam = centrales.reduce((s, b) => s + b.length, 0);
  const fin = Buffer.alloc(22); fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(nombres.length, 8); fin.writeUInt16LE(nombres.length, 10); fin.writeUInt32LE(tam, 12); fin.writeUInt32LE(off, 16);
  return new Uint8Array(Buffer.concat([...partes, ...centrales, fin]));
}

test('dist/Cierre_UGCQ.html está al día con el código (si falla: python3 ugcq_portable.py dist/Cierre_UGCQ.html)', () => {
  const fs = require('node:fs');
  const html = execFileSync('python3', ['-c', 'import ugcq_portable,sys; sys.stdout.write(ugcq_portable.armar())'], { cwd: path.join(__dirname, '..'), maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
  assert.ok(html === fs.readFileSync(path.join(__dirname, '..', 'dist', 'Cierre_UGCQ.html'), 'utf8'), 'la versión portátil publicada no coincide con el código');
});
