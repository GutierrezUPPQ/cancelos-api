# Cierre diario UGCQ — cotejo tabla quirúrgica vs SITGEQ

Página: **`/ugcq`** (enlace "▸ CIERRE UGCQ" en la Torre de Control).

Cruza **lo programado** (tabla quirúrgica) con **lo ocurrido** (SITGEQ) y deja lista la fila diaria
en el formato del reporte UGCQ "Cirugía por rangos de fecha" (119 columnas: conteos + causales de suspensión).

> Los archivos se leen **solo en el navegador**: ningún dato de pacientes llega al servidor.
> El historial guarda **solo números** (la fila UGCQ), nunca nombres ni RUN.

## Uso diario (≈ 3 minutos)

1. Exportar desde SITGEQ los archivos del día:
   - **Tabla quirúrgica** (PDF "Tabla Quirúrgica"): lo programado. Idealmente la tabla oficial publicada el día anterior.
   - **Encuentros quirúrgicos** (Excel): todo lo operado, incluidas urgencias, cirugías menores y procedimientos.
   - **Informe de suspensiones** (Excel): suspendidos con causal MINSAL.
2. Arrastrarlos a la página (se reconoce cada archivo solo; se pueden cargar varios días a la vez).
3. Resolver los **pendientes** (programados sin cirugía ni suspensión, causales sin equivalente).
4. **Descargar planilla UGCQ** o **Copiar fila** y subir/digitar en UGCQ.
5. Opcional: **Descargar cotejo detallado** (respaldo con paciente a paciente, decisiones y avisos).

## Reglas de conteo

| Columna UGCQ | Cómo se calcula |
|---|---|
| Pacientes Programados Cx Mayor Electiva | Pacientes de la tabla con agendamiento *Electivo Normal* (solo cirugía mayor) |
| Pacientes Condicionales Cx Mayor Electiva | Pacientes de la tabla *Electivo Condicional* |
| Pacientes Suspendidos | Programados no operados que están en el informe de suspensiones (o que se marcan suspendidos a mano) |
| Porcentaje de Pacientes Suspendidos | suspendidos ÷ programados × 100, redondeado a entero |
| Programadas realizadas | Programados con cirugía mayor registrada ese día |
| Condicionales realizadas | Condicionales con cirugía mayor registrada ese día |
| Agregadas realizadas | Cirugías mayores electivas de pacientes que no están en la tabla |
| Urgencia realizadas | Cirugías mayores con tipo de cirugía *Urgencia* |
| Cx Menores / Procedimientos | Todo lo registrado en SITGEQ como *Cirugía Menor* / *Procedimiento* (electivo o urgencia) |
| Total Cx Mayores Electivas | programadas + condicionales + agregadas realizadas |
| Total Realizado | mayores electivas + urgencias + menores + procedimientos |
| Causales | Causal MINSAL de SITGEQ traducida a su columna UGCQ (los encabezados UGCQ vienen truncados a 63 bytes) |

Detalles:

- El paciente se busca en SITGEQ por **RUN**; si a alguno le falta un RUN válido, por **nombre** (queda marcado).
- **Programado sin cirugía ni suspensión** → pendiente que bloquea la descarga. Se resuelve como *suspendida* (con causal),
  *realizada (falta registro)* o *no contar*.
- **Condicional no operado** → no es suspensión (no suma a suspendidos).
- **Suspendido en SITGEQ que no aparece en la tabla cargada** → se cuenta como programado y suspendido (marcado para revisar).
- **Paciente de tabla registrado como procedimiento o cirugía menor** → no suma a programados Cx Mayor; su registro va a menores/procedimientos.
- **Sin tabla para el día** → lo programado se reconstruye desde SITGEQ y no se pueden distinguir las agregadas (aviso).
- **Semana**: de sábado a viernes, con el número ISO del sábado que la inicia (deducido del reporte UGCQ de octubre 2026).
- Datos fijos (macroregión, región, servicio, hospital, complejidad, certificación): editables en *Configuración y reglas*.

Controles que se muestran cada día: programados = realizados + suspendidos; suma de causales = suspendidos;
condicionales realizadas ≤ condicionales; totales.

## Archivos

- `ugcq.html` — interfaz.
- `ugcq_core.js` — motor de cotejo (sin DOM; se usa en el navegador y en las pruebas).
- `tests/ugcq_core.test.js` — pruebas: `node --test tests/ugcq_core.test.js`.
- `tests/fixtures/tabla_pdf_items.json` — tabla PDF con la geometría real y **datos ficticios**.
