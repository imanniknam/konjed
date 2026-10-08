"""
HD asset pipeline.
Sources: assets/hd/*.png (user-supplied high-res scenes + sheets) and the original master sheet.
Everything low-res is upscaled with Real-ESRGAN (ncnn, x4plus-anime) and then down-sampled to a 2x delivery size.
Usage: ESRGAN=/path/to/realesrgan-ncnn-vulkan python3 scripts/extract-assets-v2.py
"""
import os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "public", "assets", "konjed")
ESR = os.environ.get("ESRGAN", "realesrgan-ncnn-vulkan")
ESR_DIR = os.path.dirname(ESR)

def load(p): return Image.open(os.path.join(ROOT, p)).convert("RGB")
OLD = load("assets/master-sheet.png")
SC = load("assets/hd/sheet-c.png")
SB = load("assets/hd/sheet-b.png")
HERO = load("assets/hd/hero-new.png")
ARC = load("assets/hd/arcade-new.png")

def esrgan(img, model="realesrgan-x4plus-anime"):
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, "a.png"), os.path.join(d, "b.png")
        img.save(a)
        subprocess.run([ESR, "-i", a, "-o", b, "-n", model, "-s", "4", "-m", os.path.join(ESR_DIR, "models")], check=True, capture_output=True)
        return Image.open(b).convert("RGB")

def save(img, folder, name, fmt, q=82):
    d = os.path.join(OUT, folder); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, f"{name}.{fmt}")
    if fmt == "webp": img.save(p, "WEBP", quality=q, method=6)
    else: img.save(p, "PNG", optimize=True)
    print("  ", folder, name, img.size)

def scene(src, folder, name, box=None, width=2400, sharpen=True, ai=True, small=1280):
    im = src.crop(box) if box else src
    if ai: im = esrgan(im)
    h = round(im.height * width / im.width)
    big = im.resize((width, h), Image.LANCZOS)
    if sharpen: big = big.filter(ImageFilter.UnsharpMask(radius=1.2, percent=45, threshold=3))
    save(big, folder, name, "webp", 80)
    if small:
        sm = big.resize((small, round(big.height * small / big.width)), Image.LANCZOS)
        save(sm, folder, name + "-sm", "webp", 78)

def cutout(src, folder, name, box, cloud=False, thr=48, out_w=None):
    r = esrgan(src.crop(box))
    a = np.asarray(r).astype(np.float32)
    if cloud:
        lum = a.max(axis=2)
        alpha = ndi.gaussian_filter(np.clip((lum - 34) / 130, 0, 1), 1.2)
        a = np.where(alpha[..., None] > 0.04, np.clip(a / np.maximum(alpha[..., None], 0.25), 0, 255), a)
        a = np.clip(a * 1.03 + 6, 0, 255)
    else:
        border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
        bg = np.median(border, axis=0)
        bgmask = np.sqrt(((a - bg) ** 2).sum(axis=2)) < thr
        lab, _ = ndi.label(bgmask)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        fg = ndi.binary_fill_holes(~np.isin(lab, list(edge)))
        fg = ndi.binary_opening(fg, iterations=2)
        alpha = ndi.gaussian_filter(fg.astype(np.float32), 1.6)
        alpha = np.clip((alpha - 0.4) / 0.45, 0, 1)
    img = Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), "RGBA")
    bb = img.getchannel("A").point(lambda v: 255 if v > 14 else 0).getbbox()
    if bb: img = img.crop(bb)
    w = out_w or max(240, int((box[2] - box[0]) * 3.5))
    img = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
    save(img, folder, name, "png")

