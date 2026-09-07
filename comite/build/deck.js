// Genera Comite_Quirurgico_Agosto_2026.pptx (v2: con láminas de misma fecha, algoritmos, pabellón menos y tiempos)
const path = require('path');
const { newDeck } = require('./lib');
const A = require('./slides1').slides;
const B = require('./slides2').slides;
const { N } = require('./slides3');

const all = [
  A[0], A[1], A[2], N.mismaFecha, A[3], N.cusum,
  A[4], A[5], A[6], A[7], A[8], A[9], A[10], A[11], A[12], A[13], A[14], N.patrones, A[15],
  A[16], A[17], A[18], N.produccion, A[19], B[0], N.pabellon, B[1], B[2], B[3],
  N.dia, B[4], B[5], B[6], B[7], B[8], B[9], B[10], B[11], B[12], B[13], N.hojaIA,
  B[14], B[15], B[16], B[17], B[18], B[19], N.metodos2, B[20],
];
const pres = newDeck();
all.forEach((fn, k) => fn(pres, k + 1, all.length));
const out = path.join(__dirname, 'Comite_Quirurgico_Agosto_2026.pptx');
pres.writeFile({ fileName: out }).then(f => console.log('escrito', f, 'láminas', all.length));
