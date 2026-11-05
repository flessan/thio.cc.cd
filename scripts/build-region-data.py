#!/usr/bin/env python3
"""
Build the region data used by the /kerja weather picker.

Source: https://github.com/cahyadsn/wilayah (MIT)
  db/wilayah_level_1_2.sql — provinces and kabupaten/kota with centroid
  coordinates, elevation, timezone, area, population and simplified polygons.

This script is not part of the site build. Run it only when the upstream data
changes:

    git clone --depth 1 --filter=blob:none --sparse \
        https://github.com/cahyadsn/wilayah.git /tmp/wilayah
    git -C /tmp/wilayah sparse-checkout set --no-cone 'db/wilayah_level_1_2.sql'
    python3 scripts/build-region-data.py /tmp/wilayah/db/wilayah_level_1_2.sql

Outputs:
  data/bmkg-locations.json           BMKG adm4 points enriched with region metadata
  data/wilayah-provinces.json        province metadata for browsing/search
  public/geo/indonesia-provinces.geojson  simplified province polygons for the map
"""

from __future__ import annotations

import argparse
import json
from datetime import date
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BMKG_PATH = ROOT / "data" / "bmkg-locations.json"
PROVINCE_PATH = ROOT / "data" / "wilayah-provinces.json"
GEO_PATH = ROOT / "public" / "geo" / "indonesia-provinces.geojson"

TOLERANCE = 0.008  # degrees, roughly 800 m — plenty at country zoom
NUMBER = r"(?:-?[\d.]+|NULL)"
HEAD_RE = re.compile(
    r"\('([^']*)','((?:[^']|'')*)','((?:[^']|'')*)',\s*"
    rf"({NUMBER}),\s*({NUMBER}),\s*({NUMBER}),\s*({NUMBER}),\s*({NUMBER}),\s*({NUMBER}),\s*'"
)

# BMKG uses the short province names; Kepmendagri uses the long ones.
PROVINCE_DISPLAY = {
    "31": "DKI Jakarta",
    "34": "DI Yogyakarta",
}

ISLAND_BY_PREFIX = [
    (("11", "12", "13", "14", "15", "16", "17", "18", "19", "21"), "sumatra"),
    (("31", "32", "33", "34", "35", "36"), "java"),
    (("51", "52", "53"), "bali-nusa-tenggara"),
    (("61", "62", "63", "64", "65"), "kalimantan"),
    (("71", "72", "73", "74", "75", "76"), "sulawesi"),
    (("81", "82"), "maluku"),
    (("91", "92", "93", "94", "95", "96"), "papua"),
]


def island_of(code: str) -> str:
    for prefixes, island in ISLAND_BY_PREFIX:
        if code in prefixes:
            return island
    return "other"


def number(value: str, cast=float):
    value = value.strip()
    return None if value == "NULL" else cast(value)


def depth(value) -> int:
    level = 0
    while isinstance(value, list):
        value = value[0]
        level += 1
    return level


def point_segment_distance_sq(point, start, end) -> float:
    ax, ay = start
    bx, by = end
    px, py = point
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return (px - ax) ** 2 + (py - ay) ** 2
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2


def simplify(points: list[list[float]], tolerance: float) -> list[list[float]]:
    """Douglas–Peucker, iterative to avoid recursion limits on long rings."""
    if len(points) < 3 or tolerance <= 0:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    threshold = tolerance * tolerance
    while stack:
        start, end = stack.pop()
        if end <= start + 1:
            continue
        best = -1.0
        index = -1
        a, b = points[start], points[end]
        for i in range(start + 1, end):
            distance = point_segment_distance_sq(points[i], a, b)
            if distance > best:
                best = distance
                index = i
        if best > threshold:
            keep[index] = True
            stack.append((start, index))
            stack.append((index, end))
    return [point for point, kept in zip(points, keep) if kept]


def ring(coords: list, tolerance: float) -> list[list[float]] | None:
    points = [[round(lng, 4), round(lat, 4)] for lat, lng in coords]
    if len(points) > 1 and points[0] == points[-1]:
        points = points[:-1]
    if len(points) > 3:
        points = simplify(points, tolerance)
    if len(points) < 3:
        return None
    points.append(points[0])
    return points