if __name__ == "__main__":
    print("scenes")
    scene(HERO, "world", "hero-world", width=3000)
    scene(ARC, "arcade", "arcade-hall", width=3000)
    scene(OLD, "world", "final-sunset-world", box=(0, 725, 440, 1024), width=2400)
    scene(SC, "world", "castle-sky-world", box=(520, 45, 1018, 303), width=2400)
    scene(SC, "school", "school-interior", box=(2, 345, 517, 585), width=2400)
    scene(SB, "school", "school-people", box=(613, 345, 1120, 548), width=2000)
    scene(SC, "showcase", "showcase-gallery-night", box=(520, 345, 1018, 585), width=2400)
    scene(OLD, "arcade", "arcade-lounge", box=(410, 310, 590, 515), width=1600)
    print("game thumbnails")
    for n, b in {"house-island": (20, 532, 116, 615), "sea-island": (126, 532, 214, 615), "puzzle-grid": (224, 532, 315, 615),
                 "space-explorer": (325, 532, 420, 705), "classroom-scene": (20, 624, 116, 706), "racing-car": (126, 624, 214, 706),
                 "valley-landscape": (224, 624, 315, 706)}.items():
        scene(OLD, "arcade", f"game-{n}", box=b, width=640, small=0)
    print("rewards")
    rb = {"trophy": (25, 605, 128, 743), "medal-blue": (142, 612, 195, 668), "badge-purple": (216, 610, 269, 670), "crown": (290, 615, 350, 660),
          "badge-shield": (377, 612, 424, 660), "chest-red": (437, 610, 504, 665), "coin": (140, 682, 203, 742), "coin-side": (232, 682, 285, 739),
          "potion": (305, 677, 358, 743), "chest-wood": (371, 670, 453, 747), "crystal": (467, 676, 510, 740)}
    for n, b in rb.items(): cutout(SB, "rewards", n, b)
    cb = {"scroll": (1450, 432, 1526, 518), "backpack": (1043, 465, 1136, 563), "camera": (1146, 470, 1201, 513), "tablet": (1215, 467, 1286, 523),
          "book": (1300, 462, 1381, 518), "medal-purple": (1168, 521, 1228, 578), "crate": (1255, 527, 1311, 580), "idea-bulb": (1343, 522, 1383, 580),
          "gear": (1460, 527, 1511, 578), "badge-star": (1323, 337, 1376, 393), "controller": (488, 642, 586, 718), "shield": (683, 632, 766, 730),
          "sword": (610, 635, 666, 712)}
    for n, b in cb.items():
        if n in ("controller", "shield", "sword"):
            b = (b[0], b[1] - 0, b[2], b[3])
        cutout(SC, "rewards", n, b)
    print("world objects")
    ib = {"island-tower": (1025, 635, 1130, 767), "island-forest": (1138, 632, 1203, 697), "island-waterfall": (1220, 600, 1340, 762),
          "island-waterfall-2": (1133, 722, 1230, 827), "rock-spire": (1385, 667, 1510, 770), "island-mini": (1243, 775, 1299, 820),
          "island-disc-amber": (1182, 534, 1248, 572)}
    for n, b in ib.items():
        if n == "island-disc-amber": continue
        cutout(SC, "world", n, b, out_w=int((b[2] - b[0]) * 3.5))
    for n, b in {"cloud-white": (1345, 612, 1400, 645), "cloud-big": (1350, 755, 1433, 812), "cloud-blue": (1453, 767, 1518, 820), "cloud-violet": (1039, 775, 1103, 817)}.items():
        cutout(SC, "world", n, b, cloud=True, out_w=int((b[2] - b[0]) * 6))
    cutout(SC, "school", "mission-map", (35, 632, 250, 815), thr=30, out_w=900)
    print("done")

# ---- procedural cloud banks (soft volumetric look, transparent edges) for the cloud-wall transition
def cloud_bank(name, seed, w=1600, h=720):
    rng = np.random.default_rng(seed)
    n = np.zeros((h, w), np.float32)
    for o in range(6):
        f = ndi.gaussian_filter(rng.standard_normal((h, w)).astype(np.float32), 150 / 2 ** o, mode="wrap")
        n += f / (f.std() + 1e-6) * (0.58 ** o)
    n = (n - n.min()) / (n.max() - n.min())
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2 * 1.15)
    vig = np.clip(1.15 - r, 0, 1)
    d = np.clip((n - 0.36) * 5.0, 0, 1) * np.clip(vig * 1.8, 0, 1)
    a = np.clip(d, 0, 1) ** 0.75
    a = ndi.gaussian_filter(a, 2.0)
    sh = ndi.gaussian_filter(n, 6) - ndi.shift(ndi.gaussian_filter(n, 6), (-22, 10), mode="nearest")
    t = np.clip(0.62 + sh * 7.0 - yy / h * 0.18, 0, 1)[..., None]
    top, bot = np.array([255, 255, 255.0]), np.array([150, 176, 226.0])
    rgb = bot + (top - bot) * t
    img = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), "RGBA")
    img.save(os.path.join(OUT, "world", name + ".webp"), "WEBP", quality=84, method=6)
    print("  ", name, img.size)

if os.environ.get("CLOUDS", "1") == "1":
    for i, n in enumerate(["cloudbank-a", "cloudbank-b", "cloudbank-c"]):
        cloud_bank(n, 7 + i * 13)
