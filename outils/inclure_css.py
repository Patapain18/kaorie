# -*- coding: utf-8 -*-
"""
LES FEUILLES DE STYLE, POSÉES DANS LES PAGES
============================================
Chez Mathis, Safari ressortait une copie inutilisable de la feuille propre
à la page (catalog.css, product.css…) : les pages s'affichaient sans mise
en page, et même un rechargement forcé ne suffisait pas toujours. Le
serveur, lui, envoie les bons fichiers (vérifié, toutes compressions
confondues), et tous les autres navigateurs vont bien.

Plutôt que de continuer à lutter contre un cache qu'on ne peut pas
inspecter, on supprime le problème : le CSS n'est plus un fichier à part
que le navigateur doit aller chercher, il est écrit DANS la page. Une
page qui arrive, arrive avec sa mise en page.

Les fichiers `css/*.css` restent la source : c'est là qu'on écrit. Ce
script recopie leur contenu dans les pages.

    python3 outils/inclure_css.py          # après CHAQUE modification d'un CSS

Détail qui compte : dans `css/x.css`, une image s'écrit `../images/y.png`
(un cran au-dessus du dossier css). Une fois le CSS dans une page posée à
la racine, ce chemin doit devenir `images/y.png` — le script s'en charge.
"""
import pathlib, re, sys, datetime

ICI = pathlib.Path(__file__).parent.parent
DEBUT = '<!-- feuille:{nom} -->'
FIN = '<!-- /feuille:{nom} -->'

def bloc(nom):
    """Le contenu d'une feuille, prêt à être posé dans une page."""
    css = (ICI / 'css' / f'{nom}.css').read_text(encoding='utf-8')
    css = css.replace("url('../images/", "url('images/")   # la page est à la racine
    return f'{DEBUT.format(nom=nom)}\n    <style data-feuille="{nom}">\n{css}\n    </style>\n    {FIN.format(nom=nom)}'

def feuilles_de(page_html):
    """Les feuilles que la page demande, dans l'ordre : d'abord les <link>
    (première inclusion), ensuite les blocs déjà posés (mises à jour)."""
    noms = re.findall(r'<link rel="stylesheet" href="css/([a-z-]+)\.css[^"]*"\s*/?>', page_html)
    noms += [n for n in re.findall(r'<!-- feuille:([a-z-]+) -->', page_html) if n not in noms]
    return noms

def poser(page):
    s = page.read_text(encoding='utf-8')
    noms = feuilles_de(s)
    if not noms: return None
    for nom in noms:
        b = bloc(nom)
        motif_existant = re.compile(re.escape(DEBUT.format(nom=nom)) + r'.*?' + re.escape(FIN.format(nom=nom)), re.S)
        if motif_existant.search(s):
            s = motif_existant.sub(lambda m: b, s)          # mise à jour
        else:
            lien = re.compile(r'[ \t]*<link rel="stylesheet" href="css/' + nom + r'\.css[^"]*"\s*/?>\n')
            s = lien.sub('    ' + b + '\n', s, count=1)      # première inclusion
    page.write_text(s, encoding='utf-8')
    return noms

def marquer_version(version):
    """Écrit la version du site dans `version.txt` et dans chaque page.

    À quoi ça sert : un navigateur peut resservir une vieille copie d'une
    page, complète et cohérente — impossible à distinguer de l'intérieur.
    Chaque page porte donc sa version, et demande au serveur celle du
    moment (`version.txt`, jamais mise en cache). Si les deux diffèrent,
    la page sait qu'elle est périmée et se redemande."""
    (ICI / 'version.txt').write_text(version + '\n', encoding='utf-8')
    for page in sorted(ICI.glob('*.html')):
        s = page.read_text(encoding='utf-8')
        if '<meta name="version"' in s:
            s = re.sub(r'<meta name="version" content="[^"]*">', f'<meta name="version" content="{version}">', s)
        else:
            s = s.replace('<meta name="viewport"', f'<meta name="version" content="{version}">\n    <meta name="viewport"', 1)
        page.write_text(s, encoding='utf-8')

if __name__ == '__main__':
    for page in sorted(ICI.glob('*.html')):
        noms = poser(page)
        print(f'{page.name:24} {", ".join(noms) if noms else "aucune feuille"}')
    version = datetime.datetime.now().strftime('%Y-%m-%d-%H%M')
    marquer_version(version)
    print(f'\nversion du site : {version}  (version.txt + les douze pages)')
