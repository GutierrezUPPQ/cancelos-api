"""
CancelOS IA v4 - API Python + Torre de Control
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from datetime import date, datetime, timedelta
import os, json, threading, urllib.request

app = FastAPI(title="CancelOS IA v4 API", version="4.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ═══════════════════════════════════════════════
# SERVIR TORRE DE CONTROL
# ═══════════════════════════════════════════════
def _html(nombre, fallback):
    path = os.path.join(os.path.dirname(__file__), nombre)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            contenido = f.read()
    else:
        contenido = fallback
    # no-store: el navegador siempre pide la version vigente tras cada deploy
    return HTMLResponse(contenido, headers={"Cache-Control": "no-store"})

@app.get("/torre", response_class=HTMLResponse)
def torre():
    return _html("index.html", "<h1>Torre de Control - archivo index.html no encontrado</h1>")

@app.get("/cma-app", response_class=HTMLResponse)
def cma_app():
    return _html("cma.html", "<h1>Modulo CMA - archivo cma.html no encontrado</h1>")

@app.get("/encuesta", response_class=HTMLResponse)
def encuesta():
    return _html("encuesta.html", "<h1>Encuesta CMA - archivo encuesta.html no encontrado</h1>")

@app.get("/alta", response_class=HTMLResponse)
def hoja_alta():
    return _html("alta.html", "<h1>Hoja de alta - archivo alta.html no encontrado</h1>")

@app.get("/suspensiones", response_class=HTMLResponse)
def suspensiones_app():
    return _html("suspensiones.html", "<h1>Suspensiones en el tiempo - archivo suspensiones.html no encontrado</h1>")

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

# Persistencia: cada evento se anexa a disco (sobrevive reinicios; un redeploy
# de Railway borra el disco, por eso el respaldo opcional a Google Sheets via
# CMA_SHEETS_WEBHOOK). La ficha clinica sigue siendo la fuente primaria (O.5).
EVENTOS_FILE = os.path.join(os.path.dirname(__file__), "eventos_cma.jsonl")
_ev_lock = threading.Lock()

def _cargar_eventos():
    evs = []
    try:
        with open(EVENTOS_FILE, encoding="utf-8") as f:
            for linea in f:
                linea = linea.strip()
                if linea:
                    try: evs.append(json.loads(linea))
                    except Exception: pass
    except FileNotFoundError:
        pass
    return evs

def _guardar_evento(e):
    try:
        with _ev_lock, open(EVENTOS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
        return True
    except Exception:
        return False

def _enviar_sheets(e):
    # Respaldo durable en la planilla del equipo (Apps Script doPost, ver PROTOCOLO_CMA.md)
    url = os.environ.get("CMA_SHEETS_WEBHOOK", "")
    if not url: return None
    try:
        req = urllib.request.Request(url, data=json.dumps(e, ensure_ascii=False).encode("utf-8"),
                                     headers={"Content-Type": "application/json", "User-Agent": "CancelOS/4.3"})
        with urllib.request.urlopen(req, timeout=8) as r: r.read()
        return True
    except Exception:
        return False

EVENTOS_CMA = _cargar_eventos()

# ── Encuestas al paciente: QoR-15E basal y 24 h + control dia 7 ──
# El enlace lleva solo el id de episodio (seudonimizado, Anexo O.5): sin nombre ni RUT.
# Puntaje QoR-15E: items 1-10 directos, 11-15 invertidos (10 - respuesta del paciente).
# Prioridad segun reglas de la plataforma de seguimiento: P1 alarma explicita ·
# P2 QoR<118, caida >=6, solicita llamada o hallazgo no vital · P3 completa sin
# gatillos · GRIS incompleta (nunca equivale a evolucion normal). Cierre humano.
ENCUESTAS_FILE = os.path.join(os.path.dirname(__file__), "encuestas_cma.jsonl")
MOMENTOS_ENCUESTA = ("basal", "h24", "d7")

def _cargar_encuestas():
    encs = []
    try:
        with open(ENCUESTAS_FILE, encoding="utf-8") as f:
            for linea in f:
                linea = linea.strip()
                if linea:
                    try: encs.append(json.loads(linea))
                    except Exception: pass
    except FileNotFoundError:
        pass
    return encs

def _guardar_encuesta(e):
    try:
        with _ev_lock, open(ENCUESTAS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
        return True
    except Exception:
        return False

ENCUESTAS_CMA = _cargar_encuestas()

def _puntaje_qor(respuestas):
    if not isinstance(respuestas, list) or len(respuestas) != 15:
        return None
    total = 0
    for i, r in enumerate(respuestas):
        try: v = int(r)
        except (TypeError, ValueError): return None
        if v < 0 or v > 10: return None
        total += v if i < 10 else 10 - v
    return total

def _basal_de(id_caso):
    if not id_caso: return None
    for e in reversed(ENCUESTAS_CMA):
        if e.get("id_caso") == id_caso and e.get("momento") == "basal" and e.get("total") is not None:
            return e["total"]
    return None

def registrar_encuesta(d):
    momento = str(d.get("momento", ""))
    if momento not in MOMENTOS_ENCUESTA:
        return {"error": f"momento invalido: '{momento}'", "momentos_validos": list(MOMENTOS_ENCUESTA)}
    ahora = datetime.now()
    id_caso = str(d.get("id_caso", "")).strip()[:40]
    alarma = bool(d.get("alarma", False))
    llamada = bool(d.get("quiere_llamada", False))
    total = _puntaje_qor(d.get("respuestas")) if momento in ("basal", "h24") else None
    delta = None
    if momento == "h24" and total is not None:
        basal = _basal_de(id_caso)
        if basal is not None: delta = total - basal
    extra = {}
    if momento == "d7":
        try: extra["dolor_eva"] = max(0, min(10, int(d.get("dolor_eva")))) if d.get("dolor_eva") is not None else None
        except (TypeError, ValueError): extra["dolor_eva"] = None
        extra["herida_problema"] = bool(d.get("herida_problema", False))
        extra["reconsulta"] = bool(d.get("reconsulta", False))
        extra["actividad"] = str(d.get("actividad", ""))[:20]

    gatillos = []
    if momento == "h24":
        if total is None: gatillos = None  # GRIS
        else:
            if total < 118: gatillos.append("QoR bajo 118")
            if delta is not None and delta <= -6: gatillos.append("caida de 6 o mas vs basal")
    elif momento == "basal":
        if total is None: gatillos = None
    elif momento == "d7":
        if extra.get("reconsulta"): gatillos.append("consulto en urgencia")
        if extra.get("herida_problema"): gatillos.append("problema de herida")
        if extra.get("dolor_eva") is not None and extra["dolor_eva"] > 4: gatillos.append("dolor sobre 4 (EVA)")
    if llamada and gatillos is not None: gatillos.append("solicita llamada")
    if not id_caso and gatillos is not None: gatillos.append("sin id de episodio: conciliar")

    if alarma:
        prioridad, motivo = "P1", "Sintoma de alarma declarado: revision humana inmediata (la alarma prevalece sobre todo)"
    elif gatillos is None:
        prioridad, motivo = "GRIS", "Encuesta incompleta o sin puntaje: nunca se interpreta como evolucion normal"
    elif gatillos:
        prioridad, motivo = "P2", " · ".join(gatillos)
    else:
        prioridad, motivo = "P3", "Completa y sin gatillos"

    reg = {"id_caso": id_caso, "momento": momento, "fecha": str(ahora.date()), "hora": ahora.strftime("%H:%M:%S"),
           "total": total, "delta": delta, "prioridad": prioridad, "motivo": motivo,
           "alarma": alarma, "quiere_llamada": llamada,
           "comentario": str(d.get("comentario", ""))[:500], **extra}
    ENCUESTAS_CMA.append(reg)
    _guardar_encuesta(reg)
    _enviar_sheets({"tipo_registro": "encuesta", **reg})
    return {"registrado": True, "prioridad": prioridad,
            "mensaje": ("Gracias. Sus respuestas indican que el equipo debe contactarle: si ahora mismo se siente mal, "
                        "llame a Urgencia o al 131 (SAMU) sin esperar." if prioridad in ("P1", "P2")
                        else "¡Gracias! Sus respuestas quedaron registradas y el equipo las revisara.")}

# Referencias externas (BADS/GIRFT): comparativas, NUNCA metas locales automaticas (Anexo I).
# Solo el ingreso/pernoctacion no planificado <2% es estandar publicado (BADS/GIRFT);
# el resto son referencias institucionales provisorias informadas por literatura
# observacional, hasta contar con linea base local (Anexo I).
REFERENCIAS_CMA = {
    "pernoctacion_no_planificada": {"ref_pct": 2.0,  "fuente": "BADS/GIRFT (estandar publicado)"},
    "suspension_dia0":             {"ref_pct": 2.0,  "fuente": "referencia institucional provisoria"},
    "reconsulta_7d":               {"ref_pct": 3.0,  "fuente": "referencia institucional provisoria"},
    "readmision_30d":              {"ref_pct": 2.0,  "fuente": "referencia institucional provisoria"},
    "reoperacion_30d":             {"ref_pct": 1.0,  "fuente": "referencia institucional provisoria"},
    "conversion_hospitalizacion":  {"ref_pct": 2.0,  "fuente": "referencia institucional provisoria"},
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
# MODULO SUSPENSIONES - SEGUIMIENTO EN EL TIEMPO
# Registro operable de suspensiones quirurgicas (Comite Quirurgico):
# causal codificada (catalogo SSVQ/MINSAL), evitabilidad, modalidad, tipo,
# momento, evento raiz y reprogramacion; denominador diario de programadas
# normales (monitoreo L-V) para la tasa habil; serie temporal, carta p,
# Pareto y comparacion de periodos. Cada indicador se lee con su
# denominador propio: los conteos del registro no son tasas y las
# poblaciones distintas no se suman. Ver SUSPENSIONES.md
# ═══════════════════════════════════════════════
CAUSAS_SUSPENSION = {  # codigo: (categoria MINSAL, descripcion, evitabilidad sugerida por la regla del analista)
    "error_programacion":     ("equipo_quirurgico", "Error de programacion (incluye prolongacion de tabla)", "evitable"),
    "reemplazo_urgencia":     ("equipo_quirurgico", "Reemplazo por urgencia", "no_evitable"),
    "falta_cirujano":         ("equipo_quirurgico", "Falta de cirujano", "potencialmente_evitable"),
    "falta_anestesiologo":    ("equipo_quirurgico", "Falta de anestesiologo", "potencialmente_evitable"),
    "no_se_presenta":         ("paciente", "No se presenta", "potencialmente_evitable"),
    "falta_ayuno":            ("paciente", "Falta de ayuno", "evitable"),
    "atraso_ingreso":         ("paciente", "Atraso al ingreso", "evitable"),
    "patologia_aguda":        ("paciente", "Patologia aguda o enfermedad intercurrente", "no_evitable"),
    "descompensacion":        ("paciente", "Descompensacion de patologia cronica", "no_evitable"),
    "rechazo_paciente":       ("paciente", "Paciente rechaza o desiste", "potencialmente_evitable"),
    "estudio_incompleto":     ("administrativa", "Estudio preoperatorio incompleto", "evitable"),
    "sin_consentimiento":     ("administrativa", "Consentimiento informado no firmado", "evitable"),
    "sin_cupo_recuperacion":  ("administrativa", "Sin cupo en recuperacion (URPA)", "potencialmente_evitable"),
    "sin_cama":               ("administrativa", "Sin cama de hospitalizacion o UCI", "potencialmente_evitable"),
    "falta_personal":         ("administrativa", "Falta de personal (enfermeria, TENS, otros)", "potencialmente_evitable"),
    "instrumental_incompleto":("apoyo_logistico", "Instrumental incompleto o no esteril", "evitable"),
    "falta_insumos":          ("apoyo_logistico", "Falta de insumos, implantes o farmacos", "evitable"),
    "equipo_fuera_servicio":  ("apoyo_logistico", "Equipamiento fuera de servicio", "potencialmente_evitable"),
    "falla_climatizacion":    ("infraestructura", "Falla de climatizacion", "potencialmente_evitable"),
    "falla_infraestructura":  ("infraestructura", "Falla o destruccion de infraestructura", "potencialmente_evitable"),
    "desastre_natural":       ("emergencia", "Desastre natural o emergencia externa", "no_evitable"),
    "otra":                   ("otra", "Otra causa consignada en el detalle", "sin_clasificar"),
    "sin_causal":             ("sin_causal", "Sin causal registrada (completar por jornada)", "sin_clasificar"),
}
CATEGORIAS_SUSPENSION = {"equipo_quirurgico":"Equipo quirurgico","paciente":"Paciente","administrativa":"Administrativas",
                         "apoyo_logistico":"Unidades de apoyo logistico","infraestructura":"Infraestructura",
                         "emergencia":"Emergencias","otra":"Otra","sin_causal":"Sin causal"}
EVITABILIDADES = ("evitable", "potencialmente_evitable", "no_evitable", "sin_clasificar")
MODALIDADES_CX = ("directa", "condicional", "urgencia")
TIPOS_CX = ("mayor", "menor", "procedimiento")
MOMENTOS_SUSPENSION = ("dia_previo", "dia_0", "en_pabellon")   # anticipacion: antes del dia, el mismo dia, con el paciente en pabellon
DIAS_SEMANA = ("lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo")
GRANULARIDADES = ("dia", "semana", "mes")
ACCIONES_SUSPENSION = {
    "equipo_quirurgico": "Auditar ficha por ficha el error de programacion: separar error de agenda (UPPQ) de indicacion o insumo (unidad quirurgica); reglas de reemplazo por urgencia y de cobertura del equipo",
    "paciente":          "Confirmacion telefonica 24-48 h antes (viernes PM para la tabla del lunes), recordatorio de ayuno e instrucciones escritas; contacto del dia -1",
    "administrativa":    "Compuertas H2-H4 del prequirurgico: estudio interpretado, consentimiento firmado y cupo de recuperacion o cama confirmados antes de la tabla definitiva",
    "apoyo_logistico":   "Checklist de instrumental e insumos del dia -1 con dueno y plazo; mantencion preventiva de equipos",
    "infraestructura":   "Plan de mantencion preventiva y protocolo de contingencia por sala",
    "emergencia":        "Registrar el evento raiz con una codificacion unica del suceso; no atribuir evitabilidad",
    "otra":              "Recodificar con el catalogo para que el dato alimente el ciclo de mejora",
    "sin_causal":        "Completar la causal por jornada: sin causal no hay evitabilidad ni accion posible",
    "lunes":             "Blindar la tabla del lunes: confirmacion y revision de examenes el viernes PM y dotacion de enfermeria asegurada",
}
SUSPENSIONES_FILE = os.path.join(os.path.dirname(__file__), "suspensiones.jsonl")
PROGRAMADAS_FILE  = os.path.join(os.path.dirname(__file__), "programadas.jsonl")

def _cargar_jsonl(path):
    regs = []
    try:
        with open(path, encoding="utf-8") as f:
            for linea in f:
                linea = linea.strip()
                if linea:
                    try: regs.append(json.loads(linea))
                    except Exception: pass
    except FileNotFoundError:
        pass
    return regs

def _anexar_jsonl(path, obj):
    try:
        with _ev_lock, open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")
        return True
    except Exception:
        return False

SUSPENSIONES = _cargar_jsonl(SUSPENSIONES_FILE)
PROGRAMADAS  = {r["fecha"]: r for r in _cargar_jsonl(PROGRAMADAS_FILE) if r.get("fecha")}  # la ultima version de cada fecha manda

def _fecha(v, default=None):
    try: return date.fromisoformat(str(v)[:10])
    except Exception: return default

def _clave_periodo(f, gran):
    if gran == "dia": return f.isoformat()
    if gran == "semana":
        iso = f.isocalendar(); return f"{iso[0]}-S{iso[1]:02d}"
    return f.strftime("%Y-%m")

def _normalizar_suspension(d):
    # Devuelve (registro, error). No persiste: lo usan el endpoint y el lote sin estado.
    fecha_dt = _fecha(d.get("fecha_cx") or d.get("fecha"))
    if fecha_dt is None: return None, {"error": "fecha_cx invalida: usar AAAA-MM-DD"}
    causa = (str(d.get("causa", "")).strip().lower() or "sin_causal")
    if causa not in CAUSAS_SUSPENSION:
        return None, {"error": f"causa invalida: '{causa}'", "causas_validas": list(CAUSAS_SUSPENSION)}
    cat, desc, evit_sug = CAUSAS_SUSPENSION[causa]
    evit = str(d.get("evitabilidad", "") or evit_sug).strip().lower()
    if evit not in EVITABILIDADES:
        return None, {"error": f"evitabilidad invalida: '{evit}'", "valores_validos": list(EVITABILIDADES)}
    modalidad = str(d.get("modalidad", "directa")).strip().lower()
    tipo      = str(d.get("tipo_cx", "mayor")).strip().lower()
    momento   = str(d.get("momento", "dia_0")).strip().lower()
    for valor, validos, campo in ((modalidad, MODALIDADES_CX, "modalidad"), (tipo, TIPOS_CX, "tipo_cx"), (momento, MOMENTOS_SUSPENSION, "momento")):
        if valor not in validos:
            return None, {"error": f"{campo} invalido: '{valor}'", "valores_validos": list(validos)}
    iso = fecha_dt.isocalendar(); ahora = datetime.now(); fr = _fecha(d.get("fecha_reprogramacion"))
    reg = {
        "id_caso": str(d.get("id_caso", "")).strip()[:40], "fecha_cx": fecha_dt.isoformat(),
        "servicio": str(d.get("servicio", "")).strip()[:60], "procedimiento": str(d.get("procedimiento", "")).strip()[:120],
        "pabellon": str(d.get("pabellon", "")).strip()[:20], "modalidad": modalidad, "tipo_cx": tipo, "momento": momento,
        "causa": causa, "causa_descripcion": desc, "categoria": cat, "evitabilidad": evit, "evitabilidad_sugerida": evit_sug,
        "evento_raiz": str(d.get("evento_raiz", "")).strip()[:60], "reprogramada": bool(d.get("reprogramada", False)),
        "fecha_reprogramacion": fr.isoformat() if fr else "",
        "oncologico": bool(d.get("oncologico", False)), "detalle": str(d.get("detalle", "")).strip()[:500],
        "autor": str(d.get("autor", "")).strip()[:60],
        "dia_semana": DIAS_SEMANA[fecha_dt.weekday()], "habil": fecha_dt.weekday() < 5,
        "semana": f"{iso[0]}-S{iso[1]:02d}", "mes": fecha_dt.strftime("%Y-%m"),
        "fecha_registro": str(ahora.date()), "hora_registro": ahora.strftime("%H:%M:%S"),
    }
    return reg, None

def _normalizar_programadas(d):
    fecha_dt = _fecha(d.get("fecha"))
    if fecha_dt is None: return None, {"error": "fecha invalida: usar AAAA-MM-DD"}
    try:
        prog = int(d.get("programadas", 0) or 0); cond = int(d.get("condicionales", 0) or 0); real = int(d.get("realizadas", 0) or 0)
    except (TypeError, ValueError):
        return None, {"error": "programadas, condicionales y realizadas deben ser enteros"}
    if min(prog, cond, real) < 0: return None, {"error": "los conteos no pueden ser negativos"}
    return {"fecha": fecha_dt.isoformat(), "programadas": prog, "condicionales": cond, "realizadas": real,
            "habil": fecha_dt.weekday() < 5, "autor": str(d.get("autor", "")).strip()[:60],
            "fecha_registro": str(date.today())}, None

def _filtrar_suspensiones(susp, f):
    desde, hasta = _fecha(f.get("desde")), _fecha(f.get("hasta"))
    out = []
    for s in susp:
        fd = _fecha(s.get("fecha_cx"))
        if fd is None: continue
        if desde and fd < desde: continue
        if hasta and fd > hasta: continue
        if f.get("habil") and not s.get("habil", fd.weekday() < 5): continue
        if f.get("servicio") and str(s.get("servicio", "")).strip().lower() != str(f["servicio"]).strip().lower(): continue
        for campo in ("categoria", "modalidad", "causa", "tipo_cx", "momento", "evitabilidad"):
            if f.get(campo) and s.get(campo) != f[campo]: break
        else:
            out.append(s)
    return out

def _es_cme_normal(s):
    # numerador homologo al monitoreo: cirugia mayor de programacion directa (normal)
    return s.get("modalidad") == "directa" and s.get("tipo_cx") == "mayor"

def _rango(susp, prog, desde, hasta):
    fechas = [_fecha(s.get("fecha_cx")) for s in susp] + [_fecha(k) for k in prog]
    fechas = [x for x in fechas if x]
    d = _fecha(desde) or (min(fechas) if fechas else None)
    h = _fecha(hasta) or (max(fechas) if fechas else None)
    return d, h

def _tendencia(valores, etiqueta):
    # comparacion explicable: mitad inicial vs mitad final del rango (>= 4 puntos)
    vs = [v for v in valores if v is not None]
    if len(vs) < 4:
        return {"direccion": "SIN DATOS SUFICIENTES", "nota": "Se requieren al menos 4 periodos con datos"}
    k = len(vs) // 2
    m1 = sum(vs[:k]) / k; m2 = sum(vs[k:]) / (len(vs) - k)
    delta = round((m2 - m1) / m1 * 100, 1) if m1 else (0.0 if m2 == 0 else None)
    if delta is None: dir_ = "AL ALZA"
    elif delta <= -15: dir_ = "A LA BAJA"
    elif delta >= 15: dir_ = "AL ALZA"
    else: dir_ = "ESTABLE"
    return {"direccion": dir_, "medida": etiqueta, "media_mitad_inicial": round(m1, 2), "media_mitad_final": round(m2, 2),
            "delta_pct": delta, "ultimo": vs[-1], "anterior": vs[-2],
            "nota": "Comparacion de medias entre la mitad inicial y la mitad final del rango; +/-15% se lee como estable"}

def serie_suspensiones(susp, prog, granularidad="mes", desde=None, hasta=None, filtros=None, centro_pct=None):
    gran = granularidad if granularidad in GRANULARIDADES else "mes"
    f = dict(filtros or {}); f["desde"] = desde; f["hasta"] = hasta
    susp_f = _filtrar_suspensiones(susp, f)
    prog_f = {k: v for k, v in prog.items() if (not f.get("habil") or v.get("habil", True))}
    d, h = _rango(susp_f, prog_f, desde, hasta)
    if d is not None and not susp_f and not any(d <= _fecha(k) <= h for k in prog_f):
        d = None  # rango explicito sin registros ni denominadores: no se fabrican ceros
    if d is None:
        return {"granularidad": gran, "desde": desde, "hasta": hasta, "periodos": [], "total_suspensiones": 0, "total_cme_normal": 0,
                "total_programadas": None, "tasa_pct": None, "carta_p": {"centro_pct": None}, "tendencia": {"direccion": "SIN DATOS"},
                "nota": "Sin registros ni denominadores en el rango: un dato ausente nunca se interpreta como cero"}
    periodos, orden = {}, []
    dia = d
    while dia <= h:
        k = _clave_periodo(dia, gran)
        if k not in periodos:
            periodos[k] = {"periodo": k, "desde": dia.isoformat(), "hasta": dia.isoformat(), "suspensiones": 0, "cme_normal": 0,
                           "por_categoria": {}, "evitables": 0, "potencialmente_evitables": 0, "no_evitables": 0, "sin_clasificar": 0,
                           "programadas": None, "dias_con_denominador": 0}
            orden.append(k)
        periodos[k]["hasta"] = dia.isoformat()
        p = prog_f.get(dia.isoformat())
        if p:
            periodos[k]["programadas"] = (periodos[k]["programadas"] or 0) + int(p.get("programadas", 0))
            periodos[k]["dias_con_denominador"] += 1
        dia += timedelta(days=1)
    for s in susp_f:
        k = _clave_periodo(_fecha(s["fecha_cx"]), gran); b = periodos.get(k)
        if not b: continue
        b["suspensiones"] += 1
        if _es_cme_normal(s): b["cme_normal"] += 1
        b["por_categoria"][s.get("categoria", "otra")] = b["por_categoria"].get(s.get("categoria", "otra"), 0) + 1
        ev = s.get("evitabilidad", "sin_clasificar")
        b[{"evitable": "evitables", "potencialmente_evitable": "potencialmente_evitables", "no_evitable": "no_evitables"}.get(ev, "sin_clasificar")] += 1
    lista = [periodos[k] for k in orden]
    con_den = [b for b in lista if b["programadas"]]
    tot_s = sum(b["suspensiones"] for b in lista); tot_cme = sum(b["cme_normal"] for b in con_den)
    tot_p = sum(b["programadas"] for b in con_den) if con_den else None
    tasa = round(tot_cme / tot_p * 100, 2) if tot_p else None
    centro = float(centro_pct) if centro_pct not in (None, "", 0, "0") else tasa
    for b in lista:
        n = b["programadas"]
        b["tasa_pct"] = round(b["cme_normal"] / n * 100, 2) if n else None
        if n and centro is not None:
            pbar = centro / 100.0; sig = (pbar * (1 - pbar) / n) ** 0.5
            b["lcl_pct"] = round(max(0.0, (pbar - 3 * sig) * 100), 2); b["ucl_pct"] = round((pbar + 3 * sig) * 100, 2)
            b["senal"] = "BAJO LCL" if b["tasa_pct"] < b["lcl_pct"] else "SOBRE UCL" if b["tasa_pct"] > b["ucl_pct"] else None
        else:
            b["lcl_pct"] = b["ucl_pct"] = b["senal"] = None
    if con_den and len(con_den) == len(lista):
        tend = _tendencia([b["tasa_pct"] for b in lista], "tasa_pct")
    else:
        tend = _tendencia([b["suspensiones"] for b in lista], "suspensiones")
    return {
        "granularidad": gran, "desde": d.isoformat(), "hasta": h.isoformat(), "filtros": {k: v for k, v in (filtros or {}).items() if v},
        "total_suspensiones": tot_s, "total_cme_normal": tot_cme, "total_programadas": tot_p, "tasa_pct": tasa,
        "carta_p": {"centro_pct": round(centro, 2) if centro is not None else None,
                    "origen_centro": "centro_pct entregado" if centro_pct not in (None, "", 0, "0") else "tasa acumulada del rango (suma / suma)",
                    "regla": "limites = centro +/- 3*sqrt(p(1-p)/n) con n = programadas normales del periodo; senal BAJO LCL / SOBRE UCL"},
        "periodos": lista, "tendencia": tend,
        "nota": "tasa_pct = cme_normal (mayor + directa) / programadas normales del periodo, homologa al monitoreo hábil; "
                "suspensiones = todos los registros del filtro (conteo, no tasa). programadas = null cuando el periodo no tiene denominador: "
                "un dato ausente nunca se interpreta como cero.",
    }

def resumen_suspensiones(susp, prog, desde=None, hasta=None, filtros=None):
    f = dict(filtros or {}); f["desde"] = desde; f["hasta"] = hasta
    susp_f = _filtrar_suspensiones(susp, f)
    d, h = _rango(susp_f, {k: v for k, v in prog.items() if not f.get("habil") or v.get("habil", True)}, desde, hasta)
    n = len(susp_f)
    def conteo(campo, base=None):
        c = {}
        for s in susp_f: c[s.get(campo) or ""] = c.get(s.get(campo) or "", 0) + 1
        if base: c = {k: c.get(k, 0) for k in base}
        return c
    causas = {}
    for s in susp_f:
        k = s.get("causa", "sin_causal")
        if k not in causas: causas[k] = {"causa": k, "descripcion": s.get("causa_descripcion", ""), "categoria": s.get("categoria", ""), "n": 0}
        causas[k]["n"] += 1
    pareto, acum = [], 0
    for c in sorted(causas.values(), key=lambda x: -x["n"]):
        acum += c["n"]; c["pct"] = round(c["n"] / n * 100, 1); c["acumulado_pct"] = round(acum / n * 100, 1)
        c["pocos_vitales"] = (acum - c["n"]) / n < 0.8; pareto.append(c)
    evit = conteo("evitabilidad", EVITABILIDADES)
    clasificados = n - evit["sin_clasificar"]
    por_dia = conteo("dia_semana", DIAS_SEMANA)
    habiles = sum(por_dia[x] for x in DIAS_SEMANA[:5]); finde = n - habiles
    lunes_pct = round(por_dia["lunes"] / habiles * 100, 1) if habiles else None
    dias_habiles_con = len({s["fecha_cx"] for s in susp_f if s.get("habil")})
    # tasa habil homologa al monitoreo: CME normal (mayor + directa) L-V / programadas normales L-V con denominador
    prog_lv = {k: v for k, v in prog.items() if v.get("habil", True) and d and h and d <= _fecha(k) <= h}
    den = sum(int(v.get("programadas", 0)) for v in prog_lv.values())
    num = sum(1 for s in susp_f if s.get("habil") and _es_cme_normal(s))
    tasa_habil = round(num / den * 100, 2) if den else None
    momentos = conteo("momento", MOMENTOS_SUSPENSION); modalidades = conteo("modalidad", MODALIDADES_CX); tipos = conteo("tipo_cx", TIPOS_CX)
    raices = [s.get("evento_raiz") for s in susp_f if s.get("evento_raiz")]
    servicios = sorted(conteo("servicio").items(), key=lambda x: -x[1])[:10]
    pabellones = sorted(conteo("pabellon").items(), key=lambda x: -x[1])[:10]
    # periodo anterior de igual longitud, inmediatamente antes del rango
    comparacion = None
    if d and h:
        largo = (h - d).days + 1; d0 = d - timedelta(days=largo); h0 = d - timedelta(days=1)
        f0 = dict(filtros or {}); f0["desde"] = d0.isoformat(); f0["hasta"] = h0.isoformat()
        prev = _filtrar_suspensiones(susp, f0)
        prev_lv = {k: v for k, v in prog.items() if v.get("habil", True) and d0 <= _fecha(k) <= h0}
        den0 = sum(int(v.get("programadas", 0)) for v in prev_lv.values())
        num0 = sum(1 for s in prev if s.get("habil") and _es_cme_normal(s))
        comparacion = {"desde": d0.isoformat(), "hasta": h0.isoformat(), "suspensiones": len(prev), "delta_suspensiones": n - len(prev),
                       "tasa_habil_pct": round(num0 / den0 * 100, 2) if den0 else None,
                       "delta_tasa_pp": round(tasa_habil - num0 / den0 * 100, 2) if (den0 and tasa_habil is not None) else None}
    alertas, plan = [], []
    if n:
        sc = evit["sin_clasificar"]
        if sc / n >= 0.2:
            alertas.append(f"{sc} de {n} registros sin clasificar ({round(sc/n*100)}%): completar la causal antes de leer evitabilidad")
            plan.append({"foco": "sin_causal", "registros": sc, "accion": ACCIONES_SUSPENSION["sin_causal"]})
        if habiles >= 5 and lunes_pct is not None and lunes_pct >= 30:
            alertas.append(f"Lunes concentra {por_dia['lunes']} de {habiles} registros L-V ({lunes_pct}%)")
            plan.append({"foco": "lunes", "registros": por_dia["lunes"], "accion": ACCIONES_SUSPENSION["lunes"]})
        if clasificados and evit["evitable"] / clasificados >= 0.4:
            alertas.append(f"{evit['evitable']} de {clasificados} clasificados son evitables ({round(evit['evitable']/clasificados*100)}%)")
        if momentos["en_pabellon"]:
            alertas.append(f"{momentos['en_pabellon']} suspension(es) con el paciente ya en pabellon: la mas costosa, revision individual")
        onc = sum(1 for s in susp_f if s.get("oncologico"))
        if onc: alertas.append(f"{onc} intervencion(es) oncologica(s) suspendida(s): reprogramacion preferente <= 7 dias")
        for cat, k in sorted(conteo("categoria").items(), key=lambda x: -x[1])[:3]:
            if cat and cat != "sin_causal" and k:
                plan.append({"foco": cat, "registros": k, "accion": ACCIONES_SUSPENSION.get(cat, ACCIONES_SUSPENSION["otra"])})
    return {
        "desde": d.isoformat() if d else None, "hasta": h.isoformat() if h else None, "filtros": {k: v for k, v in (filtros or {}).items() if v},
        "total_registros": n, "habiles": habiles, "fin_de_semana": finde, "dias_habiles_con_registro": dias_habiles_con,
        "tasa_habil_cme_normal": {"suspendidas": num, "programadas": den if den else None, "tasa_pct": tasa_habil,
                                  "nota": "numerador: cirugia mayor de programacion directa en L-V; denominador: programadas normales L-V registradas en /suspension/programadas"},
        "pareto_causas": pareto, "por_categoria": conteo("categoria", list(CATEGORIAS_SUSPENSION)),
        "evitabilidad": {**evit, "clasificados": clasificados,
                         "evitable_pct_clasificados": round(evit["evitable"] / clasificados * 100, 1) if clasificados else None,
                         "prevenible_pct_clasificados": round((evit["evitable"] + evit["potencialmente_evitable"]) / clasificados * 100, 1) if clasificados else None,
                         "sin_clasificar_pct": round(evit["sin_clasificar"] / n * 100, 1) if n else None},
        "por_dia_semana": por_dia, "lunes_pct_de_habiles": lunes_pct,
        "por_momento": momentos, "por_modalidad": modalidades, "por_tipo": tipos,
        "por_servicio": [{"servicio": k or "(sin servicio)", "n": v} for k, v in servicios],
        "por_pabellon": [{"pabellon": k or "(sin pabellon)", "n": v} for k, v in pabellones],
        "eventos_raiz": {"registros_con_evento_raiz": len(raices), "eventos_distintos": len(set(raices)),
                         "nota": "agrupar registros por falla de origen evita sobreestimar la inestabilidad"},
        "reprogramadas": {"n": sum(1 for s in susp_f if s.get("reprogramada")), "pct": round(sum(1 for s in susp_f if s.get("reprogramada")) / n * 100, 1) if n else None},
        "comparacion_periodo_anterior": comparacion, "alertas": alertas, "plan_de_accion": plan,
        "ciclo": "ACTUAR: cada foco con responsable y plazo en el Comite Quirurgico" if plan else ("VERIFICAR: mantener registro y vigilancia mensual" if n else "SIN DATOS: registrar suspensiones y programadas para construir la serie"),
    }

# ═══════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════
@app.get("/")
def root():
    return {"sistema":"CancelOS IA v4 API","hospital":"Hospital de Quilpue","version":"4.6.0","status":"operativo","torre":"/torre","cma_app":"/cma-app","hoja_alta":"/alta","suspensiones":"/suspensiones","docs":"/docs","protocolo_cma":"serie PSQ-CMA 00-04 v2.0","endpoints":["/caso/score","/prediccion","/anticoag","/pbm","/caso/completo","/cma/elegibilidad","/cma/caso-listo","/cma/gate0","/cma/aldrete","/cma/padss","/cma/apfel","/cma/qor15","/cma/evento","/cma/indicadores","/cma/mejora","/cma/encuesta","/cma/encuestas","/encuesta","/suspension","/suspension/programadas","/suspension/catalogo","/suspension/lista","/suspension/serie","/suspension/resumen","/suspension/lote"]}

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
    pin = os.environ.get("CMA_PIN", "")
    if pin and str(body.get("pin","")) != pin:
        return {"error": "PIN del equipo CMA requerido o incorrecto", "pin_requerido": True}
    tipo = str(body.get("tipo_evento",""))
    if tipo not in TIPOS_EVENTO_CMA:
        return {"error": f"tipo_evento invalido: '{tipo}'", "tipos_validos": TIPOS_EVENTO_CMA}
    ahora = datetime.now()
    evento = {"id_caso": body.get("id_caso",""), "tipo_evento": tipo, "detalle": str(body.get("detalle","")),
              "autor": str(body.get("autor","")), "fecha": str(ahora.date()), "hora": ahora.strftime("%H:%M:%S")}
    if tipo == "pernoctacion_no_planificada":
        evento["capa"] = str(body.get("capa",""))       # seleccion / proceso / no_prevenible
        evento["accion"] = str(body.get("accion",""))   # accion concreta con responsable y plazo
    EVENTOS_CMA.append(evento)
    out = {"registrado": evento, "eventos_registrados": len(EVENTOS_CMA), "persistido_en_disco": _guardar_evento(evento)}
    sheets = _enviar_sheets(evento)
    if sheets is not None: out["respaldado_en_sheets"] = sheets
    return out

@app.post("/cma/encuesta")
def endpoint_cma_encuesta(body: dict):
    # Publico: lo contesta el paciente desde el enlace. Solo id de episodio, sin datos personales.
    try: return registrar_encuesta(body)
    except Exception as e: raise Exception(str(e))

@app.get("/cma/encuestas")
def endpoint_cma_encuestas(id_caso: str = ""):
    encs = [e for e in ENCUESTAS_CMA if not id_caso or e.get("id_caso") == id_caso]
    encs = list(reversed(encs))[:500]
    abiertas = {"P1": 0, "P2": 0, "GRIS": 0}
    for e in encs:
        if e.get("prioridad") in abiertas: abiertas[e["prioridad"]] += 1
    return {"total": len(encs), "colas": abiertas, "encuestas": encs,
            "nota": "Prioridad determinística y versionada; el cierre de cada alerta es humano. GRIS nunca equivale a evolucion normal."}

@app.get("/cma/indicadores")
def endpoint_cma_indicadores(total_casos: int = 0):
    try: return indicadores_cma(EVENTOS_CMA, total_casos)
    except Exception as e: raise Exception(str(e))

@app.post("/cma/mejora")
def endpoint_cma_mejora(body: dict):
    # Version sin estado del loop: recibe el lote completo (ej. exportado de la planilla del mes)
    try: return indicadores_cma(body.get("eventos", []) or [], int(body.get("total_casos", 0) or 0))
    except Exception as e: raise Exception(str(e))

# ── Suspensiones en el tiempo ──
def _pin_ok(body):
    pin = os.environ.get("CMA_PIN", "")
    return (not pin) or str(body.get("pin", "")) == pin

@app.get("/suspension/catalogo")
def endpoint_suspension_catalogo():
    return {"causas": [{"codigo": k, "categoria": v[0], "categoria_nombre": CATEGORIAS_SUSPENSION[v[0]], "descripcion": v[1], "evitabilidad_sugerida": v[2]} for k, v in CAUSAS_SUSPENSION.items()],
            "categorias": CATEGORIAS_SUSPENSION, "evitabilidades": list(EVITABILIDADES), "modalidades": list(MODALIDADES_CX),
            "tipos_cx": list(TIPOS_CX), "momentos": list(MOMENTOS_SUSPENSION), "granularidades": list(GRANULARIDADES),
            "regla_evitabilidad": "Sugerencia del analista por causal (evitable / potencialmente evitable / no evitable); el equipo puede sobrescribirla con validacion clinica y operacional. Sin causal no se clasifica."}

@app.post("/suspension")
def endpoint_suspension(body: dict):
    if not _pin_ok(body): return {"error": "PIN del equipo requerido o incorrecto", "pin_requerido": True}
    reg, err = _normalizar_suspension(body)
    if err: return err
    SUSPENSIONES.append(reg)
    out = {"registrado": reg, "suspensiones_registradas": len(SUSPENSIONES), "persistido_en_disco": _anexar_jsonl(SUSPENSIONES_FILE, reg)}
    sheets = _enviar_sheets({"tipo_registro": "suspension", **reg})
    if sheets is not None: out["respaldado_en_sheets"] = sheets
    return out

@app.post("/suspension/programadas")
def endpoint_suspension_programadas(body: dict):
    # Denominador del dia: programadas normales de CME (y condicionales / realizadas) del monitoreo. La ultima version de cada fecha manda.
    if not _pin_ok(body): return {"error": "PIN del equipo requerido o incorrecto", "pin_requerido": True}
    reg, err = _normalizar_programadas(body)
    if err: return err
    PROGRAMADAS[reg["fecha"]] = reg
    out = {"registrado": reg, "fechas_con_denominador": len(PROGRAMADAS), "persistido_en_disco": _anexar_jsonl(PROGRAMADAS_FILE, reg)}
    sheets = _enviar_sheets({"tipo_registro": "programadas", **reg})
    if sheets is not None: out["respaldado_en_sheets"] = sheets
    return out

@app.get("/suspension/lista")
def endpoint_suspension_lista(desde: str = "", hasta: str = "", servicio: str = "", categoria: str = "", limite: int = 100):
    regs = _filtrar_suspensiones(SUSPENSIONES, {"desde": desde, "hasta": hasta, "servicio": servicio, "categoria": categoria})
    regs = sorted(regs, key=lambda s: (s.get("fecha_cx", ""), s.get("fecha_registro", ""), s.get("hora_registro", "")), reverse=True)
    return {"total": len(regs), "suspensiones": regs[:max(1, min(int(limite), 1000))],
            "programadas_registradas": len(PROGRAMADAS), "nota": "Conteos del registro operativo; no son una tasa"}

@app.get("/suspension/serie")
def endpoint_suspension_serie(granularidad: str = "mes", desde: str = "", hasta: str = "", servicio: str = "", categoria: str = "",
                              modalidad: str = "", causa: str = "", habil: int = 0, centro_pct: float = 0):
    try:
        return serie_suspensiones(SUSPENSIONES, PROGRAMADAS, granularidad, desde or None, hasta or None,
                                  {"servicio": servicio, "categoria": categoria, "modalidad": modalidad, "causa": causa, "habil": bool(habil)}, centro_pct or None)
    except Exception as e: raise Exception(str(e))

@app.get("/suspension/resumen")
def endpoint_suspension_resumen(desde: str = "", hasta: str = "", servicio: str = "", categoria: str = "", modalidad: str = "", habil: int = 0):
    try:
        return resumen_suspensiones(SUSPENSIONES, PROGRAMADAS, desde or None, hasta or None,
                                    {"servicio": servicio, "categoria": categoria, "modalidad": modalidad, "habil": bool(habil)})
    except Exception as e: raise Exception(str(e))

@app.post("/suspension/lote")
def endpoint_suspension_lote(body: dict):
    # Version sin estado: recibe el lote completo (ej. el informe mensual de suspensiones y el monitoreo diario) y no persiste nada
    susp, invalidos = [], []
    for i, d in enumerate(body.get("suspensiones", []) or []):
        reg, err = _normalizar_suspension(d if isinstance(d, dict) else {})
        if err: invalidos.append({"indice": i, **err})
        else: susp.append(reg)
    prog = {}
    for i, d in enumerate(body.get("programadas", []) or []):
        reg, err = _normalizar_programadas(d if isinstance(d, dict) else {})
        if err: invalidos.append({"indice": i, "programadas": True, **err})
        else: prog[reg["fecha"]] = reg
    filtros = body.get("filtros", {}) or {}
    desde, hasta = body.get("desde") or None, body.get("hasta") or None
    return {"validos": len(susp), "invalidos": invalidos, "fechas_con_denominador": len(prog),
            "serie": serie_suspensiones(susp, prog, str(body.get("granularidad", "mes")), desde, hasta, filtros, body.get("centro_pct")),
            "resumen": resumen_suspensiones(susp, prog, desde, hasta, filtros)}

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
