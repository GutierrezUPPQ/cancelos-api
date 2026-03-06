# CancelOS IA v4 - API Python

Motor de Inteligencia Artificial para Gestión Prequirúrgica
Hospital de Quilpué - Coordinador PBM

## Instalación local

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Abre: http://localhost:8000/docs  ← documentación interactiva automática

## Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /caso/score | Riesgo IA + anemia |
| POST | /prediccion | 6 complicaciones |
| POST | /anticoag | Protocolo suspensión |
| POST | /pbm | Evaluación PBM |
| POST | /caso/completo | Todo en uno |

## Ejemplo de uso

```python
import requests

caso = {
    "id_caso": "CX-2026-001",
    "fecha_cx": "2026-03-10",
    "procedimiento": "Colecistectomía laparoscópica",
    "edad": 72,
    "asa": "ASA III",
    "mallampati": "Clase II",
    "stop_bang": 4,
    "anticoag": True,
    "hb_preop": 9.5,
    "gate_72h": "PASA",
    "gate_24h": "PASA",
    "complejidad": "Media"
}

r = requests.post("http://localhost:8000/caso/score", json=caso)
print(r.json())
```

## Deploy en producción (Railway.app)

1. Crear cuenta en railway.app (gratis)
2. Conectar repositorio GitHub
3. Railway detecta Python automáticamente
4. URL pública lista en 2 minutos

Costo: $0-5 USD/mes
