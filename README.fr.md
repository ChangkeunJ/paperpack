[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md) | [Tiếng Việt](README.vi.md) | Français | [Español](README.es.md)

# paperpack

Répondez à une série de questions et obtenez les chiffres calculés, avec la source de
chacun d'entre eux. Tout s'exécute dans le navigateur.

Utilisez-le sur https://paperpack-7v7.pages.dev/ sans rien installer. Ce que vous
saisissez ne quitte jamais l'onglet, sur la copie hébergée comme sur la vôtre.

![Le pack impôt vacances-travail, rempli](docs/screenshot.png)

Le premier pack calcule l'impôt des working holiday makers en Australie. Environ
211 000 personnes détiennent un visa 417 ou 462 à un instant donné ; la plupart sont
imposées dès le premier dollar, sans seuil d'exonération d'impôt, et beaucoup subissent
une retenue excessive de la part d'un employeur qui ne s'est jamais enregistré comme
employeur vacances-travail. Cet argent ne revient que si vous déposez une déclaration.

Il calcule aussi le paiement de superannuation au départ d'Australie (DASP), qui pour la
plupart des backpackers est le plus gros des deux montants et le plus lourdement imposé.

## Ce qu'il fait

- Calcule l'impôt sur les revenus vacances-travail pour 2025-26 et 2026-27
- Montre ce qui a déjà été retenu à la source et quelle est la différence
- Vous prévient là où la nationalité change le résultat, ce qui est le cas pour huit
  pays couverts par une convention et onze pays ayant un accord de réciprocité en
  matière de soins de santé
- Effectue la comparaison *Addy* pour un résident d'un pays conventionné : il calcule
  l'impôt à la fois selon le régime vacances-travail et comme ressortissant australien
  résident, affiche les deux et applique le moins cher, ce qui est exactement ce que la
  convention vous accorde
- Calcule ce qu'une demande de DASP vous laisse après impôt, au taux vacances-travail
  quand il s'applique et aux taux ordinaires des résidents temporaires quand il ne
  s'applique pas
- Affiche chaque chiffre avec la page de l'ATO d'où il provient et la date à laquelle
  cette page a été vérifiée
- Parle anglais, coréen, chinois dans les deux écritures, japonais, vietnamien, français
  et espagnol

## Ce qu'il ne fait pas

- Il ne dépose rien. Le dépôt de la déclaration passe par myTax, entre vos propres mains.
- Il ne suppose pas que la base résidente l'emporte. La convention vous accorde la plus
  basse de deux impositions, pas les taux résidents, et les deux sont affichées à
  l'écran.
- Il ne gère pas les revenus gagnés hors d'Australie. Ces revenus comptent d'un côté de
  la comparaison et pas de l'autre, donc l'outil le dit plutôt que de se tromper en
  silence.
- Il n'estime pas l'impôt 2026-27 d'un résident tant que l'ATO n'a pas publié les seuils
  de la cotisation Medicare de cette année-là. Refuser une année vaut mieux que la
  deviner.
- Il ne modélise pas des règles de déduction qu'il n'a pas lues. À partir de 2026-27, la
  tolérance de 300 dollars sans reçus est abrogée et une déduction forfaitaire de
  1 000 dollars la remplace pour les seuls résidents ; les deux années se comportent
  donc différemment, et c'est voulu.
- Il ne décide pas du taux DASP sur la seule foi du visa. Détenir un 417 ou un 462 n'est
  que la moitié du test ; le paiement doit aussi contenir de la superannuation versée
  pendant la détention du visa, et si c'est le cas, le taux le plus élevé s'applique à
  la totalité du paiement.
- Il ne s'agit pas d'un service d'agent fiscal et rien de ce qu'il contient ne constitue
  un conseil fiscal. Il applique des taux publiés aux nombres que vous avez saisis.
  Vérifiez-les et, s'il vous faut un conseil fiable, adressez-vous à un agent fiscal
  agréé (registered tax agent). Voir [docs/legal.md](docs/legal.md).

## Le lancer

```
pnpm install
pnpm build
npx http-server . -p 8080     # or any static server
```

Ouvrez ensuite `/web/index.html`. Il n'y a pas de backend et rien à configurer. Ce que
vous saisissez reste dans l'onglet.

## Comment les règles sont stockées

Chaque nombre réglementaire vit dans `packs/<pack>/rules/*.json`, et aucun n'est livré
sans provenance :

```json
"noTfnWithholdingRate": {
  "value": 0.45,
  "from": "2024-07-01",
  "source": "https://www.ato.gov.au/tax-rates-and-codes/schedule-15-tax-table-for-working-holiday-makers",
  "checked": "2026-08-18",
  "note": "45 per cent, not 47. The published 47 per cent applies to a resident payee; Schedule 15 sets a flat 45 per cent for working holiday makers with no residency test. The rate itself is long standing, but this URL is overwritten each 1 July and now serves the version effective 1 July 2026, so the start date recorded here rests on an archived copy of the previous version rather than on the live page."
}
```

`scripts/check.mjs` rejette toute règle à laquelle il manque `value`, `from`, `source`
ou `checked`, rejette les données réglementaires rangées hors de la clé `rules`, et la
suite de tests vérifie que les montants de base de chaque table de tranches concordent
avec la table qui figure en dessous, ce qui permet d'attraper un taux mal saisi avant
que quiconque ne voie un chiffre faux.

Lorsqu'une page ne publie pas de date d'entrée en vigueur, `from` enregistre le jour où
la valeur a été lue pour la première fois, et la note de la règle le précise.

Les taux d'imposition australiens changent le 1er juillet. Revérifiez les sources avant
cette date ; une tâche CI mensuelle se met à échouer quand les dates de vérification
enregistrées deviennent antérieures au 1er juillet le plus récent.

## Ajouter une langue

Copiez `packs/au-whm-tax/i18n/en.json`, traduisez les valeurs, conservez les clés, puis
enregistrez la locale dans `web/index.html` (la map `dicts` et un bouton). Les tests
prennent en compte chaque fichier de `i18n/` et échouent si une clé manque ou est vide. La
formulation fiscale se traduit facilement de travers ; gardez donc le lien vers la
source visible à côté de tout ce que vous traduisez.

## Ajouter un pack

Un pack, c'est un questionnaire (`interview.ts`), un ou plusieurs calculs
(`calculate.ts`, `dasp.ts`), des données de règles avec leurs sources (`rules/*.json`)
et des chaînes de caractères (`i18n/*.json`). Le moteur dans `src/` est un évaluateur de
questions et un calculateur par table de tranches ; rien en lui n'est propre à
l'Australie.

## Licence

MIT.
