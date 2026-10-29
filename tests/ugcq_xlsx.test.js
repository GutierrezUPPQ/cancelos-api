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

test('Excel: escapes _xHHHH_ (retorno de carro), hojas ocultas y texto literal _x000D_', async () => {
  const libro = (hojas) => '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    hojas.map((h, i) => `<sheet name="${h}" sheetId="${i + 1}"${i === 0 ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>';
  const archivos = {
    'xl/workbook.xml': libro(['plantilla', 'Página 1']),
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>',
    'xl/sharedStrings.xml': '<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<si><t>Fecha_x000D_\nintervención</t></si><si><t xml:space="preserve">+ HERNIOPLASTIA_x000D_\n+ MALLA</t></si><si><t>2201001_x000D_\n1802003</t></si><si><t>_x005F_x000D_ literal</t></si></sst>',
    'xl/worksheets/sheet1.xml': '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>oculta</t></is></c></row></sheetData></worksheet>',
    'xl/worksheets/sheet2.xml': '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="str"><v>A_x000D_B</v></c></row></sheetData></worksheet>',
  };
  const hojas = await X.leerPlanilla(crearZipPrueba(archivos), 'x000D.xlsx');
  assert.deepEqual(hojas.map(h => [h.nombre, h.oculta]), [['plantilla', true], ['Página 1', false]]);
  assert.deepEqual(hojas[1].filas[0], ['Fecha\r\nintervención', '+ HERNIOPLASTIA\r\n+ MALLA', '2201001\r\n1802003', '_x000D_ literal', 'A\rB']);
  // El escritor protege un texto que ya trae la forma _xHHHH_, para que vuelva a leerse igual
  const [h] = await X.leerPlanilla(X.escribirXlsx([{ nombre: 'h', filas: [['_x000D_ y _x005F_']] }]), 'w.xlsx');
  assert.equal(h.filas[0][0], '_x000D_ y _x005F_');
});

test('CSV: una comilla a mitad de campo es texto; comillas sin cerrar dan un error claro', async () => {
  const txt = 'Pabellón;Intervención realizada;Proc\r\nPabellón 1;FRACTURA FALANGE 3" DEDO;1\r\nPabellón 2;"ASEO; DRENAJE";2\r\nPabellón 3;"PROTESIS ""3 PULGADAS""";3\r\n';
  const [csv] = await X.leerPlanilla(enc.encode(txt), 'e.csv');
  assert.deepEqual(csv.filas, [['Pabellón', 'Intervención realizada', 'Proc'], ['Pabellón 1', 'FRACTURA FALANGE 3" DEDO', 1], ['Pabellón 2', 'ASEO; DRENAJE', 2], ['Pabellón 3', 'PROTESIS "3 PULGADAS"', 3]]);
  await assert.rejects(X.leerPlanilla(enc.encode('a;b\r\n1;"sin cierre\r\n2;3\r\n'), 'm.csv'), /comillas sin cerrar/);
});

