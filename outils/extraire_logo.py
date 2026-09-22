# -*- coding: utf-8 -*-
"""
LE LOGO, EXTRAIT DU DESSIN D'ORIGINE
====================================
Le logo Kaorie n'existe pas en fichier à part : il n'a jamais vécu que sur
les visuels de la version d'école. Ce script le récupère sur le plus grand
d'entre eux (le flacon blanc, 1024 × 1536), proprement :

1. le trait noir du contour est isolé (pixels sombres), puis légèrement
   refermé pour boucher les trous du trait ;
2. tout ce qui touche le bord de l'image sans traverser le trait est
   l'extérieur ; le reste, c'est le logo — on garde sa plus grande pièce ;
3. le verre teintait tout en jaune pâle : la couleur du fond juste autour
   du disque sert de blanc de référence (balance des blancs) ;
4. alpha adouci d'un pixel, sortie à 2× un peu accentuée →
   outils/etiquettes/logo.png.

Lancer :  python3 outils/extraire_logo.py <visuel d'origine>
"""
import sys, pathlib
from collections import deque
from PIL import Image, ImageFilter
import numpy as np

SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/Users/Mathis/Downloads/Parfum blanc.png')
OUT = pathlib.Path(__file__).parent / 'etiquettes' / 'logo.png'

src = Image.open(SRC).convert('RGB'); w, h = src.size
crop = src.crop((int(w * 0.30), int(h * 0.40), int(w * 0.70), int(h * 0.66)))   # large autour du logo
a = np.array(crop).astype(int)
noir = a.max(axis=2) < 95
noir = np.array(Image.fromarray((noir * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))) > 0

def composantes(m):
    """Étiquette les composantes 4-connexes d'un masque ; renvoie (labels, tailles)."""
    H, W = m.shape; lab = np.zeros(m.shape, int); tailles = {}
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n = len(tailles) + 1; lab[y, x] = n; q = deque([(y, x)]); t = 0
                while q:
                    cy, cx = q.popleft(); t += 1
                    for ny, nx in ((cy+1, cx), (cy-1, cx), (cy, cx+1), (cy, cx-1)):
                        if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
                tailles[n] = t
    return lab, tailles

# l'extérieur : les composantes du « non-trait » qui touchent le bord
lab, tailles = composantes(~noir)
bord = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1]); bord.discard(0)
ext = np.isin(lab, list(bord))
lab2, t2 = composantes(~ext)
mask = lab2 == max(t2, key=t2.get)
ys, xs = np.where(mask); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()

anneau = ext & (np.array(Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.MaxFilter(15))) > 0)
ref = np.median(a[anneau], axis=0)
corr = np.clip(a * (255.0 / ref), 0, 255).astype('uint8')
out = Image.fromarray(corr).convert('RGBA')
out.putalpha(Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.7)))
out = out.crop((x0 - 2, y0 - 2, x1 + 3, y1 + 3))
big = out.resize((out.width * 2, out.height * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.5, percent=60, threshold=2))
big.save(OUT)
print(f'logo : {x1 - x0 + 1}×{y1 - y0 + 1} px dans {SRC.name} → {OUT} ({big.width}×{big.height})')
