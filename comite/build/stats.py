"""Cálculos derivados para el Comité Quirúrgico · Agosto 2026 (Hospital de Quilpué).
Fuentes: monitoreo diario (archivo -15, serie homogénea ene-2025 a ago-2026, criterio L-V),
registro operativo de suspensiones (informe 5-sep-2026, 38 registros), informe PDF 6-sep-2026,
PPT Comité Julio 2026 e informe docx de agosto (ene-2025 a jul-2026).
Sin scipy: Fisher exacto y binomial se implementan con math.lgamma.
"""
import json, math

# ── Serie mensual hábil (L–V): programadas normales de CME y suspendidas ──
MESES = ["ene-25","feb-25","mar-25","abr-25","may-25","jun-25","jul-25","ago-25","sep-25","oct-25","nov-25","dic-25",
         "ene-26","feb-26","mar-26","abr-26","may-26","jun-26","jul-26","ago-26"]
PROG = [117,167,163,170,149,187,210,190,191,219,195,174, 184,191,216,226,166,179,155,152]
SUSP = [  7, 15, 12, 19, 13, 16, 28, 23, 15, 16, 20, 16,  17, 13, 18, 13,  7,  3,  1,  2]
assert len(MESES)==len(PROG)==len(SUSP)==20
tasa = [round(s/p*100,2) for s,p in zip(SUSP,PROG)]

# Línea central: 2025 completo (pooled)
p25 = sum(SUSP[:12])/sum(PROG[:12])
lcl, ucl, bajo_lcl = [], [], []
for n,t in zip(PROG,tasa):
    sig = math.sqrt(p25*(1-p25)/n)
    l = max(0.0,(p25-3*sig)*100); u=(p25+3*sig)*100
    lcl.append(round(l,2)); ucl.append(round(u,2)); bajo_lcl.append(t < l)

def log_comb(n,k): return math.lgamma(n+1)-math.lgamma(k+1)-math.lgamma(n-k+1)
def fisher_two_sided(a,b,c,d):
    # tabla [[a,b],[c,d]]; a = eventos grupo 1, b = no eventos grupo 1
    n=a+b+c+d; r1=a+b; c1=a+c
    def p_of(x): return math.exp(log_comb(r1,x)+log_comb(n-r1,c1-x)-log_comb(n,c1))
    p_obs=p_of(a); total=0.0
    for x in range(max(0,c1-(n-r1)), min(r1,c1)+1):
        px=p_of(x)
        if px <= p_obs*(1+1e-9): total+=px
    return min(1.0,total)

def binom_quantiles(n,p,qs=(0.05,0.5,0.95)):
    logp=math.log(p); logq=math.log(1-p); cum=0.0; out={}; k=0
    probs=[]
    for k in range(n+1):
        probs.append(math.exp(log_comb(n,k)+k*logp+(n-k)*logq))
    cum=0.0; res={}
    for k,pk in enumerate(probs):
        cum+=pk
        for q in qs:
            if q not in res and cum>=q: res[q]=k
    return res

# Períodos
def pooled(idx):
    s=sum(SUSP[i] for i in idx); p=sum(PROG[i] for i in idx); return s,p,round(s/p*100,2)
trim = pooled([17,18,19])            # jun–ago 2026
previo = pooled(list(range(0,17)))   # ene-25 a may-26
trim25 = pooled([5,6,7])             # jun–ago 2025
ago26=(SUSP[19],PROG[19]); ago25=(SUSP[7],PROG[7])
ytd26 = pooled(list(range(12,20))); ytd25 = pooled(list(range(0,8)))
hist = pooled(list(range(0,20)))     # ene-25 a ago-26
prev19 = pooled(list(range(0,19)))   # 19 meses previos a agosto 2026
y2025 = pooled(list(range(0,12)))
media_tasas_19 = round(sum(tasa[:19])/19,2)

fisher_trim = fisher_two_sided(trim[0], trim[1]-trim[0], previo[0], previo[1]-previo[0])
fisher_ago  = fisher_two_sided(ago26[0], ago26[1]-ago26[0], ago25[0], ago25[1]-ago25[0])
fisher_ytd  = fisher_two_sided(ytd26[0], ytd26[1]-ytd26[0], ytd25[0], ytd25[1]-ytd25[0])
rr_trim = round(trim[2]/previo[2],3); rr_trim25=round(trim[2]/trim25[2],3)

