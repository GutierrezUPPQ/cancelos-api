"""
CancelOS IA v4 - API Python
Motor de cálculo clínico traducido desde JS a Python
FastAPI + Pydantic - listo para producción
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime, timedelta
from enum import Enum

app = FastAPI(
    title="CancelOS IA v4 API",
    description="Motor de Inteligencia Artificial para Gestión Prequirúrgica - Hospital de Quilpué",
    version="4.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción: solo tu dominio
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════
# MODELOS DE DATOS
# ═══════════════════════════════════════════════

class ASAEnum(str, Enum):
    I   = "ASA I"
    II  = "ASA II"
    III = "ASA III"
    IV  = "ASA IV"
    V   = "ASA V"

class MallampatiEnum(str, Enum):
    I   = "Clase I"
    II  = "Clase II"
    III = "Clase III"
    IV  = "Clase IV"

class TipoAnestesiaEnum(str, Enum):
    general_iot = "Anestesia general IOT"
    general_lma = "Anestesia general LMA"
    raquidea    = "Raquidea"
    epidural    = "Epidural"
    bloqueo     = "Bloqueo periferico"
    sedacion    = "Sedacion MAC"
    local       = "Solo local"

class GateEnum(str, Enum):
    pasa    = "PASA"
    no_pasa = "NO PASA"

class FarmacoEnum(str, Enum):
    warfarina    = "Warfarina"
    acenocumarol = "Acenocumarol"
    apixaban     = "Apixaban"
    rivaroxaban  = "Rivaroxaban"
    dabigatran   = "Dabigatran"
    clopidogrel  = "Clopidogrel"
    ticagrelor   = "Ticagrelor"
    prasugrel    = "Prasugrel"
    aas          = "AAS"
    otro         = "Otro"


# ─── Input para scoring de caso ─────────────────
class CasoInput(BaseModel):
    id_caso:      str
    fecha_cx:     date
    procedimiento: str
    especialidad: Optional[str] = ""
    tipo_cx:      Optional[str] = ""
    complejidad:  Optional[str] = ""
    cirujano:     Optional[str] = ""
    anestesiologo: Optional[str] = ""
    paciente:     Optional[str] = ""
    edad:         int = Field(..., ge=0, le=120)
    asa:          ASAEnum
    mallampati:   MallampatiEnum = MallampatiEnum.I
    stop_bang:    int = Field(0, ge=0, le=8)
    anticoag:     bool = False
    hb_preop:     Optional[float] = Field(None, ge=0, le=25)
    gate_72h:     GateEnum = GateEnum.pasa
    gate_24h:     GateEnum = GateEnum.pasa
    pabellon:     Optional[str] = ""
    bloque:       Optional[str] = ""

# ─── Input para predicción de complicaciones ────
class PrediccionInput(BaseModel):
    id_caso:      str
    asa_num:      int = Field(..., ge=1, le=5)
    edad:         int = Field(..., ge=0, le=120)
    imc:          Optional[float] = Field(None, ge=10, le=80)
    mallampati:   MallampatiEnum = MallampatiEnum.I
    stop_bang:    int = Field(0, ge=0, le=8)
    cardiopatia:  bool = False
    dm:           bool = False
    erc:          bool = False
    anticoag:     bool = False
    hb_preop:     Optional[float] = None
    tipo_anestesia: TipoAnestesiaEnum = TipoAnestesiaEnum.general_iot
    duracion_min: int = Field(0, ge=0)

# ─── Input para anticoagulación ─────────────────
class AnticoagInput(BaseModel):
    id_caso:   str
    fecha_cx:  date
    farmaco:   FarmacoEnum
    crcl:      Optional[float] = Field(999, ge=0)
    riesgo_te: Optional[str] = "Bajo <1%/anno"

# ─── Input PBM ──────────────────────────────────
class PBMInput(BaseModel):
    id_caso:    str
    hb_basal:   float = Field(..., ge=0, le=25)
    peso_kg:    float = Field(..., ge=20, le=300)
    altura_cm:  float = Field(..., ge=100, le=220)
    perdida_estimada_ml: Optional[float] = 0
    unidades_estimadas:  Optional[int] = 0
    unidades_reales:     Optional[int] = 0


# ═══════════════════════════════════════════════
# MOTOR DE CÁLCULO (traducido desde JS)
# ═══════════════════════════════════════════════

def cap_score(s: float) -> float:
    return min(s, 100)

def nivel_riesgo(s: float) -> str:
    if s >= 80: return "CRITICO"
    if s >= 56: return "ALTO"
    if s >= 26: return "MEDIO"
    return "BAJO"

def grado_anemia(hb: Optional[float]) -> str:
    if hb is None or hb <= 0: return ""
    if hb < 8:  return "SEVERA"
    if hb < 10: return "MODERADA"
    if hb < 13: return "LEVE"
    return "SIN ANEMIA"

def calc_score_caso(c: CasoInput) -> dict:
    """Motor de riesgo IA para caso quirúrgico"""
    s = 0

    # ASA
    asa_pts = {"ASA IV": 30, "ASA III": 18, "ASA II": 8, "ASA I": 0, "ASA V": 40}
    s += asa_pts.get(c.asa.value, 0)

    # Edad
    if c.edad > 79:   s += 15
    elif c.edad > 74: s += 10
    elif c.edad > 64: s += 6

    # Mallampati
    mall_pts = {"Clase IV": 12, "Clase III": 8, "Clase II": 4, "Clase I": 0}
    s += mall_pts.get(c.mallampati.value, 0)

    # STOP-BANG
    if c.stop_bang >= 5:   s += 8
    elif c.stop_bang >= 3: s += 4

    # Anticoagulación activa
    if c.anticoag: s += 15

    # Gates
    if c.gate_72h == GateEnum.no_pasa: s += 15
    if c.gate_24h == GateEnum.no_pasa: s += 20

    # Anemia preoperatoria
    if c.hb_preop:
        if c.hb_preop < 8:   s += 15
        elif c.hb_preop < 10: s += 10

    # RCRI proxy: complejidad y tipo cirugía
    comp = (c.complejidad or "").lower()
    if any(x in comp for x in ["alta", "mayor", "3"]): s += 12
    elif any(x in comp for x in ["media", "2"]):        s += 6

    tipo = (c.tipo_cx or "").lower()
    if any(x in tipo for x in ["cardiaca", "vascular mayor", "toracica"]): s += 15
    elif any(x in tipo for x in ["abdominal mayor", "ortopedica mayor"]):   s += 8

    riesgo = cap_score(s)
    nivel  = nivel_riesgo(riesgo)
    anemia = grado_anemia(c.hb_preop)

    acciones = {
        "CRITICO": "SUSPENDER: reagendar con evaluacion completa",
        "ALTO":    "LLAMAR HOY: cirujano + pabellon + UCI + verificar anticoag",
        "MEDIO":   "REVISAR 24-48h: examenes + consentimiento + stock + cama + gate",
        "BAJO":    "CHECKLIST ESTANDAR: NPO + consentimiento + insumos + cama"
    }
    prioridades = {"ASA IV": "URGENTE", "ASA V": "URGENTE", "ASA III": "PREFERENTE"}

    return {
        "id_caso":      c.id_caso,
        "riesgo_ia":    riesgo,
        "nivel_riesgo": nivel,
        "accion_ia":    acciones[nivel],
        "prioridad":    prioridades.get(c.asa.value, "ELECTIVA"),
        "anemia_grado": anemia,
        "score_detalle": {
            "asa":          asa_pts.get(c.asa.value, 0),
            "edad":         15 if c.edad>79 else 10 if c.edad>74 else 6 if c.edad>64 else 0,
            "mallampati":   mall_pts.get(c.mallampati.value, 0),
            "stop_bang":    8 if c.stop_bang>=5 else 4 if c.stop_bang>=3 else 0,
            "anticoag":     15 if c.anticoag else 0,
            "gate_72h":     15 if c.gate_72h==GateEnum.no_pasa else 0,
            "gate_24h":     20 if c.gate_24h==GateEnum.no_pasa else 0,
            "anemia":       15 if c.hb_preop and c.hb_preop<8 else 10 if c.hb_preop and c.hb_preop<10 else 0,
            "complejidad":  12 if any(x in comp for x in ["alta","mayor","3"]) else 6 if any(x in comp for x in ["media","2"]) else 0,
            "tipo_cx":      15 if any(x in tipo for x in ["cardiaca","vascular","toracica"]) else 8 if any(x in tipo for x in ["abdominal","ortopedica"]) else 0,
        }
    }

def calc_prediccion(p: PrediccionInput) -> dict:
    """Motor de predicción de 6 complicaciones"""

    imc = p.imc or 25

    # NVPO
    nvpo = 0
    if p.stop_bang >= 3: nvpo += 20
    if p.cardiopatia:    nvpo += 15
    if p.dm:             nvpo += 10
    if p.asa_num >= 3:   nvpo += 15
    if p.tipo_anestesia == TipoAnestesiaEnum.general_iot: nvpo += 20
    elif p.tipo_anestesia == TipoAnestesiaEnum.general_lma: nvpo += 15
    if p.duracion_min > 180: nvpo += 10
    nvpo = cap_score(nvpo)

    # Hipotensión
    hipot = 0
    if p.asa_num >= 3:   hipot += 20
    if p.edad >= 75:     hipot += 15
    if p.cardiopatia:    hipot += 20
    if imc >= 35:        hipot += 10
    if p.anticoag:       hipot += 10
    if p.tipo_anestesia == TipoAnestesiaEnum.raquidea:  hipot += 25
    elif p.tipo_anestesia == TipoAnestesiaEnum.epidural: hipot += 15
    hipot = cap_score(hipot)

    # UCI
    uci = 0
    if p.asa_num == 4:    uci += 40
    elif p.asa_num == 3:  uci += 20
    if p.edad >= 80:      uci += 15
    if p.cardiopatia:     uci += 20
    if p.erc:             uci += 15
    if p.duracion_min > 240: uci += 15
    if p.hb_preop and p.hb_preop < 8: uci += 10
    uci = cap_score(uci)

    # Reintubación
    rein = 0
    if p.mallampati == MallampatiEnum.IV:   rein += 30
    elif p.mallampati == MallampatiEnum.III: rein += 15
    if p.stop_bang >= 5:  rein += 20
    if p.asa_num == 4:    rein += 20
    if p.cardiopatia:     rein += 10
    rein = cap_score(rein)

    # Delirium
    delir = 0
    if p.edad >= 80:     delir += 30
    elif p.edad >= 70:   delir += 15
    if p.dm:             delir += 20
    if p.erc:            delir += 15
    if p.asa_num >= 3:   delir += 10
    if p.duracion_min > 240: delir += 10
    delir = cap_score(delir)

    # Sangrado
    sang = 0
    if p.anticoag:       sang += 25
    if p.hb_preop and p.hb_preop < 10: sang += 15
    if p.duracion_min > 180: sang += 20
    if p.erc:            sang += 10
    if p.asa_num >= 3:   sang += 10
    sang = cap_score(sang)

    def lvl(v, h=60, m=30): return "ALTO" if v>=h else "MODERADO" if v>=m else "BAJO"

    return {
        "id_caso": p.id_caso,
        "scores": {
            "nvpo":         nvpo,
            "hipotension":  hipot,
            "uci":          uci,
            "reintubacion": rein,
            "delirium":     delir,
            "sangrado":     sang
        },
        "niveles": {
            "nvpo":         lvl(nvpo),
            "hipotension":  lvl(hipot),
            "uci":          lvl(uci, 40, 20),
            "reintubacion": lvl(rein, 40, 20),
            "delirium":     lvl(delir, 40, 20),
            "sangrado":     lvl(sang)
        },
        "planes": {
            "profilaxis_nvpo":   "Ondansetron+Dexametasona+Droperidol+TIVA" if lvl(nvpo)=="ALTO" else "Ondansetron+Dexametasona" if lvl(nvpo)=="MODERADO" else "Sin profilaxis rutinaria",
            "plan_hemodinamico": "Linea arterial+vasopresor PRE induccion" if lvl(hipot)=="ALTO" else "Precarga 500mL+efedrina disponible" if lvl(hipot)=="MODERADO" else "Manejo hemodinamico estandar",
            "plan_via_aerea":    "VIDEOLARINGOSCOPIO+FIBROSCOPIO obligatorios" if p.mallampati==MallampatiEnum.IV else "Videolaringoscopio disponible. Plan B definido." if p.mallampati==MallampatiEnum.III else "Manejo estandar. TOF pre-extubacion.",
            "umbral_transfusion": "Hb <8 cardiaco" if p.cardiopatia else "Hb <8" if p.asa_num>=3 else "Hb <7"
        }
    }

def calc_anticoag(a: AnticoagInput) -> dict:
    """Protocolo anticoagulación perioperatoria"""
    dias_map = {
        "Warfarina": 5, "Acenocumarol": 4,
        "Clopidogrel": 5, "Ticagrelor": 5, "Prasugrel": 7, "AAS": 7
    }
    noac_map = {"Apixaban", "Rivaroxaban", "Dabigatran"}

    if a.farmaco.value in noac_map:
        dias = 4 if (a.crcl or 999) < 50 else 2
    else:
        dias = dias_map.get(a.farmaco.value, 1)

    fecha_susp = a.fecha_cx - timedelta(days=dias)
    bridging   = a.riesgo_te == "Alto >10%/anno"

    return {
        "id_caso":          a.id_caso,
        "farmaco":          a.farmaco.value,
        "dias_suspension":  dias,
        "fecha_suspension": fecha_susp.isoformat(),
        "fecha_cx":         a.fecha_cx.isoformat(),
        "bridging_indicado": bridging,
        "bridging_recomendacion": "HBPM terapéutica D-3 a D-1 pre Cx" if bridging else "No indicado",
        "alerta": f"Suspender {a.farmaco.value} el {fecha_susp.strftime('%d/%m/%Y')} ({dias} días antes)"
    }

def calc_pbm(p: PBMInput) -> dict:
    """Evaluación PBM y ahorro estimado"""
    volemia = p.peso_kg * 70  # mL estimado
    perdida_pct = round(p.perdida_estimada_ml / volemia * 100, 1) if volemia > 0 else 0
    anemia = grado_anemia(p.hb_basal)
    ahorradas   = max(0, p.unidades_estimadas - p.unidades_reales)
    ahorro_clp  = ahorradas * 250000

    return {
        "id_caso":          p.id_caso,
        "grado_anemia":     anemia,
        "volemia_estimada": round(volemia),
        "perdida_pct":      perdida_pct,
        "trigger_transfusion": "Hb <8 g/dL (ajustar según contexto clínico)",
        "unidades_ahorradas": ahorradas,
        "ahorro_clp":       ahorro_clp,
        "recomendacion_pbm": _recomendacion_pbm(anemia, p.hb_basal)
    }

def _recomendacion_pbm(grado: str, hb: float) -> str:
    if grado == "SEVERA":
        return "Optimización urgente: Hierro IV + EPO + considerar posponer cirugía"
    if grado == "MODERADA":
        return "Hierro IV + EPO si tiempo >4 semanas. Ácido tranexámico intraoperatorio."
    if grado == "LEVE":
        return "Hierro oral/IV según ferritina. Evaluar posponer si Hb <10 en cirugía mayor."
    return "Sin anemia. Ácido tranexámico según tipo de cirugía."


# ═══════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════

@app.get("/")
def root():
    return {
        "sistema": "CancelOS IA v4 API",
        "hospital": "Hospital de Quilpué",
        "version": "4.0.0",
        "status": "operativo",
        "endpoints": ["/caso/score", "/prediccion", "/anticoag", "/pbm", "/docs"]
    }

@app.post("/caso/score")
def score_caso(caso: CasoInput):
    """
    Calcula el Riesgo IA para un caso quirúrgico.
    Retorna score 0-100, nivel de riesgo y acción recomendada.
    """
    try:
        return calc_score_caso(caso)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/prediccion")
def prediccion_complicaciones(p: PrediccionInput):
    """
    Predice probabilidad de 6 complicaciones:
    NVPO, Hipotensión, UCI, Reintubación, Delirium, Sangrado
    """
    try:
        return calc_prediccion(p)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/anticoag")
def protocolo_anticoag(a: AnticoagInput):
    """
    Calcula días de suspensión y protocolo de bridging
    según fármaco y función renal.
    """
    try:
        return calc_anticoag(a)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/pbm")
def evaluacion_pbm(p: PBMInput):
    """
    Evalúa anemia preoperatoria y calcula ahorro estimado de unidades GR.
    """
    try:
        return calc_pbm(p)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/caso/completo")
def caso_completo(caso: CasoInput):
    """
    Evaluación completa: Riesgo IA + Predicción de complicaciones en un solo llamado.
    """
    try:
        score = calc_score_caso(caso)
        pred_input = PrediccionInput(
            id_caso      = caso.id_caso,
            asa_num      = {"ASA I":1,"ASA II":2,"ASA III":3,"ASA IV":4,"ASA V":5}.get(caso.asa.value, 2),
            edad         = caso.edad,
            mallampati   = caso.mallampati,
            stop_bang    = caso.stop_bang,
            anticoag     = caso.anticoag,
            hb_preop     = caso.hb_preop,
            tipo_anestesia = TipoAnestesiaEnum.general_iot
        )
        pred = calc_prediccion(pred_input)
        return {
            "id_caso":    caso.id_caso,
            "paciente":   caso.paciente,
            "fecha_cx":   caso.fecha_cx.isoformat(),
            "score":      score,
            "prediccion": pred
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