test('CSV y HTML: un byte suelto o un "�" no cambian la codificación del resto del archivo', async () => {
  const conByte = (s, byte, despues) => { const a = enc.encode(s), b = enc.encode(despues); return Uint8Array.from([...a, byte, ...b]); };
  // UTF-8 válido salvo un 0xD1 suelto en un apellido
  const [c1] = await X.leerPlanilla(conByte('FECHA CIRUGÍA;NOMBRE;Intervención\r\n28-10-2026;MU', 0xD1, 'OZ;ASEO\r\n'), 's.csv');
  assert.deepEqual(c1.filas[0], ['FECHA CIRUGÍA', 'NOMBRE', 'Intervención']);
  assert.equal(c1.filas[1][1], 'MUÑOZ', 'el byte suelto se lee como windows-1252');
  const [c2] = await X.leerPlanilla(enc.encode('FECHA CIRUGÍA;NOMBRE\r\n28-10-2026;MU�OZ\r\n'), 's.csv');
  assert.deepEqual(c2.filas, [['FECHA CIRUGÍA', 'NOMBRE'], ['28-10-2026', 'MU�OZ']]);
  const [h1] = await X.leerPlanilla(conByte('<html><meta charset="utf-8"><table><tr><td>Fecha intervención</td><td>Nombre</td></tr><tr><td>28-10-2026</td><td>MU', 0xD1, 'OZ</td></tr></table>'), 'e.xls');
  assert.equal(h1.filas[0][0], 'Fecha intervención');
  // windows-1252 declarado en el HTML, y UTF-16 con BOM (Excel "Texto Unicode", separado por tabulaciones)
  const latin = Uint8Array.from([...'<html><meta charset="windows-1252"><table><tr><td>Pabell\xf3n</td></tr></table>'].map(ch => ch.charCodeAt(0)));
  assert.equal((await X.leerPlanilla(latin, 'l.xls'))[0].filas[0][0], 'Pabellón');
  const u16 = Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from('Pabellón\tHora\r\nPabellón 1\t08:00\r\n', 'utf16le')]);
  assert.deepEqual((await X.leerPlanilla(new Uint8Array(u16), 'u.txt'))[0].filas, [['Pabellón', 'Hora'], ['Pabellón 1', '08:00']]);
});

test('HTML: colspan, rowspan, etiquetas sin cierre y entidades con nombre', async () => {
  const html = '<html><table><tr><th>Fecha intervenci&oacute;n</th><th>Servicio</th><th>Especialidad</th><th>Pabell&oacute;n</th><th>Nombre</th></tr>' +
    '<tr><td rowspan="2">28-10-2026</td><td colspan="2">SERVICIO X</td><td>P1</td><td>NU&Ntilde;EZ</td></tr>' +
    '<tr><td>CIRUGIA</td><td>ADULTO</td><td>P2</td><td>PEREZ</td></tr>' +
    '<tr><td>29-10-2026<td>URG<td>-<td>P3<td>SOTO</table>';
  const [t] = await X.leerPlanilla(enc.encode(html), 'r.xls');
  assert.deepEqual(t.filas, [
    ['Fecha intervención', 'Servicio', 'Especialidad', 'Pabellón', 'Nombre'],
    ['28-10-2026', 'SERVICIO X', null, 'P1', 'NUÑEZ'],
    ['28-10-2026', 'CIRUGIA', 'ADULTO', 'P2', 'PEREZ'],
    ['29-10-2026', 'URG', '-', 'P3', 'SOTO'],
  ]);
});

test('Libro con varias hojas del mismo tipo: se unen alineando columnas y los ids no se repiten', () => {
  const { ENC_HDR, filaEnc, run } = require('./helpers/sitgeq_sintetico.js');
  const hoja1 = [['Reporte encuentros'], ENC_HDR, filaEnc({ fecha: '28-10-2026', nombre: 'ANA SOTO PEREZ', run: run(15234567), hora: '08:10' })];
  // La segunda hoja trae las columnas en otro orden
  const orden = ENC_HDR.map((_, j) => j).reverse();
  const fila2 = filaEnc({ fecha: '28-10-2026', nombre: 'ANA SOTO PEREZ', run: run(15234567), tipoCx: 'Electivo Normal', hora: '15:00', interv: 'Otra' });
  const hoja2 = [orden.map(j => ENC_HDR[j]), orden.map(j => fila2[j])];
  const aoa = U.unirHojas([hoja1, hoja2], 'encuentros');
  const regs = U.leerEncuentros(aoa, 'libro.xlsx');
  assert.equal(regs.length, 2);
  assert.deepEqual(regs.map(r => r.hora), ['08:10', '15:00']);
  assert.equal(new Set(regs.map(r => r.id)).size, 2);
  assert.equal(U.detectarTipoPlanilla(aoa), 'encuentros');
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
