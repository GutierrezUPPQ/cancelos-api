"""
CancelOS IA v4 - API Python + Torre de Control
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from datetime import date, timedelta
import os, json

app = FastAPI(title="CancelOS IA v4 API", version="4.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ═══════════════════════════════════════════════
# SERVIR TORRE DE CONTROL
# ═══════════════════════════════════════════════
@app.get("/torre", response_class=HTMLResponse)
def torre():
    path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Torre de Control - archivo index.html no encontrado</h1>"

# ═══════════════════════════════════════════════
# MOTOR DE CALCULO
# ═══════════════════════════════════════════════
def cap(s): return min(float(s), 100.0)
def nivel(s):
    s = float(s)
    if s >= 80: return "CRITICO"
    if s >= 56: return "ALTO"
    if s >= 26: return "MEDIO"
    return "BAJO"
def anemia(hb):
    if not hb or float(hb) <= 0: return ""
    hb = float(hb)
    if hb < 8:  return "SEVERA"
    if hb < 10: return "MODERADA"
    if hb < 13: return "LEVE"
    return "SIN ANEMIA"

def score_caso(d):
    s = 0
    asa = str(d.get("asa","ASA II"))
    edad = int(d.get("edad", 0))
    mall = str(d.get("mallampati","Clase I"))
    sb   = int(d.get("stop_bang", 0))
    anti = bool(d.get("anticoag", False))
    hb   = float(d.get("hb_preop", 0) or 0)
    g72  = str(d.get("gate_72h","PASA"))
    g24  = str(d.get("gate_24h","PASA"))
    comp = str(d.get("complejidad","")).lower()
    tipo = str(d.get("tipo_cx","")).lower()
    asa_pts = {"ASA I":0,"ASA II":8,"ASA III":18,"ASA IV":30,"ASA V":40}
    s += asa_pts.get(asa, 0)
    if edad > 79: s += 15
    elif edad > 74: s += 10
    elif edad > 64: s += 6
    mall_pts = {"Clase I":0,"Clase II":4,"Clase III":8,"Clase IV":12}
    s += mall_pts.get(mall, 0)
    if sb >= 5: s += 8
    elif sb >= 3: s += 4
    if anti: s += 15
    if g72 == "NO PASA": s += 15
    if g24 == "NO PASA": s += 20
    if hb > 0:
        if hb < 8: s += 15
        elif hb < 10: s += 10
    if any(x in comp for x in ["alta","mayor","3"]): s += 12
    elif any(x in comp for x in ["media","2"]): s += 6
    if any(x in tipo for x in ["cardiaca","vascular","toracica"]): s += 15
    elif any(x in tipo for x in ["abdominal","ortopedica"]): s += 8
    riesgo = cap(s)
    niv = nivel(riesgo)
    acciones = {
        "CRITICO": "SUSPENDER: reagendar con evaluacion completa",
        "ALTO":    "LLAMAR HOY: cirujano + pabellon + UCI + anticoag",
        "MEDIO":   "REVISAR 24-48h: examenes + consentimiento + gates",
        "BAJO":    "CHECKLIST ESTANDAR: NPO + consentimiento + insumos"
    }
    prioridad = "URGENTE" if asa in ["ASA IV","ASA V"] else "PREFERENTE" if asa == "ASA III" else "ELECTIVA"
    return {"id_caso":d.get("id_caso",""),"riesgo_ia":riesgo,"nivel_riesgo":niv,"accion_ia":acciones[niv],"prioridad":prioridad,"anemia_grado":anemia(hb)}

def score_prediccion(d):
    asa_n = int(d.get("asa_num", 2))
    edad  = int(d.get("edad", 0))
    imc   = float(d.get("imc", 25) or 25)
    mall  = str(d.get("mallampati","Clase I"))
    sb    = int(d.get("stop_bang", 0))
    cardi = bool(d.get("cardiopatia", False))
    dm    = bool(d.get("dm", False))
    erc   = bool(d.get("erc", False))
    anti  = bool(d.get("anticoag", False))
    hb    = float(d.get("hb_preop", 0) or 0)
    anest = str(d.get("tipo_anestesia","General IOT"))
    dur   = int(d.get("duracion_min", 0))
    nvpo=0
    if sb>=3: nvpo+=20
    if cardi: nvpo+=15
    if dm: nvpo+=10
    if asa_n>=3: nvpo+=15
    if "IOT" in anest: nvpo+=20
    elif "LMA" in anest: nvpo+=15
    if dur>180: nvpo+=10
    nvpo=cap(nvpo)
    hipot=0
    if asa_n>=3: hipot+=20
    if edad>=75: hipot+=15
    if cardi: hipot+=20
    if imc>=35: hipot+=10
    if anti: hipot+=10
    if "Raquidea" in anest: hipot+=25
    elif "Epidural" in anest: hipot+=15
    hipot=cap(hipot)
    uci=0
    if asa_n==4: uci+=40
    elif asa_n==3: uci+=20
    if edad>=80: uci+=15
    if cardi: uci+=20
    if erc: uci+=15
    if dur>240: uci+=15
    if hb>0 and hb<8: uci+=10
    uci=cap(uci)
    rein=0
    if mall=="Clase IV": rein+=30
    elif mall=="Clase III": rein+=15
    if sb>=5: rein+=20
    if asa_n==4: rein+=20
    if cardi: rein+=10
    rein=cap(rein)
    delir=0
    if edad>=80: delir+=30
    elif edad>=70: delir+=15
    if dm: delir+=20
    if erc: delir+=15
    if asa_n>=3: delir+=10
    if dur>240: delir+=10
    delir=cap(delir)
    sang=0
    if anti: sang+=25
    if hb>0 and hb<10: sang+=15
    if dur>180: sang+=20
    if erc: sang+=10
    if asa_n>=3: sang+=10
    sang=cap(sang)
    def lvl(v,h=60,m=30): return "ALTO" if v>=h else "MODERADO" if v>=m else "BAJO"
    return {"id_caso":d.get("id_caso",""),"scores":{"nvpo":nvpo,"hipotension":hipot,"uci":uci,"reintubacion":rein,"delirium":delir,"sangrado":sang},"niveles":{"nvpo":lvl(nvpo),"hipotension":lvl(hipot),"uci":lvl(uci,40,20),"reintubacion":lvl(rein,40,20),"delirium":lvl(delir,40,20),"sangrado":lvl(sang)},"planes":{"profilaxis_nvpo":"Ondansetron+Dexametasona+Droperidol+TIVA" if nvpo>=60 else "Ondansetron+Dexametasona" if nvpo>=30 else "Sin profilaxis rutinaria","plan_hemodinamico":"Linea arterial+vasopresor PRE induccion" if hipot>=60 else "Precarga 500mL+efedrina disponible" if hipot>=30 else "Manejo estandar","plan_via_aerea":"VIDEOLARINGOSCOPIO+FIBROSCOPIO obligatorios" if mall=="Clase IV" else "Videolaringoscopio disponible" if mall=="Clase III" else "Manejo estandar","umbral_transfusion":"Hb <8 cardiaco" if cardi else "Hb <8" if asa_n>=3 else "Hb <7"}}

def score_anticoag(d):
    farm=str(d.get("farmaco",""))
    fecha=str(d.get("fecha_cx",str(date.today())))
    crcl=float(d.get("crcl",999) or 999)
    riesgo_te=str(d.get("riesgo_te",""))
    dias_map={"Warfarina":5,"Acenocumarol":4,"Clopidogrel":5,"Ticagrelor":5,"Prasugrel":7,"AAS":7}
    noac={"Apixaban","Rivaroxaban","Dabigatran"}
    dias=4 if farm in noac and crcl<50 else 2 if farm in noac else dias_map.get(farm,1)
    try:
        fecha_dt=date.fromisoformat(fecha)
        susp=(fecha_dt-timedelta(days=dias)).isoformat()
    except:
        susp="Calcular manualmente"
    return {"id_caso":d.get("id_caso",""),"farmaco":farm,"dias_suspension":dias,"fecha_suspension":susp,"bridging_indicado":"Alto" in riesgo_te,"alerta":f"Suspender {farm} el {susp} ({dias} dias antes)"}

def score_pbm(d):
    hb=float(d.get("hb_basal",0) or 0)
    peso=float(d.get("peso_kg",70) or 70)
    perdida=float(d.get("perdida_estimada_ml",0) or 0)
    u_est=int(d.get("unidades_estimadas",0) or 0)
    u_real=int(d.get("unidades_reales",0) or 0)
    volemia=peso*70
    perdida_pct=round(perdida/volemia*100,1) if volemia>0 else 0
    ahorradas=max(0,u_est-u_real)
    grado=anemia(hb)
    return {"id_caso":d.get("id_caso",""),"grado_anemia":grado,"volemia_estimada_ml":round(volemia),"perdida_pct":perdida_pct,"unidades_ahorradas":ahorradas,"ahorro_clp":ahorradas*250000,"recomendacion":{"SEVERA":"Optimizacion urgente: Fe IV + EPO + considerar posponer","MODERADA":"Fe IV + EPO si >4 semanas. Acido tranexamico intraop.","LEVE":"Fe oral/IV segun ferritina. Evaluar posponer si Hb<10 en cx mayor.","SIN ANEMIA":"Sin anemia. Acido tranexamico segun tipo de cirugia.","":"Sin datos de hemoglobina"}.get(grado,"")}

# ═══════════════════════════════════════════════
# MODULO CMA - CIRUGIA MAYOR AMBULATORIA
# Protocolo + loop de mejora continua (ciclo PDCA)
# Ver PROTOCOLO_CMA.md
# ═══════════════════════════════════════════════
def score_cma_elegibilidad(d):
    asa      = str(d.get("asa","ASA II"))
    asa3_est = bool(d.get("asa3_estable", False))
    edad     = int(d.get("edad", 0))
    imc      = float(d.get("imc", 25) or 25)
    sb       = int(d.get("stop_bang", 0))
    cpap     = bool(d.get("usa_cpap", False))
    anti     = bool(d.get("anticoag", False))
    hb       = float(d.get("hb_preop", 0) or 0)
    dur      = int(d.get("duracion_min", 0))
    acomp    = bool(d.get("acompanante_adulto", True))
    traslado = int(d.get("tiempo_traslado_min", 0) or 0)
    fono     = bool(d.get("telefono_contacto", True))
    dm_ins   = bool(d.get("dm_insulina", False))

    exclusiones, observaciones = [], []
    # Criterios de exclusion (NO APTO)
    if asa in ("ASA IV","ASA V"): exclusiones.append(f"{asa}: no candidato a cirugia ambulatoria")
    if asa == "ASA III" and not asa3_est: exclusiones.append("ASA III descompensado: optimizar antes de agendar")
    if not acomp: exclusiones.append("Sin adulto responsable para las primeras 24h post alta")
    if not fono: exclusiones.append("Sin telefono de contacto para seguimiento")
    if sb >= 5 and not cpap: exclusiones.append("STOP-BANG >=5 sin CPAP: riesgo SAOS severo")
    if imc >= 40 and sb >= 3: exclusiones.append("IMC >=40 con sospecha SAOS")
    if hb > 0 and hb < 10: exclusiones.append(f"Hb {hb} g/dL: optimizar anemia antes de agendar (ver /pbm)")
    if dur > 120: exclusiones.append("Duracion estimada >120 min: excede estandar CMA")

    # Criterios con observacion (APTO CON OBSERVACIONES)
    if asa == "ASA III" and asa3_est: observaciones.append("ASA III estable: requiere evaluacion anestesica presencial previa")
    if edad >= 80: observaciones.append("Edad >=80: evaluar fragilidad y red de apoyo domiciliario")
    if 3 <= sb < 5: observaciones.append("STOP-BANG 3-4: recuperacion prolongada con oximetria antes del alta")
    if sb >= 5 and cpap: observaciones.append("SAOS severo con CPAP: traer equipo el dia de la cirugia")
    if 35 <= imc < 40: observaciones.append("IMC 35-39: preferir tecnica regional/TIVA, evitar opioides de larga accion")
    if anti: observaciones.append("Anticoagulado: definir plan de suspension con /anticoag antes de agendar")
    if dm_ins: observaciones.append("DM insulinorequirente: agendar primera hora + esquema de ayuno protocolizado")
    if traslado > 60: observaciones.append("Traslado >60 min: entregar plan escrito de contacto y reconsulta")
    if 90 < dur <= 120: observaciones.append("Duracion 90-120 min: confirmar cupo de recuperacion extendida")

    estado = "NO APTO" if exclusiones else "APTO CON OBSERVACIONES" if observaciones else "APTO"
    acciones = {
        "NO APTO":               "Reagendar como cirugia con hospitalizacion o resolver exclusiones y reevaluar",
        "APTO CON OBSERVACIONES":"Agendar CMA cumpliendo las observaciones antes del dia quirurgico",
        "APTO":                  "Agendar CMA: checklist estandar + educacion de alta + confirmacion telefonica previa"
    }
    return {
        "id_caso":       d.get("id_caso",""),
        "estado_cma":    estado,
        "exclusiones":   exclusiones,
        "observaciones": observaciones,
        "accion":        acciones[estado]
    }

def score_cma_alta(d):
    # PADSS modificado (Chung): 5 items de 0-2. Alta con total >=9 y signos vitales = 2.
    def item(k): return max(0, min(2, int(d.get(k, 0) or 0)))
    items = {k: item(k) for k in ("signos_vitales","deambulacion","nvpo","dolor","sangrado")}
    total = sum(items.values())
    apto = total >= 9 and items["signos_vitales"] == 2
    pendientes = [k for k,v in items.items() if v < 2]
    return {
        "id_caso":    d.get("id_caso",""),
        "padss":      items,
        "total":      total,
        "apto_alta":  apto,
        "pendientes": pendientes,
        "accion":     "ALTA: entregar indicaciones escritas + telefono de contacto + control 24h" if apto
                      else "NO ALTA: reevaluar en 30-60 min. Si no mejora, activar ingreso no planificado"
    }

# Loop de mejora: eventos -> indicadores vs meta -> acciones PDCA
TIPOS_EVENTO_CMA = ["caso_cma","ingreso_no_planificado","suspension_mismo_dia","reconsulta_72h","alta_fallida","nvpo_severo","dolor_no_controlado","sangrado_reoperacion"]
METAS_CMA = {  # % maximo aceptable sobre el total de casos CMA
    "ingreso_no_planificado": 2.0,
    "suspension_mismo_dia":   5.0,
    "reconsulta_72h":         3.0,
    "alta_fallida":           3.0,
    "nvpo_severo":            5.0,
    "dolor_no_controlado":    5.0,
    "sangrado_reoperacion":   1.0
}
ACCIONES_PDCA = {
    "ingreso_no_planificado": "Auditar cada caso: si la causa es seleccion, endurecer criterios de /cma/elegibilidad (ASA, SAOS, duracion)",
    "suspension_mismo_dia":   "Reforzar gates 72h/24h y confirmacion telefonica el dia previo",
    "reconsulta_72h":         "Reforzar educacion al alta e implementar llamada de seguimiento a las 24h",
    "alta_fallida":           "Revisar tecnica anestesica (preferir corta accion/TIVA) y aplicacion estricta de PADSS",
    "nvpo_severo":            "Aplicar profilaxis segun score NVPO de /prediccion en todo caso con riesgo >=30",
    "dolor_no_controlado":    "Protocolizar analgesia multimodal intraoperatoria + receta de rescate al alta",
    "sangrado_reoperacion":   "Revisar plan de suspension de anticoagulantes (/anticoag) y hemostasia por equipo quirurgico"
}
EVENTOS_CMA = []  # registro en memoria: se reinicia con cada deploy; persistir en planilla para analisis historico

def indicadores_cma(eventos, total_override=0):
    conteo = {t: 0 for t in TIPOS_EVENTO_CMA}
    for e in eventos:
        t = str(e.get("tipo_evento",""))
        if t in conteo: conteo[t] += 1
    total = int(total_override) or conteo["caso_cma"]
    indicadores, fuera_de_meta = {}, []
    for t, meta in METAS_CMA.items():
        tasa = round(conteo[t] / total * 100, 1) if total > 0 else 0.0
        cumple = tasa <= meta
        indicadores[t] = {"casos": conteo[t], "tasa_pct": tasa, "meta_pct": meta, "estado": "CUMPLE" if cumple else "FUERA DE META"}
        if not cumple: fuera_de_meta.append(t)
    plan_de_accion = [{"indicador": t, "accion": ACCIONES_PDCA[t]} for t in fuera_de_meta]
    return {
        "total_casos_cma": total,
        "indicadores":     indicadores,
        "fuera_de_meta":   fuera_de_meta,
        "plan_de_accion":  plan_de_accion,
        "ciclo_pdca":      "ACTUAR: aplicar plan de accion y reevaluar en el proximo ciclo" if fuera_de_meta
                           else "VERIFICAR: todos los indicadores en meta, mantener protocolo vigente"
    }

# ═══════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════
@app.get("/")
def root():
    return {"sistema":"CancelOS IA v4 API","hospital":"Hospital de Quilpue","version":"4.1.0","status":"operativo","torre":"/torre","docs":"/docs","endpoints":["/caso/score","/prediccion","/anticoag","/pbm","/caso/completo","/cma/elegibilidad","/cma/alta","/cma/evento","/cma/indicadores","/cma/mejora"]}

@app.post("/caso/score")
def endpoint_score(body: dict):
    try: return score_caso(body)
    except Exception as e: raise Exception(str(e))

@app.post("/prediccion")
def endpoint_prediccion(body: dict):
    try: return score_prediccion(body)
    except Exception as e: raise Exception(str(e))

@app.post("/anticoag")
def endpoint_anticoag(body: dict):
    try: return score_anticoag(body)
    except Exception as e: raise Exception(str(e))

@app.post("/pbm")
def endpoint_pbm(body: dict):
    try: return score_pbm(body)
    except Exception as e: raise Exception(str(e))

@app.post("/caso/completo")
def endpoint_completo(body: dict):
    try:
        sc=score_caso(body)
        asa_n={"ASA I":1,"ASA II":2,"ASA III":3,"ASA IV":4,"ASA V":5}.get(str(body.get("asa","")),2)
        pred=score_prediccion({**body,"asa_num":asa_n})
        return {"id_caso":body.get("id_caso",""),"score":sc,"prediccion":pred}
    except Exception as e: raise Exception(str(e))

@app.post("/cma/elegibilidad")
def endpoint_cma_elegibilidad(body: dict):
    try: return score_cma_elegibilidad(body)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/alta")
def endpoint_cma_alta(body: dict):
    try: return score_cma_alta(body)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/evento")
def endpoint_cma_evento(body: dict):
    tipo = str(body.get("tipo_evento",""))
    if tipo not in TIPOS_EVENTO_CMA:
        return {"error": f"tipo_evento invalido: '{tipo}'", "tipos_validos": TIPOS_EVENTO_CMA}
    evento = {"id_caso": body.get("id_caso",""), "tipo_evento": tipo, "detalle": str(body.get("detalle","")), "fecha": str(date.today())}
    EVENTOS_CMA.append(evento)
    return {"registrado": evento, "eventos_en_memoria": len(EVENTOS_CMA)}

@app.get("/cma/indicadores")
def endpoint_cma_indicadores(total_casos: int = 0):
    try: return indicadores_cma(EVENTOS_CMA, total_casos)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/mejora")
def endpoint_cma_mejora(body: dict):
    # Version sin estado del loop: recibe el lote completo (ej. exportado de la planilla)
    try: return indicadores_cma(body.get("eventos", []) or [], int(body.get("total_casos", 0) or 0))
    except Exception as e: raise Exception(str(e))

# ═══════════════════════════════════════════════
# PROXY ENDPOINT — Railway llama a Google Sheets
# El browser llama a Railway, no a Google directamente
# ═══════════════════════════════════════════════
import urllib.request

SHEETS_URL = "https://script.google.com/macros/s/AKfycbzpAeHGzppGEByyobGkQLLIbtKAjVzWPK2Jp3lE-7aLLBCM3Wav6c6ZHXzvKkcqVPwF/exec"

@app.get("/casos")
def get_casos():
    try:
        req = urllib.request.Request(SHEETS_URL, headers={"User-Agent": "CancelOS/4.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode())
            return data
    except Exception as e:
        return {"casos": [], "error": str(e), "timestamp": str(date.today()), "hospital": "Hospital de Quilpue"}
