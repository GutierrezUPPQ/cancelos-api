/* CancelOS · Cierre diario UGCQ — motor de cotejo (sin DOM).
   Cruza la tabla quirúrgica (lo programado) con los encuentros quirúrgicos y el informe de
   suspensiones de SITGEQ (lo que ocurrió) y arma la fila diaria en el formato UGCQ.
   Lo usan ugcq.html (navegador) y las pruebas en Node. Ningún dato de pacientes sale del equipo. */
(function (root) {
  'use strict';

  // ═══════════════════════════════════════════════
  // FORMATO UGCQ (119 columnas, en el orden exacto del reporte "Cirugía por rangos de fecha")
  // ═══════════════════════════════════════════════
  const ENCABEZADOS = [
    "Fecha monitoreo",
    "Día",
    "Mes",
    "Año",
    "Semana",
    "Macroregión",
    "Región",
    "Servicio de Salud",
    "Hospital",
    "Complejidad del establecimiento",
    "Certificación (EAR)",
    "Pacientes Programados Cx Mayor Electiva",
    "Pacientes Condicionales Cx Mayor Electiva",
    "Pacientes Suspendidos de los Progr. Cx Mayor Elect",
    "Porcentaje de Pacientes Suspendidos",
    "Cx Mayores Electivas Programadas realizadas",
    "Cx Mayores Electivas Condicionales Realizadas",
    "Cx Mayores Electivas Agregadas Realizadas",
    "Cx Mayores de Urgencia realizadas",
    "Cx Menores realizadas",
    "Procedimientos realizados",
    "Total Cx Mayores Electivas Realizadas",
    "Total Realizado",
    "(Administrativas) Anticipación de cirugía por agudización de",
    "(Administrativas) Atraso en el ingreso",
    "(Administrativas) COVID-19: Personal de salud destinado a otras",
    "(Administrativas) COVID-19  Reconversión de camas quirúrgicas",
    "(Administrativas) Documentación incompleta",
    "(Administrativas) Error De programación",
    "(Administrativas) Estudio incompleto",
    "(Administrativas) Exámenes alterados no corregidos",
    "(Administrativas) Falla coordinación unidad anatomía patolog",
    "(Administrativas) Falla coordinación unidad de Imagenología",
    "(Administrativas) Falta de ayuno",
    "(Administrativas) Falta de disponibilidad de cama básica",
    "(Administrativas) Falta de disponibilidad de cama media",
    "(Administrativas) Falta de disponibilidad de cama UCI",
    "(Administrativas) Falta de disponibilidad de cama UTI",
    "(Administrativas) Falta de preparación de piel, intestinal, an",
    "(Administrativas) Falta disponibilidad de cama Básica",
    "(Administrativas) Falta disponibilidad de cama UPC",
    "(Administrativas) Falta disponibilidad de cama UPC, Básica",
    "(Administrativas) No se presenta",
    "(Administrativas) No se presenta - No se ubica",
    "(Administrativas) Patología crónica descompensada",
    "(Administrativas) Patología no informada, no conocida",
    "(Administrativas) Rechaza operación",
    "(Administrativas) Reemplazado por urgencia",
    "(Administrativas) Sin consentimiento informado firmado/ Falta d",
    "(Administrativas) Sin cupo en recuperación",
    "(Administrativas) Sin evaluación de especialista indicada",
    "(Administrativas) Sin indicación quirúrgica",
    "(Administrativas) Sin suspensión de anticoagulante u otras dro",
    "(Emergencias) Accidentes múltiples",
    "(Emergencias) Actos delictuales",
    "(Emergencias) Actos de marcada connotación pública.",
    "(Emergencias) Aviso de bombas",
    "(Emergencias) Derrame de productos químicos",
    "(Emergencias) Desastres de eventos deportivos.",
    "(Emergencias) Desastres naturales: terremotos, aluviones, tsuna",
    "(Emergencias) Destrucción repentina e irrecuperable de la infr",
    "(Emergencias) Emergencia sanitaria",
    "(Emergencias) Emergencia Sanitaria.  COVID-19: Resguardo de usu",
    "(Emergencias) Incendios forestales.",
    "(Emergencias) Incendios o amago de incendio",
    "(Emergencias) Inundaciones.",
    "(Equipo quirúrgico) Error de programación",
    "(Equipo quirúrgico) Falta / Disponibilidad de Anestesiólogo/a",
    "(Equipo quirúrgico) Falta / Disponibilidad de Cirujano/a",
    "(Equipo quirúrgico) Falta / Disponibilidad de Técnico de enfe",
    "(Equipo quirúrgico) Falta / Disponibilidad profesional no méd",
    "(Equipo quirúrgico) Prolongación De Tabla",
    "(Equipo quirúrgico) Reemplazo por urgencia",
    "(Gremiales) Paro o movilización de funcionarios",
    "(gremiales) suspensión de actividades",
    "(Infraestructura) Falla Ascensor",
    "(infraestructura) falla de aseo",
    "(Infraestructura) Falla de climatización",
    "(Infraestructura) Falla de red húmeda",
    "(Infraestructura) Falla energía eléctrica",
    "(Infraestructura) Falla gases clínicos",
    "(Infraestructura) Falta de personal de Aseo",
    "(otros) otros",
    "(Paciente) Anticipación de cirugía por agudización de patolo",
    "(Paciente) Atraso al ingreso",
    "(Paciente) Atraso en el ingreso ",
    "(Paciente) Descompensación en pabellón",
    "(Paciente) Estudio incompleto",
    "(Paciente) Exámenes alterados no corregidos",
    "(Paciente) Falta de ayuno",
    "(Paciente) Falta de preparación de piel, intestinal, antibiót",
    "(Paciente) No se presenta",
    "(Paciente) No se presenta / No se ubica",
    "(Paciente) No se ubica",
    "(Paciente) Paciente fallece",
    "(Paciente) Patología aguda",
    "(Paciente) Patología crónica descompensada",
    "(Paciente) Patología no informada, no conocida (alergia al lá",
    "(Paciente) Rechaza operación",
    "(Paciente) Sin evaluación de especialista indicada",
    "(Paciente) Sin indicación quirúrgica ",
    "(Paciente) Sin suspensión de anticoagulante u otras drogas pro",
    "(Unidades de apoyo clínico) Falla de coordinación con Unidad ",
    "(Unidades de apoyo clínico) Falta de sangre o hemoderivados",
    "(Unidades de apoyo logístico) Equipamiento médico no operativ",
    "(Unidades de apoyo logístico) Falla Ascensor",
    "(Unidades de apoyo logístico) Falla coordinación unidad anato",
    "(Unidades de apoyo logístico) Falla coordinación unidad de Im",
    "(Unidades de apoyo logístico) Falla De Climatización",
    "(Unidades de apoyo logístico) Falla De Red Húmeda",
    "(Unidades de apoyo logístico) Falla Energía Eléctrica",
    "(Unidades de apoyo logístico) Falla gases clínicos",
    "(Unidades de apoyo logístico) Falta de equipo, insumos y/o caj",
    "(Unidades de apoyo logístico) Falta de insumos o stock insufic",
    "(Unidades de apoyo logístico) Falta de medicamentos o stock in",
    "(Unidades de apoyo logístico) Falta de personal de Aseo",
    "(Unidades de apoyo logístico) Falta de ropa quirúrgica o stoc",
    "(Unidades de apoyo logístico) Instrumental incompleto o no dis",
    "(Unidades de apoyo logístico) Instrumental y/o material con fa",
  ];
  const PRIMERA_CAUSA = 23;

  // Columnas de conteo (L..W en la planilla)
  const CONTEOS = [
    ['programados', 11], ['condicionales', 12], ['suspendidos', 13], ['pctSuspendidos', 14],
    ['progRealizadas', 15], ['condRealizadas', 16], ['agregadas', 17], ['urgencias', 18],
    ['menores', 19], ['procedimientos', 20], ['totalMayoresElectivas', 21], ['totalRealizado', 22],
  ];

  const FIJOS_DEF = {
    macroregion: 'Macrocentro Norte',
    region: '              V',
    servicio: 'Servicio de Salud Viña del Mar Quillota',
    hospital: 'Hospital de Quilpué',
    complejidad: 'Alta',
    certificacion: 'EAR',
  };

  // ═══════════════════════════════════════════════
  // UTILIDADES DE TEXTO, RUN Y FECHAS
  // ═══════════════════════════════════════════════
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }
  // Para comparar descripciones: sin tildes, sin signos, espacios simples
  function clave(s) { return norm(s).replace(/[^a-z0-9]+/g, ' ').trim(); }
  function utf8len(s) {
    let n = 0;
    for (const ch of String(s)) { const c = ch.codePointAt(0); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
    return n;
  }

  function normRun(s) {
    return String(s == null ? '' : s).toUpperCase().replace(/[^0-9K]/g, '').replace(/^0+/, '');
  }
  function dvRun(cuerpo) {
    let s = 0, m = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) { s += Number(cuerpo[i]) * m; m = m === 7 ? 2 : m + 1; }
    const r = 11 - (s % 11);
    return r === 11 ? '0' : r === 10 ? 'K' : String(r);
  }
  function runValido(s) {
    const t = normRun(s);
    if (!/^\d{6,9}[0-9K]$/.test(t)) return false;
    return dvRun(t.slice(0, -1)) === t.slice(-1);
  }
  function fmtRun(s) {
    const t = normRun(s);
    return t.length > 1 ? t.slice(0, -1) + '-' + t.slice(-1) : t;
  }

  const NO_NOMBRE = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'dos', 'van', 'von', 'mc']);
  function tokensNombre(s) {
    return clave(s).split(' ').filter(t => t.length > 1 && !NO_NOMBRE.has(t));
  }

  // Identidad del paciente: RUN si es interpretable; si no, documento; si no, nombre
  function identidad(run, nombre) {
    const crudo = String(run == null ? '' : run).trim();
    const r = normRun(crudo);
    const pareceRun = /^\d{6,9}[0-9K]$/.test(r) && !/[A-JL-Z]/i.test(crudo.replace(/k/gi, ''));
    // Documento extranjero (pasaporte, DNI); "S/I", "NN" o similares no identifican a nadie
    const doc = crudo.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let key;
    if (pareceRun) key = 'R:' + r;
    else if (doc.length >= 5 && /\d/.test(doc)) key = 'I:' + doc;
    else key = 'N:' + tokensNombre(nombre).sort().join(' ');
    return { key, run: pareceRun ? fmtRun(r) : crudo, runOk: pareceRun && runValido(r), tokens: tokensNombre(nombre) };
  }
  function mismaPersona(a, b) {
    if (a.key === b.key) return { si: true, porNombre: false };
    if (a.runOk && b.runOk) return { si: false };
    return similitudNombre(a.tokens, b.tokens) >= 0.75 ? { si: true, porNombre: true } : { si: false };
  }
  function similitudNombre(a, b) {
    if (!a.length || !b.length) return 0;
    const sb = new Set(b);
    const comunes = new Set(a.filter(t => sb.has(t))).size;
    if (comunes < 2) return 0;
    return comunes / Math.min(new Set(a).size, sb.size);
  }

  // Fechas internas como 'AAAA-MM-DD'
  function iso(y, m, d) {
    const yy = Number(y) < 100 ? 2000 + Number(y) : Number(y);
    const f = new Date(Date.UTC(yy, Number(m) - 1, Number(d)));
    if (f.getUTCFullYear() !== yy || f.getUTCMonth() !== Number(m) - 1 || f.getUTCDate() !== Number(d)) return null;
    return f.toISOString().slice(0, 10);
  }
  function parseFecha(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date && !isNaN(v)) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
    if (typeof v === 'number' && isFinite(v) && v > 20000 && v < 80000) {
      // Serial de Excel (sistema 1900)
      const f = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
      return f.toISOString().slice(0, 10);
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return iso(m[1], m[2], m[3]);
    m = s.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
    if (m) return iso(m[3], m[2], m[1]);
    return null;
  }
  function fmtFecha(f) { return f ? f.slice(8, 10) + '-' + f.slice(5, 7) + '-' + f.slice(0, 4) : ''; }
  function horaTexto(v) {
    if (typeof v === 'number' && v >= 0 && v < 1) {
      const min = Math.round(v * 1440) % 1440;
      return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
    }
    return v == null ? '' : String(v).trim();
  }

  function semanaIso(t) {
    const d = new Date(t);
    const dia = (d.getUTCDay() + 6) % 7; // lunes = 0
    d.setUTCDate(d.getUTCDate() - dia + 3); // jueves de esa semana
    const y = d.getUTCFullYear();
    const primerJueves = new Date(Date.UTC(y, 0, 4));
    primerJueves.setUTCDate(primerJueves.getUTCDate() - ((primerJueves.getUTCDay() + 6) % 7) + 3);
    return 1 + Math.round((d - primerJueves) / (7 * 86400000));
  }
  // Semana del reporte UGCQ: corre de sábado a viernes y lleva el número ISO del sábado que la inicia
  // (deducido del reporte entregado: jue 01-10-2026 = 39, sáb 03-10-2026 = 40, sáb 10-10-2026 = 41)
  function semanaUGCQ(f) {
    const t = Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
    const desdeSabado = (new Date(t).getUTCDay() + 1) % 7;
    return semanaIso(t - desdeSabado * 86400000);
  }

  // ═══════════════════════════════════════════════
  // CAUSALES DE SUSPENSIÓN → COLUMNA UGCQ
  // ═══════════════════════════════════════════════
  const CAUSAS = ENCABEZADOS.slice(PRIMERA_CAUSA).map((h, i) => {
    const m = h.match(/^\(([^)]*)\)\s*(.*)$/);
    return {
      col: PRIMERA_CAUSA + i, encabezado: h,
      categoria: m ? m[1].trim() : '', cat: clave(m ? m[1] : ''), desc: clave(m ? m[2] : h),
      // UGCQ corta los encabezados en 63 bytes: si llegó al límite, la descripción viene truncada
      truncada: utf8len(h) >= 61,
    };
  });

  // Devuelve {col, confianza: 'exacta'|'parcial'|'sugerida'} o null
  function mapearCausal(categoria, descripcion) {
    const c = clave(categoria), d = clave(descripcion);
    if (!d) return null;
    const delaCat = CAUSAS.filter(x => x.cat === c);
    const buscar = (pool) => {
      const exacta = pool.find(x => x.desc === d);
      if (exacta) return { causa: exacta, tipo: 'exacta' };
      const pref = pool.filter(x => x.desc && (x.truncada ? d.startsWith(x.desc) : d.startsWith(x.desc + ' ')))
        .sort((a, b) => b.desc.length - a.desc.length);
      if (pref.length) return { causa: pref[0], tipo: pref[0].truncada ? 'exacta' : 'parcial' };
      const td = new Set(d.split(' '));
      let mejor = null, mejorSim = 0;
      for (const x of pool) {
        const tx = new Set(x.desc.split(' '));
        const inter = [...tx].filter(t => td.has(t)).length;
        const sim = inter / new Set([...tx, ...td]).size;
        if (sim > mejorSim) { mejorSim = sim; mejor = x; }
      }
      return mejorSim >= 0.6 ? { causa: mejor, tipo: 'sugerida' } : null;
    };
    let r = delaCat.length ? buscar(delaCat) : null;
    if (r) return { col: r.causa.col, confianza: r.tipo };
    r = buscar(CAUSAS); // categoría no reconocida o descripción en otra categoría: requiere confirmar
    return r ? { col: r.causa.col, confianza: 'sugerida' } : null;
  }

  // ═══════════════════════════════════════════════
  // LECTURA DE PLANILLAS (SITGEQ / UGCQ)
  // ═══════════════════════════════════════════════
  function celdaTexto(v) {
    if (v == null) return '';
    if (v instanceof Date) return fmtFecha(parseFecha(v));
    return String(v).trim();
  }

  // Busca la fila de encabezados (las exportaciones pueden traer títulos arriba)
  function filaEncabezado(aoa, requisitos) {
    const lim = Math.min(aoa.length, 25);
    for (let i = 0; i < lim; i++) {
      const fila = (aoa[i] || []).map(norm);
      if (requisitos.every(r => fila.includes(r))) return i;
    }
    return -1;
  }
  function indices(encab, alias) {
    const n = encab.map(norm);
    const out = {};
    for (const [campo, nombres] of Object.entries(alias)) {
      let idx = -1;
      for (const nom of nombres) { idx = n.indexOf(nom); if (idx >= 0) break; }
      out[campo] = idx;
    }
    return out;
  }

  function detectarTipoPlanilla(aoa) {
    if (filaEncabezado(aoa, ['fecha monitoreo']) >= 0) return 'ugcq';
    if (filaEncabezado(aoa, ['causal minsal']) >= 0 || filaEncabezado(aoa, ['descripcion causal']) >= 0) return 'suspensiones';
    if (filaEncabezado(aoa, ['fecha intervencion', 'tipo de cirugia']) >= 0) return 'encuentros';
    return null;
  }

  function claseIntervencion(txt, mayor, menor, proc) {
    const t = norm(txt);
    if (t.includes('mayor')) return 'MAYOR';
    if (t.includes('menor')) return 'MENOR';
    if (t.includes('proced')) return 'PROC';
    if (Number(mayor) > 0) return 'MAYOR';
    if (Number(menor) > 0) return 'MENOR';
    if (Number(proc) > 0) return 'PROC';
    return '?';
  }
  function tipoCirugia(txt) {
    const t = norm(txt);
    if (!t) return '?';
    if (t.includes('urgen')) return 'URG';
    if (t.includes('agreg')) return 'AGREG';
    if (t.includes('condicional')) return 'COND';
    if (t.includes('electiv') || t.includes('normal') || t.includes('program')) return 'ELECT';
    return '?';
  }

  function leerEncuentros(aoa, archivo) {
    const h = filaEncabezado(aoa, ['fecha intervencion', 'tipo de cirugia']);
    if (h < 0) throw new Error('No encontré los encabezados del export de encuentros quirúrgicos.');
    const ix = indices(aoa[h], {
      fecha: ['fecha intervencion'], servicio: ['servicio clinico'], especialidad: ['especialidad'],
      pabellon: ['pabellon'], tipoCirugia: ['tipo de cirugia'], propuesta: ['intervencion propuesta'],
      realizada: ['intervencion realizada'], nombre: ['nombre paciente', 'nombre'],
      run: ['run / identificacion', 'run/identificacion', 'run', 'rut', 'identificacion'],
      tipo: ['tipo'], mayor: ['cirugia mayor'], menor: ['cirugia menor'], proc: ['procedimiento'],
      cma: ['cma'], protocolo: ['protocolo'], horaQx: ['hora ingreso quirofano'], horaIQ: ['hora inicio iq'],
    });
    if (ix.fecha < 0 || ix.tipoCirugia < 0) throw new Error('El export de encuentros no trae "Fecha intervención" o "Tipo de cirugía".');
    const g = (fila, campo) => ix[campo] >= 0 ? fila[ix[campo]] : null;
    const out = [];
    for (let i = h + 1; i < aoa.length; i++) {
      const f = aoa[i] || [];
      if (!f.some(v => v != null && String(v).trim() !== '')) continue;
      const fecha = parseFecha(g(f, 'fecha'));
      if (!fecha) continue;
      const realizada = celdaTexto(g(f, 'realizada'));
      out.push({
        id: archivo + '#' + (i + 1), archivo, filaArchivo: i + 1, fecha,
        servicio: celdaTexto(g(f, 'servicio')), especialidad: celdaTexto(g(f, 'especialidad')),
        pabellon: celdaTexto(g(f, 'pabellon')),
        tipoCirugiaTxt: celdaTexto(g(f, 'tipoCirugia')), tipoCirugia: tipoCirugia(g(f, 'tipoCirugia')),
        tipoTxt: celdaTexto(g(f, 'tipo')),
        interv: claseIntervencion(g(f, 'tipo'), g(f, 'mayor'), g(f, 'menor'), g(f, 'proc')),
        intervencion: (realizada || celdaTexto(g(f, 'propuesta'))).split('\n')[0].replace(/^\+\s*/, ''),
        nombre: celdaTexto(g(f, 'nombre')), run: celdaTexto(g(f, 'run')),
        hora: horaTexto(g(f, 'horaQx')) || horaTexto(g(f, 'horaIQ')),
        cma: celdaTexto(g(f, 'cma')),
      });
    }
    return out;
  }

  function leerSuspensiones(aoa, archivo) {
    let h = filaEncabezado(aoa, ['causal minsal']);
    if (h < 0) h = filaEncabezado(aoa, ['descripcion causal']);
    if (h < 0) throw new Error('No encontré los encabezados del informe de suspensiones.');
    const ix = indices(aoa[h], {
      run: ['rut', 'run', 'run / identificacion'], nombre: ['nombre', 'nombre paciente'],
      fecha: ['fecha cirugia', 'fecha de cirugia', 'fecha suspension', 'fecha'],
      servicio: ['servicio clinico'], categoria: ['causal minsal'], descripcion: ['descripcion causal'],
      tipoSolicitud: ['tipo solicitud'], codigo: ['cod. intervencion propuesta'],
      intervencion: ['descripcion intervencion propuesta'], clase: ['cirugia mayor'],
      agendamiento: ['tipo de agendamiento'],
    });
    if (ix.fecha < 0) throw new Error('El informe de suspensiones no trae la columna "FECHA CIRUGÍA".');
    const g = (fila, campo) => ix[campo] >= 0 ? fila[ix[campo]] : null;
    const out = [];
    for (let i = h + 1; i < aoa.length; i++) {
      const f = aoa[i] || [];
      if (!f.some(v => v != null && String(v).trim() !== '')) continue;
      const fecha = parseFecha(g(f, 'fecha'));
      if (!fecha) continue;
      const agendTxt = celdaTexto(g(f, 'agendamiento'));
      out.push({
        id: archivo + '#' + (i + 1), archivo, filaArchivo: i + 1, fecha,
        run: celdaTexto(g(f, 'run')), nombre: celdaTexto(g(f, 'nombre')),
        servicio: celdaTexto(g(f, 'servicio')),
        categoria: celdaTexto(g(f, 'categoria')), descripcion: celdaTexto(g(f, 'descripcion')),
        tipoSolicitud: celdaTexto(g(f, 'tipoSolicitud')),
        intervencion: celdaTexto(g(f, 'intervencion')), codigo: celdaTexto(g(f, 'codigo')),
        intervTxt: celdaTexto(g(f, 'clase')), interv: claseIntervencion(g(f, 'clase')),
        agendamientoTxt: agendTxt, agend: norm(agendTxt).includes('condicional') ? 'CONDICIONAL' : 'NORMAL',
      });
    }
    return out;
  }

  // Reporte UGCQ ya subido (para comparar o reconstruir el historial)
  function leerUGCQ(aoa) {
    const h = filaEncabezado(aoa, ['fecha monitoreo']);
    if (h < 0) throw new Error('No encontré "Fecha monitoreo" en el reporte UGCQ.');
    const encab = aoa[h].map(v => String(v == null ? '' : v));
    const pos = ENCABEZADOS.map(e => {
      let j = encab.indexOf(e);
      if (j < 0) j = encab.map(clave).indexOf(clave(e));
      return j;
    });
    const out = [];
    for (let i = h + 1; i < aoa.length; i++) {
      const f = aoa[i] || [];
      const fecha = parseFecha(f[pos[0]]);
      if (!fecha) continue;
      out.push({ fecha, fila: pos.map(j => (j >= 0 && f[j] !== undefined ? f[j] : null)) });
    }
    return out;
  }

  // ═══════════════════════════════════════════════
  // LECTURA DE LA TABLA QUIRÚRGICA EN PDF (SITGEQ, generada con dompdf)
  // Entrada: páginas con los textos posicionados de pdf.js: [{items:[{str,x,y,w}]}] (y crece hacia arriba)
  // ═══════════════════════════════════════════════
  const COLUMNAS_TABLA = [
    ['pabellon', 'pabellon'], ['hora', 'hora'], ['nombre', 'nombre'], ['run', 'run'], ['edad', 'edad'],
    ['diagnostico', 'diagnostico'], ['operacion', 'op propuesta'], ['plano', 'plano extremidad'],
    ['cirujano', 'cirujano'], ['ayud1', 'ayud 1'], ['ayud2', 'ayud 2'], ['anest', 'anest'],
    ['tipoAnest', 'tipo anest'], ['ges', 'ges'], ['tiempo', 'tiempo ocupacion'],
    ['condicionalidad', 'condicionalidad'], ['agendamiento', 'tipo agendamiento'],
  ];
  const HORA_RE = /^(\d{1,2})[:.](\d{2})\b/;
  const CUERPO_RUN = /^\d{1,2}\.?\d{3}\.?\d{3}-?/;
  function horaDe(s) {
    const m = String(s).match(HORA_RE);
    return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? m[1].padStart(2, '0') + ':' + m[2] : '';
  }
  const seccionTexto = (s) => String(s).trim().replace(/^PABELL[ÓO]N/i, 'Pabellón');

  // Distancia típica entre líneas de una misma celda; se mide en la página para tolerar otra escala.
  // 1º: en el encabezado (rótulos de dos líneas: "Ayud./2", "Tiempo/Ocupación"); 2º: lo más frecuente en la página
  function pasoEncabezado(items) {
    for (const it of items) {
      if (norm(it.str) !== 'pabellon' || !it.w) continue;
      const tol = it.w * 0.1;
      const misma = items.filter(o => Math.abs(o.y - it.y) < tol);
      if (!misma.some(o => norm(o.str) === 'hora') || !misma.some(o => norm(o.str) === 'run')) continue;
      const banda = items.filter(o => Math.abs(o.y - it.y) < it.w * 0.45 && o !== it);
      const difs = [];
      for (const a of banda) for (const b of banda) {
        const dy = a.y - b.y;
        if (dy > it.w * 0.15 && Math.abs(a.cx - b.cx) < it.w * 0.4) difs.push(dy);
      }
      if (difs.length) return difs.sort((a, b) => a - b)[Math.floor(difs.length / 2)];
      return 11.235 * it.w / 33.23; // proporción medida en la tabla real (rótulo "Pabellón" de 33,23 pt)
    }
    return 0;
  }
  function pasoLinea(items) {
    const cuenta = new Map();
    for (const a of items) {
      let menor = 0;
      for (const b of items) {
        const dy = a.y - b.y;
        if (dy <= 0.5 || dy > 40 || (Math.abs(a.cx - b.cx) > 3 && Math.abs(a.x - b.x) > 1)) continue;
        if (!menor || dy < menor) menor = dy;
      }
      if (menor) { const k = Math.round(menor * 4) / 4; cuenta.set(k, (cuenta.get(k) || 0) + 1); }
    }
    let paso = 11.235, max = 0;
    for (const [k, n] of cuenta) if (n > max || (n === max && k < paso)) { max = n; paso = k; }
    return max >= 3 ? paso : 11.235;
  }

  function columnasDeEncabezado(banda, tolX) {
    const grupos = [];
    for (const o of banda.slice().sort((a, b) => a.cx - b.cx)) {
      const g = grupos.find(gr => Math.abs(gr.cx - o.cx) < tolX);
      if (g) { g.items.push(o); g.cx = g.items.reduce((s, q) => s + q.cx, 0) / g.items.length; }
      else grupos.push({ cx: o.cx, items: [o] });
    }
    const cols = grupos.map(g => {
      const txt = clave(g.items.slice().sort((a, b) => b.y - a.y || a.x - b.x).map(q => q.str).join(' '));
      const def = COLUMNAS_TABLA.find(([, n]) => n === txt);
      return {
        campo: def ? def[0] : 'col_' + txt.replace(/ /g, '_'), cx: g.cx,
        izq: Math.min(...g.items.map(q => q.x)), der: Math.max(...g.items.map(q => q.x + q.w)),
      };
    }).sort((a, b) => a.cx - b.cx);
    for (let k = 0; k < cols.length; k++) {
      cols[k].desde = k === 0 ? -Infinity : (cols[k - 1].der + cols[k].izq) / 2;
      cols[k].hasta = k === cols.length - 1 ? Infinity : (cols[k].der + cols[k + 1].izq) / 2;
    }
    return cols;
  }

  function parsearTablaPDF(paginas, archivo) {
    const res = { archivo: archivo || 'tabla.pdf', fecha: null, filas: [], avisos: [] };
    let columnas = null;   // se heredan si una página no repite el encabezado
    let seccion = '';
    let trozoPendiente = null; // parte de una fila cortada al pie de una página (sin hora ni RUN)
    let pasoPrevio = 0;

    const armarFila = (celdas, obs, pagina, sec) => {
      const txt = (campo, sep = ' ') => (celdas[campo] || []).join(sep).replace(/\s+/g, ' ').trim();
      const agTxt = txt('agendamiento'), condTxt = txt('condicionalidad');
      const nAg = norm(agTxt);
      let agend = 'NORMAL';
      if (nAg.includes('condicional')) agend = 'CONDICIONAL';
      else if (nAg && !nAg.includes('electivo') && !nAg.includes('normal') && !nAg.includes('directo')) agend = 'OTRO';
      else if (!nAg && /^s/.test(norm(condTxt))) agend = 'CONDICIONAL';
      const runTxt = txt('run', '');
      const fila = {
        pagina, pabellon: txt('pabellon') || sec, hora: (celdas.hora || []).map(horaDe).find(Boolean) || '',
        nombre: txt('nombre'), run: runTxt, edad: parseInt(txt('edad'), 10) || null,
        diagnostico: txt('diagnostico'), operacion: txt('operacion'), cirujano: txt('cirujano'),
        ayudantes: [txt('ayud1'), txt('ayud2')].filter(v => v && v !== '-'),
        anestesista: txt('anest'), tipoAnestesia: txt('tipoAnest'), ges: txt('ges'), tiempo: parseInt(txt('tiempo'), 10) || null,
        condicionalidad: condTxt, agendamiento: agTxt, agend, obs: obs || '', avisos: [],
      };
      if (condTxt && agTxt && /^s/.test(norm(condTxt)) !== (agend === 'CONDICIONAL')) {
        fila.avisos.push(`Condicionalidad "${condTxt}" no calza con tipo de agendamiento "${agTxt}"`);
      }
      if (agend === 'OTRO') fila.avisos.push(`Tipo de agendamiento "${agTxt}" no es electivo`);
      if ((runTxt.match(/\d{6,8}-?[\dkK]/g) || []).length > 1) fila.avisos.push('Dos RUN en la misma fila de la tabla: revisar');
      return fila;
    };
    const agregarCeldas = (destino, origen, alInicio) => {
      for (const [k, v] of Object.entries(origen)) destino[k] = alInicio ? v.concat(destino[k] || []) : (destino[k] || []).concat(v);
    };
    const celdasDe = (grupo) => {
      const celdas = {};
      for (const it of grupo.slice().sort((a, b) => b.y - a.y || a.x - b.x)) if (it.col) (celdas[it.col] = celdas[it.col] || []).push(it.str);
      return celdas;
    };
    const filasCeldas = []; // {celdas, obs, pagina, seccion}

    paginas.forEach((pag, ip) => {
      const items = (pag.items || []).filter(it => it && String(it.str).trim() !== '')
        .map(it => ({ str: String(it.str).replace(/\s+/g, ' ').trim(), x: Number(it.x), y: Number(it.y), w: Number(it.w) || 0, usado: false }))
        .map(it => Object.assign(it, { cx: it.x + it.w / 2 }))
        .sort((a, b) => b.y - a.y || a.x - b.x);
      if (!items.length) return;
      const paso = pasoEncabezado(items) || pasoPrevio || pasoLinea(items);
      pasoPrevio = paso;
      const tolLinea = paso * 0.25;
      const cortes = [];

      // 1) Encabezados de columnas: "Pabellón" con "Hora" y "Run" en la misma línea
      for (const it of items) {
        if (it.usado || norm(it.str) !== 'pabellon') continue;
        const misma = items.filter(o => !o.usado && Math.abs(o.y - it.y) < tolLinea);
        if (!misma.some(o => norm(o.str) === 'hora') || !misma.some(o => norm(o.str) === 'run')) continue;
        const banda = items.filter(o => !o.usado && Math.abs(o.y - it.y) <= paso * 0.8);
        banda.forEach(o => { o.usado = true; });
        const ys = banda.map(o => o.y);
        cortes.push({ tipo: 'encabezado', arriba: Math.max(...ys) + tolLinea, abajo: Math.min(...ys) - tolLinea, cols: columnasDeEncabezado(banda, paso * 0.9) });
      }

      // 2) Observaciones: "Obs:" y sus líneas de continuación (alineadas a "Obs:", a menos de una línea)
      for (const ob of items.filter(o => !o.usado && /^obs\s*(?:[:.]|$)/i.test(o.str))) {
        if (ob.usado) continue;
        const linea = items.filter(o => !o.usado && Math.abs(o.y - ob.y) < tolLinea && o.x >= ob.x - 1).sort((a, b) => a.x - b.x);
        linea.forEach(o => { o.usado = true; });
        const textos = [linea.map(o => o === ob ? o.str.replace(/^obs\s*[:.]?\s*/i, '') : o.str).filter(Boolean).join(' ')];
        let yPrev = ob.y, abajo = ob.y;
        for (;;) {
          const cont = items.filter(o => !o.usado && yPrev - o.y > tolLinea && yPrev - o.y < paso * 1.17 && Math.abs(o.x - ob.x) < paso * 0.35);
          if (!cont.length) break;
          const yc = Math.max(...cont.map(o => o.y));
          const lineaC = items.filter(o => !o.usado && Math.abs(o.y - yc) < tolLinea && o.x >= ob.x - 1).sort((a, b) => a.x - b.x);
          lineaC.forEach(o => { o.usado = true; });
          textos.push(lineaC.map(o => o.str).join(' '));
          yPrev = yc; abajo = yc;
        }
        cortes.push({ tipo: 'obs', arriba: ob.y + tolLinea, abajo: abajo - tolLinea, texto: textos.join(' ').replace(/\s+/g, ' ').trim() });
      }

      // 3) Título del documento, fecha y títulos de sección ("PABELLÓN 2"), solos en su línea y fuera de la columna Pabellón
      const encPag = cortes.filter(c => c.tipo === 'encabezado');
      for (const it of items) {
        if (it.usado) continue;
        const solo = !items.some(o => o !== it && !o.usado && Math.abs(o.y - it.y) < tolLinea && !/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(o.str));
        if (/^TABLA QUIR/i.test(it.str)) {
          it.usado = true;
          cortes.push({ tipo: 'titulo', arriba: it.y + tolLinea, abajo: it.y - tolLinea, texto: it.str });
        } else if (/^fecha\s*:/i.test(it.str)) {
          let m = it.str.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
          const vecina = items.filter(o => o !== it && !o.usado && Math.abs(o.y - it.y) < tolLinea && o.x > it.x).sort((a, b) => a.x - b.x)[0];
          if (!m && vecina) { m = vecina.str.match(/^(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/); if (m) vecina.usado = true; }
          it.usado = true;
          if (m && !res.fecha) res.fecha = parseFecha(m[1]);
          cortes.push({ tipo: 'titulo', arriba: it.y + tolLinea, abajo: it.y - tolLinea, texto: it.str });
        } else if (/^PABELL[ÓO]N\s+\S/i.test(it.str) && it.str.length <= 40 && !/\/\//.test(it.str) && solo) {
          const enc = encPag.filter(e => e.abajo > it.y).sort((a, b) => a.abajo - b.abajo)[0];
          const cols = enc ? enc.cols : columnas;
          const colPab = cols && cols.find(c => c.campo === 'pabellon');
          if (colPab && it.cx < colPab.hasta) continue; // celda de la fila, no título
          it.usado = true;
          cortes.push({ tipo: 'titulo', arriba: it.y + tolLinea, abajo: it.y - tolLinea, texto: it.str, seccion: seccionTexto(it.str) });
        }
      }

      // 4) Segmentos: lo que queda entre cortes. Una fila termina donde terminan sus observaciones
      cortes.sort((a, b) => b.arriba - a.arriba);
      const libres = items.filter(it => !it.usado);
      const segmentos = [];
      let techo = Infinity, cols = columnas;
      for (const c of cortes.concat([{ tipo: 'fin', arriba: -Infinity, abajo: -Infinity }])) {
        const piso = c.tipo === 'obs' ? c.abajo : c.arriba;
        segmentos.push({ items: libres.filter(it => it.y < techo && it.y > piso), obs: c.tipo === 'obs' ? c.texto : null, cols, seccion, ultimo: c.tipo === 'fin' });
        techo = c.abajo;
        if (c.tipo === 'encabezado') cols = c.cols;
        if (c.seccion) seccion = c.seccion;
      }
      if (cols) columnas = cols;

      let conDatos = false; // ¿ya hubo filas en esta página?
      segmentos.forEach((seg) => {
        const ult = filasCeldas[filasCeldas.length - 1];
        // Al comienzo de una página, una fila que viene de la anterior sin sus observaciones puede continuar aquí
        const continua = !conDatos && ult && ult.pagina === ip && !ult.obs;
        if (!seg.items.length) {
          if (seg.obs && continua) ult.obs = seg.obs;
          return;
        }
        if (!seg.cols) return; // texto antes de la tabla (membrete)
        for (const it of seg.items) { const c = seg.cols.find(k => it.cx >= k.desde && it.cx < k.hasta); it.col = c ? c.campo : null; }
        const anclasHora = seg.items.filter(it => it.col === 'hora' && horaDe(it.str));
        const anclasRun = seg.items.filter(it => it.col === 'run' && CUERPO_RUN.test(it.str));
        const anclas = [anclasHora, anclasRun].sort((a, b) => b.length - a.length)[0].slice();
        if (!seg.items.some(it => it.col === 'nombre' || it.col === 'run')) return; // pie de página u otro texto suelto
        conDatos = true;
        if (!anclas.length) {
          const celdas = celdasDe(seg.items);
          // Resto de la última fila de la página anterior (fila cortada entre páginas)
          if (continua) { agregarCeldas(ult.celdas, celdas, false); if (seg.obs) ult.obs = seg.obs; ult.partida = true; return; }
          // Comienzo de una fila que sigue en la página siguiente
          if (seg.ultimo && !seg.obs) { trozoPendiente = { celdas, pagina: ip + 1 }; return; }
        }
        if (!anclas.length) anclas.push(seg.items.filter(it => it.col === 'nombre' || it.col === 'run').sort((a, b) => b.y - a.y)[0]);
        // Varias filas sin línea de observaciones entre ellas: se separan por el mayor hueco entre anclas
        const ys = [...new Set(anclas.map(a => a.y))].sort((a, b) => b - a);
        // La celda Pabellón se centra distinto (abarca también las observaciones): no sirve para medir huecos
        const lineas = [...new Set(seg.items.filter(it => it.col !== 'pabellon').map(it => it.y))].sort((a, b) => b - a);
        const cortesY = [];
        for (let k = 0; k < ys.length - 1; k++) {
          const entre = lineas.filter(y => y <= ys[k] && y >= ys[k + 1]);
          let corte = (ys[k] + ys[k + 1]) / 2, hueco = -1;
          for (let j = 0; j < entre.length - 1; j++) {
            const h = entre[j] - entre[j + 1];
            if (h > hueco + 0.01) { hueco = h; corte = (entre[j] + entre[j + 1]) / 2; }
          }
          cortesY.push(corte);
        }
        ys.forEach((_, k) => {
          const arriba = k === 0 ? Infinity : cortesY[k - 1], abajo = k === ys.length - 1 ? -Infinity : cortesY[k];
          const grupo = seg.items.filter(it => it.y < arriba && it.y > abajo);
          const celdas = celdasDe(grupo);
          let partida = false;
          if (trozoPendiente) { agregarCeldas(celdas, trozoPendiente.celdas, true); trozoPendiente = null; partida = true; }
          filasCeldas.push({ celdas, obs: k === ys.length - 1 ? seg.obs : '', pagina: ip + 1, seccion: seg.seccion, partida });
        });
      });
    });

    filasCeldas.forEach((fc, i) => {
      const fila = armarFila(fc.celdas, fc.obs, fc.pagina, fc.seccion);
      if (!fila.nombre && !fila.run) return;
      fila.id = res.archivo + '#' + (i + 1);
      fila.archivo = res.archivo;
      if (fc.partida) fila.avisos.push('Fila cortada entre páginas: se unieron sus partes (revisar)');
      if (!fila.run) {
        fila.avisos.push('Fila de la tabla sin RUN: revisar');
        res.avisos.push(`Página ${fila.pagina}: fila sin RUN${fila.nombre ? ' (' + fila.nombre + ')' : ''}`);
      }
      res.filas.push(fila);
    });
    if (trozoPendiente) res.avisos.push(`Página ${trozoPendiente.pagina}: texto al pie de la tabla que no pude asignar a una fila`);
    if (!res.fecha) res.avisos.push('No encontré la fecha ("Fecha: dd-mm-aaaa") en la tabla.');
    res.filas.forEach(f => { f.fecha = res.fecha; });
    if (!res.filas.length) res.avisos.push('No encontré pacientes en la tabla. ¿Es la "Tabla Quirúrgica" de SITGEQ?');
    return res;
  }

  // ═══════════════════════════════════════════════
  // MOTOR DE COTEJO DE UN DÍA
  // ═══════════════════════════════════════════════
  /* fuentes = { tabla: {cargada, filas}, encuentros: {cargado, filas}, suspensiones: {cargado, filas} }
     (las filas pueden traer varias fechas; aquí se filtra por la fecha pedida)
     ajustes = decisiones manuales:
       pac[id] = { estado: 'REALIZADA'|'SUSPENDIDA'|'NO_CONTAR', agend: 'NORMAL'|'CONDICIONAL', causalCol }
       enc[id] = { clase: 'PROG'|'AGREG'|'URG'|'MENOR'|'PROC'|'NO_CONTAR'|'NUEVO_NORMAL'|'NUEVO_COND' }
     Clases de conteo de un encuentro: PROG (cirugía del paciente programado), AGREG, URG, MENOR, PROC, NO_CONTAR */
  function cotejarDia(fecha, fuentes, ajustes) {
    ajustes = ajustes || {};
    const ajP = ajustes.pac || {}, ajE = ajustes.enc || {};
    const filas = (k) => (fuentes && fuentes[k] && fuentes[k].filas) || [];
    const cargado = (k) => !!(fuentes && fuentes[k] && (fuentes[k].cargada || fuentes[k].cargado));
    const tablaDia = filas('tabla').filter(f => f.fecha === fecha);
    const encAll = filas('encuentros'), susAll = filas('suspensiones');
    const conTabla = tablaDia.length > 0;

    const pacientes = [];
    const porClave = new Map();
    const nuevoPaciente = (base) => {
      const p = Object.assign({ encuentros: [], suspensiones: [], avisos: [], obs: '', pabellon: '', hora: '' }, base);
      pacientes.push(p);
      porClave.set(p.ident.key, p);
      return p;
    };
    const enlazar = (ident) => {
      const p = porClave.get(ident.key);
      if (p) return { p, porNombre: false };
      let mejor = null, sim = 0;
      for (const q of pacientes) {
        if (!mismaPersona(ident, q.ident).si) continue;
        const s = similitudNombre(ident.tokens, q.ident.tokens);
        if (s > sim) { sim = s; mejor = q; }
      }
      return mejor ? { p: mejor, porNombre: true } : { p: null, porNombre: false };
    };
    // Un registro sin RUN ni nombre no puede fusionarse con otros
    const identReg = (r) => {
      const ident = identidad(r.run, r.nombre);
      if (ident.key === 'N:') ident.key = 'X:' + r.id;
      return ident;
    };
    const vincular = (e, p, porNombre) => {
      e.paciente = p;
      p.encuentros.push(e);
      if (porNombre) e.avisos.push(`Enlazado por nombre (RUN programado ${p.run || '—'} / SITGEQ ${e.ident.run || '—'})`);
    };

    // 1) Programados: la tabla del día
    for (const f of tablaDia) {
      const ident = identReg(f);
      const ya = porClave.get(ident.key);
      if (ya) { ya.avisos.push(`Aparece dos veces en la tabla (${[f.pabellon, f.hora].filter(Boolean).join(' ')}); se cuenta una vez`); continue; }
      const p = nuevoPaciente({
        id: 'T:' + ident.key, origen: 'tabla', ident, nombre: f.nombre, run: ident.run,
        pabellon: f.pabellon, hora: f.hora, intervencion: f.operacion, agendTabla: f.agend,
        agendamientoTxt: f.agendamiento, obs: f.obs || '',
      });
      p.avisos.push(...(f.avisos || []));
      if (/^R:/.test(ident.key) && !ident.runOk) p.avisos.push('RUN con dígito verificador inválido en la tabla');
      if (!/^R:/.test(ident.key)) p.avisos.push('Sin RUN válido en la tabla: se enlaza por documento o nombre');
      const prev = (f.obs || '').match(/SUSPENDID[OA]\S*\s*(?:EL\s*)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)?/i);
      if (prev) p.avisos.push('Reprogramado tras suspensión previa' + (prev[1] ? ' (' + prev[1] + ')' : '') + ', según Obs');
    }

    // 2) Encuentros del día (lo realizado)
    const encuentros = encAll.filter(e => e.fecha === fecha)
      .map(e => Object.assign({}, e, { ident: identReg(e), avisos: [], paciente: null }))
      .sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
    for (const e of encuentros) {
      const aj = (ajE[e.id] || {}).clase;
      if (aj !== 'NUEVO_NORMAL' && aj !== 'NUEVO_COND') continue;
      // Programado que no venía en la tabla cargada (p. ej., falta la tabla de un pabellón)
      const p = porClave.get(e.ident.key) || nuevoPaciente({
        id: 'M:' + e.ident.key, origen: 'manual', ident: e.ident, nombre: e.nombre, run: e.ident.run,
        pabellon: e.pabellon, hora: e.hora, intervencion: e.intervencion,
        agendTabla: aj === 'NUEVO_COND' ? 'CONDICIONAL' : 'NORMAL', agendamientoTxt: 'Agregado a mano como programado',
      });
      vincular(e, p, false);
      e.fijoProg = true;
    }
    for (const e of encuentros) {
      if (e.paciente) continue;
      const { p, porNombre } = enlazar(e.ident);
      if (p) vincular(e, p, porNombre);
    }
    if (!conTabla) {
      // Sin tabla: lo programado se reconstruye con las electivas registradas en SITGEQ
      for (const e of encuentros) {
        if (e.paciente || e.interv === 'MENOR' || e.interv === 'PROC' || e.tipoCirugia === 'URG' || e.tipoCirugia === 'AGREG') continue;
        const p = porClave.get(e.ident.key) || nuevoPaciente({
          id: 'E:' + e.ident.key, origen: 'sitgeq', ident: e.ident, nombre: e.nombre, run: e.ident.run,
          pabellon: e.pabellon, hora: e.hora, intervencion: e.intervencion,
          agendTabla: e.tipoCirugia === 'COND' ? 'CONDICIONAL' : 'NORMAL', agendamientoTxt: e.tipoCirugiaTxt,
        });
        vincular(e, p, false);
        if (e.tipoCirugia === '?') e.avisos.push('SITGEQ no informa el tipo de cirugía: se asume electiva programada');
      }
    }

    // 3) Suspensiones del día
    const suspensiones = susAll.filter(s => s.fecha === fecha)
      .map(s => Object.assign({}, s, { ident: identReg(s), avisos: [], causal: mapearCausal(s.categoria, s.descripcion) }));
    for (const s of suspensiones) {
      let { p, porNombre } = enlazar(s.ident);
      if (!p) {
        // Suspendido en SITGEQ sin estar en la tabla cargada: se asume que sí estaba programado
        p = nuevoPaciente({
          id: 'S:' + s.ident.key, origen: 'suspension', ident: s.ident, nombre: s.nombre, run: s.ident.run,
          intervencion: s.intervencion, agendTabla: s.agend, agendamientoTxt: s.agendamientoTxt,
        });
        if (conTabla) p.avisos.push('Suspendido en SITGEQ, pero no aparece en la tabla cargada: se cuenta como programado (revisar)');
        for (const e of encuentros) {
          if (e.paciente) continue;
          const m = mismaPersona(e.ident, s.ident);
          if (m.si) vincular(e, p, m.porNombre);
        }
        porNombre = false;
      }
      s.paciente = p;
      p.suspensiones.push(s);
      if (porNombre) s.avisos.push(`Enlazada por nombre (RUN programado ${p.run || '—'} / SITGEQ ${s.ident.run || '—'})`);
      if (!s.causal) s.avisos.push('Causal sin equivalente en UGCQ: elegir a mano');
      else if (s.causal.confianza === 'sugerida') s.avisos.push('Causal UGCQ sugerida: confirmar');
      else if (s.causal.confianza === 'parcial') s.avisos.push('Causal UGCQ por coincidencia parcial: revisar');
    }

    // 4) Clase automática de cada encuentro
    for (const e of encuentros) {
      if (e.interv === 'MENOR') e.claseAuto = 'MENOR';
      else if (e.interv === 'PROC') e.claseAuto = 'PROC';
      else if (e.paciente) {
        const yaTiene = e.paciente.encuentros.some(o => o !== e && o.claseAuto === 'PROG');
        if (e.fijoProg || !yaTiene) {
          e.claseAuto = 'PROG';
          if (e.tipoCirugia === 'URG') e.avisos.push('Paciente programado registrado como Urgencia en SITGEQ: se cuenta como programado realizado');
        } else if (e.tipoCirugia === 'URG') {
          e.claseAuto = 'URG';
          e.avisos.push('Segunda cirugía del mismo paciente en el día (urgencia)');
        } else {
          e.claseAuto = 'NO_CONTAR';
          e.avisos.push('Segundo registro electivo del mismo paciente en el día: no se suma (revisar)');
        }
      } else if (e.tipoCirugia === 'URG') e.claseAuto = 'URG';
      else {
        e.claseAuto = 'AGREG';
        if (!conTabla) e.avisos.push('Registrada como agregada en SITGEQ');
        else if (e.tipoCirugia === '?') e.avisos.push('SITGEQ no informa el tipo de cirugía: se asume electiva agregada');
        else if (e.tipoCirugia === 'COND') e.avisos.push('SITGEQ la registra como condicional, pero el paciente no está en la tabla cargada');
      }
      if (e.interv === '?' && (e.claseAuto === 'PROG' || e.claseAuto === 'AGREG' || e.claseAuto === 'URG')) {
        e.avisos.push('SITGEQ no indica si es cirugía mayor: se asume mayor');
      }
    }
    for (const e of encuentros) {
      const aj = (ajE[e.id] || {}).clase || '';
      e.ajuste = aj;
      e.claseFinal = aj && aj !== 'NUEVO_NORMAL' && aj !== 'NUEVO_COND' ? aj : e.claseAuto;
      if (e.claseFinal === 'PROG' && !e.paciente) e.claseFinal = e.tipoCirugia === 'URG' ? 'URG' : 'AGREG';
    }

    // 5) Estado de cada programado
    for (const p of pacientes) {
      const aj = ajP[p.id] || {};
      p.agend = aj.agend || p.agendTabla;
      p.ajuste = aj.estado || '';
      const realizada = p.encuentros.some(e => e.claseFinal === 'PROG');
      const soloMenores = p.encuentros.length > 0 && p.encuentros.every(e => e.claseFinal === 'MENOR' || e.claseFinal === 'PROC');
      const intervSusp = p.suspensiones.length ? p.suspensiones[0].interv : '?';

      let estado, origen = 'manual';
      if (p.ajuste === 'NO_CONTAR' || p.ajuste === 'REALIZADA' || p.ajuste === 'SUSPENDIDA') estado = p.ajuste;
      else {
        origen = 'auto';
        if (realizada) estado = 'REALIZADA';
        else if (soloMenores) estado = 'NO_MAYOR';
        else if (p.suspensiones.length) estado = 'SUSPENDIDA';
        else if (p.agend === 'CONDICIONAL') estado = 'NO_REALIZADA';
        else estado = 'SIN_REGISTRO';
      }
      p.estado = estado;
      p.estadoOrigen = origen;

      // ¿Suma a UGCQ? Solo Cx Mayor electiva; una decisión manual REALIZADA/SUSPENDIDA la fuerza
      const noMayorSusp = origen === 'auto' && estado === 'SUSPENDIDA' && (intervSusp === 'MENOR' || intervSusp === 'PROC');
      p.cuenta = estado !== 'NO_CONTAR' && estado !== 'NO_MAYOR' && !noMayorSusp && (p.agend === 'NORMAL' || p.agend === 'CONDICIONAL');
      if (estado === 'NO_MAYOR') p.avisos.push('Registrado en SITGEQ como cirugía menor o procedimiento: no suma a programados Cx Mayor');
      if (noMayorSusp) p.avisos.push(`Suspensión de ${p.suspensiones[0].intervTxt || 'intervención no mayor'}: no suma a programados Cx Mayor`);
      if (p.agend !== 'NORMAL' && p.agend !== 'CONDICIONAL' && estado !== 'NO_CONTAR') p.avisos.push('Agendamiento no electivo en la tabla: no suma a programados');
      if (realizada && p.suspensiones.length && origen === 'auto') p.avisos.push('Tiene suspensión registrada, pero se operó el mismo día: se cuenta como realizada');
      if (p.suspensiones.length > 1) p.avisos.push(`${p.suspensiones.length} registros de suspensión el mismo día: se usa el primero`);
      if (p.origen === 'tabla') {
        for (const e of p.encuentros) {
          if (e.claseFinal !== 'PROG' || (e.tipoCirugia !== 'COND' && e.tipoCirugia !== 'ELECT')) continue;
          if ((e.tipoCirugia === 'COND') !== (p.agend === 'CONDICIONAL')) {
            p.avisos.push(`Tabla dice ${p.agend === 'CONDICIONAL' ? 'Condicional' : 'Normal'}; SITGEQ registró "${e.tipoCirugiaTxt}". Manda la tabla`);
          }
        }
      }

      // Causal UGCQ (solo para suspendidos)
      p.causalCol = null;
      p.causalConfianza = '';
      if (estado === 'SUSPENDIDA') {
        if (aj.causalCol != null && aj.causalCol !== '') { p.causalCol = Number(aj.causalCol); p.causalConfianza = 'manual'; }
        else if (p.suspensiones.length && p.suspensiones[0].causal) { p.causalCol = p.suspensiones[0].causal.col; p.causalConfianza = p.suspensiones[0].causal.confianza; }
      }
    }
    // La cirugía de un programado que no se cuenta pasa a contarse por su propio tipo
    for (const e of encuentros) {
      if (e.claseFinal === 'PROG' && e.paciente && !e.paciente.cuenta) {
        e.claseFinal = e.tipoCirugia === 'URG' ? 'URG' : 'AGREG';
        e.avisos.push('El paciente no suma como programado: esta cirugía se cuenta como ' + (e.claseFinal === 'URG' ? 'urgencia' : 'agregada'));
      }
    }

    // 6) Conteos UGCQ
    const c = { programados: 0, condicionales: 0, suspendidos: 0, pctSuspendidos: 0, progRealizadas: 0, condRealizadas: 0,
      agregadas: 0, urgencias: 0, menores: 0, procedimientos: 0, totalMayoresElectivas: 0, totalRealizado: 0 };
    const causas = {};
    const pendientes = [];
    for (const p of pacientes) {
      if (!p.cuenta) continue;
      if (p.agend === 'CONDICIONAL') {
        c.condicionales++;
        if (p.estado === 'REALIZADA') c.condRealizadas++;
        continue;
      }
      c.programados++;
      if (p.estado === 'REALIZADA') c.progRealizadas++;
      else if (p.estado === 'SUSPENDIDA') {
        c.suspendidos++;
        if (p.causalCol == null) pendientes.push({ tipo: 'causal', pacienteId: p.id, texto: 'Suspensión sin causal UGCQ: elegir causal' });
        else {
          causas[p.causalCol] = (causas[p.causalCol] || 0) + 1;
          if (p.causalConfianza === 'sugerida') pendientes.push({ tipo: 'causal', pacienteId: p.id, texto: 'Confirmar la causal UGCQ sugerida' });
        }
      } else if (p.estado === 'SIN_REGISTRO') {
        pendientes.push({ tipo: 'estado', pacienteId: p.id, texto: 'Programado sin cirugía ni suspensión en SITGEQ: indicar qué pasó' });
      }
    }
    for (const e of encuentros) {
      if (e.claseFinal === 'AGREG') c.agregadas++;
      else if (e.claseFinal === 'URG') c.urgencias++;
      else if (e.claseFinal === 'MENOR') c.menores++;
      else if (e.claseFinal === 'PROC') c.procedimientos++;
    }
    c.pctSuspendidos = c.programados > 0 ? Math.round(c.suspendidos * 100 / c.programados) : 0;
    c.totalMayoresElectivas = c.progRealizadas + c.condRealizadas + c.agregadas;
    c.totalRealizado = c.totalMayoresElectivas + c.urgencias + c.menores + c.procedimientos;

    // 7) Avisos del día
    const avisos = [];
    if (!conTabla) {
      avisos.push((cargado('tabla') ? 'No hay tabla quirúrgica cargada para este día' : 'Falta la tabla quirúrgica') +
        ': lo programado se reconstruye desde SITGEQ y no se pueden identificar las agregadas.');
    }
    if (!encuentros.length) avisos.push(cargado('encuentros') ? 'El export de encuentros no trae cirugías de este día.' : 'Falta el export de encuentros quirúrgicos (lo realizado).');
    if (!cargado('suspensiones')) avisos.push('Falta el informe de suspensiones: los programados no operados quedarán pendientes.');
    if (conTabla && c.agregadas > Math.max(3, c.programados)) {
      avisos.push(`Hay ${c.agregadas} electivas fuera de tabla (más que las programadas): ¿falta la tabla de algún pabellón?`);
    }
    // Pista para los no operados: ¿hay registro en otra fecha?
    for (const p of pacientes) {
      if (p.estado !== 'SIN_REGISTRO' && p.estado !== 'NO_REALIZADA') continue;
      const otrosE = encAll.filter(e => e.fecha !== fecha && identidad(e.run, e.nombre).key === p.ident.key);
      const otrosS = susAll.filter(s => s.fecha !== fecha && identidad(s.run, s.nombre).key === p.ident.key);
      if (otrosE.length) p.avisos.push('Tiene cirugía registrada otro día: ' + otrosE.map(e => fmtFecha(e.fecha)).join(', '));
      if (otrosS.length) p.avisos.push('Tiene suspensión registrada otro día: ' + otrosS.map(s => fmtFecha(s.fecha)).join(', '));
    }

    return { fecha, conTabla, pacientes, encuentros, suspensiones, conteos: c, causas, pendientes, avisos, controles: controles(c, causas, pacientes) };
  }

  function controles(c, causas, pacientes) {
    const sinReg = pacientes.filter(p => p.cuenta && p.agend !== 'CONDICIONAL' && p.estado === 'SIN_REGISTRO').length;
    const sumaCausas = Object.values(causas).reduce((a, b) => a + b, 0);
    return [
      { ok: c.progRealizadas + c.suspendidos + sinReg === c.programados, texto: `Programados (${c.programados}) = realizados (${c.progRealizadas}) + suspendidos (${c.suspendidos})` + (sinReg ? ` + sin registro (${sinReg})` : '') },
      { ok: sinReg === 0, texto: sinReg ? `${sinReg} programado(s) sin cirugía ni suspensión en SITGEQ` : 'Todos los programados tienen cirugía o suspensión registrada' },
      { ok: sumaCausas === c.suspendidos, texto: `Causales asignadas (${sumaCausas}) = suspendidos (${c.suspendidos})` },
      { ok: c.condRealizadas <= c.condicionales, texto: `Condicionales realizadas (${c.condRealizadas}) ≤ condicionales (${c.condicionales})` },
      { ok: c.totalMayoresElectivas === c.progRealizadas + c.condRealizadas + c.agregadas, texto: `Total Cx Mayores Electivas = ${c.progRealizadas} + ${c.condRealizadas} + ${c.agregadas} = ${c.totalMayoresElectivas}` },
      { ok: c.totalRealizado === c.totalMayoresElectivas + c.urgencias + c.menores + c.procedimientos, texto: `Total realizado = ${c.totalMayoresElectivas} + ${c.urgencias} + ${c.menores} + ${c.procedimientos} = ${c.totalRealizado}` },
    ];
  }

  // ═══════════════════════════════════════════════
  // FILA UGCQ
  // ═══════════════════════════════════════════════
  function filaUGCQ(fecha, conteos, causas, fijos) {
    const fx = Object.assign({}, FIJOS_DEF, fijos || {});
    const fila = new Array(ENCABEZADOS.length).fill(null);
    fila[0] = fmtFecha(fecha);
    fila[1] = String(Number(fecha.slice(8, 10)));
    fila[2] = String(Number(fecha.slice(5, 7)));
    fila[3] = fecha.slice(0, 4);
    fila[4] = semanaUGCQ(fecha);
    fila[5] = fx.macroregion; fila[6] = fx.region; fila[7] = fx.servicio;
    fila[8] = fx.hospital; fila[9] = fx.complejidad; fila[10] = fx.certificacion;
    for (const [k, col] of CONTEOS) fila[col] = conteos[k] || 0;
    for (const [col, n] of Object.entries(causas || {})) if (n) fila[Number(col)] = n;
    return fila;
  }

  // Compara una fila calculada con la fila subida a UGCQ (conteos y causales)
  function compararFilas(calc, subida) {
    const dif = [];
    for (let j = 11; j < ENCABEZADOS.length; j++) {
      const a = Number(calc[j] || 0), b = Number(subida[j] || 0);
      if (a !== b) dif.push({ col: j, encabezado: ENCABEZADOS[j], calculado: a, ugcq: b });
    }
    return dif;
  }

  const api = {
    ENCABEZADOS, PRIMERA_CAUSA, CONTEOS, FIJOS_DEF, CAUSAS,
    norm, clave, normRun, runValido, fmtRun, identidad, similitudNombre,
    parseFecha, fmtFecha, semanaUGCQ, mapearCausal,
    detectarTipoPlanilla, leerEncuentros, leerSuspensiones, leerUGCQ, parsearTablaPDF,
    horaTexto, mismaPersona, cotejarDia, filaUGCQ, compararFilas,
  };
  root.UGCQ = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
