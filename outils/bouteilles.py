# -*- coding: utf-8 -*-
"""
LES BOUTEILLES KAORIE, EN 3D
============================
Rend les huit produits du site (quatre flacons de parfum, quatre bouteilles
de boisson) avec Blender, en Cycles, sur fond transparent.

Pourquoi : les visuels d'origine du projet d'école étaient des photos de
produits du commerce retouchées — pas à nous. Ici, chaque bouteille est
modelée, éclairée et rendue dans ce script : la géométrie est construite en
code (pas de .blend à ouvrir), l'étiquette est une image faite par
outils/etiquettes/etiquettes.py.

Un seul STUDIO pour les huit images — même caméra, même lumière, même sol —
c'est ce qui en fait une gamme et pas huit rendus sans rapport.

Lancer :
    /Applications/Blender.app/Contents/MacOS/Blender --background \
        --python outils/bouteilles.py -- [--rapide] [produit ...]

Sans produit, les huit sont rendus. `--rapide` divise la résolution et les
échantillons par deux (pour vérifier une composition sans attendre).
Sortie : outils/rendus/<produit>.png, puis outils/finir.py les découpe.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

ICI      = os.path.dirname(os.path.abspath(__file__))
ETIQ     = os.path.join(ICI, 'etiquettes', 'sortie')
SORTIE   = os.path.join(ICI, 'rendus')
RES_X, RES_Y = 1200, 1800          # portrait 2:3, comme les images du site
SAMPLES  = 320

# ── Les produits ──────────────────────────────────────────────────────
# Les couleurs sont linéaires (0–1). Un liquide se voit par transmission :
# plus il est sombre, plus il est dense.
PARFUMS = {
    'parfum-blanc': dict(verre=(1, 1, 1),           liquide=(0.97, 0.80, 0.78), opaque=False),
    'parfum-jaune': dict(verre=(1, 1, 1),           liquide=(0.93, 0.62, 0.18), opaque=False),
    'parfum-noir':  dict(verre=(0.01, 0.01, 0.012), liquide=None,               opaque=True),
    'parfum-bleu':  dict(verre=(0.55, 0.76, 0.96),  liquide=(0.62, 0.82, 0.97), opaque=False),
}
BOISSONS = {
    'boisson-citron':    dict(liquide=(0.98, 0.90, 0.42)),
    'boisson-framboise': dict(liquide=(0.95, 0.30, 0.46)),
    'boisson-gingembre': dict(liquide=(0.96, 0.78, 0.40)),
    'boisson-menthe':    dict(liquide=(0.50, 0.85, 0.32)),
}

# ── Petits outils ─────────────────────────────────────────────────────
def objet(nom, bm, mats=()):
    """Transforme un bmesh en objet de la scène, lissé, avec ses matériaux."""
    me = bpy.data.meshes.new(nom)
    bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    ob = bpy.data.objects.new(nom, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob

def revolution(profil, pas=96, fermer=True):
    """Fait tourner un profil (r, z) autour de l'axe Z : un tour de potier.
    Le profil est une polyligne ; les points à r=0 sont sur l'axe."""
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0, z)) for r, z in profil]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=edges, cent=(0, 0, 0), axis=(0, 0, 1), dvec=(0, 0, 0),
                   angle=math.tau, steps=pas, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.normal_update()
    # Le sens du profil décide du sens des normales ; on veut la surface
    # extérieure tournée vers le dehors (Cycles s'en sert pour savoir si un
    # rayon entre ou sort du verre). On regarde la face la plus éloignée de l'axe.
    loin = max(bm.faces, key=lambda f: f.calc_center_median().xy.length)
    c = loin.calc_center_median()
    if loin.normal.dot(Vector((c.x, c.y, 0))) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.normal_update()
    return bm

def boite(taille, centre, inverser=False):
    """Un pavé aux arêtes vives ; le biseau vient d'un modificateur."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=taille, verts=bm.verts)
    bmesh.ops.translate(bm, vec=centre, verts=bm.verts)
    if inverser: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return bm

def biseau(ob, largeur, segments=12):
    m = ob.modifiers.new('Biseau', 'BEVEL')
    m.width = largeur; m.segments = segments; m.limit_method = 'NONE'
    m.harden_normals = True

def par_normale(ob, mat_haut, mat_autre):
    """Deux matériaux sur un même objet : les faces qui regardent vers le
    haut (la surface du liquide, vers l'air) et toutes les autres (contre le
    verre)."""
    me = ob.data
    me.materials.append(mat_autre); me.materials.append(mat_haut)
    for p in me.polygons:
        p.material_index = 1 if p.normal.z > 0.9 else 0

def principled(nom, **valeurs):
    """Un matériau Principled BSDF réglé par nom d'entrée."""
    m = bpy.data.materials.new(nom); m.use_nodes = True
    n = m.node_tree.nodes['Principled BSDF']
    for k, v in valeurs.items():
        s = n.inputs.get(k)
        if s is None: continue
        if s.type == 'RGBA' and len(v) == 3: v = (*v, 1.0)
        s.default_value = v
    return m

