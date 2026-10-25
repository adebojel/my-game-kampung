#!/usr/bin/env python3
"""
Unduh peta nyata (OpenStreetMap) + ketinggian (AWS Terrain Tiles, dari SRTM)
untuk area Cidadap - Cicurug + Gunung Salak, lalu simpan jadi data game.

Pakai (di PC yang ada internet):
    pip install pillow numpy
    python fetch_map.py
Hasil:
    www/data/map.json    -> jalan, rel, bangunan (sudah jadi kotak berputar), tempat
    www/data/heights.bin -> grid ketinggian Float32 (meter)

Koordinat game: x = timur (+), z = selatan (+), y = ketinggian dari titik asal.
Titik asal (0,0) = rumah karakter di Cidadap.
Data (c) OpenStreetMap contributors (ODbL), wajib dicantumkan di credit game.
"""
import argparse, io, json, math, os, struct, sys, time
import urllib.parse, urllib.request

# --- Default area ---------------------------------------------------------
# Cidadap (asal) dan Cicurug dari koordinat yang kamu kirim:
ORIGIN = (-6.761489, 106.740925)   # 6°45'41.36"S 106°44'27.33"E
CICURUG = (-6.780878, 106.782925)  # 6°46'51.16"S 106°46'58.53"E
# S, W, N, E  (utara dilebarkan agar Gunung Salak & Kawah Ratu masuk)
DEFAULT_BBOX = (-6.83, 106.70, -6.69, 106.82)

OVERPASS = "https://overpass-api.de/api/interpreter"
TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
UA = {"User-Agent": "game-kampung-map-builder/1.0"}


# --- Proyeksi lokal -------------------------------------------------------
class Proj:
    def __init__(self, lat0, lon0):
        self.lat0, self.lon0 = lat0, lon0
        self.kx = 111320.0 * math.cos(math.radians(lat0))
        self.kz = 110574.0

    def xz(self, lat, lon):
        return ((lon - self.lon0) * self.kx, (self.lat0 - lat) * self.kz)


# --- Bangunan -> kotak berputar (untuk instancing House.glb dsb.) ----------
def oriented_box(pts):
    """pts: [(x,z),...] -> (cx, cz, width, depth, angle_rad) atau None."""
    if len(pts) < 3:
        return None
    best, best_len = 0.0, -1.0
    for i in range(len(pts) - 1):
        dx, dz = pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]
        L = math.hypot(dx, dz)
        if L > best_len:
            best_len, best = L, math.atan2(dz, dx)
    c, s = math.cos(-best), math.sin(-best)
    rot = [(x * c - z * s, x * s + z * c) for x, z in pts]
    xs, zs = [p[0] for p in rot], [p[1] for p in rot]
    w, d = max(xs) - min(xs), max(zs) - min(zs)
    mx, mz = (max(xs) + min(xs)) / 2, (max(zs) + min(zs)) / 2
    c2, s2 = math.cos(best), math.sin(best)
    return (mx * c2 - mz * s2, mx * s2 + mz * c2, w, d, best)


# --- OSM ------------------------------------------------------------------
def overpass(bbox, retries=3):
    s, w, n, e = bbox
    q = f"""[out:json][timeout:180];
(
  way["highway"]({s},{w},{n},{e});
  way["building"]({s},{w},{n},{e});
  way["railway"]({s},{w},{n},{e});
  way["waterway"~"river|stream"]({s},{w},{n},{e});
  way["natural"="water"]({s},{w},{n},{e});
  node["railway"~"station|halt"]({s},{w},{n},{e});
  node["place"~"village|hamlet|town|suburb"]({s},{w},{n},{e});
  node["amenity"~"police|fire_station"]({s},{w},{n},{e});
  node["natural"="peak"]({s},{w},{n},{e});
);
out geom;"""
    data = urllib.parse.urlencode({"data": q}).encode()
    for t in range(retries):
        try:
            req = urllib.request.Request(OVERPASS, data=data, headers=UA)
            with urllib.request.urlopen(req, timeout=240) as r:
                return json.load(r)["elements"]
        except Exception as ex:
            print(f"  Overpass gagal ({ex}), ulang {t + 1}/{retries}...", file=sys.stderr)
            time.sleep(10 * (t + 1))
    return []


def split_bbox(bbox, n=3):
    s, w, nn, e = bbox
    out = []
    for i in range(n):
        for j in range(n):
            out.append((s + (nn - s) * i / n, w + (e - w) * j / n,
                        s + (nn - s) * (i + 1) / n, w + (e - w) * (j + 1) / n))
    return out


ROAD_WIDTH = {"motorway": 14, "trunk": 12, "primary": 10, "secondary": 8, "tertiary": 7,
              "residential": 6, "unclassified": 5, "service": 4, "track": 3,
              "path": 1.5, "footway": 1.5, "steps": 1.5, "pedestrian": 3}


