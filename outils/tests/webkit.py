# -*- coding: utf-8 -*-
"""
BANC DE TEST — MOTEUR WEBKIT (celui de Safari)
==============================================
Charge chaque page dans une vraie WKWebView — le moteur de Safari, mais
avec un profil vierge : aucun cache, aucune extension, aucun réglage —
et vérifie que les styles sont bien appliqués.

Pourquoi ce banc : quand une page s'affiche mal chez quelqu'un et bien
partout ailleurs, il faut pouvoir répondre à « est-ce le site, ou est-ce
son navigateur ? ». Si WebKit vierge dit que tout va bien, le site est
hors de cause.

    python3 outils/tests/webkit.py [adresse de base]

Sans adresse, teste le site en ligne. Exemple avec une copie locale :
    python3 outils/tests/webkit.py http://127.0.0.1:8797
"""
import sys, time, json
from Foundation import NSURL, NSURLRequest, NSRunLoop, NSDate, NSMakeRect
from AppKit import NSApplication, NSWindow, NSBackingStoreBuffered, NSApplicationActivationPolicyRegular
from WebKit import WKWebView, WKWebViewConfiguration, WKWebsiteDataStore

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'https://patapain18.github.io/kaorie').rstrip('/')

# Ce qu'on vérifie sur chaque page : un nom, l'adresse, et des attentes
# écrites en JavaScript qui doivent toutes répondre vrai.
PAGES = [
    ('accueil',      '/index.html', [
        ("la vidéo est derrière la page", "getComputedStyle(document.querySelector('.video-bg')).zIndex === '0'"),
        ("l'en-tête est visible",         "document.querySelector('.header').getBoundingClientRect().height > 30"),
    ]),
    ('parfums',      '/parfums.html', [
        ("la grille a quatre colonnes",   "getComputedStyle(document.querySelector('.products-grid')).gridTemplateColumns.split(' ').length === 4"),
        ("« click pour ouvrir » est caché", "getComputedStyle(document.querySelector('.click-label')).display === 'none'"),
        ("les bouteilles ont leur image", "getComputedStyle(document.querySelector('.product-img')).backgroundImage.includes('cut.png')"),
    ]),
    ('boissons',     '/boissons.html', [
        ("la grille a quatre colonnes",   "getComputedStyle(document.querySelector('.products-grid')).gridTemplateColumns.split(' ').length === 4"),
    ]),
    ('top produits', '/top-produits.html', [
        ("huit produits",                 "document.querySelectorAll('.top-card').length === 8"),
        ("les rangs sont posés au-dessus", "getComputedStyle(document.querySelector('.top-rank')).position === 'absolute'"),
    ]),
    ('fiche parfum', '/produit-parfum.html?id=3', [
        ("la fiche est centrée",          "getComputedStyle(document.querySelector('.product-hero')).display === 'flex'"),
        ("l'image du produit est grande", "document.querySelector('.product-detail-img').getBoundingClientRect().height > 300"),
        ("le texte est posé sur la page", "getComputedStyle(document.querySelector('.product-description-box')).position === 'absolute'"),
    ]),
    ('fiche boisson', '/produit-boisson.html?id=2', [
        ("l'image du produit est grande", "document.querySelector('.product-detail-img').getBoundingClientRect().height > 300"),
    ]),
    ('panier',       '/panier.html', [
        ("les vignettes ont leur image",  "getComputedStyle(document.querySelector('.product-img')).backgroundImage.includes('cut.png')"),
    ]),
    ('contact',      '/contact.html', [
        ("le formulaire est encadré",     "getComputedStyle(document.querySelector('.form-container')).borderStyle !== 'none'"),
    ]),
]

FEUILLES = "[].map.call(document.querySelectorAll('style[data-feuille], link[rel=\"stylesheet\"][href*=\"css/\"]'), e => e.getAttribute('data-feuille') || e.getAttribute('href'))"
TEMOINS = "[].map.call(document.querySelectorAll('style[data-feuille]'), e => e.getAttribute('data-feuille')).map(n => n + '=' + (getComputedStyle(document.documentElement).getPropertyValue('--feuille-' + n).trim() || 'ABSENT'))"

def tourner(secondes):
    fin = time.time() + secondes
    while time.time() < fin:
        NSRunLoop.currentRunLoop().runUntilDate_(NSDate.dateWithTimeIntervalSinceNow_(0.05))

def tester(vue, chemin, attentes):
    vue.loadRequest_(NSURLRequest.requestWithURL_(NSURL.URLWithString_(BASE + chemin)))
    tourner(6)
    js = "JSON.stringify({feuilles: %s, temoins: %s, resultats: [%s], titre: document.title})" % (
        FEUILLES, TEMOINS,
        ','.join("(function(){try{return !!(%s)}catch(e){return 'erreur: '+e.message}})()" % code for _, code in attentes))
    reponse = {}
    vue.evaluateJavaScript_completionHandler_(js, lambda r, e: reponse.update(r=r, e=e))
    tourner(2.5)
    return json.loads(reponse.get('r') or '{}')

app = NSApplication.sharedApplication(); app.setActivationPolicy_(NSApplicationActivationPolicyRegular)
cfg = WKWebViewConfiguration.alloc().init()
cfg.setWebsiteDataStore_(WKWebsiteDataStore.nonPersistentDataStore())      # profil vierge
fen = NSWindow.alloc().initWithContentRect_styleMask_backing_defer_(NSMakeRect(40, 40, 1280, 900), 15, NSBackingStoreBuffered, False)
vue = WKWebView.alloc().initWithFrame_configuration_(NSMakeRect(0, 0, 1280, 900), cfg)
fen.setContentView_(vue); fen.makeKeyAndOrderFront_(None)

print(f'WebKit (moteur de Safari, profil vierge) — {BASE}\n')
total = rates = 0
for nom, chemin, attentes in PAGES:
    r = tester(vue, chemin, attentes)
    if not r:
        print(f'  {nom:14} ⚠ pas de réponse'); rates += 1; continue
    lignes = []
    for (libelle, _), ok in zip(attentes, r['resultats']):
        total += 1
        if ok is not True: rates += 1
        lignes.append(('   ✓ ' if ok is True else '   ✗ ') + libelle + ('' if ok is True else f'  [{ok}]'))
    print(f'  {nom:14} {"  ".join(r["temoins"])}')
    print('\n'.join(lignes))
fen.close()
print(f'\n{total - rates}/{total} vérifications passées' + ('' if rates == 0 else f' — {rates} ÉCHEC(S)'))
sys.exit(1 if rates else 0)
