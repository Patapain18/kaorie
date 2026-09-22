import { chromium } from 'playwright-core';
const base = 'http://127.0.0.1:8847';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
p.on('console', m => console.log('  [console]', m.type(), m.text()));
await p.goto(base + '/produit-parfum.html?id=1');
await p.waitForTimeout(800);
// clique la 3e miniature
const thumbs = await p.$$('#product-thumbnails .thumb');
console.log('miniatures:', thumbs.length);
await thumbs[2].click();
await p.waitForTimeout(400);
console.log('URL apres clic  :', p.url());
console.log('affiche         :', await p.evaluate(() => ({
  titre: document.getElementById('product-title').textContent,
  nom:   document.getElementById('product-name').textContent,
  prix:  document.getElementById('product-price').textContent,
  img:   document.getElementById('product-image').className
})));
// crayon Modifier
await p.click('button[aria-label="Modifier"]');
await p.waitForTimeout(500);
await p.fill('#engraving-input', 'Marie');
await p.waitForTimeout(200);
await p.click('#engraving-confirm');
await p.waitForTimeout(900);
console.log('panier localStorage:', await p.evaluate(() => localStorage.getItem('cart')));
const lignes = await p.$$eval('#cart-items .cart-item', els => els.map(e => ({
  vignette: e.querySelector('.cart-item-img').className,
  nom: e.querySelector('h4').textContent,
  prix: e.querySelector('.price').textContent,
  grav: e.querySelector('.cart-item-engraving')?.textContent || ''
})));
console.log('lignes panier   :', JSON.stringify(lignes, null, 1));
// comparaison : bouton normal "Ajouter au panier"
await p.evaluate(() => localStorage.removeItem('cart'));
await p.goto(base + '/produit-parfum.html?id=1');
await p.waitForTimeout(700);
const th2 = await p.$$('#product-thumbnails .thumb');
await th2[2].click();
await p.waitForTimeout(300);
await p.click('#add-cart-btn');
await p.waitForTimeout(400);
console.log('via bouton normal :', await p.evaluate(() => localStorage.getItem('cart')));
await b.close();
