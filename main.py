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

@app.get("/cma-app", response_class=HTMLResponse)
def cma_app():
    path = os.path.join(os.path.dirname(__file__), "cma.html")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Modulo CMA - archivo cma.html no encontrado</h1>"

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
# Motor digital de la serie PSQ-CMA 00-04 v2.0 (agosto 2026)
# Semaforo de 4 dimensiones · matriz SAHOS · CASO LISTO (9.5.8)
# Gate 0 · Aldrete/PADSS · Apfel · QoR-15E · Etapa 9 (mejora)
# Apoya la decision clinica, no la reemplaza. Ver PROTOCOLO_CMA.md
# ═══════════════════════════════════════════════
def _h(lista, color, motivo): lista.append({"color": color, "motivo": motivo})
def _color_dim(h):
    colores = [x["color"] for x in h]
    return "ROJO" if "ROJO" in colores else "AMARILLO" if "AMARILLO" in colores else "VERDE"

def cma_matriz_sahos(d):
    # Matriz SAHOS 9.4.4: cinco dominios; el puntaje aislado no excluye
    sb    = int(d.get("stop_bang", 0) or 0)
    cpap  = str(d.get("cpap","no_aplica")).lower()          # adherente / variable / sin_cpap / no_aplica
    opio  = str(d.get("opioide_esperado","bajo")).lower()   # ninguno / bajo / moderado_alto
    anest = str(d.get("tipo_anestesia_cma","general_breve")).lower()  # local_regional / general_breve / general_prolongada
    vigil = str(d.get("vigilancia_postop","prevista")).lower()        # prevista / reforzada / insuficiente
    dom = {
        "stop_bang":  "VERDE" if sb <= 2 else "AMARILLO" if sb <= 4 else "ROJO",
        "cpap":       {"adherente":"VERDE","no_aplica":"VERDE","variable":"AMARILLO"}.get(cpap,"ROJO"),
        "opioide":    {"ninguno":"VERDE","bajo":"AMARILLO"}.get(opio,"ROJO"),
        "anestesia":  {"local_regional":"VERDE","general_breve":"AMARILLO"}.get(anest,"ROJO"),
        "vigilancia": {"prevista":"VERDE","reforzada":"AMARILLO"}.get(vigil,"ROJO"),
    }
    colores = list(dom.values())
    if "ROJO" in colores:
        res, cond = "ROJO", "Prevalece el rojo: Policlinico + validacion de vigilancia/rescate; otra modalidad si no se asegura alta segura"
    elif "AMARILLO" in colores:
        res, cond = "AMARILLO", "CMA condicionada solo tras evaluacion resolutiva del Policlinico, con mitigaciones y CPAP cuando corresponda"
    else:
        res, cond = "VERDE", "CMA estandar"
    return {"dominios": dom, "resultado": res, "conducta": cond}

