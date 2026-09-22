// BANC DE TEST — MOTEUR CHROMIUM (Chrome, Edge…)
// ==============================================
// Même idée que outils/tests/webkit.py, dans l'autre grand moteur : on
// charge chaque page dans un navigateur vierge et on vérifie que les
// styles s'appliquent. Les deux bancs ensemble disent si un affichage
// raté vient du site (les deux échouent) ou du navigateur de la personne
// (les deux passent).
//
//   node outils/tests/chromium.mjs [adresse de base]
//
// Il faut playwright-core et un Chromium ; le script va le chercher dans
// le cache de Playwright s'il est là.
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';

const BASE = (process.argv[2] || 'https://patapain18.github.io/kaorie').replace(/\/$/, '');

function trouverChromium() {
    if (process.env.CHROME) return process.env.CHROME;
    const cache = `${homedir()}/Library/Caches/ms-playwright`;
    if (!existsSync(cache)) return undefined;
    for (const d of readdirSync(cache).filter(n => n.startsWith('chromium-')).sort().reverse()) {
        for (const c of [`${cache}/${d}/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
                         `${cache}/${d}/chrome-mac/Chromium.app/Contents/MacOS/Chromium`]) if (existsSync(c)) return c;
    }
}

const PAGES = [
    ['accueil', '/index.html', [
        ['la police Fraunces est chargée', () => document.fonts.check('italic 700 24px Fraunces')],
        ['la vidéo est derrière la page', () => getComputedStyle(document.querySelector('.video-bg')).zIndex === '0'],
        ["l'en-tête est visible", () => document.querySelector('.header').getBoundingClientRect().height > 30],
    ]],
    ['parfums', '/parfums.html', [
        ['la grille a quatre colonnes', () => getComputedStyle(document.querySelector('.products-grid')).gridTemplateColumns.split(' ').length === 4],
        ['« click pour ouvrir » est caché', () => getComputedStyle(document.querySelector('.click-label')).display === 'none'],
        ['les bouteilles ont leur image', () => getComputedStyle(document.querySelector('.product-img')).backgroundImage.includes('cut.png')],
    ]],
    ['boissons', '/boissons.html', [
        ['la grille a quatre colonnes', () => getComputedStyle(document.querySelector('.products-grid')).gridTemplateColumns.split(' ').length === 4],
    ]],
    ['top produits', '/top-produits.html', [
        ['huit produits', () => document.querySelectorAll('.top-card').length === 8],
        ['les rangs sont posés au-dessus', () => getComputedStyle(document.querySelector('.top-rank')).position === 'absolute'],
    ]],
    ['fiche parfum', '/produit-parfum.html?id=3', [
        ['la fiche est centrée', () => getComputedStyle(document.querySelector('.product-hero')).display === 'flex'],
        ["l'image du produit est grande", () => document.querySelector('.product-detail-img').getBoundingClientRect().height > 300],
        ['le texte est posé sur la page', () => getComputedStyle(document.querySelector('.product-description-box')).position === 'absolute'],
    ]],
    ['fiche boisson', '/produit-boisson.html?id=2', [
        ["l'image du produit est grande", () => document.querySelector('.product-detail-img').getBoundingClientRect().height > 300],
    ]],
    ['panier', '/panier.html', [
        ['les vignettes ont leur image', () => getComputedStyle(document.querySelector('.product-img')).backgroundImage.includes('cut.png')],
    ]],
    ['contact', '/contact.html', [
        ['le formulaire est encadré', () => getComputedStyle(document.querySelector('.form-container')).borderStyle !== 'none'],
    ]],
];

const navigateur = await chromium.launch({ executablePath: trouverChromium() });
console.log(`Chromium (profil vierge) — ${BASE}\n`);
let total = 0, rates = 0;
for (const [nom, chemin, attentes] of PAGES) {
    const ctx = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on('pageerror', e => erreurs.push(String(e).slice(0, 80)));
    page.on('response', r => { if (r.status() >= 400) erreurs.push(r.status() + ' ' + r.url().split('?')[0].split('/').slice(-1)[0]); });
    page.on('requestfailed', r => erreurs.push('échec ' + r.url().split('/').slice(2, 3)[0]));
    await page.goto(BASE + chemin, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    const temoins = await page.evaluate(() => [].map.call(document.querySelectorAll('style[data-feuille]'),
        e => e.getAttribute('data-feuille') + '=' + (getComputedStyle(document.documentElement).getPropertyValue('--feuille-' + e.getAttribute('data-feuille')).trim() || 'ABSENT')));
    console.log(`  ${nom.padEnd(14)} ${temoins.join('  ')}${erreurs.length ? '  ⚠ ' + [...new Set(erreurs)].join(' | ') : ''}`);
    total++; if (erreurs.length) { rates++; console.log('   ✗ aucune erreur réseau ni JavaScript  [' + [...new Set(erreurs)].join(', ') + ']'); }
    else console.log('   ✓ aucune erreur réseau ni JavaScript');
    for (const [libelle, code] of attentes) {
        total++;
        let ok; try { ok = await page.evaluate(code); } catch (e) { ok = 'erreur: ' + e.message.slice(0, 60); }
        if (ok !== true) rates++;
        console.log((ok === true ? '   ✓ ' : '   ✗ ') + libelle + (ok === true ? '' : `  [${ok}]`));
    }
    await ctx.close();
}
await navigateur.close();
console.log(`\n${total - rates}/${total} vérifications passées${rates ? ` — ${rates} ÉCHEC(S)` : ''}`);
process.exit(rates ? 1 : 0);
