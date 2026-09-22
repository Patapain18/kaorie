


/* ======================================================================
   1. LOADER D'INTRO
   Anime le remplissage du nom 'Kaorie' au démarrage (Mathis)
   =================================================================== */

(function initLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;

    if (sessionStorage.getItem('kaorieLoaded')) {
        loader.remove();
        return;
    }

    const logo = loader.querySelector('.loader-logo');
    let progress = 0;

    const interval = setInterval(() => {
        
        progress += Math.random() * 6 + 2;
        if (progress >= 100) progress = 100;

        if (logo) logo.style.setProperty('--loader-progress', progress + '%');

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                loader.classList.add('hide');
                sessionStorage.setItem('kaorieLoaded', 'true');
                document.documentElement.classList.remove('loader-active');
                
                setTimeout(() => loader.remove(), 1000);
            }, 600);
        }
    }, 80);
})();


/* ======================================================================
   2. DONNÉES PRODUITS
   Liste centrale des 8 produits (4 parfums + 4 boissons)
   =================================================================== */

const ALL_PRODUCTS = [
    { img: 'parfum-1',  name: 'Rose Velours',      type: 'parfum',  id: 1 },
    { img: 'parfum-2',  name: 'Bois Précieux',     type: 'parfum',  id: 2 },
    { img: 'parfum-3',  name: "Nuit d'Orient",     type: 'parfum',  id: 3 },
    { img: 'parfum-4',  name: 'Brise Marine',      type: 'parfum',  id: 4 },
    { img: 'boisson-1', name: 'Gingembre',         type: 'boisson', id: 1 },
    { img: 'boisson-2', name: 'Thé Vert Menthe',   type: 'boisson', id: 2 },
    { img: 'boisson-3', name: 'Citron',            type: 'boisson', id: 3 },
    { img: 'boisson-4', name: 'Framboise',         type: 'boisson', id: 4 }
];


/* ======================================================================
   3. TRACKING DES CLICS
   Compte les clics produit pour calculer le top 4 (Mathis)
   =================================================================== */

const CLICKS_KEY = 'kaorieProductClicks';

function getProductClicks() {
    
    try {
        return JSON.parse(localStorage.getItem(CLICKS_KEY) || '{}');
    } catch (e) {
        return {};
    }
}

function trackProductClick(productImg) {
    const clicks = getProductClicks();
    clicks[productImg] = (clicks[productImg] || 0) + 1;
    localStorage.setItem(CLICKS_KEY, JSON.stringify(clicks));
}

function initProductClickTracking() {
    document.querySelectorAll('a.bottle-card[href*="produit-"]').forEach(link => {
        if (link.dataset.clickTracked) return;        
        link.dataset.clickTracked = 'true';
        link.addEventListener('click', () => {
            const href = link.getAttribute('href');
            const match = href.match(/produit-(\w+)\.html\?id=(\d+)/);
            if (match) {
                trackProductClick(`${match[1]}-${match[2]}`);
            }
        });
    });
}


/* ======================================================================
   4. SÉLECTEUR DE THÈMES
   Filtrage produits par catégorie (SAE 203 annexe 2 — dead code mais conservé)
   =================================================================== */

function renderThemeGrid(theme = 'all') {
    const grid = document.getElementById('theme-grid');
    if (!grid) return;

    const filtered = theme === 'all'
        ? ALL_PRODUCTS
        : ALL_PRODUCTS.filter(p => p.type === theme);

    grid.innerHTML = filtered.map(p => `
        <a href="produit-${p.type}.html?id=${p.id}" class="theme-card product-card bottle-card">
            <div class="theme-card-img product-img ${p.img}"></div>
            <span class="theme-card-cat">${p.type === 'parfum' ? 'Parfum' : 'Boisson'}</span>
            <span class="theme-card-name">${p.name}</span>
        </a>
    `).join('');

    initProductClickTracking();
}

