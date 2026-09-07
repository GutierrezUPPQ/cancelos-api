// Librería de estilo del Comité Quirúrgico (identidad visual del PPT de julio/agosto 2026)
const pptxgen = require('pptxgenjs');

const C = {
  BG: '0B1220', CARD: '0F1930', CARD2: '111E34', BORDER: '22304A', BORDER2: '2C3A4E',
  TEXT: 'EAF1FB', TEXT2: 'BCCDE8', TEXT3: 'C6D6EE', MUTED: '94AACC', DIM: '6B7F9E',
  TEAL: '2DD4BF', TEAL2: '5EEAD4', RED: 'F26B6B', AMBER: 'F5B342', GREEN: '34D399',
  GRAY: '5B6B85', BLUE: '5B7DB1', BLUE2: '7FA3D9', VIOLET: 'A78BFA', ORANGE: 'FB923C', WHITE: 'FFFFFF',
};
const F = 'Arial';
const FOOT_R = 'HQ  ·  COMITÉ QUIRÚRGICO  ·  SEPTIEMBRE 2026';
const W = 13.333, H = 7.5, ML = 0.55, CW = 12.22;

function newDeck() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Coordinación del Proceso Quirúrgico · UPPQ · Hospital de Quilpué';
  pres.title = 'Comité Quirúrgico · Agosto 2026 · Hospital de Quilpué';
  return pres;
}

function txt(slide, text, x, y, w, h, o = {}) {
  const opts = Object.assign({
    x, y, w, h, fontFace: F, fontSize: 12, color: C.TEXT, margin: 0, isTextBox: true,
    valign: 'top', align: 'left', autoFit: false, shrinkText: false,
  }, o);
  slide.addText(text, opts);
}

function baseSlide(pres, { num, total, kicker, title, subtitle, notes }) {
  const s = pres.addSlide();
  s.background = { color: C.BG };
  // resplandores (el gradiente radial se inyecta en el post-proceso, ver postprocess.py)
  s.addShape(pres.shapes.OVAL, { x: 9.17, y: -2.5, w: 6.39, h: 4.72, fill: { color: C.TEAL, transparency: 93 }, line: { type: 'none' } });
  s.addShape(pres.shapes.OVAL, { x: -2.22, y: 5.0, w: 6.11, h: 4.17, fill: { color: C.VIOLET, transparency: 94.5 }, line: { type: 'none' } });
  txt(s, kicker.replace('NN', String(num - 1).padStart(2, '0')), ML, 0.32, 9.7, 0.32, { fontSize: 10.5, bold: true, color: C.TEAL2, charSpacing: 3, valign: 'middle' });
  const tSize = title.length > 66 ? 21 : title.length > 58 ? 23.5 : 27;
  txt(s, title, ML, 0.65, CW, 0.6, { fontSize: tSize, bold: true, color: C.TEXT, valign: 'middle' });
  if (subtitle) txt(s, subtitle, ML, 1.24, CW, 0.32, { fontSize: subtitle.length > 120 ? 11.5 : 13, color: C.TEXT2, valign: 'middle' });
  txt(s, `${String(num).padStart(2, '0')}  /  ${total}`, ML, 7.08, 1.6, 0.3, { fontSize: 9, color: C.MUTED, charSpacing: 2, valign: 'middle' });
  txt(s, FOOT_R, 6.5, 7.08, 6.27, 0.3, { fontSize: 9, color: C.MUTED, charSpacing: 2, align: 'right', valign: 'middle' });
  if (notes) s.addNotes(notes);
  return s;
}

function card(slide, x, y, w, h, o = {}) {
  const pres = o.pres;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: o.radius == null ? 0.08 : o.radius,
    fill: { color: o.fill || C.CARD }, line: { color: o.border || C.BORDER, width: o.borderW || 0.75 },
  });
}

