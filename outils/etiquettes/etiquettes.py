# -*- coding: utf-8 -*-
"""
LES ÉTIQUETTES
==============
Fabrique les huit étiquettes (quatre parfums, quatre boissons) en PNG, avec les
vraies polices du site (Fraunces, Inter — chargées depuis Google Fonts).

Comment : chaque étiquette est une petite page HTML, capturée par Chrome en
mode headless avec un fond transparent. Le navigateur fait le travail de
typographie et de rendu du SVG ; on récupère l'image à 2× pour qu'elle reste
nette une fois plaquée sur la bouteille.

Lancer :  python3 outils/etiquettes/etiquettes.py
Sortie :  outils/etiquettes/sortie/<produit>.png
"""
import pathlib, subprocess, glob, sys

ICI = pathlib.Path(__file__).parent
SORTIE = ICI / 'sortie'; SORTIE.mkdir(exist_ok=True)
LOGO = (ICI / 'logo.svg').read_text()
CHROME = sorted(glob.glob('/Users/Mathis/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]

POLICES = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,800;1,9..144,700;1,9..144,800&family=Inter:wght@400;500;600;700&display=swap">'

# Les quatre parfums : nom, couleur du texte sur le verre (encre ou doré
# pour le flacon noir), et une ligne de composition tirée des fiches du site.
PARFUMS = [
    ('parfum-blanc', 'Rose Velours', '#1b1a17', 'rose · pivoine · musc'),
    ('parfum-jaune', 'Bois Précieux', '#1b1a17', 'santal · cèdre · vanille'),
    ('parfum-noir',  'Nuit d’Orient', '#e6c77a', 'ambre · oud · épices'),
    ('parfum-bleu',  'Brise Marine',  '#1b1a17', 'agrumes · iodé · frais'),
]
# Les quatre boissons : nom, couleur de la bande, et les tags du site.
BOISSONS = [
    ('boisson-citron',    'Citron',           '#ffd84f', 'agrumes · miel · pétillant'),
    ('boisson-framboise', 'Framboise',        '#ff7a9c', 'cassis · violette · fruité'),
    ('boisson-gingembre', 'Gingembre',        '#f5a623', 'curcuma · cardamome · miel'),
    ('boisson-menthe',    'Thé vert · Menthe','#4cc23b', 'menthe · basilic · concombre'),
]

def page(largeur, hauteur, corps, css):
    return f'''<!doctype html><html><head><meta charset="utf-8">{POLICES}
<style>
  html, body {{ margin: 0; background: transparent; }}
  body {{ width: {largeur}px; height: {hauteur}px; overflow: hidden; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }}
  .logo svg {{ display: block; width: 100%; height: 100%; }}
  .u {{ text-transform: none; }}   /* les unités restent en minuscules */
  {css}
</style></head><body>{corps}</body></html>'''

def parfum(slug, nom, encre, notes):
    # Imprimée directement sur le verre : pas de fond, tout est centré.
    css = f'''
  .etq {{ width: 800px; height: 1000px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; color: {encre}; text-align: center; }}
  .logo {{ width: 300px; height: 300px; }}
  h1 {{ font-family: 'Fraunces', serif; font-style: italic; font-weight: 700; font-variation-settings: 'opsz' 144; font-size: 168px; letter-spacing: -0.03em; margin: 24px 0 26px; line-height: 1; }}
  .nom {{ font-weight: 600; font-size: 42px; letter-spacing: 0.28em; text-transform: uppercase; margin-left: 0.28em; }}
  .notes {{ font-weight: 500; font-size: 30px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.85; margin: 18px 0 0; margin-left: 0.18em; }}
  .type {{ font-weight: 500; font-size: 24px; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.85; margin-top: 56px; margin-left: 0.22em; }}
'''
    corps = f'''<div class="etq"><div class="logo">{LOGO}</div><h1>Kaorie</h1>
  <div class="nom">{nom}</div><div class="notes">{notes}</div><div class="type">Eau de parfum · 50 <span class="u">ml</span></div></div>'''
    return page(800, 1000, corps, css)

def boisson(slug, nom, bande, notes):
    # Une étiquette papier qui fait le tour de la bouteille : le motif est au
    # centre (c'est la face avant), les bords restent unis.
    css = f'''
  .etq {{ position: relative; width: 1800px; height: 800px; background: #fff8ea; color: #1b1a17; overflow: hidden; }}
  .bande {{ position: absolute; left: 0; right: 0; top: 0; height: 64px; background: {bande}; }}
  .bande.bas {{ top: auto; bottom: 0; height: 26px; }}
  .avant {{ position: absolute; left: 50%; top: 64px; bottom: 26px; width: 760px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }}
  .marque {{ font-family: 'Fraunces', serif; font-style: italic; font-weight: 700; font-variation-settings: 'opsz' 144; font-size: 92px; letter-spacing: -0.03em; line-height: 1; }}
  .logo {{ width: 230px; height: 230px; margin: 22px 0 18px; }}
  h1 {{ font-family: 'Fraunces', serif; font-weight: 800; font-variation-settings: 'opsz' 144; font-size: 96px; line-height: 1; margin: 0; letter-spacing: -0.02em; text-transform: uppercase; white-space: nowrap; }}
  h1.long {{ font-size: 64px; line-height: 1.05; white-space: normal; }}
  .sous {{ font-weight: 600; font-size: 28px; letter-spacing: 0.3em; text-transform: uppercase; margin: 22px 0 0; margin-left: 0.3em; }}
  .notes {{ font-weight: 400; font-size: 24px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.62; margin: 12px 0 0; }}
  .cote {{ position: absolute; top: 50%; transform: translateY(-50%) rotate(-90deg); font-weight: 600; font-size: 26px; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.55; white-space: nowrap; }}
  .cote.g {{ left: 120px; }} .cote.d {{ right: 120px; transform: translateY(-50%) rotate(90deg); }}
'''
    corps = f'''<div class="etq"><div class="bande"></div><div class="bande bas"></div>
  <div class="cote g">Boisson pétillante · 25 <span class="u">cl</span></div><div class="cote d">Kaorie · Parfums &amp; Boissons</div>
  <div class="avant"><div class="marque">Kaorie</div><div class="logo">{LOGO}</div><h1 class="{'long' if len(nom) > 10 else ''}">{nom.replace(' · ', '<br>')}</h1>
  <div class="sous">Boisson pétillante</div><div class="notes">{notes}</div></div></div>'''
    return page(1800, 800, corps, css)

def capturer(slug, html, largeur, hauteur):
    f = SORTIE / f'{slug}.html'; f.write_text(html, encoding='utf-8')
    png = SORTIE / f'{slug}.png'
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
                    '--default-background-color=00000000', '--force-device-scale-factor=2',
                    f'--window-size={largeur},{hauteur}', '--virtual-time-budget=8000',
                    f'--screenshot={png}', f'file://{f}'], check=True, capture_output=True)
    print('étiquette', png.name)

if __name__ == '__main__':
    voulus = sys.argv[1:]
    for slug, nom, encre, notes in PARFUMS:
        if not voulus or slug in voulus: capturer(slug, parfum(slug, nom, encre, notes), 800, 1000)
    for slug, nom, bande, notes in BOISSONS:
        if not voulus or slug in voulus: capturer(slug, boisson(slug, nom, bande, notes), 1800, 800)