function initThemeTabs() {
    const tabs = document.getElementById('theme-tabs');
    if (!tabs) return;

    tabs.querySelectorAll('.theme-tab').forEach(tab => {
        if (tab.dataset.wired) return;
        tab.dataset.wired = 'true';
        tab.addEventListener('click', () => {
            
            tabs.querySelectorAll('.theme-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderThemeGrid(tab.dataset.theme);
        });
    });

    renderThemeGrid('all');
}


/* ======================================================================
   5. PODIUM TOP 4
   Trie ALL_PRODUCTS par nombre de clics, affiche les 4 premiers avec badges (Mathis)
   =================================================================== */

/** Place d'un produit quand aucun n'a encore été cliqué : parfum 1,
 *  boisson 1, parfum 2, boisson 2… (le rang vient de l'id, le décalage
 *  du type, pour alterner les deux familles). */
function ordreParDefaut(produit) {
    return produit.id * 2 + (produit.type === 'boisson' ? 1 : 0);
}

function renderTopProducts() {
    const grid = document.getElementById('top-products-grid');
    if (!grid) return;

    const clicks = getProductClicks();

    // Tous les produits, du plus cliqué au moins cliqué. Tant que personne
    // n'a rien cliqué, le classement reste l'ordre de la liste : on alterne
    // donc parfum / boisson pour que la page ne montre pas quatre parfums
    // puis quatre boissons.
    const sorted = [...ALL_PRODUCTS].sort((a, b) => {
        const ecart = (clicks[b.img] || 0) - (clicks[a.img] || 0);
        if (ecart !== 0) return ecart;
        return ordreParDefaut(a) - ordreParDefaut(b);
    });

    grid.innerHTML = sorted.map((p, i) => `
        <a href="produit-${p.type}.html?id=${p.id}" class="product-card bottle-card top-card">
            <span class="top-rank">#${i + 1}</span>
            <div class="product-img ${p.img}">
                <span class="product-label bottle-name">${p.name}</span>
            </div>
        </a>
    `).join('');

    initProductClickTracking();
}

renderTopProducts();
initThemeTabs();
initProductClickTracking();

document.addEventListener('DOMContentLoaded', () => {
    renderTopProducts();
    initThemeTabs();
    initProductClickTracking();
});


/* ======================================================================
   6. PANIER — DONNÉES & STOCKAGE
   Gestion du panier dans localStorage (Léa)
   =================================================================== */

const PRODUCT_NAMES = {
    'parfum-1':  'Rose Velours',
    'parfum-2':  'Bois Précieux',
    'parfum-3':  "Nuit d'Orient",
    'parfum-4':  'Brise Marine',
    'boisson-1': 'Gingembre',
    'boisson-2': 'Thé Vert Menthe',
    'boisson-3': 'Citron',
    'boisson-4': 'Framboise'
};

function getProductDisplayName(item) {
    return PRODUCT_NAMES[item.img] || item.nom || 'Produit';
}

function getProductCategory(item) {
    if (!item.img) return '';
    return item.img.startsWith('parfum') ? 'Parfum' : 'Boisson';
}

function getCart() {
    const data = localStorage.getItem('cart');
    return data ? JSON.parse(data) : [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('#cart-count').forEach(el => el.textContent = total);
}


/* ======================================================================
   7. PANIER — AJOUT & RECHERCHE D'ITEMS
   Items gravés = lignes séparées (Léa + Mathis pour gravure)
   =================================================================== */

function findCartItemIndex(cart, produit) {
    const grav = (produit.engraving || '').trim();
    return cart.findIndex(item =>
        item.img === produit.img &&
        (item.engraving || '').trim() === grav
    );
}

function addToCart(produit) {
    const cart = getCart();
    
    const idx = findCartItemIndex(cart, produit);

    if (idx >= 0) {
        cart[idx].qty += 1;
    } else {
        cart.push({ ...produit, qty: 1 });
    }
    saveCart(cart);
    
    const suffix = produit.engraving ? ` (gravé : « ${produit.engraving} »)` : '';
    showToast(`${getProductDisplayName(produit)} ajouté au panier${suffix}`);
}


/* ======================================================================
   8. PANIER — AFFICHAGE
   Rend les items du panier dans le drawer (Léa)
   =================================================================== */

function renderCart() {
    const container = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    if (!container) { updateCartCount(); return; }

    const cart = getCart();
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px 10px; color:var(--gray);">
                <div style="font-size:40px; margin-bottom:10px;">&#128722;</div>
                <p>Votre panier est vide</p>
            </div>`;
        if (subtotalEl) subtotalEl.textContent = '0 €';
        updateCartCount();
        return;
    }

    let subtotal = 0;
    cart.forEach((item, index) => {
        subtotal += item.prix * item.qty;
        const displayName = getProductDisplayName(item);
        const category    = getProductCategory(item);
        const div = document.createElement('div');
        div.className = 'cart-item';
        
        const engravingMarkup = item.engraving
            ? `<span class="cart-item-engraving">« ${item.engraving} »</span>`
            : '';

        div.innerHTML = `
            <div class="cart-item-img ${item.img || item.type}"></div>
            <div class="cart-item-info">
                <div>
                    <span class="cart-item-category">${category}</span>
                    <h4>${displayName}</h4>
                    ${engravingMarkup}
                    <div class="price">${item.prix} €</div>
                </div>
                <div class="qty-control">
                    <button onclick="changeQty(${index}, -1)" aria-label="Diminuer">−</button>
                    <span>${item.qty}</span>
                    <button onclick="changeQty(${index}, 1)" aria-label="Augmenter">+</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    if (subtotalEl) subtotalEl.textContent = subtotal + ' €';
    updateCartCount();
}


/* ======================================================================
   9. PANIER — MODIFICATION QUANTITÉ
   Boutons +/- et vidage du panier (Léa)
   =================================================================== */

function changeQty(index, delta) {
    const cart = getCart();
    if (!cart[index]) return;

    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart(cart);
    renderCart();
}

function clearCart() {
    if (confirm('Vider votre panier ?')) {
        localStorage.removeItem('cart');
        renderCart();
    }
}

document.addEventListener('click', (e) => {
    if (e.target.closest('#clear-cart')) {
        e.preventDefault();
        
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    }
});

document.addEventListener('click', (e) => {
    if (e.target.closest('#checkout-btn')) {
        const cart = getCart();
        if (cart.length === 0) {
            showToast('Votre panier est vide');
            return;
        }
        showToast('Merci pour votre commande !');
        setTimeout(() => {
            localStorage.removeItem('cart');
            renderCart();
        }, 1500);
    }
});


/* ======================================================================
   10. PAGE PRODUIT DÉTAIL
   Carrousel + miniatures + tailles + favoris + ajout panier (Mathis — annexe 3 SAE 203)
   =================================================================== */

function initProductDetail(produits, type) {
    const params = new URLSearchParams(window.location.search);
    let currentId = parseInt(params.get('id')) || 1;

    let basePrice = produits.find(p => p.id === currentId)?.prix || 0;

    function renderThumbnails() {
        const thumbContainer = document.getElementById('product-thumbnails');
        if (!thumbContainer) return;
        thumbContainer.innerHTML = produits.map(p => `
            <div class="thumb ${p.id === currentId ? 'active' : ''} ${p.img}"
                 data-id="${p.id}" aria-label="${p.nom}"></div>
        `).join('');

        thumbContainer.querySelectorAll('.thumb').forEach(t => {
            t.addEventListener('click', () => {
                currentId = parseInt(t.dataset.id);
                render();
            });
        });
    }

    function render() {
        const produit = produits.find(p => p.id === currentId) || produits[0];
        basePrice = produit.prix;

        document.getElementById('product-title').textContent = produit.nom;
        document.getElementById('product-description').textContent = produit.desc;

        const nameEl = document.getElementById('product-name');
        if (nameEl) {
            nameEl.textContent = PRODUCT_NAMES[produit.img] || produit.nom;
        }

        const imgEl = document.getElementById('product-image');
        imgEl.className = 'product-detail-img';
        imgEl.classList.add(produit.img);

        const mainEl = document.getElementById('product-main');
        const PRODUCT_COLORS = {
            'parfum-1':  '#ffd7c8',
            'parfum-2':  '#ffe9a0',
            'parfum-3':  '#dec8f0',
            'parfum-4':  '#ffe1d8',
            'boisson-1': '#ffd9b3',
            'boisson-2': '#d8efa8',
            'boisson-3': '#fff2b3',
            'boisson-4': '#fbcce0'
        };
        const color = PRODUCT_COLORS[produit.img] || '#fef6e9';

        if (mainEl) mainEl.setAttribute('data-product', produit.img);
        document.body.setAttribute('data-product', produit.img);
        document.documentElement.style.backgroundColor = color;
        document.body.style.backgroundColor = color;

        imgEl.style.animation = 'none';
        imgEl.offsetHeight;
        imgEl.style.animation = '';

        const thumbs = document.querySelectorAll('.thumb');
        thumbs.forEach(t => {
            t.classList.toggle('active', parseInt(t.dataset.id) === currentId);
        });

        updatePriceForSize();

        updateFavoriteButton(produit.img);
    }

    function updatePriceForSize() {
        const activeSize = document.querySelector('.size-option.active');
        const ratio = parseFloat(activeSize?.dataset.ratio || '1');
        const finalPrice = Math.round(basePrice * ratio);
        document.getElementById('product-price').textContent = finalPrice;
    }

    document.querySelectorAll('.size-option').forEach(opt => {
        opt.addEventListener('click', () => {
            
            document.querySelectorAll('.size-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            updatePriceForSize();
        });
    });

    function getFavorites() {
        try { return JSON.parse(localStorage.getItem('kaorieFavorites') || '[]'); }
        catch { return []; }
    }
    function updateFavoriteButton(img) {
        const btn = document.getElementById('favorite-btn');
        if (!btn) return;
        const favs = getFavorites();
        btn.classList.toggle('active', favs.includes(img));
    }
    const favBtn = document.getElementById('favorite-btn');
    if (favBtn) {
        favBtn.addEventListener('click', () => {
            const produit = produits.find(p => p.id === currentId) || produits[0];
            const favs = getFavorites();
            const idx = favs.indexOf(produit.img);
            if (idx >= 0) {
                favs.splice(idx, 1);
                showToast(`${produit.nom} retiré des favoris`);
            } else {
                favs.push(produit.img);
                showToast(`❤️ ${produit.nom} ajouté aux favoris`);
            }
            localStorage.setItem('kaorieFavorites', JSON.stringify(favs));
            updateFavoriteButton(produit.img);
        });
    }

    const prevBtn = document.getElementById('prev-product');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentId = currentId > 1 ? currentId - 1 : produits.length;
            render();
        });
    }
    const nextBtn = document.getElementById('next-product');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentId = currentId < produits.length ? currentId + 1 : 1;
            render();
        });
    }

    document.getElementById('add-cart-btn').addEventListener('click', () => {
        const produit = produits.find(p => p.id === currentId) || produits[0];
        const activeSize = document.querySelector('.size-option.active');
        const sizeLabel = activeSize?.textContent || '';
        const ratio = parseFloat(activeSize?.dataset.ratio || '1');
        const finalPrice = Math.round(basePrice * ratio);
        
        addToCart({ ...produit, type, prix: finalPrice, taille: sizeLabel });
    });

    renderThumbnails();
    render();
}


