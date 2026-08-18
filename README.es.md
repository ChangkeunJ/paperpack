[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md) | [Tiếng Việt](README.vi.md) | [Français](README.fr.md) | Español

# paperpack

Responda una serie de preguntas y reciba las cifras calculadas con la fuente de cada una
de ellas. Funciona íntegramente en el navegador.

Úselo en https://paperpack-7v7.pages.dev/ sin instalar nada. Lo que usted escribe nunca
sale de la pestaña, tanto en la copia alojada como en la suya propia.

![El pack de impuestos de working holiday, con los datos rellenados](docs/screenshot.png)

El primer pack calcula el impuesto de los working holiday makers en Australia. Unas
211 000 personas tienen un visado 417 o 462 en cualquier momento dado; a la mayoría se
les grava desde el primer dólar, sin umbral exento de impuestos, y a muchas un empleador
que nunca se registró como empleador de working holiday les retiene de más. Ese dinero
solo vuelve si usted presenta la declaración.

También calcula el pago de super por salida de Australia, que para la mayoría de los
mochileros es la mayor de las dos cifras y la que soporta el impuesto más duro.

## Qué hace

- Calcula el impuesto sobre el ingreso de working holiday para 2025-26 y 2026-27
- Muestra lo que ya le retuvieron y cuál es la diferencia
- Le avisa cuando la nacionalidad cambia el resultado, algo que ocurre con ocho países
  con tratado y once países con acuerdo recíproco de atención sanitaria
- Ejecuta la comparación de *Addy* para un residente de un país con tratado: calcula el
  impuesto tanto en la base de working holiday maker como en la de un nacional
  australiano residente, muestra ambas y aplica la más barata, que es lo que el tratado
  realmente le da
- Calcula lo que le queda de una reclamación de DASP después de impuestos, a la tasa de
  working holiday donde se aplica y a las tasas ordinarias de residente temporal donde no
- Imprime cada cifra con la página de la ATO de la que salió y la fecha en que esa
  página se comprobó
- Habla inglés, coreano, chino en ambas escrituras, japonés, vietnamita, francés y
  español

## Qué no hace

- No presenta nada. La presentación se hace a través de myTax, en sus propias manos.
- No da por hecho que gana la base de cálculo de residente. El tratado le da la menor de
  dos evaluaciones, no las tasas de residente, y ambas están en pantalla.
- No maneja ingresos obtenidos fuera de Australia. Ese ingreso cuenta en un lado de la
  comparación y no en el otro, así que la herramienta lo dice en lugar de equivocarse en
  silencio.
- No estima el impuesto de un residente para 2026-27 hasta que la ATO publique los
  umbrales del gravamen de Medicare de ese año. Rechazar un año es mejor que adivinarlo.
- No modela reglas de deducción que no ha leído. A partir de 2026-27 la franquicia de
  300 dólares sin recibos queda derogada y una deducción estándar de 1 000 dólares la
  sustituye solo para residentes, así que los dos años se comportan de forma distinta a
  propósito.
- No decide la tasa del DASP solo por el visado. Tener un 417 o un 462 es solo la mitad
  de la prueba; el pago también tiene que contener super aportado mientras se tenía el
  visado, y si lo contiene, las tasas working holiday se aplican al pago completo.
- No es un servicio de agente fiscal y nada de lo que contiene constituye asesoramiento
  fiscal. Aplica tasas publicadas a las cifras que usted escribió. Compruébelas y, si
  necesita asesoramiento en el que pueda confiar, consulte a un agente fiscal
  registrado. Vea [docs/legal.md](docs/legal.md).

## Ejecútelo

```
pnpm install
pnpm build
npx http-server . -p 8080     # or any static server
```

Después abra `/web/index.html`. No hay backend ni nada que configurar. Lo que usted
escribe se queda en la pestaña.

## Cómo se almacenan las reglas

Cada número regulatorio vive en `packs/<pack>/rules/*.json`, y ninguno se publica sin
procedencia:

```json
"noTfnWithholdingRate": {
  "value": 0.45,
  "from": "2024-07-01",
  "source": "https://www.ato.gov.au/tax-rates-and-codes/schedule-15-tax-table-for-working-holiday-makers",
  "checked": "2026-08-18",
  "note": "45 per cent, not 47. The published 47 per cent applies to a resident payee; Schedule 15 sets a flat 45 per cent for working holiday makers with no residency test. The rate itself is long standing, but this URL is overwritten each 1 July and now serves the version effective 1 July 2026, so the start date recorded here rests on an archived copy of the previous version rather than on the live page."
}
```

`scripts/check.mjs` rechaza cualquier regla a la que le falte `value`, `from`, `source`
o `checked`, rechaza datos regulatorios aparcados fuera de la clave `rules`, y la suite
de pruebas verifica que los importes base de cada tabla de tramos concuerdan con la
tabla que tienen debajo, que es como se detecta una tasa mal tecleada antes de que nadie
vea un número erróneo.

Cuando una página no publica fecha de entrada en vigor, `from` registra el día en que el
valor se leyó por primera vez, y la nota de la regla lo dice.

Las tasas de impuestos australianas cambian el 1 de julio. Vuelva a comprobar las
fuentes antes de esa fecha; un trabajo mensual de CI empieza a fallar cuando las fechas
de comprobación registradas quedan por detrás del 1 de julio más reciente.

## Añadir un idioma

Copie `packs/au-whm-tax/i18n/en.json`, traduzca los valores, conserve las claves y
después registre la configuración regional en `web/index.html` (el mapa `dicts` y un
botón). Las pruebas recogen cada archivo de `i18n/` y fallan si una clave falta o está
vacía. La redacción fiscal es fácil de estropear al traducir, así que mantenga el enlace
a la fuente visible junto a todo lo que traduzca.

## Añadir un pack

Un pack es una entrevista (`interview.ts`), uno o más cálculos (`calculate.ts`,
`dasp.ts`), datos de reglas con fuentes (`rules/*.json`) y cadenas de texto
(`i18n/*.json`). El motor en `src/` es un evaluador de preguntas y una calculadora de
tablas de tramos; nada en él es específico de Australia.

## Licencia

MIT.
