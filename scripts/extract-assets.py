"""Extract reusable assets from assets/master-sheet.png (original is never modified)."""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "assets")
OUT = os.path.join(ROOT, "konjed")
sheet = Image.open(os.path.join(ROOT, "master-sheet.png")).convert("RGB")

def save(img, folder, name, fmt):
    d = os.path.join(OUT, folder); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, f"{name}.{fmt}")
    if fmt == "webp": img.save(p, "WEBP", quality=88, method=6)
    else: img.save(p, "PNG", optimize=True)

def scene(folder, name, box, scale=2.5):
    r = sheet.crop(box)
    r = r.resize((int(r.width*scale), int(r.height*scale)), Image.LANCZOS)
    r = r.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
    save(r, folder, name, "webp")

def cutout(folder, name, box, scale=2.0, thr=46, cloud=False):
    r = sheet.crop(box)
    r = r.resize((int(r.width*scale), int(r.height*scale)), Image.LANCZOS)
    a = np.asarray(r).astype(np.float32)
    if cloud:
        lum = a.max(axis=2)
        alpha = np.clip((lum-30)/130, 0, 1)
        alpha = ndi.gaussian_filter(alpha, 0.7)
        # un-premultiply against the dark sheet background so edges don't carry a dark halo
        a = np.where(alpha[...,None] > 0.04, np.clip(a/np.maximum(alpha[...,None], 0.2), 0, 255), a)
        a = np.clip(a*1.04+6, 0, 255)
    else:
        border = np.concatenate([a[0], a[-1], a[:,0], a[:,-1]])
        bg = np.median(border, axis=0)
        dist = np.sqrt(((a-bg)**2).sum(axis=2))
        bgmask = dist < thr
        lab, n = ndi.label(bgmask)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]]))) - {0}
        bgc = np.isin(lab, list(edge))
        fg = ndi.binary_fill_holes(~bgc)           # keep interior holes (e.g. gear)
        fg = ndi.binary_opening(fg, iterations=1)
        alpha = ndi.gaussian_filter(fg.astype(np.float32), 0.8)
        alpha = np.clip((alpha-0.35)/0.5, 0, 1)
    rgba = np.dstack([a, alpha*255]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    bb = img.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
    if bb: img = img.crop(bb)
    save(img, folder, name, "png")

# ---- environments (WebP) ----
scene("world", "hero-world", (0,0,745,308))
scene("world", "final-sunset-world", (0,725,440,1024))
scene("world", "castle-sky-world", (1122,775,1536,1024))
scene("arcade", "arcade-hall", (0,310,410,515))
scene("arcade", "arcade-lounge", (410,310,590,515))
scene("school", "school-classroom", (715,310,965,520))
scene("school", "school-atrium", (965,310,1155,520))
scene("showcase", "showcase-gallery-night", (1165,377,1410,520), 3)
# ---- game thumbnails ----
for n,b in {"house-island":(20,532,116,615),"sea-island":(126,532,214,615),"puzzle-grid":(224,532,315,615),
            "space-explorer":(325,532,420,705),"classroom-scene":(20,624,116,706),"racing-car":(126,624,214,706),
            "valley-landscape":(224,624,315,706)}.items():
    scene("arcade", f"game-{n}", b, 4)
# ---- rewards / objects (PNG) ----
rewards = {"trophy":(452,532,520,605),"medal-blue":(530,535,570,573),"badge-purple":(585,527,630,583),
 "badge-star":(645,527,692,573),"crown":(707,534,753,568),"chest-red":(767,535,850,590),
 "crystal":(867,540,908,598),"coin":(522,595,568,642),"coin-side":(580,595,617,635),"potion":(631,590,669,634),
 "chest-wood":(684,579,758,644),"scroll":(786,612,853,685),"camera":(865,611,915,651),"backpack":(455,622,513,688),
 "tablet":(585,649,648,694),"book":(662,645,718,683),"badge-shield":(460,697,500,746),"medal-purple":(512,695,565,746),
 "crate":(579,701,620,746),"lock-box":(636,694,675,746),"idea-bulb":(691,697,730,746),"gear":(792,702,838,746)}
for n,b in rewards.items(): cutout("rewards", n, b, 3)
cutout("rewards","controller",(600,333,688,405),3.5)
# ---- floating islands, rocks, clouds ----
isl = {"island-forest":(940,555,1069,720),"island-waterfall":(1072,535,1173,755),"island-disc-amber":(1182,534,1248,572),
 "island-disc-violet":(1260,567,1325,608),"island-tower":(1171,585,1263,700),"rock-spire":(1267,607,1395,745),
 "island-mini":(850,659,915,746)}
for n,b in isl.items(): cutout("world", n, b, 3.5)
for n,b in {"cloud-white":(1337,525,1510,600),"cloud-blue":(1167,322,1255,385),"cloud-sunset":(1345,310,1520,378),"cloud-violet":(1395,372,1525,420)}.items():
    cutout("world", n, b, 3.5, cloud=True)
# ---- skill path / map / elements ----
cutout("school", "mission-map", (460,780,558,943), 3.5)
for n,b in {"fire":(767,880,796,925),"water":(820,880,852,925),"leaf":(872,880,906,925)}.items(): cutout("icons", n, b, 4)
print("ok")
