#!/usr/bin/env python3
"""Convert the Gallery requests log (.xlsx) into src/data/seed-requests.json.

Stdlib only (zipfile + xml.etree) — no openpyxl needed.

    python3 -I scripts/import-xlsx.py path/to/Gallery_Requests_Log.xlsx

Reads the "Feature Requests" sheet only. Link 1–3 cells hold real hyperlinks,
resolved through the sheet's _rels file.
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

M = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"
SHEET_NAME = "Feature Requests"
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "seed-requests.json"

CATEGORY_BUCKET = {
    "Store, Pricing & Payments": "store",
    "Print Labs & Products": "store",
    "Integrations, CRM & Website": "marketing",
    "Gallery Design & Branding": "brandkit",
    "Organization (Sets/Folders/Collections)": "collection",
}

# Manual corrections after reading each request (keyed by row #).
OVERRIDES = {
    # watermarks + delivery-email styling -> brandkit
    **dict.fromkeys([19, 71, 73, 92, 137, 35, 56], "brandkit"),
    # paid download caps / selling unwatermarked files -> store
    **dict.fromkeys([2, 32, 54, 79, 131], "store"),
    # layouts, image viewing, imports, API, Lightroom, webhooks -> gallery
    **dict.fromkeys([16, 59, 125, 27, 67, 144, 105, 146, 5, 13, 53, 114, 17], "gallery"),
    # per-collection branding + collections view -> collection
    **dict.fromkeys([147, 148], "collection"),
    # time-based sales, link previews, promo banners -> marketing
    **dict.fromkeys([41, 30, 88], "marketing"),
}


def q(tag, ns=M):
    return f"{{{ns}}}{tag}"


def sheet_path(z):
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    targets = {r.get("Id"): r.get("Target") for r in rels.iter(q("Relationship", PKG))}
    for s in wb.iter(q("sheet")):
        if s.get("name") == SHEET_NAME:
            return "xl/" + targets[s.get(q("id", R))].lstrip("/").removeprefix("xl/")
    raise SystemExit(f'Sheet "{SHEET_NAME}" not found')


def main(src):
    z = zipfile.ZipFile(src)
    strings = [
        "".join(t.text or "" for t in si.iter(q("t")))
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(q("si"))
    ]
    path = sheet_path(z)
    rels_path = path.replace("worksheets/", "worksheets/_rels/") + ".rels"
    rels = {
        r.get("Id"): r.get("Target")
        for r in ET.fromstring(z.read(rels_path)).iter(q("Relationship", PKG))
    }
    sheet = ET.fromstring(z.read(path))
    links = {h.get("ref"): rels.get(h.get(q("id", R))) for h in sheet.iter(q("hyperlink"))}

    rows = []
    for row in sheet.find(q("sheetData")).findall(q("row")):
        cells = {}
        for c in row.findall(q("c")):
            v = c.find(q("v"))
            if c.get("t") == "s" and v is not None:
                val = strings[int(v.text)]
            elif c.get("t") == "inlineStr":
                val = "".join(t.text or "" for t in c.iter(q("t")))
            else:
                val = v.text if v is not None else None
            ref = c.get("r")
            cells[re.match(r"[A-Z]+", ref).group(0)] = (val, links.get(ref))
        rows.append(cells)

    header = {(v or "").strip(): col for col, (v, _) in rows[0].items()}
    col = lambda name: header[name]
    link_cols = [header[k] for k in ("Link 1", "Link 2", "Link 3") if k in header]

    out = []
    for cells in rows[1:]:
        get = lambda name: (cells.get(col(name)) or (None, None))[0]
        n = get("#")
        text = (get("Feature Request") or "").strip()
        if not n or not text:
            continue
        n = int(float(n))
        category = (get("Category") or "Other").strip()
        url_list = []
        for lc in link_cols:
            url = (cells.get(lc) or (None, None))[1]
            if url and url.startswith("https://") and url not in url_list:
                url_list.append(url)
        out.append({
            "id": f"r{n}",
            "n": n,
            "date": (get("Activity Date") or "").strip()[:10],
            "text": text,
            "category": category,
            "mentions": max(1, int(float(get("Mentions") or 1))),
            "origin": (get("Origin") or "").strip(),
            "source": (get("Source Channel / Ref") or "").strip(),
            "links": url_list,
            "bucket": OVERRIDES.get(n, CATEGORY_BUCKET.get(category, "gallery")),
        })

    out.sort(key=lambda r: r["n"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    counts = {}
    for r in out:
        counts[r["bucket"]] = counts.get(r["bucket"], 0) + 1
    print(f"Wrote {len(out)} requests to {OUT}")
    print("Buckets:", counts)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
