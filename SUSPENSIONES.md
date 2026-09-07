# Suspensiones en el tiempo — registro operable y serie temporal

Módulo de CancelOS para **seguir las suspensiones quirúrgicas a lo largo del tiempo** con la
misma lógica del Comité Quirúrgico: causal codificada (catálogo SSVQ/MINSAL), evitabilidad,
modalidad, tipo, momento de la suspensión, evento raíz y reprogramación, más el denominador
diario de programadas normales para calcular la **tasa hábil** homóloga al monitoreo.

Regla de lectura que respeta todo el módulo: **cada indicador se lee con su denominador propio**.
Los conteos del registro no son tasas, las poblaciones distintas no se suman y un dato ausente
nunca se interpreta como cero (`programadas: null` cuando no hay denominador).

Página web: **`/suspensiones`** (serie por día/semana/mes con barras por categoría, tasa hábil con
banda ±3σ, Pareto de causas, día de la semana, evitabilidad, alertas, plan de acción, tabla de
registros y formularios de registro).

## Modelo de datos

### Suspensión (`POST /suspension`)

| Campo | Valores | Comentario |
| --- | --- | --- |
| `fecha_cx` | `AAAA-MM-DD` | fecha para la que estaba programada la cirugía (obligatorio) |
| `id_caso` | texto | id de caso o episodio, sin nombre ni RUT |
| `servicio` | texto | especialidad o servicio (se agrupa por texto exacto) |
| `pabellon` | texto | |
| `tipo_cx` | `mayor` · `menor` · `procedimiento` | por defecto `mayor` |
| `modalidad` | `directa` · `condicional` · `urgencia` | por defecto `directa` |
| `causa` | código del catálogo (ver abajo) | por defecto `sin_causal` |
| `evitabilidad` | `evitable` · `potencialmente_evitable` · `no_evitable` · `sin_clasificar` | si se omite, se usa la sugerida por la causa |
| `momento` | `dia_previo` · `dia_0` · `en_pabellon` | anticipación de la suspensión; `en_pabellon` es la más costosa |
| `evento_raiz` | texto | agrupa registros que provienen de una misma falla (jornada, equipo, clima…) |
| `reprogramada`, `fecha_reprogramacion` | bool, fecha | reprogramación efectiva |
| `oncologico` | bool | marca de alerta clínica |
| `procedimiento`, `detalle`, `autor` | texto | |
| `pin` | texto | requerido si la variable de entorno `CMA_PIN` está definida |

El registro guarda además campos derivados: `categoria`, `causa_descripcion`,
`evitabilidad_sugerida`, `dia_semana`, `habil` (L–V), `semana` (ISO, `2026-S36`), `mes`.

### Programadas del día (`POST /suspension/programadas`)

`{ "fecha": "2026-09-07", "programadas": 9, "condicionales": 1, "realizadas": 10, "autor": "CG", "pin": "…" }`

`programadas` = programadas normales de cirugía mayor electiva del día (columna L del monitoreo).
Un registro por fecha; la última versión manda.

## Catálogo de causas

| Código | Categoría MINSAL | Evitabilidad sugerida |
| --- | --- | --- |
| `error_programacion` (incluye prolongación de tabla) | Equipo quirúrgico | evitable |
| `reemplazo_urgencia` | Equipo quirúrgico | no evitable |
| `falta_cirujano`, `falta_anestesiologo` | Equipo quirúrgico | potencialmente evitable |
| `no_se_presenta`, `rechazo_paciente` | Paciente | potencialmente evitable |
| `falta_ayuno`, `atraso_ingreso` | Paciente | evitable |
| `patologia_aguda`, `descompensacion` | Paciente | no evitable |
| `estudio_incompleto`, `sin_consentimiento` | Administrativas | evitable |
| `sin_cupo_recuperacion`, `sin_cama`, `falta_personal` | Administrativas | potencialmente evitable |
| `instrumental_incompleto`, `falta_insumos` | Apoyo logístico | evitable |
| `equipo_fuera_servicio` | Apoyo logístico | potencialmente evitable |
| `falla_climatizacion`, `falla_infraestructura` | Infraestructura | potencialmente evitable |
| `desastre_natural` | Emergencias | no evitable |
| `otra` | Otra | sin clasificar |
| `sin_causal` | Sin causal | sin clasificar (completar por jornada) |