/* ======================================================================
   11. VALIDATION DES FORMULAIRES
   Regex email + handlers contact/inscription/connexion/mot-de-passe (Léa)
   =================================================================== */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nom = document.getElementById('contact-nom').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const tel = document.getElementById('contact-tel').value.trim();
        const msg = document.getElementById('contact-msg').value.trim();

        if (!nom || !email || !tel || !msg) {
            showToast('Merci de remplir tous les champs');
            return;
        }
        if (!isValidEmail(email)) {
            showToast('Email invalide');
            return;
        }
        showToast(`Merci ${nom}, votre message a été envoyé !`);
        contactForm.reset();
    });
}

const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value.trim();
        const pwd = document.getElementById('signup-password').value;

        if (!isValidEmail(email)) {
            showToast('Email invalide');
            return;
        }
        if (pwd.length < 6) {
            showToast('Le mot de passe doit faire au moins 6 caractères');
            return;
        }
        localStorage.setItem('user', JSON.stringify({ email }));
        showToast('Bienvenue ! Inscription réussie');
        setTimeout(() => window.location.href = 'index.html', 1200);
    });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const pwd = document.getElementById('login-password').value;

        if (!email || !pwd) {
            showToast('Merci de remplir tous les champs');
            return;
        }
        localStorage.setItem('user', JSON.stringify({ email }));
        showToast('Connexion réussie');
        setTimeout(() => window.location.href = 'index.html', 1000);
    });
}