def cma_dim_clinica(d):
    h = []
    asa  = str(d.get("asa","")).upper().replace("ASA","").strip()
    edad = int(d.get("edad", 0) or 0)
    if asa in ("IV","V"):
        _h(h,"ROJO",f"ASA {asa}: fuera de CMA electiva, salvo procedimiento menor con recursos verificados y decision documentada")
    elif asa == "III" and bool(d.get("descompensacion_aguda", False)):
        _h(h,"ROJO","ASA III inestable o descompensacion aguda: contraindicado")
    elif asa == "III" and bool(d.get("asa3_estable", False)) and bool(d.get("asa3_plan_escrito", False)):
        _h(h,"VERDE","ASA III estable, compensado y con plan escrito")
    elif asa == "III":
        _h(h,"AMARILLO","ASA III con duda, cambio reciente o sin plan escrito: nota resolutiva del Policlinico (G-D)")
    cfs = d.get("cfs", None)
    if cfs is None:
        if edad >= 65: _h(h,"AMARILLO","CFS no registrado: obligatorio en >=65 anos (Anexo B)")
    else:
        cfs = int(cfs)
        if cfs >= 6:   _h(h,"ROJO","CFS >=6: no apto CMA (excepcion institucional declarada, por capacidad local)")
        elif cfs == 5: _h(h,"AMARILLO","CFS 5: Policlinico + revision multidisciplinaria; prehabilitacion segun riesgo")
        elif cfs == 4: _h(h,"AMARILLO","CFS 4 vulnerable: evaluacion resolutiva del Policlinico; considerar prehabilitacion")
    imc = float(d.get("imc", 0) or 0)
    if imc >= 50:   _h(h,"ROJO","IMC >=50: fuera de la ruta CMA electiva local (excepcion institucional declarada)")
    elif imc >= 40: _h(h,"AMARILLO","IMC 40-50 ALTO RIESGO: nota resolutiva + ruta SAHOS + capacidad verificada por sede")
    elif imc >= 35: _h(h,"AMARILLO","IMC 35-40: nota resolutiva del Policlinico; cruzar via aerea, SAHOS, opioide y vigilancia")
    hba1c = float(d.get("hba1c", 0) or 0)
    if hba1c >= 9:  _h(h,"AMARILLO","HbA1c >=9%: evaluacion prioritaria (no contraindica ni clasifica ASA por si sola)")
    elif hba1c >= 8:_h(h,"AMARILLO","HbA1c 8-8,9%: revision y optimizacion sin diferimiento automatico")
    if bool(d.get("anticoag", False)) or bool(d.get("doble_antiagregacion", False)):
        _h(h,"AMARILLO","Anticoagulacion o doble antiagregacion: sin plan individual concordante el caso permanece NO LISTO")
    glp1r = str(d.get("glp1_riesgo","")).lower()
    if bool(d.get("glp1", False)) or glp1r:
        if glp1r in ("intermedio","alto"):
            _h(h,"AMARILLO",f"GLP-1 riesgo {glp1r}: plan del Policlinico; considerar dieta liquida 24 h" + ("; diferir electiva si persisten sintomas" if glp1r=="alto" else ""))
        else:
            _h(h,"VERDE","GLP-1 riesgo bajo: continuar por defecto, plan de ayuno individual")
    if bool(d.get("embarazo", False)): _h(h,"AMARILLO","Embarazo: evaluacion individual y decision documentada")
    epm = d.get("edad_postmenstrual_sem", None)
    if epm is not None and int(epm) < 60:
        _h(h,"AMARILLO","Ex prematuro <60 semanas postmenstruales: evaluacion pediatrico-anestesica resolutiva y capacidad verificada")
    sahos = None
    if int(d.get("stop_bang", 0) or 0) >= 3 or str(d.get("cpap","no_aplica")).lower() not in ("no_aplica",""):
        sahos = cma_matriz_sahos(d)
        if sahos["resultado"] == "ROJO":
            _h(h,"AMARILLO","Matriz SAHOS con componente ROJO: " + sahos["conducta"])
        elif sahos["resultado"] == "AMARILLO":
            _h(h,"AMARILLO","Matriz SAHOS amarilla: " + sahos["conducta"])
    return h, sahos

def cma_dim_quirurgica(d):
    h = []
    if not bool(d.get("en_cartera_activa", True)):
        _h(h,"ROJO","Procedimiento fuera de cartera ACTIVA: no se ofrece CMA (la continuidad historica no habilita)")
    dur = int(d.get("duracion_min", 0) or 0)
    if dur > 120: _h(h,"AMARILLO","Duracion esperada >120 min: exige paquete y franja horaria adecuadas (no es exclusion automatica)")
    if bool(d.get("riesgo_sangrado_dolor", False)):   _h(h,"AMARILLO","Riesgo de sangrado o dolor que exige plan especifico")
    if bool(d.get("implante_condiciona_alta", False)):_h(h,"AMARILLO","Implante o dispositivo que condiciona el alta")
    if bool(d.get("riesgo_via_aerea_postop", False)): _h(h,"ROJO","Riesgo de compromiso de via aerea posoperatorio")
    if bool(d.get("cuidados_exceden_sede", False)):   _h(h,"ROJO","Cuidados que la sede no puede entregar")
    return h