def to_multipolygon(path: list, tolerance: float) -> dict:
    polygons = path if depth(path) == 4 else [path]
    coordinates = []
    for polygon in polygons:
        rings = []
        for candidate in polygon:
            if depth(candidate) != 2:
                continue
            simplified = ring(candidate, tolerance)
            if simplified:
                rings.append(simplified)
        if rings:
            coordinates.append(rings)
    return {"type": "MultiPolygon", "coordinates": coordinates}


def path_centroid(path: list) -> tuple[float, float] | None:
    points: list[tuple[float, float]] = []

    def walk(value) -> None:
        if not isinstance(value, list):
            return
        if len(value) >= 2 and isinstance(value[0], (int, float)) and isinstance(value[1], (int, float)):
            points.append((value[0], value[1]))
            return
        for item in value:
            walk(item)

    walk(path)
    if not points:
        return None
    lats = [point[0] for point in points]
    lngs = [point[1] for point in points]
    return ((min(lats) + max(lats)) / 2, (min(lngs) + max(lngs)) / 2)


def in_indonesia(lat: float | None, lon: float | None) -> bool:
    return lat is not None and lon is not None and -11.5 <= lat <= 7.0 and 94.0 <= lon <= 142.0


def polygon_centroid_from_sql(sql: str, code: str) -> tuple[float, float] | None:
    match = re.search(rf"\n\('{re.escape(code)}','", sql)
    if not match:
        return None
    head = HEAD_RE.match(sql[match.start() + 1 : match.start() + 700])
    if not head:
        return None
    start = match.start() + 1 + head.end()
    end = re.compile(r"'\),?\s*\d+\)").search(sql, start) or re.compile(r"'\s*,\s*\d+\)").search(
        sql, start
    )
    if not end:
        return None
    try:
        return path_centroid(json.loads(sql[start : end.start()]))
    except (ValueError, TypeError):
        return None


def parse_rows(sql: str) -> list[dict]:
    rows: list[dict] = []
    position = 0
    while True:
        start = sql.find("\n('", position)
        if start < 0:
            break
        start += 1
        match = HEAD_RE.match(sql[start : start + 700])
        if not match:
            raise SystemExit(f"Could not parse a row near offset {start}: {sql[start:start + 120]!r}")
        code = match.group(1)
        row = {
            "kode": code,
            "nama": match.group(2).replace("''", "'"),
            "ibukota": match.group(3).replace("''", "'"),
            "lat": number(match.group(4)),
            "lng": number(match.group(5)),
            "elv": number(match.group(6)),
            "tz": number(match.group(7), int),
            "luas": number(match.group(8)),
            "penduduk": number(match.group(9), int),
        }
        if "." not in code:
            path_start = start + match.end()
            end = re.compile(r"'\),?\s*\d+\)").search(sql, path_start) or re.compile(
                r"'\s*,\s*\d+\)"
            ).search(sql, path_start)
            if not end:
                raise SystemExit(f"Could not find the polygon end for province {code}")
            row["path"] = json.loads(sql[path_start : end.start()])
            position = end.end()
        else:
            position = start + match.end()
        rows.append(row)
    return rows