`GET /suspension/catalogo` devuelve el catálogo completo con descripciones.

## Endpoints

| Método y ruta | Uso |
| --- | --- |
| `GET /suspension/catalogo` | catálogo de causas, categorías, evitabilidades, modalidades, tipos, momentos |
| `POST /suspension` | registra una suspensión (PIN opcional) |
| `POST /suspension/programadas` | registra el denominador del día (PIN opcional) |
| `GET /suspension/lista?desde&hasta&servicio&categoria&limite` | últimos registros |
| `GET /suspension/serie?granularidad=dia|semana|mes&desde&hasta&servicio&categoria&modalidad&causa&habil=1&centro_pct` | serie temporal |
| `GET /suspension/resumen?desde&hasta&servicio&categoria&modalidad&habil=1` | Pareto, evitabilidad, día de la semana, comparación con el período anterior, alertas y plan |
| `POST /suspension/lote` | versión sin estado: recibe `{suspensiones:[…], programadas:[…], granularidad, desde, hasta, centro_pct, filtros}` y devuelve serie y resumen sin persistir |

### Serie temporal

Cada período (día, semana ISO o mes) entrega: `suspensiones` (todos los registros del filtro),
`cme_normal` (cirugía mayor de programación directa: el numerador homólogo al monitoreo),
`por_categoria`, evitables / potencialmente / no evitables / sin clasificar, `programadas`
(suma del denominador registrado; `null` si no hay), `tasa_pct` = `cme_normal / programadas`,
y la **carta p**: `lcl_pct`, `ucl_pct` y `senal` (`BAJO LCL`, `SOBRE UCL`). El centro de la carta es
`centro_pct` (por ejemplo, la tasa de la línea base 2025: 9,38 %) o, si no se entrega, la tasa
acumulada del rango (suma / suma). La `tendencia` compara la media de la mitad inicial con la de
la mitad final del rango (±15 % se lee como estable) y requiere al menos 4 períodos.

### Resumen

`pareto_causas` (con % y acumulado, marcando los "pocos vitales" hasta el 80 %), `por_categoria`,
`evitabilidad` (evitable y prevenible como % de los clasificados; sin causal como % del total),
`por_dia_semana` y `lunes_pct_de_habiles`, `por_momento`, `por_modalidad`, `por_tipo`,
`por_servicio`, `por_pabellon`, `eventos_raiz`, `reprogramadas`, `tasa_habil_cme_normal`,
`comparacion_periodo_anterior` (ventana de igual longitud inmediatamente anterior), `alertas`
(sin causal ≥ 20 %, lunes ≥ 30 % de L–V, evitables ≥ 40 % de clasificados, suspensiones en
pabellón, oncológicos) y `plan_de_accion` con la acción sugerida por foco.

## Ejemplos

```bash
# registrar una suspensión
curl -X POST https://<host>/suspension -H "Content-Type: application/json" -d '{
  "fecha_cx":"2026-08-17","id_caso":"CX-118","servicio":"Traumatología","pabellon":"PAB 3",
  "tipo_cx":"mayor","modalidad":"directa","causa":"no_se_presenta","momento":"dia_0","autor":"CG","pin":"1234"}'

# registrar el denominador del día
curl -X POST https://<host>/suspension/programadas -H "Content-Type: application/json" \
  -d '{"fecha":"2026-08-17","programadas":8,"condicionales":1,"realizadas":9,"pin":"1234"}'

# serie mensual con carta p centrada en la línea base 2025
curl "https://<host>/suspension/serie?granularidad=mes&desde=2026-01-01&centro_pct=9.38"

# resumen del mes, solo lunes a viernes
curl "https://<host>/suspension/resumen?desde=2026-08-01&hasta=2026-08-31&habil=1"
```

## Persistencia y respaldo

Los registros se anexan a `suspensiones.jsonl` y `programadas.jsonl` junto al código (se cargan al
iniciar). Un redeploy puede borrar el disco, por eso cada registro también se envía al webhook de
Google Sheets si `CMA_SHEETS_WEBHOOK` está definido (`tipo_registro`: `suspension` o
`programadas`). La ficha clínica y el informe mensual de suspensiones siguen siendo la fuente
primaria; `POST /suspension/lote` permite analizar un lote exportado sin guardar nada.
