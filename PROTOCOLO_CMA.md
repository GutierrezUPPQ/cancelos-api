# Motor digital CMA — serie PSQ-CMA

**CancelOS IA v4 · Hospital de Quilpué · Servicio de Salud Viña del Mar–Quillota–Petorca**

Este módulo implementa como API la lógica de decisión de la serie documental
**PSQ-CMA 00–04 v2.0 (agosto 2026)** del Protocolo de Cirugía Mayor Ambulatoria:

| Código | Documento | Qué implementa este motor |
|---|---|---|
| PSQ-CMA-00 | Guía rápida | Los tres algoritmos de decisión (candidato / Gate 0 / alta) |
| PSQ-CMA-01 | Norma clínica | Semáforo de 4 dimensiones (9.3–9.4), CASO LISTO (9.5.8), Gate 0 (9.6), Aldrete/PADSS (9.8), análisis de falla en 3 capas (9.11.1) |
| PSQ-CMA-02 | Herramientas | STOP-BANG + matriz SAHOS (Anexo A), CFS (B), Apfel (C), QoR-15E (D) |
| PSQ-CMA-03 | Gobernanza | Subconjunto computable de indicadores K (Anexo I), reglas de calidad de datos (O) |

> ⚠️ Conforme a la sección 9.11.5 de la norma: estas herramientas **apoyan** la
> priorización y el registro; requieren gobernanza, validación local y revisión
> humana. **Nunca sustituyen el juicio clínico ni generan exclusión automática.**
> Los casos de alto riesgo generan revisión humana, no exclusión.

---

## Endpoints por etapa del viaje del paciente

| Etapa | Endpoint | Qué hace |
|---|---|---|
| 1–2 · Selección | `POST /cma/elegibilidad` | Semáforo de 4 dimensiones (clínico-anestésica, quirúrgica, social, logística). Devuelve color y hallazgos por dimensión, matriz SAHOS cuando aplica, y disposición: `AVANZA` / `ZONA AMARILLA CLINICO-ANESTESICA` (→ Policlínico, NO LISTO) / `AMARILLO NO CLINICO` (→ dueño RACI) / `NO ES CMA ELECTIVA` |
| 2 · Escalas | `POST /cma/apfel` | Riesgo NVPO y profilaxis según 9.7.4 |
| 3 · Preparación | `POST /cma/caso-listo` | Los 11 elementos de la sección 9.5.8. Falta uno = NO LISTO |
| 4 · Día 0 | `POST /cma/gate0` | Checklist Gate 0 (9.6.1). Bloqueador → PAUSA CMA; distingue hallazgo nuevo (decide anestesiólogo del caso) de duda antigua (NO LISTO) |
| 6 · Fase I | `POST /cma/aldrete` | Aldrete ≥ 9 sostenido 15 min, ningún parámetro en 0 |
| 6–7 · Fase II | `POST /cma/padss` (alias `/cma/alta`) | PADSS/Ped-PADSS ≥ 9, signos vitales = 2, ningún dominio en 0, acompañante presente |
| 7–8 · PROM | `POST /cma/qor15` | QoR-15E: total /150, PASS ≥ 118, MCID Δ ≤ −6 vs basal |
| 8–9 · Registro | `POST /cma/evento` | Registra caso o evento (taxonomía abajo) |
| 9 · Mejora | `GET /cma/indicadores` · `POST /cma/mejora` | Tablero con subconjunto K computable, análisis de falla en 3 capas y plan de acción |

## Reglas del protocolo que el motor respeta

- **Ningún valor aislado decide por sí solo**: ASA, STOP-BANG, HbA1c, IMC y duración
  operan como disparadores de evaluación, no como exclusiones automáticas.
- **Excepciones institucionales declaradas** (rojas): CFS ≥ 6 e IMC ≥ 50.
- **Zona amarilla clínico-anestésica** → derivación al Policlínico de Anestesiología;
  el caso queda NO LISTO hasta nota resolutiva (G-D). Amarillos no clínicos → dueño RACI.
- **Matriz SAHOS de 5 dominios** (STOP-BANG, CPAP, opioide, anestesia, vigilancia):
  el rojo prevalece pero no excluye automáticamente — decide Policlínico + capacidad.
- **El alta es por criterios, no por reloj**: doble llave, ningún dominio en 0,
  nunca sin acompañante presente.
- **Un dato ausente nunca se interpreta como cero**: sin denominador, los indicadores
  reportan `SIN DATOS`, no 0 %.
- **Las referencias externas (BADS/GIRFT) son comparativas, no metas locales
  automáticas** (Anexo I): las metas se aprueban después de tener línea base.

## Taxonomía de eventos (Etapa 9)

`caso_cma` · `alta_mismo_dia` · `pernoctacion_no_planificada` (con `capa`:
`seleccion`/`proceso`/`no_prevenible` y `accion` concreta) · `conversion_hospitalizacion`
· `suspension_dia0` · `pausa_cma` · `rescate_activado` · `evento_adverso` ·
`reconsulta_7d` · `readmision_30d` · `reoperacion_30d` · `seguimiento_24h_ok` ·
`seguimiento_24h_fallido` · `qor15_deterioro`

Cada pernoctación no planificada sin clasificar en sus 3 capas aparece como acción
pendiente en el plan — el loop no se cierra hasta clasificarla y asignarle una
acción concreta con responsable y plazo (9.11.1).

## Ejemplos

```json
POST /cma/elegibilidad
{
  "id_caso": "EP-001", "asa": "ASA III", "asa3_estable": true, "asa3_plan_escrito": true,
  "edad": 68, "cfs": 3, "imc": 36, "stop_bang": 4, "cpap": "adherente",
  "opioide_esperado": "ninguno", "tipo_anestesia_cma": "local_regional",
  "vigilancia_postop": "prevista", "hba1c": 7.2, "en_cartera_activa": true,
  "duracion_min": 75, "acompanante_24h": "confirmado", "transporte_seguro": true,
  "telefono_operativo": true, "red_rescate_operativa": true, "capacidad_fase_1_2": true
}
```

```json
POST /cma/mejora
{
  "total_casos": 120,
  "eventos": [
    {"id_caso":"EP-014","tipo_evento":"pernoctacion_no_planificada","capa":"proceso","accion":"receta antes del egreso"},
    {"id_caso":"EP-022","tipo_evento":"reconsulta_7d"}
  ]
}
```

## Nota sobre persistencia

El registro `/cma/evento` vive en memoria y se reinicia con cada deploy. La ficha
clínica institucional es la fuente clínica primaria (Anexo O.5); este registro es
un instrumento operacional. Para el análisis mensual del Comité CMA usar
`POST /cma/mejora` con el lote exportado de la fuente institucional.
