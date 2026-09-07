# Comité Quirúrgico · Agosto 2026 (Hospital de Quilpué)

- `Comite_Quirurgico_Agosto_2026_v2.pptx` — presentación completa (49 láminas, con notas y fuentes por lámina).
- `Comite_Quirurgico_Agosto_2026_v2.pdf` — la misma presentación en PDF para lectura rápida.

## Regenerar la presentación

```bash
cd comite/build
python3 stats.py            # recalcula la serie, carta p, Fisher, CUSUM/EWMA, contrafactual y proyección → stats.json
npm install                 # instala pptxgenjs 3.12
node deck.js                # escribe Comite_Quirurgico_Agosto_2026.pptx
python3 postprocess.py Comite_Quirurgico_Agosto_2026.pptx   # resplandores con gradiente del tema
```

Los datos de entrada están en `stats.py` (serie mensual del monitoreo ene-2025 a ago-2026, calendario del
registro operativo de agosto, causas y evitabilidad, producción) y en los textos de `slides1.js`, `slides2.js`
y `slides3.js`. Para el mes siguiente basta actualizar la serie y los textos.