def cma_dim_social(d):
    h = []
    acomp = str(d.get("acompanante_24h","confirmado")).lower()
    if acomp in ("no","false","0"): _h(h,"ROJO","Sin adulto responsable por 24 h: requisito social irrenunciable")
    elif acomp == "sin_confirmar":  _h(h,"AMARILLO","Acompanante identificado pero sin confirmar")
    if not bool(d.get("transporte_seguro", True)): _h(h,"ROJO","Sin transporte seguro asegurado")
    if not bool(d.get("telefono_operativo", True)): _h(h,"ROJO","Sin telefono operativo: sin forma de contacto para seguimiento")
    compr = str(d.get("comprension","ok")).lower()
    if compr == "imposible": _h(h,"ROJO","Imposibilidad de comprender o cumplir el plan, aun con apoyo")
    elif compr == "con_apoyo": _h(h,"AMARILLO","Barrera idiomatica o comunicacional con apoyo disponible: habilitar interprete/apoyo")
    if bool(d.get("domicilio_distante", False)): _h(h,"AMARILLO","Domicilio distante: plan de contingencia compatible con el mapa de rescate")
    return h

def cma_dim_logistica(d):
    h = []
    if bool(d.get("falta_recurso_critico", False)):        _h(h,"ROJO","Falta un recurso critico")
    if bool(d.get("termino_fuera_horario_seguro", False)): _h(h,"ROJO","Termino proyectado fuera del horario seguro sin cama confirmada y aceptada")
    if not bool(d.get("red_rescate_operativa", True)):     _h(h,"ROJO","Sin cama de rescate ni acuerdo de traslado")
    if not bool(d.get("capacidad_fase_1_2", True)):        _h(h,"ROJO","Sin capacidad de Fase I y II en la jornada")
    if not bool(d.get("insumos_confirmados", True)):       _h(h,"AMARILLO","Recurso pendiente: requiere dueno y plazo antes de H4")
    if bool(d.get("capacidad_ajustada", False)):           _h(h,"AMARILLO","Capacidad ajustada que exige reordenar la tabla")
    return h

def score_cma_elegibilidad(d):
    clin, sahos = cma_dim_clinica(d)
    quir, soc, log = cma_dim_quirurgica(d), cma_dim_social(d), cma_dim_logistica(d)
    dims = {
        "clinico_anestesica": {"color": _color_dim(clin), "hallazgos": clin},
        "quirurgica":         {"color": _color_dim(quir), "hallazgos": quir},
        "social":             {"color": _color_dim(soc), "hallazgos": soc},
        "logistica":          {"color": _color_dim(log), "hallazgos": log},
    }
    colores = [v["color"] for v in dims.values()]
    if "ROJO" in colores:
        disp, accion = "NO ES CMA ELECTIVA", "Corta estadia u hospitalizacion desde el inicio. No se resuelve el dia de la cirugia"
    elif dims["clinico_anestesica"]["color"] == "AMARILLO":
        disp, accion = "ZONA AMARILLA CLINICO-ANESTESICA", "Derivar al Policlinico de Anestesiologia (G-D). El caso queda NO LISTO hasta nota resolutiva: apto, apto condicionado, diferir u otra modalidad"
    elif "AMARILLO" in colores:
        disp, accion = "AMARILLO NO CLINICO", "Resolver por el dueno RACI de cada dimension, con mitigacion y capacidad real documentadas"
    else:
        disp, accion = "AVANZA", "Declarar modalidad CMA y avanzar a preparacion (Etapa 3, compuertas H2-H4)"
    out = {
        "id_caso":     d.get("id_caso",""),
        "dimensiones": dims,
        "disposicion": disp,
        "accion":      accion,
        "regla":       "Ningun valor aislado decide por si solo: deciden la combinacion y la capacidad verificada de la sede. Una roja saca de la ruta; una amarilla detiene hasta nota resolutiva o mitigacion del dueno RACI"
    }
    if sahos: out["matriz_sahos"] = sahos
    return out