def verre(nom, couleur, rugosite=0.02):
    return principled(nom, **{'Base Color': couleur, 'Roughness': rugosite, 'IOR': 1.5, 'Transmission Weight': 1.0})

def liquide(nom, couleur):
    """Deux matériaux : l'interface liquide/verre (IOR relatif 1,33/1,5) et
    la surface libre liquide/air (IOR 1,33). Le liquide chevauche la paroi de
    verre de quelques dixièmes ; c'est la recette classique pour que les
    rayons traversent verre puis liquide sans « bulle d'air » parasite."""
    contre_verre = principled(nom + ' (verre)', **{'Base Color': couleur, 'Roughness': 0.0, 'IOR': 1.33 / 1.5, 'Transmission Weight': 1.0})
    surface      = principled(nom + ' (air)',   **{'Base Color': couleur, 'Roughness': 0.0, 'IOR': 1.33,       'Transmission Weight': 1.0})
    return surface, contre_verre

def verre_imprime(nom, couleur, chemin, opaque):
    """Le verre du flacon, avec l'étiquette imprimée dessus. Pas de plan
    posé devant (un plan transparent, même parfait, laissait une trace dans
    le reflet du verre) : l'image est projetée en coordonnées objet sur la
    seule face avant, et là où elle est opaque, la surface cesse d'être du
    verre — c'est de l'encre. Le repère : l'étiquette fait 0,8 × 1,0, centrée
    en z = 0,70 sur le corps (voir flacon())."""
    m = bpy.data.materials.new(nom); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes['Principled BSDF']
    def noeud(type_, **attrs):
        n = nt.nodes.new(type_)
        for k, v in attrs.items(): setattr(n, k, v)
        return n
    lier = nt.links.new
    tc = noeud('ShaderNodeTexCoord'); sep = noeud('ShaderNodeSeparateXYZ'); lier(tc.outputs['Object'], sep.inputs[0])
    u = noeud('ShaderNodeMath', operation='MULTIPLY_ADD'); u.inputs[1].default_value = 1 / 0.8; u.inputs[2].default_value = 0.5; lier(sep.outputs['X'], u.inputs[0])
    v = noeud('ShaderNodeMath', operation='MULTIPLY_ADD'); v.inputs[1].default_value = 1 / 1.0; v.inputs[2].default_value = 0.5 - 0.70; lier(sep.outputs['Z'], v.inputs[0])
    uv = noeud('ShaderNodeCombineXYZ'); lier(u.outputs[0], uv.inputs['X']); lier(v.outputs[0], uv.inputs['Y'])
    tex = noeud('ShaderNodeTexImage', extension='CLIP', interpolation='Cubic'); tex.image = bpy.data.images.load(chemin); lier(uv.outputs[0], tex.inputs['Vector'])
    # Seule la face avant (normale vers -y) reçoit l'impression.
    geo = noeud('ShaderNodeNewGeometry')
    dot = noeud('ShaderNodeVectorMath', operation='DOT_PRODUCT'); dot.inputs[1].default_value = (0, -1, 0); lier(geo.outputs['Normal'], dot.inputs[0])
    devant = noeud('ShaderNodeMath', operation='GREATER_THAN'); devant.inputs[1].default_value = 0.9; lier(dot.outputs['Value'], devant.inputs[0])
    # …et seulement vue de face : vue de l'intérieur (un rayon qui a traversé
    # le liquide et revient), l'encre redevient du verre, sinon son dos se
    # réfléchit dans la paroi arrière et l'étiquette apparaît en double.
    face = noeud('ShaderNodeMath', operation='SUBTRACT'); face.inputs[0].default_value = 1.0; lier(geo.outputs['Backfacing'], face.inputs[1])
    devant2 = noeud('ShaderNodeMath', operation='MULTIPLY'); lier(devant.outputs[0], devant2.inputs[0]); lier(face.outputs[0], devant2.inputs[1])
    encre = noeud('ShaderNodeMath', operation='MULTIPLY'); lier(tex.outputs['Alpha'], encre.inputs[0]); lier(devant2.outputs[0], encre.inputs[1])
    teinte = noeud('ShaderNodeMix', data_type='RGBA'); teinte.inputs['A'].default_value = (*couleur, 1); lier(encre.outputs[0], teinte.inputs['Factor']); lier(tex.outputs['Color'], teinte.inputs['B'])
    lier(teinte.outputs['Result'], p.inputs['Base Color'])
    rugo = noeud('ShaderNodeMath', operation='MULTIPLY_ADD'); rugo.inputs[1].default_value = 0.35; lier(encre.outputs[0], rugo.inputs[0])
    if opaque:
        rugo.inputs[2].default_value = 0.06
        p.inputs['Coat Weight'].default_value = 1.0; p.inputs['Coat Roughness'].default_value = 0.03
    else:
        rugo.inputs[2].default_value = 0.02
        p.inputs['IOR'].default_value = 1.5
        trans = noeud('ShaderNodeMath', operation='SUBTRACT'); trans.inputs[0].default_value = 1.0; lier(encre.outputs[0], trans.inputs[1])
        lier(trans.outputs[0], p.inputs['Transmission Weight'])
    lier(rugo.outputs[0], p.inputs['Roughness'])
    return m

