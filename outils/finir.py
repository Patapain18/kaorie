# -*- coding: utf-8 -*-
"""
FINITION DES RENDUS
===================
Prend les rendus Blender (outils/rendus/*.png, 1200×1800, fond transparent)
et fabrique les images du site : découpées au plus près de la bouteille et
de son ombre, ramenées à 1000 px de haut, dans images/<produit>-cut.png —
le nom que le CSS attend (`-cut` : détouré).

Lancer :  python3 outils/finir.py
"""
import pathlib
from PIL import Image

ICI = pathlib.Path(__file__).parent
RENDUS, IMAGES = ICI / 'rendus', ICI.parent / 'images'
HAUTEUR = 1000

for f in sorted(RENDUS.glob('*.png')):
    im = Image.open(f).convert('RGBA')
    # Le sol laisse un voile de quelques pour cent autour de la bouteille (la
    # lumière ambiante qu'elle intercepte) : on le retire, en gardant l'ombre
    # franche du pied — sinon, sur les fonds colorés du site, la bouteille
    # traîne un halo gris rectangulaire.
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 12 else (255 if v > 200 else int((v - 12) * 255 / (200 - 12))))
    im = Image.merge('RGBA', (r, g, b, a))
    # L'ombre portée est très transparente : on ne garde que ce qui compte
    # (alpha > 6 %), sinon la boîte englobante part loin sur la droite.
    a = im.getchannel('A').point(lambda v: 255 if v > 16 else 0)
    x0, y0, x1, y1 = a.getbbox()
    # La bouteille elle-même (alpha franc) donne l'axe : l'image est
    # découpée symétriquement autour de lui, pour que le CSS du site
    # (background-position: center) la centre bien — l'ombre, qui file d'un
    # côté, est compensée par du vide de l'autre.
    bx0, _, bx1, _ = im.getchannel('A').point(lambda v: 255 if v > 200 else 0).getbbox()
    axe = (bx0 + bx1) / 2
    # Largeur : la bouteille plus 15 % de chaque côté. L'ombre au pied déborde
    # un peu plus loin, très pâle : on la coupe là, sinon l'image s'élargit
    # pour rien et le CSS (background-size: contain) rapetisse la bouteille.
    demi = (bx1 - bx0) / 2 * 1.3
    marge = int((y1 - y0) * 0.03)
    im = im.crop((max(0, int(axe - demi) - marge), max(0, y0 - marge), min(im.width, int(axe + demi) + marge), min(im.height, y1 + marge)))
    im = im.resize((round(im.width * HAUTEUR / im.height), HAUTEUR), Image.LANCZOS)
    sortie = IMAGES / f'{f.stem}-cut.png'
    im.save(sortie, optimize=True)
    print(f'{sortie.name:28} {im.width}×{im.height}  {sortie.stat().st_size // 1024} Ko')
