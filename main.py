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
# ENDPOINTS
# ═══════════════════════════════════════════════
@app.get("/")
def root():
    return {"sistema":"CancelOS IA v4 API","hospital":"Hospital de Quilpue","version":"4.0.0","status":"operativo","torre":"/torre","docs":"/docs","endpoints":["/caso/score","/prediccion","/anticoag","/pbm","/caso/completo"]}

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