def image_mat(nom, chemin, papier):
    """L'étiquette : imprimée sur le verre (alpha) ou papier (opaque)."""
    m = bpy.data.materials.new(nom); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(chemin)
    tex.interpolation = 'Cubic'
    nt.links.new(tex.outputs['Color'], p.inputs['Base Color'])
    if papier:
        p.inputs['Roughness'].default_value = 0.55
        p.inputs['Specular IOR Level'].default_value = 0.35
        p.inputs['Sheen Weight'].default_value = 0.15
    else:
        nt.links.new(tex.outputs['Alpha'], p.inputs['Alpha'])
        p.inputs['Roughness'].default_value = 0.35
        p.inputs['Specular IOR Level'].default_value = 0.4
    return m

# ── Le flacon de parfum ───────────────────────────────────────────────
def flacon(slug, spec):
    L, P, H = 1.0, 0.55, 1.5          # largeur, profondeur, hauteur du corps
    paroi, fond, plein = 0.05, 0.12, 1.30
    couleur = spec['verre']
    mat_verre = verre_imprime('Verre', couleur, os.path.join(ETIQ, slug + '.png'), spec['opaque'])

    corps = objet('Corps', boite((L, P, H), (0, 0, H / 2)), [mat_verre])
    biseau(corps, 0.075)
    if not spec['opaque']:
        # La poche d'air au-dessus du liquide : une boîte ouverte en bas,
        # normales vers l'intérieur (c'est du verre vu de dedans).
        bm = boite((L - 2 * paroi, P - 2 * paroi, H - 0.04 - plein), (0, 0, (H - 0.04 + plein) / 2), inverser=True)
        bas = [f for f in bm.faces if f.normal.z > 0.5]   # après inversion, la face du bas regarde vers le haut
        bmesh.ops.delete(bm, geom=bas, context='FACES')
        poche = objet('Poche', bm, [mat_verre]); biseau(poche, 0.03, 6)
        # Le liquide : un peu plus large que la cavité pour entrer dans la paroi.
        ch = 0.004
        liq = objet('Liquide', boite((L - 2 * paroi + 2 * ch, P - 2 * paroi + 2 * ch, plein - fond + ch), (0, 0, (plein + fond - ch) / 2)))
        surface, contre = liquide('Parfum', spec['liquide']); par_normale(liq, surface, contre); biseau(liq, 0.03, 6)

    # Le col, la bague dorée, le capuchon.
    objet('Col', revolution([(0, H - 0.02), (0.16, H - 0.02), (0.16, H + 0.10), (0, H + 0.10)]), [mat_verre])
    or_ = principled('Bague', **{'Base Color': (0.85, 0.62, 0.22), 'Metallic': 1.0, 'Roughness': 0.28})
    objet('Bague', revolution([(0.15, H + 0.06), (0.215, H + 0.06), (0.215, H + 0.14), (0.15, H + 0.14)]), [or_])
    noir = principled('Capuchon', **{'Base Color': (0.012, 0.012, 0.012), 'Roughness': 0.18, 'Coat Weight': 1.0, 'Coat Roughness': 0.05})
    cap = objet('Capuchon', revolution([(0, H + 0.14), (0.30, H + 0.14), (0.30, H + 0.62), (0.27, H + 0.65), (0, H + 0.65)]), [noir])
    biseau(cap, 0.012, 4)

    # L'étiquette est dans le matériau du verre (voir verre_imprime).
    return dict(haut=H + 0.65, regard=1.08, lacet=14)

