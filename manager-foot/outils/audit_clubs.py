"""Audit reproductible des noms et logos du mode monde réel.

Usage : python outils/audit_clubs.py
Vérifie les données du dépôt et les médias déjà inclus, sans faire de requête réseau.
"""
from __future__ import annotations

import gzip
import io
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PACKS = ROOT / "packs"


def audit() -> dict:
    corrections = json.loads((PACKS / "noms-reels-fmscout.json").read_text(encoding="utf-8"))["clubs"]
    entries = []
    for path in sorted(PACKS.glob("monde-*.json.gz")):
        with gzip.open(path, "rt", encoding="utf-8") as source:
            country = json.load(source)
        entries.extend((path.stem, club) for club in country["clubs"])

    parts = sorted(PACKS.glob("football-monde-fmb-v15.zip.*"))
    archive = b"".join(part.read_bytes() for part in parts)
    with ZipFile(io.BytesIO(archive)) as z:
        local_logos = {
            item.filename.rsplit("/", 1)[-1][5:-5]
            for item in z.infolist()
            if item.filename.rsplit("/", 1)[-1].startswith("club_")
            and item.filename.endswith(".webp")
            and item.file_size > 0
        }

    ids = [str(c.get("fmUid", "")) for _, c in entries]
    names = [corrections.get(uid, {}).get("name") or c.get("name", "") for uid, (_, c) in zip(ids, entries)]
    logo_urls = [c.get("logo", "") for _, c in entries]
    domains = Counter(urlparse(url).netloc for url in logo_urls if url)
    missing = [
        {"id": uid, "name": name, "country_pack": source}
        for uid, name, (source, _) in zip(ids, names, entries)
        if uid not in local_logos
    ]
    return {
        "scope": "Pack monde réel embarqué, instantané FM26 ; aucun contrôle du web ou des licences des logos",
        "clubs": len(entries),
        "unique_ids": len(set(ids)),
        "unique_names_after_corrections": len(set(names)),
        "missing_names": sum(not name.strip() for name in names),
        "name_corrections_applied": sum(uid in corrections for uid in ids),
        "logos_with_url": sum(bool(urlparse(url).scheme == "https" and urlparse(url).netloc) for url in logo_urls),
        "logo_domains": dict(domains),
        "local_logos_in_existing_archive": sum(uid in local_logos for uid in ids),
        "logos_without_local_file": missing,
    }


if __name__ == "__main__":
    print(json.dumps(audit(), ensure_ascii=False, indent=2))