ELEMENTOS_CASO_LISTO = {  # seccion 9.5.8 - fuente unica: los once elementos
    "indicacion_modalidad":       "1. Indicacion quirurgica corroborada y modalidad definida",
    "criterios_cma":              "2. Cuatro dimensiones resueltas, sin roja ni amarilla clinico-anestesica abierta",
    "epa_nota_resolutiva":        "3. EPA vigente y nota resolutiva del Policlinico presente cuando hubo zona amarilla",
    "optimizacion_pbm":           "4. Optimizacion ejecutada, incluida compuerta PBM cuando aplique",
    "plan_farmacologico":         "5. Plan farmacologico individual documentado, unico y entregado por escrito",
    "examenes_interpretados":     "6. Examenes indicados revisados e interpretados, sin pendientes que cambien conducta",
    "consentimiento_cma":         "7. Consentimiento con intencion de alta el mismo dia y posibilidad de conversion",
    "acompanante_transporte":     "8. Acompanante adulto responsable 24 h confirmado y transporte seguro",
    "educacion_teachback":        "9. Educacion entregada con teach-back documentado",
    "logistica_paquete":          "10. Requisitos logisticos del paquete confirmados (Anexo L)",
    "red_rescate":                "11. Red de rescate de la jornada verificada (Anexos K y M.6)",
}

def score_caso_listo(d):
    faltantes = [desc for k, desc in ELEMENTOS_CASO_LISTO.items() if not bool(d.get(k, False))]
    listo = not faltantes
    return {
        "id_caso":   d.get("id_caso",""),
        "estado":    "CASO LISTO" if listo else "NO LISTO",
        "faltantes": faltantes,
        "accion":    "Declarar CASO LISTO con fecha, autor y vigencia; puede pasar a tabla definitiva" if listo
                     else "NO pasa a tabla definitiva: falta UN elemento = NO LISTO (seccion 9.5.8)",
        "nota":      "Cualquier cambio clinico posterior invalida la declaracion hasta nueva verificacion"
    }

def score_gate0(d):
    # Etapa 4 / H5: confirmacion, no reevaluacion (9.6.1 y 9.6.3)
    checks = {
        "identidad_sitio_consentimiento": "Identidad, procedimiento, sitio, lateralidad, consentimiento y marcacion",
        "ayuno_plan_individual":          "Ayuno cumplido segun plan individual (6 h / 2 h), ultima dosis registrada",
        "sin_cambio_clinico":             "Sin cambio clinico, farmacologico ni social desde el dia -1",
        "caso_listo_vigente":             "CASO LISTO vigente; ninguna duda antigua sin nota resolutiva",
        "acompanante_confirmado":         "Acompanante presente o con llegada segura confirmada; transporte asegurado",
        "capacidad_rescate":              "Capacidad de Fase I y II y red de rescate de la jornada confirmadas",
        "sign_in":                        "Sign-IN de la lista OMS ejecutado (Anexo F)",
    }
    bloqueadores = [desc for k, desc in checks.items() if not bool(d.get(k, False))]
    if not bloqueadores:
        return {"id_caso": d.get("id_caso",""), "resultado": "GATE 0 CERRADO", "bloqueadores": [],
                "accion": "Traslado a pabellon"}
    nuevo = bool(d.get("hallazgo_nuevo", False))
    return {
        "id_caso":      d.get("id_caso",""),
        "resultado":    "PAUSA CMA",
        "bloqueadores": bloqueadores,
        "decide":       "Anestesiologo del caso: proceder, mitigar, diferir o cambiar de modalidad (hallazgo nuevo del dia 0)" if nuevo
                        else "El caso permanece NO LISTO: Gate 0 no reemplaza al Policlinico. Suspension con causa codificada",
        "accion":       "No se induce anestesia con un bloqueador critico abierto. Registrar causa, hora y responsable (G-C)"
    }

def score_aldrete(d):
    # Fase I (9.8.2): transito a Fase II con >=9 sostenido 15 min y ningun parametro en 0
    def item(k): return max(0, min(2, int(d.get(k, 0) or 0)))
    items = {k: item(k) for k in ("actividad","respiracion","circulacion","conciencia","spo2")}
    total = sum(items.values())
    sostenido = bool(d.get("sostenido_15min", False))
    en_cero = [k for k, v in items.items() if v == 0]
    pasa = total >= 9 and not en_cero and sostenido
    motivo = [] if pasa else (
        ([f"dominio en 0: {', '.join(en_cero)}"] if en_cero else []) +
        (["total < 9"] if total < 9 else []) +
        ([] if sostenido or total < 9 or en_cero else ["falta sostener >= 15 min"])
    )
    return {"id_caso": d.get("id_caso",""), "aldrete": items, "total": total,
            "pasa_fase_2": pasa, "motivo_no_avance": motivo,
            "accion": "Transito a Fase II" if pasa else "No avanza: manejar dolor/NVPO/estabilidad y reevaluar; deterioro activa rescate"}