# ── Registro operativo agosto: calendario (día -> registros) ──
CAL = {1:0,2:0,3:1,4:1,5:0,6:1,7:0,8:5,9:4,10:0,11:0,12:0,13:1,14:1,15:1,16:2,17:1,18:0,19:0,20:1,21:2,22:2,23:5,
       24:3,25:1,26:2,27:0,28:3,29:0,30:0,31:1}
assert sum(CAL.values())==38
import datetime as dt
dow = [0]*7; dias_lv_con=0; dias_lv=0
for d,n in CAL.items():
    w = dt.date(2026,8,d).weekday(); dow[w]+=n
    if w<5:
        dias_lv+=1
        if n>0: dias_lv_con+=1
lv = sum(dow[:5]); fds = sum(dow[5:])
assert lv==19 and fds==19

# ── Evitabilidad (regla del analista de julio aplicada a la causal registrada) ──
CAUSAS = [  # (causa, n, clase)
 ("Error de programación",7,"evitable"),
 ("Reemplazo por urgencia",3,"no_evitable"),
 ("No presentación",3,"pot_evitable"),
 ("Ayuno / exámenes incompletos",2,"evitable"),
 ("Instrumental incompleto",1,"evitable"),
 ("Infraestructura",1,"pot_evitable"),
 ("Falta de cirujano",1,"pot_evitable"),
 ("Enfermedad aguda",1,"no_evitable"),
 ("Descompensación",1,"no_evitable"),
 ("Sin causal registrada",18,"sin_causal"),
]
assert sum(n for _,n,_ in CAUSAS)==38
evit = {}
for _,n,c in CAUSAS: evit[c]=evit.get(c,0)+n

# ── Producción ──
LV_DIAS_26 = [22,20,22,22,21,22,23,21]
CME_LV_26  = [256,245,255,286,186,237,214,201]
CME_TOT_26 = [381,478,467,534,425,382,308,411]
CME_FDS_26 = [t-l for t,l in zip(CME_TOT_26,CME_LV_26)]
CME_TOT_25 = [358,410,486,372,400,467,395,419,363,534,461,349]
assert sum(CME_LV_26)==1880
# actividad declarada ene–ago (monitoreo, todos los días)
act25 = {"cme":3307,"urg":1164,"menor":459,"proc":515,"total":5445}
act26 = {"cme":2667+308+411,"urg":1023+160+145,"menor":217+53+61,"proc":428+324+620,"total":4335+845+1237}
var = {k: round((act26[k]-act25[k])/act25[k]*100,1) for k in act25}
cme_lv_25_ytd=1657; cme_lv_26_ytd=1880

# ── Proyección HPMM (binomial) ──
PROY = {}
for nombre,n in (("actual_3pab",2308),("hpmm_7pab",5387)):
    for tag,p in (("2025_9.38",p25),("hist_ene25_ago26",hist[2]/100),("2026_ene_ago",ytd26[2]/100),("jun_ago_2026",trim[2]/100)):
        q=binom_quantiles(n,p); PROY[f"{nombre}|{tag}"]={"n":n,"p":round(p*100,2),"p5":q[0.05],"p50":q[0.5],"p95":q[0.95],"esperado":round(n*p)}
n_sep_dic = round(sum(PROG[12:20])/8*4)   # volumen mensual medio 2026 x 4 meses
esp_sep_dic = {tag: binom_quantiles(n_sep_dic,p) for tag,p in (("jun_ago",trim[2]/100),("planificar_4",0.04),("2025",p25))}

