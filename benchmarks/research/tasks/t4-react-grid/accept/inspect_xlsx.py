"""Inspect an .xlsx without third-party code: first sheet must hold every customer and its subtotal."""
import json
import re
import sys
import zipfile

path = sys.argv[1]
EXPECT = {"Alpha Test ApS": 3497.5, "Beta Test A/S": 2146, "Gamma Test I/S": 1596}
out = {"valid_zip": False, "customers": {}, "subtotals": {}}
try:
    z = zipfile.ZipFile(path)
    names = z.namelist()
    out["valid_zip"] = "[Content_Types].xml" in names and "xl/workbook.xml" in names
    shared = z.read("xl/sharedStrings.xml").decode("utf-8") if "xl/sharedStrings.xml" in names else ""
    wb_rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8")
    wb = z.read("xl/workbook.xml").decode("utf-8")
    first_rid = re.search(r'<sheet\b[^>]*r:id="([^"]+)"', wb).group(1)
    target = re.search(r'Id="%s"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="%s"' % (first_rid, first_rid), wb_rels)
    target = (target.group(1) or target.group(2)).lstrip("/")
    sheet = z.read(target if target.startswith("xl/") else "xl/" + target).decode("utf-8")
    text = shared + sheet
    numbers = {float(v) for v in re.findall(r"<v>(-?[0-9.]+(?:E[+-]?\d+)?)</v>", sheet)}
    for c, total in EXPECT.items():
        out["customers"][c] = c.replace("&", "&amp;") in text or c in text
        out["subtotals"][c] = any(abs(n - total) < 0.005 for n in numbers)
except Exception as e:  # noqa: BLE001
    out["error"] = repr(e)
print(json.dumps(out))