def score_padss(d):
    # Fase II (9.8.3): alta con PADSS >= 9/10, signos vitales = 2 y ningun dominio en 0
    def item(k): return max(0, min(2, int(d.get(k, 0) or 0)))
    items = {k: item(k) for k in ("signos_vitales","deambulacion","nvpo","dolor","sangrado")}
    total = sum(items.values())
    ped = bool(d.get("pediatrico", False))
    acomp = bool(d.get("acompanante_presente", False))
    bloqueos = []
    if total < 9: bloqueos.append("PADSS < 9")
    if items["signos_vitales"] < 2: bloqueos.append("signos vitales < 2")
    en_cero = [k for k, v in items.items() if v == 0]
    if en_cero: bloqueos.append("dominio en 0: " + ", ".join(en_cero))
    if not acomp: bloqueos.append("acompanante adulto no presente")
    apto = not bloqueos
    return {
        "id_caso": d.get("id_caso",""), "escala": "Ped-PADSS" if ped else "PADSS",
        "padss": items, "total": total, "apto_alta": apto, "bloqueos": bloqueos,
        "accion": "Cumple criterios objetivos: verificar los 8 deberes del alta (9.9.3) y ejecutar alta dentro del paquete" if apto
                  else "Bloqueo de alta: revision presencial por dominio (Anestesiologia: dolor/NVPO/sedacion/via aerea; Cirugia: sangrado/herida/dispositivos). Si persiste: observacion, conversion o rescate"
    }

def score_apfel(d):
    factores = {k: bool(d.get(k, False)) for k in ("sexo_femenino","no_fumador","antecedente_nvpo","opioides_postop")}
    p = sum(factores.values())
    riesgo = {0: "~10%", 1: "~21%", 2: "~39%", 3: "~61%", 4: "~79%"}[p]
    if p >= 3:   prof = "ALTO: tres o mas intervenciones de clases diferentes; considerar TIVA y tecnicas regionales; minimizar opioides"
    elif p == 2: prof = "INTERMEDIO: al menos dos intervenciones de clases diferentes; considerar una tercera y reducir riesgo basal"
    elif p == 1: prof = "BAJO: al menos dos intervenciones de clases diferentes; individualizar contraindicaciones"
    else:        prof = "BAJO: reducir riesgo basal; profilaxis segun procedimiento y consecuencias clinicas"
    return {"id_caso": d.get("id_caso",""), "apfel": p, "factores": factores, "riesgo_nvpo": riesgo,
            "profilaxis": prof, "nota": "El rescate debe usar una clase distinta de la profilaxis reciente"}

def score_qor15(d):
    # QoR-15E (Anexo D): 0-150, PASS >= 118, MCID = 6. Basal preop y a 24 h en adultos
    items = d.get("items", None)
    if items and len(items) == 15:
        total = sum(max(0, min(10, int(x or 0))) for x in items)
    else:
        total = max(0, min(150, int(d.get("total", 0) or 0)))
    basal = d.get("basal", None)
    out = {"id_caso": d.get("id_caso",""), "total": total, "pass_118": total >= 118,
           "interpretacion": "Recuperacion aceptable (PASS >= 118)" if total >= 118 else "Bajo umbral PASS: revisar dominios descendidos"}
    if basal is not None:
        delta = total - int(basal)
        out["basal"] = int(basal); out["delta"] = delta
        out["deterioro_mcid"] = delta <= -6
        if delta <= -6: out["interpretacion"] = f"Deterioro clinicamente importante (delta {delta} <= -6): evaluar y escalar segun senales de alarma"
    return out

