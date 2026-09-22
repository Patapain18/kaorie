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


## Les feuilles de style sont posées dans les pages

Depuis le 22/09/2026, les pages ne vont plus chercher `css/*.css` : le CSS
est écrit directement dans chaque page (un `<style>` par feuille). Raison :
sur le Mac de Mathis, Safari resservait une copie inutilisable de la feuille
propre à la page — le site s'affichait sans mise en page, et le serveur,
lui, était irréprochable (vérifié dans toutes les compressions, et dans un
moteur Safari au cache vierge).

**Les fichiers `css/*.css` restent la source : c'est là qu'on écrit.** Après
chaque modification :

```bash
python3 outils/inclure_css.py
```

Le script recopie le contenu à jour dans les douze pages, entre les repères
`<!-- feuille:nom -->` et `<!-- /feuille:nom -->`, et corrige au passage les
chemins d'images (`../images/…` devient `images/…`, puisque la page est à la
racine et non dans `css/`).

Il **marque aussi la version du site** : l'heure de son passage, écrite dans
`version.txt` et dans chaque page. C'est ce qui permet à une page de savoir
qu'elle est périmée — elle demande au serveur la version du moment (un
fichier qu'on interdit de mettre en cache), la compare à la sienne, et se
redemande si elles diffèrent. À lancer donc **avant chaque publication**,
même si aucun CSS n'a bougé.