# ── La bouteille de boisson ───────────────────────────────────────────
def bouteille(slug, spec):
    R, Hc = 0.30, 1.50                 # rayon et hauteur de la partie cylindrique
    epaule = [(0.29, 1.62), (0.245, 1.78), (0.17, 1.92), (0.13, 2.05)]
    col_h, levre = 2.42, 2.52
    plein = 2.10                       # le niveau du liquide, dans le col
    mat_verre = verre('Verre', (1, 1, 1))
    # Le verre : profil extérieur du fond à la lèvre, puis paroi intérieure du
    # col jusqu'au niveau du liquide (en dessous, c'est le liquide qui fait la paroi).
    ext = [(0, 0), (0.24, 0), (0.285, 0.03), (R, 0.08), (R, Hc)] + epaule + [(0.13, col_h), (0.15, col_h + 0.02), (0.15, levre - 0.02), (0.13, levre)]
    interieur = [(0.09, levre), (0.09, plein)]
    objet('Verre', revolution(ext + interieur), [mat_verre])
    # Le liquide : mêmes courbes, 4 millièmes dans la paroi.
    ch = 0.004; e = 0.04                 # e : épaisseur de la paroi
    liq_profil = [(0, 0.03), (R - e + ch, 0.03), (R - e + ch, Hc)] + [(r - e + ch, z) for r, z in epaule] + [(0.09 + ch, 2.05), (0.09 + ch, plein), (0, plein)]
    liq = objet('Liquide', revolution(liq_profil))
    surface, contre = liquide('Boisson', spec['liquide']); par_normale(liq, surface, contre)
    # La capsule.
    metal = principled('Capsule', **{'Base Color': (0.80, 0.80, 0.82), 'Metallic': 1.0, 'Roughness': 0.32})
    cap = objet('Capsule', revolution([(0, levre + 0.05), (0.16, levre + 0.05), (0.175, levre + 0.02), (0.175, levre - 0.10), (0.155, levre - 0.10), (0.155, levre - 0.04), (0.09, levre - 0.04), (0, levre - 0.04)]), [metal])
    biseau(cap, 0.006, 3)
    # L'étiquette papier : un ruban de 307° autour du corps, la face avant en 0.
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    r, z0, hauteur = R + 0.002, 0.62, 0.72
    largeur = hauteur * 1800 / 800; demi = largeur / r / 2      # angle total = largeur / rayon
    n = 96; rangs = []
    for i in range(n + 1):
        t = -demi + (2 * demi) * i / n
        rangs.append([bm.verts.new((r * math.sin(t), -r * math.cos(t), z0)), bm.verts.new((r * math.sin(t), -r * math.cos(t), z0 + hauteur))])
    for i in range(n):
        f = bm.faces.new([rangs[i][0], rangs[i + 1][0], rangs[i + 1][1], rangs[i][1]])
        for l, (u, v) in zip(f.loops, [(i / n, 0), ((i + 1) / n, 0), ((i + 1) / n, 1), (i / n, 1)]): l[uv].uv = (u, v)
    bm.normal_update()
    if any(f.normal.dot(Vector((f.calc_center_median().x, f.calc_center_median().y, 0))) < 0 for f in bm.faces):
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    objet('Étiquette', bm, [image_mat('Étiquette', os.path.join(ETIQ, slug + '.png'), papier=True)])
    return dict(haut=levre + 0.05, regard=1.28, lacet=9)