# ── Etapa 9: mejora continua ──
# Cada caso deja un dato y cada falla deja un aprendizaje.
# Registro en memoria (se reinicia con cada deploy): la ficha clinica es la
# fuente primaria; para analisis historico usar /cma/mejora con el lote completo.
TIPOS_EVENTO_CMA = ["caso_cma","alta_mismo_dia","pernoctacion_no_planificada","conversion_hospitalizacion",
                    "suspension_dia0","pausa_cma","rescate_activado","evento_adverso",
                    "reconsulta_7d","readmision_30d","reoperacion_30d",
                    "seguimiento_24h_ok","seguimiento_24h_fallido","qor15_deterioro"]
CAPAS_FALLA = ["seleccion","proceso","no_prevenible"]  # 9.11.1: toda pernoctacion no planificada se clasifica en 3 capas
EVENTOS_CMA = []

# Referencias externas (BADS/GIRFT): comparativas, NUNCA metas locales automaticas (Anexo I).
REFERENCIAS_CMA = {
    "pernoctacion_no_planificada": {"ref_pct": 2.0,  "fuente": "BADS/GIRFT"},
    "suspension_dia0":             {"ref_pct": 2.0,  "fuente": "GIRFT"},
    "reconsulta_7d":               {"ref_pct": 3.0,  "fuente": "BADS"},
    "readmision_30d":              {"ref_pct": 2.0,  "fuente": "BADS/GIRFT"},
    "reoperacion_30d":             {"ref_pct": 1.0,  "fuente": "BADS"},
    "conversion_hospitalizacion":  {"ref_pct": 2.0,  "fuente": "BADS/GIRFT"},
}
ACCIONES_MEJORA = {
    "pernoctacion_no_planificada": "Clasificar cada caso en sus 3 capas (seleccion/proceso/no prevenible) y asignar una accion concreta con responsable y plazo (9.11.1)",
    "suspension_dia0":             "Auditar causa codificada por caso; reforzar compuertas H2-H4 y contacto del dia -1; revisar K7 y evitabilidad colegiada",
    "reconsulta_7d":               "Revisar educacion y teach-back, plan analgesico al alta y llamada de 24-48 h (K16)",
    "readmision_30d":              "Revision individual de cada evento aunque no genere senal estadistica (O.4); evaluar seleccion y paquete del procedimiento",
    "reoperacion_30d":             "Revision individual obligatoria; evaluar hemostasia, plan antitrombotico y criterios del paquete",
    "conversion_hospitalizacion":  "Auditar si la probabilidad de alta segura era adecuada al programar; ajustar seleccion o cartera si se repite",
}

def indicadores_cma(eventos, total_override=0):
    conteo = {t: 0 for t in TIPOS_EVENTO_CMA}
    pernoc_sin_capa, pernoc_capas = 0, {c: 0 for c in CAPAS_FALLA}
    for e in eventos:
        t = str(e.get("tipo_evento",""))
        if t in conteo: conteo[t] += 1
        if t == "pernoctacion_no_planificada":
            capa = str(e.get("capa",""))
            if capa in pernoc_capas: pernoc_capas[capa] += 1
            else: pernoc_sin_capa += 1
    total = int(total_override) or conteo["caso_cma"]
    indicadores, fuera_de_referencia = {}, []
    for t, ref in REFERENCIAS_CMA.items():
        if total <= 0:
            indicadores[t] = {"casos": conteo[t], "tasa_pct": None, "estado": "SIN DATOS",
                              "nota": "Un dato ausente nunca se interpreta como cero (Anexo I)"}
            continue
        tasa = round(conteo[t] / total * 100, 1)
        dentro = tasa <= ref["ref_pct"]
        indicadores[t] = {"casos": conteo[t], "tasa_pct": tasa,
                          "referencia_pct": ref["ref_pct"], "referencia_fuente": ref["fuente"],
                          "estado": "DENTRO DE REFERENCIA" if dentro else "SOBRE REFERENCIA",
                          "nota": "Referencia comparativa, no meta local automatica"}
        if not dentro: fuera_de_referencia.append(t)
    seg_total = conteo["seguimiento_24h_ok"] + conteo["seguimiento_24h_fallido"]
    k18 = {"contacto_efectivo": conteo["seguimiento_24h_ok"], "fallidos": conteo["seguimiento_24h_fallido"],
           "cobertura_pct": round(conteo["seguimiento_24h_ok"] / seg_total * 100, 1) if seg_total else None}
    plan = [{"indicador": t, "accion": ACCIONES_MEJORA[t]} for t in fuera_de_referencia]
    if pernoc_sin_capa:
        plan.append({"indicador": "pernoctacion_no_planificada",
                     "accion": f"{pernoc_sin_capa} pernoctacion(es) sin clasificar en 3 capas: clasificar antes de la revision semanal"})
    return {
        "total_casos_cma":       total if total > 0 else None,
        "indicadores":           indicadores,
        "alta_mismo_dia_k2":     {"casos": conteo["alta_mismo_dia"],
                                  "tasa_pct": round(conteo["alta_mismo_dia"] / total * 100, 1) if total > 0 else None},
        "seguridad_k13":         {"eventos_adversos": conteo["evento_adverso"], "rescates": conteo["rescate_activado"],
                                  "pausas_cma": conteo["pausa_cma"],
                                  "nota": "Todo evento grave tiene revision individual aunque no genere senal estadistica"},
        "continuidad_24h_k18":   k18,
        "qor15_deterioros_k19":  conteo["qor15_deterioro"],
        "analisis_falla_9111":   {"clasificadas": pernoc_capas, "sin_clasificar": pernoc_sin_capa},
        "fuera_de_referencia":   fuera_de_referencia,
        "plan_de_accion":        plan,
        "ciclo":                 "ACTUAR: cada falla genera una accion concreta con responsable y plazo; revisar en Comite CMA" if plan
                                 else ("VERIFICAR: dentro de referencias; mantener vigilancia diaria/semanal/mensual (O.3)" if total > 0
                                       else "SIN DATOS: registrar casos y eventos para construir linea base (>=10 puntos, O.4)")
    }