out = {
 "meses":MESES,"prog":PROG,"susp":SUSP,"tasa":tasa,"lcl":lcl,"ucl":ucl,"bajo_lcl":bajo_lcl,
 "p_2025":round(p25*100,2),"y2025":y2025,"hist":hist,"prev19":prev19,"media_tasas_19":media_tasas_19,
 "trim_jun_ago_26":trim,"previo_ene25_may26":previo,"trim_jun_ago_25":trim25,"ytd26":ytd26,"ytd25":ytd25,
 "rr_trim":rr_trim,"rr_trim_vs_25":rr_trim25,
 "fisher_trim":fisher_trim,"fisher_ago":fisher_ago,"fisher_ytd":fisher_ytd,
 "cal":CAL,"dow":dow,"lv":lv,"fds":fds,"dias_lv":dias_lv,"dias_lv_con":dias_lv_con,
 "causas":CAUSAS,"evit":evit,
 "cme_lv_26":CME_LV_26,"cme_fds_26":CME_FDS_26,"cme_tot_26":CME_TOT_26,"cme_tot_25":CME_TOT_25,"lv_dias_26":LV_DIAS_26,
 "act25":act25,"act26":act26,"var":var,
 "proy":PROY,"n_sep_dic":n_sep_dic,"esp_sep_dic":{k:{str(q):v for q,v in d.items()} for k,d in esp_sep_dic.items()},
}
json.dump(out,open("stats.json","w"),ensure_ascii=False,indent=1)
print("p2025 %.2f%%  hist %s  prev19 %s media_tasas19 %.2f" % (p25*100,hist,prev19,media_tasas_19))
print("trim jun-ago 26",trim,"previo",previo,"RR",rr_trim,"fisher p=%.2e"%fisher_trim, "| vs trim25",trim25,"RR",rr_trim25)
print("ago26 vs ago25 fisher p=%.2e ; ytd fisher p=%.2e"%(fisher_ago,fisher_ytd), "ytd",ytd26,ytd25)
print("LCL por mes:",list(zip(MESES,tasa,lcl,bajo_lcl))[-6:])
print("dow L..D:",dow,"dias LV con registros %d/%d"%(dias_lv_con,dias_lv))
print("evit:",evit)
print("act26",act26,"var",var)
for k,v in PROY.items(): print(k,v)
print("n_sep_dic",n_sep_dic,esp_sep_dic)

# ══════════════ v2: comparacion a la misma fecha, CUSUM/EWMA, contrafactual, pruebas ══════════════
import random
def pooled_rate(s, p): return round(s / p * 100, 2) if p else None
MESES_CORTOS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]
def por_anio(anio):
    idx = range(0, 8) if anio == 2025 else range(12, 20)
    s = [SUSP[i] for i in idx]; p = [PROG[i] for i in idx]
    tasa_m = [pooled_rate(a, b) for a, b in zip(s, p)]
    ma3 = [None, None] + [pooled_rate(sum(s[k-2:k+1]), sum(p[k-2:k+1])) for k in range(2, 8)]
    ytd = [pooled_rate(sum(s[:k+1]), sum(p[:k+1])) for k in range(8)]
    return {"susp": s, "prog": p, "tasa": tasa_m, "ma3": ma3, "ytd": ytd}
misma_fecha = {"meses": MESES_CORTOS[:8], "2025": por_anio(2025), "2026": por_anio(2026)}
# contrafactual: suspensiones esperadas en 2026 al ritmo de 2025 (misma fecha, acumulado ene-ago 9,83%)
p_ytd25 = ytd25[0] / ytd25[1]
esperadas_2026 = [round(PROG[i] * p_ytd25, 1) for i in range(12, 20)]
evitadas_2026 = round(sum(esperadas_2026) - sum(SUSP[12:20]))
esperadas_ago = round(PROG[19] * p25, 1)
# CUSUM sobre conteos: acumulado de (esperadas a tasa 2025 - observadas); el maximo marca el quiebre
cusum, acc = [], 0.0
for i in range(20):
    acc += PROG[i] * p25 - SUSP[i]; cusum.append(round(acc, 1))
# quiebre = ultimo minimo antes del ascenso sostenido (para una caida de tasa, C_t desciende y luego sube)
i_q = max(i for i in range(20) if cusum[i] <= 1.0)   # ultimo mes en torno a cero antes del ascenso sostenido
quiebre = MESES[i_q + 1] if i_q < 19 else MESES[19]
exceso_post = round(cusum[19] - cusum[i_q])
# EWMA (lambda 0,3) sobre la tasa mensual, con pronostico para septiembre
lam = 0.3; ewma = []; e = p25 * 100
for t in tasa:
    e = lam * t + (1 - lam) * e; ewma.append(round(e, 2))
