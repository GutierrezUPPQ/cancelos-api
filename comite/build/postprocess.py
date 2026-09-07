"""Post-proceso del PPTX generado: reemplaza el relleno plano de los dos resplandores
(elipses con alpha 7000 / 5500) por el gradiente radial del tema original del comité."""
import re, sys, zipfile, shutil, os

src = sys.argv[1]
tmp = src + '.tmp'
GRAD = {
    '2DD4BF': '<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="2DD4BF"><a:alpha val="7059"/></a:srgbClr></a:gs><a:gs pos="100000"><a:srgbClr val="2DD4BF"><a:alpha val="0"/></a:srgbClr></a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path></a:gradFill>',
    'A78BFA': '<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="A78BFA"><a:alpha val="5490"/></a:srgbClr></a:gs><a:gs pos="100000"><a:srgbClr val="A78BFA"><a:alpha val="0"/></a:srgbClr></a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path></a:gradFill>',
}
pat = re.compile(r'(<a:prstGeom prst="ellipse">.*?</a:prstGeom>)<a:solidFill><a:srgbClr val="(2DD4BF|A78BFA)"><a:alpha val="(7000|5500)"/></a:srgbClr></a:solidFill>', re.S)
n = 0
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename.startswith('ppt/slides/slide') and item.filename.endswith('.xml'):
            x = data.decode('utf-8')
            x, k = pat.subn(lambda m: m.group(1) + GRAD[m.group(2)], x)
            n += k
            data = x.encode('utf-8')
        zout.writestr(item, data)
shutil.move(tmp, src)
print('gradientes inyectados:', n)