def convert(elements, proj, min_area=12.0):
    roads, rails, waters, buildings, places = [], [], [], [], []
    seen = set()
    for el in elements:
        key = (el["type"], el["id"])
        if key in seen:
            continue
        seen.add(key)
        tags = el.get("tags", {})
        if el["type"] == "node":
            x, z = proj.xz(el["lat"], el["lon"])
            kind = ("station" if tags.get("railway") in ("station", "halt") else
                    tags.get("amenity") or tags.get("place") or tags.get("natural"))
            places.append({"kind": kind, "name": tags.get("name", ""), "x": round(x, 1), "z": round(z, 1),
                           "ele": tags.get("ele")})
            continue
        geom = el.get("geometry")
        if not geom:
            continue
        pts = [proj.xz(g["lat"], g["lon"]) for g in geom]
        rp = [[round(x, 1), round(z, 1)] for x, z in pts]
        if "building" in tags:
            ob = oriented_box(pts)
            if ob and ob[2] * ob[3] >= min_area:
                lv = tags.get("building:levels")
                try:
                    h = float(lv) * 3.0 if lv else 4.0
                except ValueError:
                    h = 4.0
                buildings.append([round(ob[0], 1), round(ob[1], 1), round(ob[2], 1), round(ob[3], 1),
                                  round(ob[4], 3), h, tags.get("building", "yes")])
        elif "highway" in tags:
            hw = tags["highway"]
            roads.append({"t": hw, "w": ROAD_WIDTH.get(hw, 4), "n": tags.get("name", ""), "p": rp})
        elif "railway" in tags:
            rails.append({"t": tags["railway"], "p": rp})
        elif "waterway" in tags or tags.get("natural") == "water":
            waters.append({"t": tags.get("waterway") or "water", "p": rp})
    return {"roads": roads, "rails": rails, "waters": waters, "buildings": buildings, "places": places}


# --- Elevasi --------------------------------------------------------------
def tile_xy(lat, lon, z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def fetch_heights(bbox, proj, spacing=25.0, zoom=13):
    import numpy as np
    from PIL import Image
    s, w, n, e = bbox
    x0f, y0f = tile_xy(n, w, zoom)
    x1f, y1f = tile_xy(s, e, zoom)
    tx0, tx1, ty0, ty1 = int(x0f), int(x1f), int(y0f), int(y1f)
    W, H = (tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256
    mosaic = np.zeros((H, W), dtype=np.float32)
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            url = TILE_URL.format(z=zoom, x=tx, y=ty)
            print("  tile", tx, ty)
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                im = np.asarray(Image.open(io.BytesIO(r.read())).convert("RGB"), dtype=np.float32)
            mosaic[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = \
                im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768

    # grid game: x dari xmin..xmax, z dari zmin..zmax, jarak 'spacing' meter
    xmin, zmin = proj.xz(n, w)
    xmax, zmax = proj.xz(s, e)
    cols = int((xmax - xmin) / spacing) + 1
    rows = int((zmax - zmin) / spacing) + 1
    grid = np.zeros((rows, cols), dtype=np.float32)
    for r in range(rows):
        z = zmin + r * spacing
        lat = proj.lat0 - z / proj.kz
        for c in range(cols):
            x = xmin + c * spacing
            lon = proj.lon0 + x / proj.kx
            fx, fy = tile_xy(lat, lon, zoom)
            px = min(max(int((fx - tx0) * 256), 0), W - 1)
            py = min(max(int((fy - ty0) * 256), 0), H - 1)
            grid[r, c] = mosaic[py, px]
    return grid, dict(cols=cols, rows=rows, spacing=spacing, xmin=round(xmin, 1), zmin=round(zmin, 1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bbox", nargs=4, type=float, metavar=("S", "W", "N", "E"), default=DEFAULT_BBOX)
    ap.add_argument("--out", default="www/data")
    ap.add_argument("--spacing", type=float, default=25.0, help="jarak grid ketinggian (m)")
    a = ap.parse_args()
    bbox = tuple(a.bbox)
    os.makedirs(a.out, exist_ok=True)
    proj = Proj(*ORIGIN)

    print("1/3 Unduh OSM (9 potongan)...")
    els = []
    for i, bb in enumerate(split_bbox(bbox)):
        print(f"  potongan {i + 1}/9")
        els += overpass(bb)
        time.sleep(2)
    data = convert(els, proj)

    print("2/3 Unduh ketinggian...")
    grid, meta = fetch_heights(bbox, proj, a.spacing)
    base = float(grid[int(-meta["zmin"] / meta["spacing"]), int(-meta["xmin"] / meta["spacing"])])
    meta["originElevation"] = round(base, 1)
    meta["minElevation"] = round(float(grid.min()), 1)
    meta["maxElevation"] = round(float(grid.max()), 1)

    print("3/3 Simpan...")
    cx, cz = proj.xz(*CICURUG)
    data["meta"] = {"origin": {"lat": ORIGIN[0], "lon": ORIGIN[1]}, "cicurug": {"x": round(cx, 1), "z": round(cz, 1)},
                    "bbox": bbox, "heights": meta, "credit": "(c) OpenStreetMap contributors"}
    with open(os.path.join(a.out, "map.json"), "w") as f:
        json.dump(data, f, separators=(",", ":"))
    with open(os.path.join(a.out, "heights.bin"), "wb") as f:
        f.write(struct.pack(f"<{grid.size}f", *grid.flatten()))
    print(f"Selesai: {len(data['roads'])} jalan, {len(data['buildings'])} bangunan, "
          f"{len(data['rails'])} rel, {len(data['places'])} tempat. Tinggi {meta['minElevation']}..{meta['maxElevation']} m")


if __name__ == "__main__":
    main()