resid = [t - v for t, v in zip(tasa, ewma)]
sd = (sum(r * r for r in resid) / (len(resid) - 1)) ** 0.5
n_sep = round(sum(PROG[12:20]) / 8)
q_sep = binom_quantiles(n_sep, max(0.001, ewma[-1] / 100))
pron_sep = {"tasa_pct": ewma[-1], "programadas_supuestas": n_sep, "esperadas": round(n_sep * ewma[-1] / 100, 1), "p5": q_sep[0.05], "p95": q_sep[0.95],
            "banda_tasa": [round(max(0, ewma[-1] - 1.645 * sd), 2), round(ewma[-1] + 1.645 * sd, 2)]}
# prueba del lunes: P(X >= 6 | n = 19, p = 1/5)
def binom_tail(n, k, p): return sum(math.exp(log_comb(n, j) + j * math.log(p) + (n - j) * math.log(1 - p)) for j in range(k, n + 1))
p_lunes = binom_tail(19, 6, 0.2); p_lunes_minsal = 0.2 ** 2
# agrupamiento de fin de semana: 19 registros en 5 fines de semana; observado: los dos mayores suman 16
random.seed(20260907); N = 200000; hits = 0
for _ in range(N):
    c = [0] * 5
    for _ in range(19): c[random.randrange(5)] += 1
    c.sort()
    if c[-1] + c[-2] >= 16: hits += 1
p_finde = hits / N
# pabellon menos (agosto): encuentros electivos L-V 202 en 51 pabellon-dias (P2 9, P3 21, P4 21)
pab_dias = {"P2": 9, "P3": 21, "P4": 21}; tot_pd = sum(pab_dias.values())
elect_lv = 202; cme_lv_ago = 201
por_pd = round(elect_lv / tot_pd, 2)
elect_si_p2 = round(elect_lv * 63 / tot_pd); cme_si_p2 = round(cme_lv_ago * 63 / tot_pd)
pabellon = {"pab_dias": pab_dias, "total_pab_dias": tot_pd, "posibles": 63, "sin_p2": 12, "electivos_lv": elect_lv, "por_pab_dia": por_pd,
            "electivos_si_p2_completo": elect_si_p2, "cme_lv": cme_lv_ago, "cme_por_pab_dia": round(cme_lv_ago / tot_pd, 2),
            "cme_si_p2_completo": cme_si_p2, "cme_por_dia_si_p2": round(cme_si_p2 / 21, 2), "delta_estimado": elect_si_p2 - elect_lv}
out.update({"misma_fecha": misma_fecha, "esperadas_2026": esperadas_2026, "evitadas_2026": evitadas_2026, "esperadas_ago_2025": esperadas_ago,
            "cusum": cusum, "cusum_quiebre": quiebre, "cusum_exceso_post": exceso_post, "ewma": ewma, "ewma_sd": round(sd, 2), "pron_sep": pron_sep,
            "p_lunes": p_lunes, "p_lunes_minsal": p_lunes_minsal, "p_finde": p_finde, "pabellon": pabellon})
json.dump(out, open("stats.json", "w"), ensure_ascii=False, indent=1)
print("misma fecha 2025:", misma_fecha["2025"]); print("misma fecha 2026:", misma_fecha["2026"])
print("esperadas 2026 a tasa 2025:", esperadas_2026, "suma", round(sum(esperadas_2026), 1), "evitadas", evitadas_2026, "| ago esperadas a 9,38%:", esperadas_ago)
print("CUSUM:", cusum, "quiebre", quiebre, "exceso post", exceso_post)
print("EWMA:", ewma, "sd", round(sd, 2), "pron sep", pron_sep)
print("p lunes 6/19:", round(p_lunes, 4), "| 2/2 MINSAL en lunes:", p_lunes_minsal, "| p finde:", p_finde)
print("pabellon:", pabellon)