const resetForm = document.getElementById('reset-form');
if (resetForm) {
    resetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value.trim();
        if (!isValidEmail(email)) {
            showToast('Email invalide');
            return;
        }
        showToast(`Un email a été envoyé à ${email}`);
        resetForm.reset();
    });
}


/* ======================================================================
   12. RECHERCHE — DONNÉES
   Liste plate des produits pour la recherche live (Léa)
   =================================================================== */

const PRODUCTS = [
    // ⚠️ Les noms, descriptions et prix doivent rester identiques à ceux
    // des fiches (produit-parfum.html / produit-boisson.html) : sinon la
    // recherche annonce un produit et la page en montre un autre.
    {
        name: 'Parfum n°1 — Rose Velours',
        category: 'Parfum',
        tags: ['rose', 'floral', 'pivoine', 'musc', 'délicat', 'velours'],
        desc: 'Une fragrance florale délicate, signature de la maison.',
        price: 79, img: 'parfum-1',
        url: 'produit-parfum.html?id=1'
    },
    {
        name: 'Parfum n°2 — Bois Précieux',
        category: 'Parfum',
        tags: ['bois', 'boisé', 'santal', 'cèdre', 'vanille', 'bourbon'],
        desc: 'Notes profondes de santal, cèdre et vanille bourbon.',
        price: 89, img: 'parfum-2',
        url: 'produit-parfum.html?id=2'
    },
    {
        name: 'Parfum n°3 — Nuit d\'Orient',
        category: 'Parfum',
        tags: ['oriental', 'épicé', 'ambre', 'oud', 'envoûtant'],
        desc: 'Épices chaudes, ambre et oud pour une signature envoûtante.',
        price: 95, img: 'parfum-3',
        url: 'produit-parfum.html?id=3'
    },
    {
        name: 'Parfum n°4 — Brise Marine',
        category: 'Parfum',
        tags: ['agrumes', 'frais', 'marin', 'aquatique', 'iodé', 'été'],
        desc: 'Agrumes pétillants et accords aquatiques, frais et iodé.',
        price: 75, img: 'parfum-4',
        url: 'produit-parfum.html?id=4'
    },

    {
        name: 'Boisson n°1 — Gingembre',
        category: 'Boisson',
        tags: ['kéfir', 'gingembre', 'pétillant', 'bio', 'vivant', 'frais'],
        desc: "Kéfir d'eau pétillant au gingembre frais, BIO et vivant.",
        price: 5, img: 'boisson-1',
        url: 'produit-boisson.html?id=1'
    },
    {
        name: 'Boisson n°2 — Thé Vert Menthe',
        category: 'Boisson',
        tags: ['kéfir', 'thé vert', 'menthe', 'désaltérant', 'frais', 'vert'],
        desc: "Kéfir d'eau au thé vert et à la menthe fraîche, désaltérant.",
        price: 6, img: 'boisson-2',
        url: 'produit-boisson.html?id=2'
    },
    {
        name: 'Boisson n°3 — Citron',
        category: 'Boisson',
        tags: ['kéfir', 'citron', 'agrumes', 'peu sucré', 'vivant'],
        desc: "Kéfir d'eau au citron, pauvre en sucre et vivant.",
        price: 5, img: 'boisson-3',
        url: 'produit-boisson.html?id=3'
    },
    {
        name: 'Boisson n°4 — Framboise',
        category: 'Boisson',
        tags: ['kéfir', 'framboise', 'fruité', 'pétillant', 'rouge'],
        desc: "Kéfir d'eau à la framboise, pétillant et fruité.",
        price: 6, img: 'boisson-4',
        url: 'produit-boisson.html?id=4'
    }
];


