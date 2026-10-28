/* CancelOS · Lector y escritor mínimo de Excel (.xlsx), CSV y tablas HTML, sin dependencias externas.
   Alcanza para las exportaciones de SITGEQ y el reporte UGCQ. No lee el formato antiguo .xls (binario).
   Funciona en el navegador y en Node (pruebas). */
(function (root) {
  'use strict';

  // ═══════════════════════════════════════════════
  // ZIP (lectura con descompresión del navegador; escritura sin compresión)
  // ═══════════════════════════════════════════════
  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

  async function inflarRaw(datos) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador no puede abrir Excel: actualiza Chrome o Edge.');
    const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(flujo).arrayBuffer());
  }

  function abrirZip(b) {
    let fin = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
      if (u32(b, i) === 0x06054b50) { fin = i; break; }
    }
    if (fin < 0) throw new Error('El archivo no es un Excel (.xlsx) válido.');
    const n = u16(b, fin + 10);
    let p = u32(b, fin + 16);
    const dec = new TextDecoder();
    const entradas = new Map();
    for (let k = 0; k < n; k++) {
      if (u32(b, p) !== 0x02014b50) throw new Error('Excel dañado: no pude leer su índice interno.');
      const lenNom = u16(b, p + 28), lenExtra = u16(b, p + 30), lenCom = u16(b, p + 32);
      const nombre = dec.decode(b.subarray(p + 46, p + 46 + lenNom));
      entradas.set(nombre.toLowerCase(), { metodo: u16(b, p + 10), tamano: u32(b, p + 20), local: u32(b, p + 42) });
      p += 46 + lenNom + lenExtra + lenCom;
    }
    return {
      async leer(nombre) {
        const e = entradas.get(String(nombre).replace(/^\/+/, '').toLowerCase());
        if (!e) return null;
        if (u32(b, e.local) !== 0x04034b50) throw new Error('Excel dañado: no pude leer una de sus partes.');
        const ini = e.local + 30 + u16(b, e.local + 26) + u16(b, e.local + 28);
        const datos = b.subarray(ini, ini + e.tamano);
        if (e.metodo === 0) return datos;
        if (e.metodo === 8) return inflarRaw(datos);
        throw new Error('Excel con compresión no soportada (método ' + e.metodo + ').');
      },
    };
  }

  const TABLA_CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < b.length; i++) c = TABLA_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  // Empaqueta [{nombre, datos}] en un ZIP sin compresión (método 0)
  function crearZip(archivos) {
    const enc = new TextEncoder();
    const locales = [], centrales = [];
    let off = 0;
    const FECHA_DOS = ((2026 - 1980) << 9) | (1 << 5) | 1;
    for (const a of archivos) {
      const nom = enc.encode(a.nombre), d = a.datos, crc = crc32(d);
      const h = new Uint8Array(30 + nom.length), v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
      v.setUint16(10, 0, true); v.setUint16(12, FECHA_DOS, true); v.setUint32(14, crc, true);
      v.setUint32(18, d.length, true); v.setUint32(22, d.length, true); v.setUint16(26, nom.length, true); v.setUint16(28, 0, true);
      h.set(nom, 30);
      const c = new Uint8Array(46 + nom.length), w = new DataView(c.buffer);
      w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true);
      w.setUint16(10, 0, true); w.setUint16(12, 0, true); w.setUint16(14, FECHA_DOS, true); w.setUint32(16, crc, true);
      w.setUint32(20, d.length, true); w.setUint32(24, d.length, true); w.setUint16(28, nom.length, true); w.setUint32(42, off, true);
      c.set(nom, 46);
      locales.push(h, d);
      centrales.push(c);
      off += h.length + d.length;
    }
    const tamCentral = centrales.reduce((s, c) => s + c.length, 0);
    const fin = new Uint8Array(22), f = new DataView(fin.buffer);
    f.setUint32(0, 0x06054b50, true); f.setUint16(8, archivos.length, true); f.setUint16(10, archivos.length, true);
    f.setUint32(12, tamCentral, true); f.setUint32(16, off, true);
    const total = new Uint8Array(off + tamCentral + 22);
    let p = 0;
    for (const x of locales.concat(centrales, [fin])) { total.set(x, p); p += x.length; }
    return total;
  }

  // ═══════════════════════════════════════════════
  // XML
  // ═══════════════════════════════════════════════
  const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
  function desXml(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return cp > 0 && cp <= 0x10FFFF ? String.fromCodePoint(cp) : '';
      }
      return Object.prototype.hasOwnProperty.call(ENTIDADES, e.toLowerCase()) ? ENTIDADES[e.toLowerCase()] : m;
    });
  }
  // Algunos generadores usan prefijos de espacio de nombres (<x:row>); se quitan de las etiquetas
  const sinPrefijos = (xml) => xml.replace(/<(\/?)[A-Za-z_][\w.-]*:(?=[A-Za-z_])/g, '<$1');
  function atributo(etiqueta, nombre) {
    const m = etiqueta.match(new RegExp('\\s' + nombre.replace(':', '\\:') + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')'));
    return m ? desXml(m[2] != null ? m[2] : m[3]) : null;
  }
  // Texto de <si>/<is>: une los <t>, sin la guía fonética <rPh>
  function textoRico(xml) {
    let out = '';
    const re = /<t(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/t>)/g;
    const limpio = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
    let m;
    while ((m = re.exec(limpio))) if (m[1]) out += desXml(m[1]);
    return out;
  }
  function numeroColumna(ref) {
    let n = 0;
    for (const ch of ref.toUpperCase()) { const c = ch.charCodeAt(0); if (c < 65 || c > 90) break; n = n * 26 + (c - 64); }
    return n - 1;
  }

  function hojaComoFilas(xml, compartidas) {
    const filas = [];
    const reFila = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
    let mf, siguiente = 0;
    while ((mf = reFila.exec(xml))) {
      const r = atributo('<row' + mf[1] + '>', 'r');
      const i = r ? Number(r) - 1 : siguiente;
      siguiente = i + 1;
      const fila = [];
      const reC = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let mc, col = 0;
      while ((mc = reC.exec(mf[2] || ''))) {
        const et = '<c' + mc[1] + '>';
        const ref = atributo(et, 'r');
        const j = ref ? numeroColumna(ref) : col;
        col = j + 1;
        const t = atributo(et, 't') || 'n';
        const cuerpo = mc[2] || '';
        const vm = cuerpo.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/);
        const v = vm ? vm[1] : null;
        let val = null;
        if (t === 's') val = v != null ? (compartidas[Number(v)] != null ? compartidas[Number(v)] : '') : null;
        else if (t === 'inlineStr') { const is = cuerpo.match(/<is(?:\s[^>]*)?>([\s\S]*?)<\/is>/); val = is ? textoRico(is[1]) : null; }
        else if (t === 'str' || t === 'e' || t === 'd') val = v != null ? desXml(v) : null;
        else if (t === 'b') val = v != null ? v.trim() === '1' : null;
        else if (v != null && v.trim() !== '') { const x = Number(v); val = isFinite(x) ? x : desXml(v); }
        if (val != null && j >= 0) fila[j] = val;
      }
      filas[i] = fila;
    }
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i] || [];
      for (let j = 0; j < f.length; j++) if (f[j] === undefined) f[j] = null;
      filas[i] = f;
    }
    return filas;
  }

  async function leerXlsx(bytes) {
    const zip = abrirZip(bytes);
    const texto = async (ruta) => { const d = await zip.leer(ruta); return d ? sinPrefijos(new TextDecoder().decode(d)) : null; };
    const libro = await texto('xl/workbook.xml');
    if (!libro) throw new Error('El archivo no es un libro de Excel (.xlsx).');
    const rels = (await texto('xl/_rels/workbook.xml.rels')) || '';
    const destino = {}, tipos = {};
    for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
      destino[atributo(m[0], 'Id')] = atributo(m[0], 'Target');
      tipos[atributo(m[0], 'Id')] = atributo(m[0], 'Type') || '';
    }
    const ruta = (t) => !t ? null : t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
    const idCompartidas = Object.keys(tipos).find(k => /sharedStrings$/i.test(tipos[k]));
    const xmlCompartidas = await texto(ruta(idCompartidas ? destino[idCompartidas] : 'sharedStrings.xml') || 'xl/sharedStrings.xml');
    const compartidas = [];
    if (xmlCompartidas) {
      for (const m of xmlCompartidas.matchAll(/<si(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/si>)/g)) compartidas.push(m[1] ? textoRico(m[1]) : '');
    }
    const hojas = [];
    for (const m of libro.matchAll(/<sheet\b[^>]*>/g)) {
      const id = atributo(m[0], 'r:id') || atributo(m[0], 'id');
      const xml = await texto(ruta(destino[id]));
      if (xml == null) continue;
      hojas.push({ nombre: atributo(m[0], 'name') || 'Hoja', filas: hojaComoFilas(xml, compartidas) });
    }
    return hojas;
  }

  function convertirCelda(v) {
    const t = v.trim();
    if (t === '') return null;
    if (/^-?\d+(?:\.\d+)?$/.test(t) && !/^-?0\d/.test(t)) return Number(t);
    return v;
  }
  function leerCsv(bytes) {
    let txt = new TextDecoder('utf-8').decode(bytes);
    if (txt.includes('\uFFFD')) txt = new TextDecoder('windows-1252').decode(bytes);
    txt = txt.replace(/^\uFEFF/, '');
    const primera = txt.split(/\r?\n/, 1)[0] || '';
    const sep = [';', ',', '\t'].map(s => [s, primera.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const filas = [];
    let fila = [], campo = '', comillas = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (comillas) {
        if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else comillas = false; }
        else campo += ch;
      } else if (ch === '"') comillas = true;
      else if (ch === sep) { fila.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && txt[i + 1] === '\n') i++;
        fila.push(campo); filas.push(fila); fila = []; campo = '';
      } else campo += ch;
    }
    if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
    return [{ nombre: 'CSV', filas: filas.map(f => f.map(convertirCelda)) }];
  }
  // Exportaciones "Excel" que en realidad son una tabla HTML
  function leerHtml(bytes) {
    let txt = new TextDecoder('utf-8').decode(bytes);
    if (txt.includes('\uFFFD')) txt = new TextDecoder('windows-1252').decode(bytes);
    const filas = [];
    for (const tr of txt.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const fila = [];
      for (const td of tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
        fila.push(convertirCelda(desXml(td[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ')));
      }
      filas.push(fila);
    }
    return [{ nombre: 'HTML', filas }];
  }

  // Devuelve [{nombre, filas}] (filas = arreglo de arreglos, null en celdas vacías)
  async function leerPlanilla(datos, nombreArchivo) {
    const b = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
    if (b[0] === 0x50 && b[1] === 0x4B) return leerXlsx(b);
    if (b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0) {
      throw new Error('Es un Excel antiguo (.xls). Ábrelo en Excel y guárdalo como "Libro de Excel (.xlsx)".');
    }
    const inicio = new TextDecoder('utf-8').decode(b.subarray(0, 2048)).toLowerCase();
    if (/<table|<html/.test(inicio)) return leerHtml(b);
    if (/\.(csv|txt)$/i.test(nombreArchivo || '') || !/[\u0000-\u0008]/.test(inicio)) return leerCsv(b);
    throw new Error('No reconozco el formato del archivo.');
  }

  // ═══════════════════════════════════════════════
  // ESCRITURA .xlsx (texto en línea, números como número, celdas vacías se omiten)
  // ═══════════════════════════════════════════════
  const escXml = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  function letraColumna(n) {
    let s = '';
    for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
  }
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  function hojaXml(filas) {
    let cuerpo = '';
    filas.forEach((fila, i) => {
      let celdas = '';
      (fila || []).forEach((v, j) => {
        if (v == null || v === '') return;
        const ref = letraColumna(j) + (i + 1);
        if (typeof v === 'number' && isFinite(v)) celdas += `<c r="${ref}"><v>${v}</v></c>`;
        else if (typeof v === 'boolean') celdas += `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
        else celdas += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escXml(v)}</t></is></c>`;
      });
      cuerpo += `<row r="${i + 1}">${celdas}</row>`;
    });
    return XML + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cuerpo}</sheetData></worksheet>`;
  }
  // hojas: [{nombre, filas}] → bytes de un .xlsx
  function escribirXlsx(hojas) {
    const enc = new TextEncoder();
    const usados = new Set();
    const nombres = hojas.map((h, i) => {
      let n = String(h.nombre || 'Hoja' + (i + 1)).replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Hoja' + (i + 1);
      while (usados.has(n.toLowerCase())) n = n.slice(0, 28) + ' ' + (i + 1);
      usados.add(n.toLowerCase());
      return n;
    });
    const tipos = XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      '</Types>';
    const relsRaiz = XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    const libro = XML + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      nombres.map((n, i) => `<sheet name="${escXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>';
    const relsLibro = XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const estilos = XML + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    return crearZip([
      { nombre: '[Content_Types].xml', datos: enc.encode(tipos) },
      { nombre: '_rels/.rels', datos: enc.encode(relsRaiz) },
      { nombre: 'xl/workbook.xml', datos: enc.encode(libro) },
      { nombre: 'xl/_rels/workbook.xml.rels', datos: enc.encode(relsLibro) },
      { nombre: 'xl/styles.xml', datos: enc.encode(estilos) },
    ].concat(hojas.map((h, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, datos: enc.encode(hojaXml(h.filas || [])) }))));
  }

  const api = { leerPlanilla, escribirXlsx, crc32 };
  root.UGCQ_XLSX = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