# ── Le studio ─────────────────────────────────────────────────────────
def studio(cadre):
    sc = bpy.context.scene
    # Le sol n'existe que pour son ombre ; le fond n'existe que dans les reflets.
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    sol = bpy.context.object; sol.name = 'Sol'; sol.is_shadow_catcher = True
    def decor(nom, pos, rot, taille, valeur):
        # Un plan que seule la surface du verre voit : dans ses reflets et à
        # travers lui, jamais par la caméra, jamais comme ombre sur le sol.
        # Il émet sa propre lumière (valeur fixe) au lieu d'être éclairé par
        # les lampes : ce qu'on voit à travers le verre garde une teinte
        # stable, jamais surexposée — sinon le liquide pâle disparaît dans le blanc.
        bpy.ops.mesh.primitive_plane_add(size=taille, location=pos, rotation=rot)
        o = bpy.context.object; o.name = nom
        o.visible_camera = False; o.visible_shadow = False; o.visible_diffuse = False
        m = bpy.data.materials.new(nom); m.use_nodes = True
        nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (valeur, valeur, valeur, 1)
        nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
        o.data.materials.append(m)
        return o
    decor('Fond',    (0, 3.5, 3),   (math.pi / 2, 0, 0),           16, 0.82)   # clair derrière : le verre reste lisible
    decor('Drapeau', (-3.2, 0, 3),  (0, math.pi / 2, 0),           14, 0.0)    # noir à gauche : une arête sombre et nette
    decor('Plafond', (0, 0.5, 6.5), (0, 0, 0),                     10, 1.0)    # blanc au-dessus : les capuchons brillent

    def lampe(nom, pos, taille, watts, forme='SQUARE', ombre=True):
        d = bpy.data.lights.new(nom, 'AREA'); d.energy = watts; d.shape = forme
        d.use_shadow = ombre        # seule la lampe clé porte une ombre : un détourage veut UNE ombre, compacte
        if forme == 'RECTANGLE': d.size, d.size_y = taille
        else: d.size = taille
        o = bpy.data.objects.new(nom, d); sc.collection.objects.link(o); o.location = pos
        c = o.constraints.new('TRACK_TO'); c.target = cible; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
        return o
    cible = bpy.data.objects.new('Cible', None); sc.collection.objects.link(cible); cible.location = (0, 0, cadre['regard'])
    lampe('Clé',    (-0.2, -1.0, 6.2), 2.4, 1000)    # presque à la verticale : l'ombre reste sous l'objet, un halo au pied
    lampe('Débouche', (3.0, -2.4, 1.8), 3.0, 170, ombre=False)
    lampe('Contre', (0.8, 2.6, 3.4), (1.0, 3.0), 300, forme='RECTANGLE', ombre=False)
    lampe('Ligne',  (-3.4, -0.6, 1.6), (0.25, 3.2), 260, forme='RECTANGLE', ombre=False)   # le reflet long sur le verre

    # Le ciel : gris clair, doux — il ne sert qu'aux reflets.
    w = sc.world or bpy.data.worlds.new('Monde'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.5, 0.5, 0.5, 1); bg.inputs[1].default_value = 0.25

    # La caméra : un 70 mm, un peu au-dessus de l'objet, tournée d'un petit
    # lacet pour voir l'épaisseur. Sa distance découle de la hauteur à cadrer.
    cam = bpy.data.cameras.new('Caméra'); cam.lens = 70; cam.sensor_fit = 'VERTICAL'; cam.sensor_height = 24
    h_vue = cadre['haut'] * 1.30
    dist = (h_vue / 2) / math.tan(math.atan(12 / 70))
    lacet = math.radians(cadre['lacet'])
    o = bpy.data.objects.new('Caméra', cam); sc.collection.objects.link(o)
    o.location = (math.sin(lacet) * dist, -math.cos(lacet) * dist, cadre['regard'] + dist * 0.09)
    c = o.constraints.new('TRACK_TO'); c.target = cible; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    sc.camera = o
    # La cible regarde le milieu de l'objet, la caméra cadre un peu plus haut :
    cible.location.z = cadre['haut'] * 0.5 + 0.02

def rendu(chemin, rapide):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = SAMPLES // (2 if rapide else 1)
    sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.015
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 16; sc.cycles.transmission_bounces = 16; sc.cycles.transparent_max_bounces = 16; sc.cycles.glossy_bounces = 8
    sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False   # voir studio() : le sol ne garde que l'ombre
    sc.cycles.blur_glossy = 1.0; sc.cycles.sample_clamp_indirect = 8
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'; prefs.get_devices()
        for d in prefs.devices: d.use = True
        sc.cycles.device = 'GPU'
    except Exception as e:
        print('GPU indisponible, CPU :', e)
    sc.render.resolution_x, sc.render.resolution_y = RES_X, RES_Y
    sc.render.resolution_percentage = 50 if rapide else 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'; sc.render.image_settings.compression = 50
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = 0.0
    sc.render.filepath = chemin
    bpy.ops.render.render(write_still=True)

def produit(slug, rapide):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cadre = flacon(slug, PARFUMS[slug]) if slug in PARFUMS else bouteille(slug, BOISSONS[slug])
    studio(cadre)
    os.makedirs(SORTIE, exist_ok=True)
    rendu(os.path.join(SORTIE, slug + '.png'), rapide)
    print('rendu', slug)

if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    rapide = '--rapide' in args
    voulus = [a for a in args if not a.startswith('--')] or list(PARFUMS) + list(BOISSONS)
    for slug in voulus: produit(slug, rapide)