// Tarjeta KPI: valor grande + etiqueta en mayúsculas + subtexto
function kpi(slide, pres, x, y, w, h, { value, label, sub, color = C.TEAL2, border = C.BORDER, valueSize = 30, labelSize = 8.5, subSize = 10, pad = 0.17 }) {
  card(slide, x, y, w, h, { pres, border, borderW: border === C.BORDER ? 0.75 : 1.25 });
  const vh = valueSize / 72 * 1.35;
  txt(slide, value, x + pad, y + 0.12, w - 2 * pad, vh, { fontSize: valueSize, bold: true, color, valign: 'middle' });
  txt(slide, label, x + pad, y + 0.12 + vh + 0.02, w - 2 * pad, 0.24, { fontSize: labelSize, bold: true, color: C.TEXT2, charSpacing: 1.5, valign: 'middle' });
  if (sub) txt(slide, sub, x + pad, y + 0.12 + vh + 0.28, w - 2 * pad, h - (0.12 + vh + 0.32), { fontSize: subSize, color: C.MUTED, valign: 'top' });
}

// Tarjeta de texto con título en mayúsculas y cuerpo (opcionalmente con runs)
function note(slide, pres, x, y, w, h, { title, body, border = C.BORDER, titleColor = C.TEXT, titleSize = 11.5, bodySize = 10.5, pad = 0.16, fill }) {
  card(slide, x, y, w, h, { pres, border, borderW: border === C.BORDER ? 0.75 : 1.25, fill });
  let yy = y + 0.12;
  if (title) { txt(slide, title, x + pad, yy, w - 2 * pad, 0.3, { fontSize: titleSize, bold: true, color: titleColor, valign: 'middle' }); yy += 0.34; }
  if (body) txt(slide, body, x + pad, yy, w - 2 * pad, h - (yy - y) - 0.1, { fontSize: bodySize, color: C.TEXT3, valign: 'top' });
}

// Tabla con estilo del comité. rows: array de arrays de strings (o {text, options}).
function table(slide, rows, { x, y, w, colW, fontSize = 11.5, rowH = 0.36, headRowH, aligns, boldFirstCol = false, highlightCol = -1, highlightColor = C.TEAL2, boldRows = [], mutedRows = [] }) {
  const n = rows[0].length;
  const cw = colW || Array(n).fill(w / n);
  const data = rows.map((r, ri) => r.map((c, ci) => {
    const cell = (typeof c === 'object' && c !== null && !Array.isArray(c)) ? c : { text: String(c) };
    const isHead = ri === 0;
    const fill = isHead ? C.CARD : (ri % 2 === 1 ? C.CARD2 : C.CARD);
    let color = isHead ? C.TEXT2 : C.TEXT;
    if (!isHead && ci === highlightCol) color = highlightColor;
    if (!isHead && mutedRows.includes(ri)) color = C.MUTED;
    const o = Object.assign({
      fill: { color: fill }, color, bold: isHead || (boldFirstCol && ci === 0) || boldRows.includes(ri) || (!isHead && ci === highlightCol),
      fontSize: isHead ? fontSize - 1 : fontSize, fontFace: F, valign: 'middle',
      align: aligns ? aligns[ci] : (ci === 0 ? 'left' : 'left'), margin: [0.05, 0.09, 0.05, 0.09],
    }, cell.options || {});
    return { text: cell.text, options: o };
  }));
  const rh = rows.map((_, i) => (i === 0 && headRowH) ? headRowH : rowH);
  slide.addTable(data, { x, y, w, colW: cw, rowH: rh, border: { type: 'solid', pt: 0.5, color: C.BORDER }, fontFace: F, autoPage: false });
}

