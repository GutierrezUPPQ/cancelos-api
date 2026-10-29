"""
Cierre UGCQ portátil: arma un único archivo HTML que funciona con doble clic,
sin internet y sin servidor (motor, lector de Excel y pdf.js van incrustados).

Uso:  python3 ugcq_portable.py [Cierre_UGCQ.html]
También lo sirve la API en /ugcq/portable.
"""
import base64
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))

# Convierte el pdf.js incrustado (base64) en módulos que el navegador puede importar
ARRANQUE = """window.UGCQ_PORTABLE = true;
window.UGCQ_PDFJS = (function () {
  let urls = null;
  const deBase64 = (id) => {
    const bin = atob(document.getElementById(id).textContent.trim());
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([u8], { type: 'text/javascript' }));
  };
  return () => urls || (urls = { lib: deBase64('pdfjs-lib'), worker: deBase64('pdfjs-worker') });
})();"""


def _texto(*ruta):
    with open(os.path.join(BASE, *ruta), "r", encoding="utf-8") as f:
        return f.read()


def _base64(*ruta):
    with open(os.path.join(BASE, *ruta), "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def armar():
    html = _texto("ugcq.html")
    for js in ("ugcq_core.js", "ugcq_xlsx.js"):
        codigo = _texto(js)
        if "</script" in codigo.lower():
            raise ValueError(js + " no puede contener '</script'")
        etiqueta = '<script src="%s"></script>' % js
        if html.count(etiqueta) != 1:
            raise ValueError("ugcq.html debe cargar " + js + " una vez")
        html = html.replace(etiqueta, "<script>\n" + codigo + "</script>")
    # Sin conexiones externas: las fuentes de Google se reemplazan por las del sistema
    html = re.sub(r'<link href="https://fonts\.googleapis\.com/[^"]*" rel="stylesheet">\n?', "", html)
    if html.count("<!--PORTATIL-->") != 1:
        raise ValueError("ugcq.html no tiene el marcador <!--PORTATIL-->")
    incrustado = (
        '<script id="pdfjs-lib" type="application/octet-stream">' + _base64("vendor", "pdfjs", "pdf.min.mjs") + "</script>\n"
        '<script id="pdfjs-worker" type="application/octet-stream">' + _base64("vendor", "pdfjs", "pdf.worker.min.mjs") + "</script>\n"
        "<script>\n" + ARRANQUE + "\n</script>"
    )
    return html.replace("<!--PORTATIL-->", incrustado)


if __name__ == "__main__":
    destino = sys.argv[1] if len(sys.argv) > 1 else "Cierre_UGCQ.html"
    with open(destino, "w", encoding="utf-8") as f:
        f.write(armar())
    print("Listo:", destino, "(%d KB)" % (os.path.getsize(destino) // 1024))