/* ======================================================================
   13. RECHERCHE — FILTRAGE
   Filtre la liste selon la requête utilisateur (Léa)
   =================================================================== */

function searchProducts(query) {
    const q = query.toLowerCase().trim();
    if (!q) return PRODUCTS; 

    return PRODUCTS.filter(p => {
        const haystack = [
            p.name,
            p.category,
            p.desc,
            ...p.tags
        ].join(' ').toLowerCase();
        
        return q.split(/\s+/).every(word => haystack.includes(word));
    });
}


/* ======================================================================
   14. RECHERCHE — UI DROPDOWN
   Animation clip-path + affichage résultats (Léa)
   =================================================================== */

function initSearch() {
    const trigger = document.querySelector('.search-icon');
    const overlay = document.getElementById('search-overlay');
    const input   = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    if (!trigger || !overlay || !input || !results) return;

    function openSearch() {
        overlay.classList.add('open');
        setTimeout(() => input.focus(), 200);
        renderResults(input.value);
    }
    function closeSearch() {
        overlay.classList.remove('open');
        input.value = '';
        results.innerHTML = ''; 
    }
    function toggleSearch() {
        if (overlay.classList.contains('open')) closeSearch();
        else openSearch();
    }

    function renderResults(query) {
        const q = query.trim();

        if (!q) {
            results.innerHTML = '';
            return;
        }

        const matches = searchProducts(query);

        if (matches.length === 0) {
            results.innerHTML = `
                <div class="search-no-results">
                    Aucun produit pour « ${q} »<br>
                    <em>Essaye : parfum, rose, menthe, gingembre…</em>
                </div>
            `;
            return;
        }

        results.innerHTML = matches.map((p, i) => `
            <a href="${p.url}" class="search-result-item" style="animation-delay: ${i * 0.04}s">
                <span class="name">${p.name.replace(/^[^—]+— /, '')}</span>
                <span class="meta">${p.category} · ${p.price} €</span>
            </a>
        `).join('');
    }

    if (!trigger.dataset.wired) {
        trigger.dataset.wired = 'true';
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSearch();
        });
    }

    if (!input.dataset.wired) {
        input.dataset.wired = 'true';
        input.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });
    }

    if (!initSearch.docWired) {
        initSearch.docWired = true;

        document.addEventListener('click', (e) => {
            const ov = document.getElementById('search-overlay');
            const tr = document.querySelector('.search-icon');
            if (!ov || !ov.classList.contains('open')) return;
            if (ov.contains(e.target) || (tr && tr.contains(e.target))) return;
            ov.classList.remove('open');
            const inp = document.getElementById('search-input');
            if (inp) { inp.value = ''; }
            const res = document.getElementById('search-results');
            if (res) res.innerHTML = '';
        });

        document.addEventListener('keydown', (e) => {
            const ov = document.getElementById('search-overlay');
            if (e.key === 'Escape' && ov && ov.classList.contains('open')) {
                ov.classList.remove('open');
                const inp = document.getElementById('search-input');
                if (inp) inp.value = '';
                const res = document.getElementById('search-results');
                if (res) res.innerHTML = '';
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
} else {
    initSearch();
}


/* ======================================================================
   15. MENU BURGER (alternatif)
   Panneau de navigation overlay (peu utilisé)
   =================================================================== */

function initBurgerMenu() {
    const toggle = document.getElementById('menu-toggle');
    const panel  = document.getElementById('menu-panel');
    const close  = document.getElementById('menu-close');
    if (!toggle || !panel) return;

    function openMenu() {
        panel.classList.add('open');
        toggle.classList.add('active');
        toggle.innerHTML = '&times;'; 
        document.documentElement.classList.add('menu-open');
    }
    function closeMenu() {
        panel.classList.remove('open');
        toggle.classList.remove('active');
        toggle.innerHTML = '&#9776;'; 
        document.documentElement.classList.remove('menu-open');
    }
    function toggleMenu() {
        if (panel.classList.contains('open')) closeMenu();
        else openMenu();
    }

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    if (close) close.addEventListener('click', closeMenu);

    panel.addEventListener('click', (e) => {
        if (e.target === panel) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel.classList.contains('open')) closeMenu();
    });

    panel.querySelectorAll('.menu-nav a').forEach(link => {
        link.addEventListener('click', () => closeMenu());
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBurgerMenu);
} else {
    initBurgerMenu();
}


/* ======================================================================
   16. LECTEUR MUSIQUE
   Aria Math de C418 en fond + persistance entre pages (Mathis)
   =================================================================== */

function initMusicPlayer() {
    const musicToggle = document.getElementById('music-toggle');
    const audio = document.getElementById('bg-music');
    if (!musicToggle || !audio) return;

    if (!audio.dataset.initialized) {
        audio.dataset.initialized = 'true';
        audio.volume = 0.4;

        const savedTime = parseFloat(sessionStorage.getItem('musicTime') || '0');
        const wasPlaying = sessionStorage.getItem('musicPlaying') === 'true';

        if (savedTime > 0) audio.currentTime = savedTime;

        if (wasPlaying) {
            audio.play()
                .then(() => musicToggle.classList.add('playing'))
                .catch(() => sessionStorage.setItem('musicPlaying', 'false'));
        }

        setInterval(() => {
            if (!audio.paused) sessionStorage.setItem('musicTime', audio.currentTime);
        }, 1000);

        window.addEventListener('pagehide', () => {
            sessionStorage.setItem('musicTime', audio.currentTime);
        });
    }

    if (!musicToggle.dataset.wired) {
        musicToggle.dataset.wired = 'true';
        musicToggle.addEventListener('click', () => {
            if (audio.paused) {
                audio.play()
                    .then(() => {
                        musicToggle.classList.add('playing');
                        sessionStorage.setItem('musicPlaying', 'true');
                        showToast('🎵 Aria Math — C418');
                    })
                    .catch(err => console.warn('Lecture audio refusée :', err));
            } else {
                audio.pause();
                musicToggle.classList.remove('playing');
                sessionStorage.setItem('musicPlaying', 'false');
            }
        });

        if (!audio.paused) musicToggle.classList.add('playing');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMusicPlayer);
} else {
    initMusicPlayer();
}


/* ======================================================================
   17. TOAST NOTIFICATIONS
   Petites notifications discrètes (utilitaire global)
   =================================================================== */

function showToast(message) {
    
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 110px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: var(--black);
        color: var(--white);
        padding: 14px 28px;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        z-index: 1000;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}


/* ======================================================================
   18. DRAWER PANIER — INJECTION
   Injecte le drawer dans le DOM de chaque page (Léa)
   =================================================================== */

function initCartDrawer() {

    if (document.getElementById('cart-drawer')) return setupCartDrawerHandlers();

    const oldSidebar = document.querySelector('.cart-sidebar');
    if (oldSidebar) oldSidebar.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'cart-backdrop';
    backdrop.className = 'cart-backdrop';
    document.body.appendChild(backdrop);

    const drawer = document.createElement('aside');
    drawer.id = 'cart-drawer';
    drawer.className = 'cart-drawer';
    drawer.innerHTML = `
        <button class="cart-drawer-close" id="cart-drawer-close" aria-label="Fermer le panier">&times;</button>
        <div class="cart-header">
            <h3><em>Panier</em></h3>
            <span class="cart-count" id="cart-count">0</span>
        </div>
        <div class="cart-items" id="cart-items"></div>
        <div class="cart-footer">
            <div class="cart-total">
                <span class="label">Sous-total</span>
                <span class="amount" id="cart-subtotal">0 €</span>
            </div>
            <button class="cart-checkout" id="checkout-btn">Finaliser la commande</button>
            <button class="cart-clear-btn" id="cart-clear-btn">Vider le panier</button>
        </div>
    `;
    document.body.appendChild(drawer);

    setupCartDrawerHandlers();
    renderCart();   

    if (location.pathname.endsWith('panier.html')) {
        const delay = sessionStorage.getItem('kaorieLoaded') ? 100 : 2000;
        setTimeout(() => window.openCartDrawer?.(), delay);
    }
}


/* ======================================================================
   19. DRAWER PANIER — HANDLERS
   Hijack des liens, open/close, échap, backdrop (Léa)
   =================================================================== */

function setupCartDrawerHandlers() {
    const drawer   = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    const closeBtn = document.getElementById('cart-drawer-close');
    const clearBtn = document.getElementById('cart-clear-btn');

    if (!drawer || !backdrop) return;

    function openDrawer() {
        renderCart();                       
        drawer.classList.add('open');
        backdrop.classList.add('open');
        document.documentElement.classList.add('cart-open');
    }
    function closeDrawer() {
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
        document.documentElement.classList.remove('cart-open');
    }

    window.openCartDrawer = openDrawer;
    window.closeCartDrawer = closeDrawer;

    document.querySelectorAll('a[href$="panier.html"]').forEach(link => {
        if (link.dataset.cartHijacked) return;       
        link.dataset.cartHijacked = 'true';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openDrawer();
        });
    });

    if (closeBtn && !closeBtn.dataset.wired) {
        closeBtn.dataset.wired = 'true';
        closeBtn.addEventListener('click', closeDrawer);
    }

    if (!backdrop.dataset.wired) {
        backdrop.dataset.wired = 'true';
        backdrop.addEventListener('click', closeDrawer);
    }

    if (clearBtn && !clearBtn.dataset.wired) {
        clearBtn.dataset.wired = 'true';
        clearBtn.addEventListener('click', clearCart);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartDrawer);
} else {
    initCartDrawer();
}


/* ======================================================================
   20. MODAL GRAVURE — INJECTION
   Injecte la modal personnalisation flacon (Mathis)
   =================================================================== */

function initEngravingModal() {
    
    if (document.getElementById('engraving-modal')) {
        setupEngravingHandlers();
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'engraving-modal';
    modal.className = 'engraving-modal';
    modal.innerHTML = `
        <button class="modal-close" id="engraving-close" aria-label="Fermer">&times;</button>
        <h3><em>Gravure personnalisée</em></h3>
        <p class="modal-desc">
            Faites graver un prénom, une date ou un mot court sur votre flacon.<br>
            Une touche unique, signée Kaorie.
        </p>
        <div class="engraving-preview">
            <span class="engraving-preview-text placeholder" id="engraving-preview-text">Votre gravure</span>
        </div>
        <div class="engraving-input-wrap">
            <input
                type="text"
                class="engraving-input"
                id="engraving-input"
                maxlength="20"
                placeholder="Ex : Marie, 2026, Pour toi…"
                autocomplete="off"
            >
            <span class="char-count"><span id="engraving-count">0</span>/20</span>
        </div>
        <button class="modal-confirm" id="engraving-confirm" disabled>
            Ajouter au panier avec gravure
        </button>
    `;
    document.body.appendChild(modal);

    if (!document.getElementById('engraving-backdrop')) {
        const bd = document.createElement('div');
        bd.id = 'engraving-backdrop';
        bd.className = 'cart-backdrop';
        document.body.appendChild(bd);
    }

    setupEngravingHandlers();
}


/* ======================================================================
   21. MODAL GRAVURE — HANDLERS
   Listener crayon, preview live, validation (Mathis)
   =================================================================== */

function setupEngravingHandlers() {
    const modal      = document.getElementById('engraving-modal');
    const backdrop   = document.getElementById('engraving-backdrop');
    const input      = document.getElementById('engraving-input');
    const previewEl  = document.getElementById('engraving-preview-text');
    const countEl    = document.getElementById('engraving-count');
    const closeBtn   = document.getElementById('engraving-close');
    const confirmBtn = document.getElementById('engraving-confirm');

    if (!modal || !backdrop) return;

    document.querySelectorAll('button[aria-label="Modifier"]').forEach(btn => {
        if (btn.dataset.engravingWired) return;
        btn.dataset.engravingWired = 'true';
        btn.addEventListener('click', openEngravingModal);
    });

    if (closeBtn && !closeBtn.dataset.wired) {
        closeBtn.dataset.wired = 'true';
        closeBtn.addEventListener('click', closeEngravingModal);
    }

    if (!backdrop.dataset.engravingWired) {
        backdrop.dataset.engravingWired = 'true';
        backdrop.addEventListener('click', (e) => {
            
            if (modal.classList.contains('open')) closeEngravingModal();
        });
    }

    if (!setupEngravingHandlers.escWired) {
        setupEngravingHandlers.escWired = true;
        document.addEventListener('keydown', (e) => {
            const m = document.getElementById('engraving-modal');
            if (e.key === 'Escape' && m && m.classList.contains('open')) closeEngravingModal();
        });
    }

    if (input && !input.dataset.wired) {
        input.dataset.wired = 'true';
        input.addEventListener('input', () => {
            const val = input.value.trim();
            if (val) {
                previewEl.textContent = val;
                previewEl.classList.remove('placeholder');
            } else {
                previewEl.textContent = 'Votre gravure';
                previewEl.classList.add('placeholder');
            }
            countEl.textContent = input.value.length;
            confirmBtn.disabled = val.length === 0;
        });
    }

    if (confirmBtn && !confirmBtn.dataset.wired) {
        confirmBtn.dataset.wired = 'true';
        confirmBtn.addEventListener('click', confirmEngraving);
    }
}

function openEngravingModal() {
    const modal    = document.getElementById('engraving-modal');
    const backdrop = document.getElementById('engraving-backdrop');
    const input    = document.getElementById('engraving-input');
    const preview  = document.getElementById('engraving-preview-text');
    const count    = document.getElementById('engraving-count');
    const confirm  = document.getElementById('engraving-confirm');
    if (!modal) return;

    if (input)   input.value = '';
    if (preview) { preview.textContent = 'Votre gravure'; preview.classList.add('placeholder'); }
    if (count)   count.textContent = '0';
    if (confirm) confirm.disabled = true;

    modal.classList.add('open');
    backdrop.classList.add('open');
    setTimeout(() => input?.focus(), 300);
}

function closeEngravingModal() {
    document.getElementById('engraving-modal')?.classList.remove('open');
    document.getElementById('engraving-backdrop')?.classList.remove('open');
}

function getCurrentPageProduct() {
    const params = new URLSearchParams(location.search);
    const id     = parseInt(params.get('id')) || 1;
    const isParfum  = location.pathname.includes('parfum');
    const isBoisson = location.pathname.includes('boisson');
    if (!isParfum && !isBoisson) return null;

    const type  = isParfum ? 'parfum' : 'boisson';
    const img   = `${type}-${id}`;
    
    const nom   = document.getElementById('product-name')?.textContent?.trim()
                  || PRODUCT_NAMES[img]
                  || (isParfum ? 'Parfum' : 'Boisson');
    const desc  = document.getElementById('product-description')?.textContent?.trim() || '';
    const prix  = parseInt(document.getElementById('product-price')?.textContent) || 0;

    return { id, type, img, nom, desc, prix };
}

function confirmEngraving() {
    const input = document.getElementById('engraving-input');
    const text  = input?.value.trim();
    if (!text) return;

    const produit = getCurrentPageProduct();
    if (!produit) {
        showToast("Impossible : ouvrez d'abord une fiche produit");
        closeEngravingModal();
        return;
    }

    addToCart({ ...produit, engraving: text });
    closeEngravingModal();

    setTimeout(() => window.openCartDrawer?.(), 400);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEngravingModal);
} else {
    initEngravingModal();
}


/* ======================================================================
   22-23. NAVIGATION — RETIRÉE LE 22/09/2026
   Il y avait ici une navigation « maison » : un écouteur attrapait tous
   les clics sur les liens internes et, au lieu de laisser le navigateur
   changer de page, allait chercher la nouvelle page en fetch pour n'en
   recopier que le <body>. Le <head> n'était jamais touché.

   Conséquence : une page atteinte par un CLIC recevait le contenu de la
   nouvelle page mais gardait les styles de la précédente. Le catalogue
   arrivait sans sa grille, la fiche produit sans sa mise en page,
   l'accueil sans son en-tête. Une page ouverte directement (adresse
   tapée, rechargement) était correcte : de là l'impression d'un bug
   capricieux, qui a coûté une journée à diagnostiquer.

   Elle apportait un seul avantage — la musique de fond ne se coupait pas
   entre deux pages — et la musique n'existe plus dans cette version.
   Trois autres défauts venaient avec : le script d'une fiche produit
   redéclarait ses constantes au deuxième passage (erreur JavaScript),
   les formulaires repassaient en GET (le mot de passe se retrouvait dans
   l'adresse), et les écouteurs clavier s'empilaient à chaque page.

   Les liens sont donc redevenus de vrais liens : chaque page arrive
   entière, avec ses styles et son script propre.
   =================================================================== */


/* ======================================================================
   24. BANDEAU COOKIES (SAE 203)
   Apparait à 1s, 2 cases à cocher, refus = flou (Léa)
   =================================================================== */

function initCookieBanner() {
    const path = location.pathname;
    const isHome = path.endsWith('index.html') || path === '/' || path.endsWith('/');
    if (!isHome) return;



    document.body.classList.remove('cookies-refused');


    if (document.getElementById('cookie-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-banner';
    banner.innerHTML = `
        <p class="cookie-text">
            <strong>Ce site utilise des cookies</strong> pour améliorer votre expérience.
            Vous pouvez les accepter ou les refuser ci-contre.
        </p>
        <div class="cookie-options">
            <label class="cookie-option">
                <input type="checkbox" id="cookie-accept" name="cookies">
                <span>Accepter</span>
            </label>
            <label class="cookie-option">
                <input type="checkbox" id="cookie-refuse" name="cookies">
                <span>Refuser</span>
            </label>
        </div>
    `;
    document.body.appendChild(banner);


    setTimeout(() => banner.classList.add('show'), 1000);

    function closeBanner() {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 500);
    }


    document.getElementById('cookie-accept').addEventListener('change', (e) => {
        if (!e.target.checked) return;
        document.getElementById('cookie-refuse').checked = false;
        closeBanner();
    });


    document.getElementById('cookie-refuse').addEventListener('change', (e) => {
        if (!e.target.checked) return;
        document.getElementById('cookie-accept').checked = false;
        document.body.classList.add('cookies-refused');
        closeBanner();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieBanner);
} else {
    initCookieBanner();
}


/* ======================================================================
   25. ANIMATION CLIC BOUTONS
   Pop scale 1.12 sur les boutons au clic (SAE 203 point e)
   =================================================================== */

function initButtonClickPop() {
    if (initButtonClickPop.wired) return;
    initButtonClickPop.wired = true;

    document.addEventListener('click', (e) => {
        
        const btn = e.target.closest(
            'button, .contact-btn, a.icon-btn, ' +
            '.product-description-box .add-to-cart, ' +
            '.cart-checkout, .modal-confirm, ' +
            '.cart-clear-btn, .cookie-option'
        );
        if (!btn) return;

        const cs = getComputedStyle(btn);
        const usesCenterTransform = cs.transform && cs.transform.includes('matrix')
            && Math.abs(parseFloat(cs.transform.split(',')[4]) || 0) > 1;

        const cls = usesCenterTransform ? 'btn-clicked-centered' : 'btn-clicked';
        btn.classList.add(cls);
        setTimeout(() => btn.classList.remove(cls), 400);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButtonClickPop);
} else {
    initButtonClickPop();
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
});