// Barras horizontales dibujadas con formas (permite color por barra)
function hbars(slide, pres, items, x, y, w, h, { labelW = 2.2, valueW = 0.55, max, fontSize = 10.5, barH, gap = 0.08, valueFmt = v => String(v), labelColor = C.TEXT2 } = {}) {
  const mx = max || Math.max(...items.map(i => i.value));
  const n = items.length;
  const rowH = h / n;
  const bh = barH || Math.min(rowH - gap, 0.34);
  const bx = x + labelW, bw = w - labelW - valueW;
  items.forEach((it, i) => {
    const cy = y + i * rowH + (rowH - bh) / 2;
    txt(slide, it.label, x, cy - 0.02, labelW - 0.12, bh + 0.04, { fontSize, color: it.labelColor || labelColor, align: 'right', valign: 'middle' });
    const len = mx > 0 ? Math.max(0.02, bw * it.value / mx) : 0.02;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: cy, w: len, h: bh, rectRadius: 0.04, fill: { color: it.color || C.TEAL }, line: { type: 'none' } });
    txt(slide, valueFmt(it.value), bx + len + 0.08, cy - 0.02, valueW + 0.6, bh + 0.04, { fontSize: fontSize + 0.5, bold: true, color: it.valueColor || C.TEXT, valign: 'middle' });
  });
}

// Barras verticales dibujadas con formas
function vbars(slide, pres, items, x, y, w, h, { max, fontSize = 10, valueFmt = v => String(v), labelH = 0.3, valueH = 0.26, gapPct = 0.35 } = {}) {
  const mx = max || Math.max(...items.map(i => i.value));
  const n = items.length;
  const slot = w / n; const bw = slot * (1 - gapPct);
  const plotH = h - labelH - valueH;
  items.forEach((it, i) => {
    const bhh = mx > 0 ? Math.max(0.02, plotH * it.value / mx) : 0.02;
    const bx = x + i * slot + (slot - bw) / 2; const by = y + valueH + (plotH - bhh);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: by, w: bw, h: bhh, rectRadius: 0.03, fill: { color: it.color || C.TEAL }, line: { type: 'none' } });
    txt(slide, valueFmt(it.value), bx - 0.2, by - valueH, bw + 0.4, valueH, { fontSize: fontSize + 1, bold: true, color: it.valueColor || C.TEXT, align: 'center', valign: 'bottom' });
    txt(slide, it.label, bx - 0.25, y + h - labelH, bw + 0.5, labelH, { fontSize, color: it.labelColor || C.MUTED, align: 'center', valign: 'middle' });
  });
}

function legend(slide, pres, items, x, y, { fontSize = 9.5, gap = 0.22, itemW } = {}) {
  let cx = x;
  items.forEach(it => {
    slide.addShape(pres.shapes.OVAL, { x: cx, y: y + 0.06, w: 0.12, h: 0.12, fill: { color: it.color }, line: { type: 'none' } });
    const wdt = itemW || (0.0068 * fontSize * it.label.length + 0.2);
    txt(slide, it.label, cx + 0.17, y, wdt, 0.24, { fontSize, color: C.TEXT2, valign: 'middle' });
    cx += 0.17 + wdt + gap;
  });
}

function footnote(slide, text, o = {}) {
  txt(slide, text, ML, o.y || 6.5, CW, o.h || 0.5, Object.assign({ fontSize: 9.5, color: C.MUTED, valign: 'top' }, o));
}

const darkChart = (extra = {}) => Object.assign({
  chartArea: { fill: { color: C.CARD } }, plotArea: { fill: { color: C.CARD } },
  catAxisLabelColor: C.MUTED, catAxisLabelFontSize: 9.5, catAxisLabelFontFace: F,
  valAxisLabelColor: C.MUTED, valAxisLabelFontSize: 9, valAxisLabelFontFace: F,
  valGridLine: { color: C.BORDER, size: 0.5 }, catGridLine: { style: 'none' },
  catAxisLineShow: false, valAxisLineShow: false,
  dataLabelColor: C.TEXT, dataLabelFontSize: 9.5, dataLabelFontFace: F,
  legendColor: C.TEXT2, legendFontSize: 9.5, legendFontFace: F, legendPos: 'b',
  showTitle: false,
}, extra);