# ═══════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════
@app.get("/")
def root():
    return {"sistema":"CancelOS IA v4 API","hospital":"Hospital de Quilpue","version":"4.2.0","status":"operativo","torre":"/torre","cma_app":"/cma-app","docs":"/docs","protocolo_cma":"serie PSQ-CMA 00-04 v2.0","endpoints":["/caso/score","/prediccion","/anticoag","/pbm","/caso/completo","/cma/elegibilidad","/cma/caso-listo","/cma/gate0","/cma/aldrete","/cma/padss","/cma/apfel","/cma/qor15","/cma/evento","/cma/indicadores","/cma/mejora"]}

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

@app.post("/cma/caso-listo")
def endpoint_cma_caso_listo(body: dict):
    try: return score_caso_listo(body)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/gate0")
def endpoint_cma_gate0(body: dict):
    try: return score_gate0(body)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/aldrete")
def endpoint_cma_aldrete(body: dict):
    try: return score_aldrete(body)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/padss")
def endpoint_cma_padss(body: dict):
    try: return score_padss(body)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/alta")  # alias historico de /cma/padss
def endpoint_cma_alta(body: dict):
    try: return score_padss(body)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/apfel")
def endpoint_cma_apfel(body: dict):
    try: return score_apfel(body)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/qor15")
def endpoint_cma_qor15(body: dict):
    try: return score_qor15(body)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/evento")
def endpoint_cma_evento(body: dict):
    tipo = str(body.get("tipo_evento",""))
    if tipo not in TIPOS_EVENTO_CMA:
        return {"error": f"tipo_evento invalido: '{tipo}'", "tipos_validos": TIPOS_EVENTO_CMA}
    evento = {"id_caso": body.get("id_caso",""), "tipo_evento": tipo, "detalle": str(body.get("detalle","")), "fecha": str(date.today())}
    if tipo == "pernoctacion_no_planificada":
        evento["capa"] = str(body.get("capa",""))       # seleccion / proceso / no_prevenible
        evento["accion"] = str(body.get("accion",""))   # accion concreta con responsable y plazo
    EVENTOS_CMA.append(evento)
    return {"registrado": evento, "eventos_en_memoria": len(EVENTOS_CMA)}

@app.get("/cma/indicadores")
def endpoint_cma_indicadores(total_casos: int = 0):
    try: return indicadores_cma(EVENTOS_CMA, total_casos)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/mejora")
def endpoint_cma_mejora(body: dict):
    # Version sin estado del loop: recibe el lote completo (ej. exportado de la planilla del mes)
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