def normalize_name(name: str) -> str:
    text = unicodedata.normalize("NFKD", name)
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.lower()
    for prefix in ("kota administrasi ", "kabupaten ", "kota "):
        if text.startswith(prefix):
            text = text[len(prefix) :]
            break
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def kind_of(name: str) -> str:
    return "kota" if name.startswith("Kota") else "kabupaten"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sql", type=Path, help="path to wilayah_level_1_2.sql")
    args = parser.parse_args()

    rows = parse_rows(args.sql.read_text(encoding="utf-8"))
    provinces = [row for row in rows if "." not in row["kode"]]
    regencies = [row for row in rows if "." in row["kode"]]
    if len(provinces) != 38 or len(regencies) < 500:
        raise SystemExit(f"Unexpected row counts: {len(provinces)} provinces, {len(regencies)} regencies")

    by_code = {row["kode"]: row for row in regencies}
    by_name: dict[str, list[dict]] = {}
    for row in regencies:
        by_name.setdefault(normalize_name(row["nama"]), []).append(row)

    sql_text = args.sql.read_text(encoding="utf-8")
    bmkg = json.loads(BMKG_PATH.read_text(encoding="utf-8"))
    province_by_code = {row["kode"]: row for row in provinces}
    unmatched = []
    repaired = []
    for row in regencies:
        if in_indonesia(row["lat"], row["lng"]):
            continue
        centroid = polygon_centroid_from_sql(sql_text, row["kode"])
        if centroid and in_indonesia(*centroid):
            row["lat"], row["lng"] = centroid
            repaired.append(row["kode"])
        else:
            province = province_by_code[row["kode"][:2]]
            row["lat"], row["lng"] = province["lat"], province["lng"]
            repaired.append(f'{row["kode"]} (province fallback)')

    for entry in bmkg["locations"]:
        adm2 = ".".join(entry["adm4"].split(".")[:2])
        name_key = normalize_name(entry["name"])
        province_prefix = entry["adm4"][:2]
        candidates = by_name.get(name_key, [])
        if not candidates:
            # fall back to a contains match inside the same province
            candidates = [
                row
                for key, values in by_name.items()
                if key in name_key or name_key in key
                for row in values
                if row["kode"].startswith(province_prefix + ".")
            ]
        match = next((row for row in candidates if row["kode"] == adm2), None)
        if match is None and candidates:
            match = candidates[0]
        if match is None:
            match = by_code.get(adm2)
        if match is None:
            unmatched.append(entry["name"])
            continue

        province = province_by_code[match["kode"][:2]]
        entry.update(
            {
                "regencyCode": match["kode"],
                "capital": match["ibukota"] or None,
                "lat": match["lat"],
                "lon": match["lng"],
                "elevationM": match["elv"],
                "timezone": match["tz"],
                "areaKm2": match["luas"],
                "population": match["penduduk"],
                "kind": kind_of(match["nama"]),
                "officialName": match["nama"],
                "provinceCode": match["kode"][:2],
                "province": PROVINCE_DISPLAY.get(match["kode"][:2], province["nama"]),
            }
        )

    if unmatched:
        raise SystemExit(f"Unmatched BMKG locations: {unmatched}")

    bmkg["source"] = (
        "BMKG administrative codes (one representative desa/kelurahan per kabupaten/kota, "
        "https://github.com/Mikhaells/Prakiraan-Cuaca-Indonesia----BMKG) joined with "
        "cahyadsn/wilayah (MIT) coordinates, capitals, area and population "
        "(Kepmendagri No 300.2.2-2430 Tahun 2025)."
    )
    bmkg["note"] = (
        "One representative desa/kelurahan (adm4) per kabupaten/kota, used as a starting point "
        "for the BMKG forecast API. lat/lon are the regency centroids from cahyadsn/wilayah, "
        "not the forecast village. Village-level codes can be entered manually in the workspace."
    )
    BMKG_PATH.write_text(json.dumps(bmkg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    province_payload = {
        "source": "https://github.com/cahyadsn/wilayah (MIT), Kepmendagri No 300.2.2-2430 Tahun 2025",
        "generatedAt": date.today().isoformat(),
        "provinces": [
            {
                "code": row["kode"],
                "name": PROVINCE_DISPLAY.get(row["kode"], row["nama"]),
                "officialName": row["nama"],
                "capital": row["ibukota"] or None,
                "lat": row["lat"],
                "lon": row["lng"],
                "timezone": row["tz"],
                "areaKm2": row["luas"],
                "population": row["penduduk"],
                "regencyCount": sum(1 for reg in regencies if reg["kode"].startswith(row["kode"] + ".")),
                "island": island_of(row["kode"]),
            }
            for row in provinces
        ],
    }
    PROVINCE_PATH.write_text(
        json.dumps(province_payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )

    features = [
        {
            "type": "Feature",
            "properties": {
                "code": row["kode"],
                "name": PROVINCE_DISPLAY.get(row["kode"], row["nama"]),
                "island": island_of(row["kode"]),
                "capital": row["ibukota"] or "",
                "population": row["penduduk"] or 0,
            },
            "geometry": to_multipolygon(row["path"], TOLERANCE),
        }
        for row in provinces
    ]
    GEO_PATH.parent.mkdir(parents=True, exist_ok=True)
    GEO_PATH.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": features},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )

    if repaired:
        print(f"repaired coordinates: {', '.join(repaired)}")
    print(f"provinces: {len(provinces)}")
    print(f"regencies: {len(regencies)}")
    print(f"bmkg locations enriched: {len(bmkg['locations'])}")
    print(f"geo: {GEO_PATH.relative_to(ROOT)} ({GEO_PATH.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