// Carta p dibujada con formas: banda ±3σ, línea central, serie mensual con marcadores
function pchart(slide, pres, { labels, tasa, lcl, ucl, center, flag }, x, y, w, h, { yMax = 16, labelEvery = 1, fontSize = 8.5 } = {}) {
  const padL = 0.5, padB = 0.42, padT = 0.25, padR = 0.15;
  const px = x + padL, py = y + padT, pw = w - padL - padR, ph = h - padT - padB;
  const n = labels.length;
  const X = i => px + pw * (i / (n - 1));
  const Y = v => py + ph * (1 - v / yMax);
  // ejes / grilla
  for (let g = 0; g <= yMax; g += 4) {
    slide.addShape(pres.shapes.LINE, { x: px, y: Y(g), w: pw, h: 0, line: { color: C.BORDER, width: 0.5 } });
    txt(slide, `${g}%`, x, Y(g) - 0.11, padL - 0.08, 0.22, { fontSize: 8, color: C.MUTED, align: 'right', valign: 'middle' });
  }
  // banda entre LCL y UCL
  const pts = [];
  for (let i = 0; i < n; i++) pts.push({ x: X(i) - px, y: Y(Math.min(ucl[i], yMax)) - py });
  for (let i = n - 1; i >= 0; i--) pts.push({ x: X(i) - px, y: Y(lcl[i]) - py });
  pts.push({ close: true });
  slide.addShape(pres.shapes.CUSTOM_GEOMETRY, { x: px, y: py, w: pw, h: ph, points: pts, fill: { color: C.BLUE, transparency: 82 }, line: { type: 'none' } });
  // línea central
  slide.addShape(pres.shapes.LINE, { x: px, y: Y(center), w: pw, h: 0, line: { color: C.AMBER, width: 1.25, dashType: 'dash' } });
  txt(slide, `media 2025 · ${center.toFixed(2).replace('.', ',')} %`, px + pw - 1.6, Y(center) - 0.25, 1.6, 0.22, { fontSize: 8, color: C.AMBER, align: 'right', valign: 'middle' });
  txt(slide, 'banda ±3σ (n de cada mes)', px + 0.08, Y(lcl[0]) - 0.26, 2.2, 0.22, { fontSize: 8, color: C.BLUE2, valign: 'middle' });
  // serie
  for (let i = 0; i < n - 1; i++) {
    const x1 = X(i), y1 = Y(tasa[i]), x2 = X(i + 1), y2 = Y(tasa[i + 1]);
    const up = y2 < y1;
    slide.addShape(pres.shapes.LINE, { x: x1, y: Math.min(y1, y2), w: x2 - x1, h: Math.abs(y2 - y1), line: { color: C.TEAL, width: 2 }, flipV: up });
  }
  for (let i = 0; i < n; i++) {
    const cx = X(i), cy = Y(tasa[i]);
    const isFlag = flag[i];
    slide.addShape(pres.shapes.OVAL, { x: cx - 0.06, y: cy - 0.06, w: 0.12, h: 0.12, fill: { color: isFlag ? C.GREEN : C.TEAL }, line: { color: C.BG, width: 0.75 } });
    if (i % labelEvery === 0) txt(slide, labels[i], cx - 0.35, y + h - padB + 0.06, 0.7, 0.22, { fontSize, color: C.MUTED, align: 'center', valign: 'middle' });
    const above = i === 0 || tasa[i] >= tasa[i - 1] || tasa[i] < 2.0;
    txt(slide, tasa[i].toFixed(1).replace('.', ','), cx - 0.3, above ? cy - 0.33 : cy + 0.08, 0.6, 0.22, { fontSize: 7.5, color: isFlag ? C.GREEN : C.TEXT2, align: 'center', valign: 'middle', bold: isFlag });
  }
}

function fmtN(n) { return n.toLocaleString('de-DE'); } // 1.469
function fmtP(v, d = 2) { return v.toFixed(d).replace('.', ',') + ' %'; }

module.exports = { pptxgen, C, F, W, H, ML, CW, newDeck, txt, baseSlide, card, kpi, note, table, hbars, vbars, legend, footnote, darkChart, pchart, fmtN, fmtP };
