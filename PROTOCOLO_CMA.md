# Protocolo CMA — Cirugía Mayor Ambulatoria

**CancelOS IA v4 · Hospital de Quilpué**

Módulo de apoyo a la decisión para el circuito de Cirugía Mayor Ambulatoria, con un
**loop de mejora continua (ciclo PDCA)** que cierra el circuito: los resultados de cada
caso alimentan indicadores que generan acciones de ajuste del propio protocolo.

> ⚠️ Este módulo **apoya** la decisión clínica, no la reemplaza. La indicación final de
> ambulatorización y de alta es siempre del equipo tratante.

---

## 1. El loop de mejora (ciclo PDCA)

```
   PLANIFICAR                 HACER                  VERIFICAR              ACTUAR
┌──────────────────┐   ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────┐
│ Elegibilidad     │──▶│ Cirugía + Alta   │──▶│ Registro de        │──▶│ Plan de acción   │
│ /cma/elegibilidad│   │ PADSS /cma/alta  │   │ eventos            │   │ ajusta criterios │
└──────────────────┘   └──────────────────┘   │ /cma/evento        │   │ del protocolo    │
        ▲              └────────────────────┘   └──────────────────┘
        │                                              │ /cma/indicadores        │
        └──────────────────────────────────────────────┴─────────────────────────┘
```

1. **Planificar** — selección del paciente con `/cma/elegibilidad`.
2. **Hacer** — cirugía y alta con criterios objetivos PADSS (`/cma/alta`).
3. **Verificar** — registrar cada caso y cada evento adverso (`/cma/evento`);
   revisar el tablero `/cma/indicadores` en el comité (sugerido: mensual).
4. **Actuar** — aplicar el `plan_de_accion` que entrega la API para cada indicador
   fuera de meta, ajustar el protocolo y reevaluar en el ciclo siguiente.

## 2. Elegibilidad — `POST /cma/elegibilidad`

Devuelve `APTO`, `APTO CON OBSERVACIONES` o `NO APTO`, con los motivos explícitos.

**Exclusiones (NO APTO):** ASA IV–V · ASA III descompensado · sin adulto responsable
24 h · sin teléfono de contacto · STOP-BANG ≥5 sin CPAP · IMC ≥40 con sospecha de SAOS ·
Hb <10 g/dL (optimizar por PBM) · duración estimada >120 min.

**Observaciones (APTO CON OBSERVACIONES):** ASA III estable · edad ≥80 · STOP-BANG 3–4 ·
SAOS con CPAP (traer equipo) · IMC 35–39 · anticoagulado (plan con `/anticoag`) ·
DM insulinorrequirente · traslado >60 min · duración 90–120 min.

```json
{
  "id_caso": "CMA-001", "asa": "ASA II", "edad": 67, "imc": 31,
  "stop_bang": 3, "anticoag": false, "hb_preop": 12.5,
  "duracion_min": 60, "acompanante_adulto": true,
  "telefono_contacto": true, "tiempo_traslado_min": 25
}
```

## 3. Alta — `POST /cma/alta` (PADSS modificado)

Cinco ítems de 0–2: `signos_vitales`, `deambulacion`, `nvpo`, `dolor`, `sangrado`.
**Alta con total ≥9 y signos vitales = 2.** Si no cumple, reevaluar en 30–60 min;
si no mejora, activar ingreso no planificado (y registrarlo como evento).

## 4. Registro de eventos — `POST /cma/evento`

Registrar **todos los casos** (`caso_cma`) y cada evento adverso:

| `tipo_evento` | Qué registra |
|---|---|
| `caso_cma` | Todo caso CMA operado (denominador de las tasas) |
| `ingreso_no_planificado` | Paciente ambulatorio que quedó hospitalizado |
| `suspension_mismo_dia` | Suspensión el día quirúrgico |
| `reconsulta_72h` | Consulta a urgencias dentro de 72 h |
| `alta_fallida` | No cumplió PADSS y no se fue de alta el mismo día |
| `nvpo_severo` | Náuseas/vómitos que retrasan el alta |
| `dolor_no_controlado` | Dolor que retrasa el alta o motiva reconsulta |
| `sangrado_reoperacion` | Sangrado que requiere reintervención |

```json
{ "id_caso": "CMA-001", "tipo_evento": "caso_cma", "detalle": "colecistectomia lap" }
```

> El registro en memoria se reinicia con cada deploy. Para el análisis histórico,
> registrar también en la planilla y usar `/cma/mejora` con el lote exportado.

## 5. Indicadores y plan de acción — `GET /cma/indicadores` · `POST /cma/mejora`

Metas (máximo aceptable sobre el total de casos CMA):

| Indicador | Meta |
|---|---|
| Ingreso no planificado | ≤ 2 % |
| Suspensión mismo día | ≤ 5 % |
| Reconsulta 72 h | ≤ 3 % |
| Alta fallida | ≤ 3 % |
| NVPO severo | ≤ 5 % |
| Dolor no controlado | ≤ 5 % |
| Sangrado con reoperación | ≤ 1 % |

Cada indicador **fuera de meta** genera una acción concreta en `plan_de_accion`
(p. ej., ingreso no planificado alto → auditar casos y endurecer elegibilidad;
NVPO alto → profilaxis según score de `/prediccion` en riesgo ≥30). Las metas y
acciones viven en `METAS_CMA` y `ACCIONES_PDCA` en `main.py`: **ajustarlas es parte
del propio loop de mejora** — cada ciclo del comité puede recalibrarlas según los
resultados locales.

`POST /cma/mejora` hace el mismo cálculo sin depender de la memoria del servidor:

```json
{
  "total_casos": 120,
  "eventos": [
    { "id_caso": "CMA-014", "tipo_evento": "ingreso_no_planificado" },
    { "id_caso": "CMA-022", "tipo_evento": "nvpo_severo" }
  ]
}
```

## 6. Rutina sugerida del comité CMA

1. **Mensual:** revisar `/cma/indicadores` (o `/cma/mejora` con la planilla del mes).
2. Auditar caso a caso los eventos de los indicadores fuera de meta.
3. Aplicar el plan de acción y dejarlo escrito en acta.
4. Si un criterio de elegibilidad demuestra estar mal calibrado, modificarlo en
   `score_cma_elegibilidad` y registrar la fecha del cambio.
5. Comparar el ciclo siguiente contra el anterior: el loop está funcionando cuando
   las tasas convergen hacia la meta después de cada ajuste.
