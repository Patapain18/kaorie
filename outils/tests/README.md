# Les bancs de test

Deux scripts qui chargent chaque page du site dans un navigateur **vierge**
(aucun cache, aucune extension, aucun réglage) et vérifient que les styles
s'appliquent vraiment : la grille a bien quatre colonnes, les bouteilles ont
bien leur image, l'en-tête est bien visible…

Pourquoi : quand une page s'affiche mal chez quelqu'un et bien partout
ailleurs, la seule question qui compte est « est-ce le site, ou est-ce son
navigateur ? ». Ces deux bancs y répondent — et ils couvrent les deux
grands moteurs, celui de Safari et celui de Chrome.

```bash
python3 outils/tests/webkit.py                    # moteur de Safari, site en ligne
node     outils/tests/chromium.mjs                # moteur de Chrome, site en ligne
python3 outils/tests/webkit.py http://127.0.0.1:8797   # sur une copie locale
```

`webkit.py` n'a besoin de rien (PyObjC est fourni avec macOS).
`chromium.mjs` a besoin de `playwright-core` et d'un Chromium :

```bash
npm install playwright-core
npx playwright install chromium
```

Chaque banc affiche, page par page, l'état des témoins de feuilles puis ses
vérifications, et sort en erreur si l'une d'elles échoue — de quoi le
brancher un jour sur une intégration continue.
