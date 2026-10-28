# Cierre diario UGCQ — cotejo tabla quirúrgica vs SITGEQ

Cruza **lo programado** (tabla quirúrgica) con **lo ocurrido** (SITGEQ) y deja lista la ficha diaria para
**digitar en UGCQ**, en el orden del reporte "Cirugía por rangos de fecha" (119 columnas: conteos y causales de suspensión).
Además muestra la **gestión de pabellón**: todo lo ocurrido, aunque no vaya a UGCQ.

Dos formas de usarla, sin depender de Claude:

- **Archivo portátil** `Cierre_UGCQ.html`: se abre con doble clic en Chrome o Edge, **sin internet y sin servidor**.
  Se descarga desde la página web (botón "⬇ VERSIÓN PORTÁTIL", ruta `/ugcq/portable`) o se arma con `python3 ugcq_portable.py`.
- **Página web** `/ugcq` del servidor CancelOS (enlace "▸ CIERRE UGCQ" en la Torre de Control).

> Los archivos se leen **solo en el navegador**: ningún dato de pacientes llega a un servidor.
> El historial guarda **solo números** (la fila UGCQ y los indicadores de gestión), nunca nombres ni RUN.

## Uso diario (≈ 3 minutos)

1. Exportar desde SITGEQ los archivos del día:
   - **Tabla quirúrgica** (PDF "Tabla Quirúrgica") **publicada el día de la cirugía**: lo programado.
   - **Encuentros quirúrgicos** (Excel): todo lo operado, incluidas urgencias, cirugías menores y procedimientos.
   - **Informe de suspensiones** (Excel): suspendidos con causal MINSAL.
2. Arrastrarlos a la página (se reconoce cada archivo solo; se pueden cargar varios días a la vez).
   Si hay dos archivos del mismo tipo para un día, se usa el último cargado.
3. Resolver los **pendientes** (en rojo).
4. **Digitar en UGCQ** con la ficha (tocar cada fila al digitarla) y **marcar el día como digitado**.
5. Opcional: **cotejo detallado** en Excel (paciente a paciente, decisiones y avisos) como respaldo.

## Reglas de conteo

| Columna UGCQ | Cómo se calcula |
|---|---|
| Pacientes Programados Cx Mayor Electiva | Pacientes de la tabla *Electivo Normal* (directa), cirugía mayor |
| Pacientes Condicionales Cx Mayor Electiva | Pacientes de la tabla *Electivo Condicional* |
| Pacientes Suspendidos | **Cirugía mayor electiva directa programada en horario hábil** que se suspendió |
| Porcentaje de Pacientes Suspendidos | suspendidos ÷ **programados en horario hábil** × 100, redondeado (los de fin de semana, feriado o fuera de horario se cuentan como programados, pero no entran al %) |
| Programadas / Condicionales realizadas | Programados / condicionales con cirugía mayor registrada ese día |
| Agregadas realizadas | Cirugías mayores electivas de pacientes que no están en la tabla |
| Urgencia realizadas | Cirugías mayores con tipo de cirugía *Urgencia* |
| Cx Menores / Procedimientos | **Por código**: suma de las columnas *Cirugía Menor* / *Procedimiento* del export (incluye anestesia 2201001) |
| Total Cx Mayores Electivas | programadas + condicionales + agregadas realizadas |
| Total Realizado | mayores electivas + urgencias + menores + procedimientos |
| Causales | Causal MINSAL de SITGEQ traducida a su columna UGCQ (los encabezados UGCQ vienen truncados a 63 bytes) |

**Horario hábil**: lunes a jueves 08:00–17:00 y viernes 08:00–16:00, excepto feriados (Chile 2026–2027 incluidos).
Todo es editable en *Configuración y reglas*. La hora que manda es la hora programada en la tabla.

**No van a UGCQ** (se ven en *Gestión de pabellón*): suspensiones de condicionales, de cirugía menor o procedimiento,
fuera de horario hábil o con agendamiento no electivo; condicionales no operados (sin causal no son suspensión).

Detalles del cotejo:

- El paciente se busca en SITGEQ por **RUN**. Por **nombre** solo si a alguno le falta un RUN válido y el nombre calza completo.
  Si el RUN difiere (error de digitación), la herramienta sugiere el registro parecido y se vincula con un clic.
- Programado sin cirugía ni suspensión → **pendiente**: se resuelve como suspendido (con causal), realizado sin registro o no contar.
- Suspendido en SITGEQ que no aparece en la tabla cargada → programado y suspendido (marcado para revisar).
- Paciente con una electiva y una urgencia el mismo día → la electiva es la del programado; la otra cuenta como urgencia.
  Suspendido y luego operado de urgencia → suspensión + urgencia.
- Electivas en un pabellón que no tiene pacientes en la tabla → pendiente (¿falta la tabla de ese pabellón?).
- Falta un archivo del día → pendiente, que se puede confirmar ("no hubo suspensiones", "continuar sin tabla").
- **Semana**: de sábado a viernes, con el número ISO del sábado que la inicia (deducido del reporte UGCQ de octubre 2026).

Controles diarios: programados = realizados + suspendidos UGCQ + suspendidos fuera de horario + sin registro;
suma de causales = suspendidos; condicionales realizadas ≤ condicionales; totales.

## Archivos

- `ugcq.html` — interfaz.
- `ugcq_core.js` — motor de cotejo y lector de la tabla PDF (sin DOM; se usa en el navegador y en las pruebas).
- `ugcq_xlsx.js` — lector/escritor de Excel propio (sin librerías externas).
- `ugcq_portable.py` — arma el archivo portátil (todo incrustado, también pdf.js).
- `vendor/pdfjs/` — pdf.js 4.10.38 (Mozilla, Apache 2.0).
- `tests/` — pruebas con datos ficticios: `node --test tests/*.test.js`.
  `tests/fixtures/tabla_pdf_items.json` tiene la geometría real de una tabla SITGEQ con datos inventados.
