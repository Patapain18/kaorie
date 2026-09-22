# Les outils

Ce dossier fabrique les visuels des produits. Rien ici n'est chargé par le
site : ce sont les scripts qui produisent `images/*-cut.png`.

## Pourquoi

Les visuels de la version d'école étaient des photos de produits du commerce
retouchées. Pour la version publique, chaque bouteille est modelée et rendue
par nous, en code — un seul studio pour les huit, c'est ce qui en fait une
gamme.

## La chaîne

1. `extraire_logo.py` — le logo Kaorie est le dessin d'origine de Mathis et
   Léa ; il n'existait que sur les visuels de la version d'école, ce script
   le récupère proprement sur le plus grand d'entre eux (contour isolé,
   remplissage depuis l'extérieur, balance des blancs, sortie à 2× dans
   `etiquettes/logo.png`). Une version vectorisée existe aussi
   (`etiquettes/logo-vecteur.svg`), non utilisée : trop lisse, on préfère le dessin.
2. `etiquettes/etiquettes.py` — écrit une page HTML par étiquette (les vraies
   polices du site, Fraunces et Inter, depuis Google Fonts) et la capture avec
   Chrome headless, fond transparent, à 2×. Sortie : `etiquettes/sortie/`.
3. `bouteilles.py` — Blender (5.1, Cycles, GPU Metal). Construit le flacon ou
   la bouteille en géométrie pure (bmesh), le liquide avec la recette
   verre/liquide (IOR relatif), l'étiquette imprimée dans le matériau du verre
   (flacons) ou en ruban papier (boissons), un studio à quatre lampes et un
   sol qui ne garde que l'ombre. Sortie : `rendus/` (1200 × 1800, RGBA,
   hors dépôt : ~35 s par image, elles se refont).
4. `finir.py` — découpe chaque rendu autour de la bouteille, centré sur son
   axe, et l'écrit à 1000 px de haut dans `images/<produit>-cut.png`.

```bash
python3 outils/etiquettes/etiquettes.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python outils/bouteilles.py
python3 outils/finir.py
```

`--rapide` après `--` chez Blender rend en demi-résolution, pour vérifier une
composition ; un ou plusieurs noms de produits limitent le rendu à ceux-là.
