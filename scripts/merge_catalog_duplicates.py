"""Merge known legacy cards into their exact price-list counterparts.

The legacy card keeps its stable ID, curated image and description. Exact Russian
name, current price and commercial metadata come from the imported XLS card.
Running the migration more than once is safe.
"""

import json
import os
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "web" / "products.json"
LEGACY_TO_IMPORTED = {1: 96, 2: 97, 3: 98, 4: 99, 22: 120}
COMMERCIAL_FIELDS = ("cat", "pricePerKg", "packKg", "priceUnit", "tag", "country", "visible")


def main() -> None:
    products = json.loads(CATALOG.read_text(encoding="utf-8"))
    by_id = {int(product["id"]): product for product in products}
    remove_ids: set[int] = set()

    for legacy_id, imported_id in LEGACY_TO_IMPORTED.items():
        legacy = by_id.get(legacy_id)
        imported = by_id.get(imported_id)
        if not legacy or not imported:
            continue
        legacy.setdefault("name", {})["ru"] = imported["name"]["ru"]
        for field in COMMERCIAL_FIELDS:
            if field in imported:
                legacy[field] = imported[field]
        remove_ids.add(imported_id)

    products = [product for product in products if int(product["id"]) not in remove_ids]
    for index, product in enumerate(products):
        product["sortOrder"] = index

    descriptor, temporary_name = tempfile.mkstemp(prefix="products-", suffix=".json", dir=CATALOG.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as file:
            json.dump(products, file, ensure_ascii=False, indent=2)
            file.write("\n")
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary_name, CATALOG)
    finally:
        Path(temporary_name).unlink(missing_ok=True)

    print(f"Catalog contains {len(products)} products; merged {len(remove_ids)} duplicates.")


if __name__ == "__main__":
    main()
