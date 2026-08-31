# PBM·IA Perioperatorio — vínculo con la planilla «Datos PBM» de Drive

La app vive en **`/pbm-app`** (https://cancelos-api.onrender.com/pbm-app) y es la misma
página `pbm.html` que funciona como artefacto en claude.ai. Tiene tres puertas de datos,
en este orden de prioridad:

| Puerta | Dónde funciona | Cómo llega el dato |
|---|---|---|
| **1 · Conector Google Drive** | Artefacto en claude.ai | La página lee la planilla con la cuenta Google del espectador. Privado: la planilla nunca se hace pública. |
| **2 · API `/pbm/casos`** | Desplegada en Render | El servidor entrega los casos del feed de Apps Script (planilla, sin RUT) + los guardados vía `POST /pbm/caso`. |
| **3 · CSV importado** | Cualquier navegador | Archivo → Descargar → CSV desde Sheets, o copiar/pegar celdas. Queda solo en ese navegador. |

Si ninguna puerta entrega datos, la app muestra **datos de ejemplo sintéticos** con un aviso.

## Por qué así (privacidad)

La columna `ID_paciente` de la planilla contiene RUT reales. Por eso:

- **Nunca** compartas la planilla como «cualquiera con el enlace» ni la publiques en la web.
- Este repositorio es **público**: `pbm.html` no lleva ningún dato de paciente embebido.
- El Apps Script de abajo **elimina la columna RUT antes de servir** los datos y exige un token.
- En la app, los ID se muestran enmascarados por defecto (botón «Mostrar ID completo»).

## Configurar el feed de la planilla (puerta 2)

1. Abre la planilla **Datos PBM** → Extensiones → **Apps Script**.
2. Pega este código y guarda:

```javascript
// NEXUS PBM · feed sin RUT + registro de casos
// Propiedades del script: TOKEN = una clave larga aleatoria (Configuración ⚙ → Propiedades del script)
const OCULTAR = ['id_paciente'];              // columnas que NUNCA se sirven
const norm = s => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

function hojaDatos_() {
  // la pestaña cuyo encabezado (fila 1) contiene ID_paciente
  return SpreadsheetApp.getActive().getSheets().find(sh =>
    sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].some(h => norm(h).includes('idpaciente')));
}

function doGet(e) {
  const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (token && (!e || !e.parameter || e.parameter.token !== token))
    return ContentService.createTextOutput(JSON.stringify({error: 'token'}))
      .setMimeType(ContentService.MimeType.JSON);
  const sh = hojaDatos_();
  if (!sh) return ContentService.createTextOutput(JSON.stringify({casos: []}))
      .setMimeType(ContentService.MimeType.JSON);
  const values = sh.getDataRange().getDisplayValues();   // DisplayValues conserva "7,6" y fechas chilenas
  const head = values[0];
  const keep = head.map(h => !OCULTAR.some(o => norm(h).includes(o)));
  const casos = values.slice(1)
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => {
      const o = {};
      head.forEach((h, i) => { if (keep[i] && String(h).trim()) o[String(h).trim()] = r[i]; });
      return o;
    });
  return ContentService.createTextOutput(JSON.stringify({casos: casos}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  if (token && body.token !== token)
    return ContentService.createTextOutput(JSON.stringify({ok: false, error: 'token'}))
      .setMimeType(ContentService.MimeType.JSON);
  const sh = hojaDatos_();
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const fila = head.map(h => {
    const k = Object.keys(body).find(kk => norm(kk) === norm(h) || norm(h).includes(norm(kk)));
    return norm(h).includes('marcatemporal') ? new Date() : (k ? body[k] : '');
  });
  sh.appendRow(fila);
  return ContentService.createTextOutput(JSON.stringify({ok: true}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. En ⚙ **Configuración del proyecto → Propiedades del script** crea `TOKEN` con una clave
   larga aleatoria.
4. **Implementar → Nueva implementación → Aplicación web**:
   - Ejecutar como: **Yo**
   - Acceso: **Cualquier persona con el enlace** (el token protege el contenido)
5. Copia la URL de la aplicación web y configúrala en Render (dashboard → Environment):

```
PBM_SHEETS_FEED    = https://script.google.com/macros/s/…/exec?token=TU_TOKEN
PBM_SHEETS_WEBHOOK = https://script.google.com/macros/s/…/exec   (opcional, para POST /pbm/caso)
```

Al redeployar, `/pbm/casos` servirá los casos de la planilla (sin RUT, cache 5 min) y la app
en `/pbm-app` los mostrará automáticamente.

## Registrar casos nuevos

El flujo primario sigue siendo el **Formulario «Hoja datos PBM»** → planilla → app.
La app enlaza el formulario en el botón «➕ Nuevo caso» (pestaña Datos).

## Endpoints

- `GET /pbm-app` — la aplicación PBM·IA Perioperatorio
- `GET /pbm/casos` — `{casos: [...], fuente_planilla: bool}` (feed Apps Script + `casos_pbm.jsonl` local)
- `POST /pbm/caso` — anexa un caso al jsonl local y, si hay `PBM_SHEETS_WEBHOOK`, a la planilla
