"""Generate fixture/data/products.csv deterministically (~5000 rows). Run once; output is committed."""
import csv
import itertools
from pathlib import Path

FAMILIES = [
    # (category, brand, models, variant axes)
    ("Laptop", "Lenovo", ["ThinkPad X1 Carbon Gen 11", "ThinkPad X1 Carbon Gen 12", "ThinkPad X1 Carbon Gen 13", "ThinkPad T14 Gen 4", "ThinkPad T14 Gen 5", "ThinkPad E14 Gen 6", "IdeaPad Slim 5", "Legion 5 Pro", "Yoga 7i"], "laptop"),
    ("Laptop", "Dell", ["XPS 13", "XPS 14", "XPS 16", "Latitude 5440", "Latitude 7440", "Inspiron 15", "Precision 3581"], "laptop"),
    ("Laptop", "HP", ["EliteBook 840 G10", "EliteBook 840 G11", "Pavilion 15", "Spectre x360 14", "ProBook 450 G10", "Envy 16"], "laptop"),
    ("Laptop", "Apple", ["MacBook Air 13 M3", "MacBook Air 15 M3", "MacBook Pro 14 M4", "MacBook Pro 16 M4"], "laptop"),
    ("Laptop", "ASUS", ["ZenBook 14 OLED", "ZenBook S 13 OLED", "ROG Zephyrus G14", "Vivobook 15", "TUF Gaming A15"], "laptop"),
    ("Laptop", "Acer", ["Swift Go 14", "Aspire 5", "Nitro V 15", "Predator Helios Neo 16"], "laptop"),
    ("Laptop", "Microsoft", ["Surface Laptop 7", "Surface Pro 11"], "laptop"),
    ("Phone", "Apple", ["iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max", "iPhone 16", "iPhone 16 Pro", "iPhone 16 Pro Max"], "phone"),
    ("Phone", "Samsung", ["Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "Galaxy S25", "Galaxy S25 Ultra", "Galaxy A55", "Galaxy Z Flip6", "Galaxy Z Fold6"], "phone"),
    ("Phone", "Google", ["Pixel 8", "Pixel 8 Pro", "Pixel 9", "Pixel 9 Pro", "Pixel 9 Pro XL"], "phone"),
    ("Phone", "OnePlus", ["OnePlus 12", "OnePlus 12R", "OnePlus Nord 4"], "phone"),
    ("Phone", "Xiaomi", ["Xiaomi 14", "Xiaomi 14 Ultra", "Redmi Note 13 Pro"], "phone"),
    ("Headphones", "Sony", ["WH-1000XM4", "WH-1000XM5", "WF-1000XM5", "ULT Wear"], "audio"),
    ("Headphones", "Bose", ["QuietComfort Ultra Headphones", "QuietComfort 45", "QuietComfort Ultra Earbuds"], "audio"),
    ("Headphones", "Apple", ["AirPods Pro 2", "AirPods 4", "AirPods Max"], "audio"),
    ("Headphones", "Sennheiser", ["Momentum 4 Wireless", "Momentum True Wireless 4"], "audio"),
    ("Headphones", "JBL", ["Tune 770NC", "Live 770NC"], "audio"),
    ("Monitor", "Dell", ["UltraSharp U2724D", "UltraSharp U2723QE", "UltraSharp U3223QE", "S2721DS"], "monitor"),
    ("Monitor", "LG", ["UltraGear 27GP850", "UltraGear 27GR95QE", "UltraFine 27UQ850", "DualUp 28MQ780"], "monitor"),
    ("Monitor", "Samsung", ["Odyssey G7", "Odyssey OLED G9", "ViewFinity S8"], "monitor"),
    ("Monitor", "ASUS", ["ProArt PA278QV", "ROG Swift PG27AQDM"], "monitor"),
    ("Monitor", "BenQ", ["PD2705U", "MOBIUZ EX2710Q"], "monitor"),
    ("Accessory", "Logitech", ["MX Master 3S", "MX Keys S", "MX Anywhere 3S", "G Pro X Superlight 2", "Lift Vertical"], "accessory"),
    ("Accessory", "Apple", ["Magic Keyboard", "Magic Mouse", "Magic Trackpad"], "accessory"),
    ("Accessory", "Razer", ["DeathAdder V3", "BlackWidow V4", "Basilisk V3"], "accessory"),
    ("Console", "Sony", ["PlayStation 5 Slim", "PlayStation 5 Pro", "DualSense Edge Controller"], "console"),
    ("Console", "Nintendo", ["Switch OLED", "Switch Lite", "Pro Controller"], "console"),
    ("Console", "Microsoft", ["Xbox Series X", "Xbox Series S", "Xbox Wireless Controller"], "console"),
]

AXES = {
    "laptop": [["16GB", "32GB"], ["512GB SSD", "1TB SSD"], ["Black", "Silver", "Grey"]],
    "phone": [["128GB", "256GB", "512GB", "1TB"], ["Black", "White", "Blue", "Green", "Titanium"]],
    "audio": [["Black", "Silver", "White", "Blue", "Sand"]],
    "monitor": [["with stand", "VESA only", "with 3y warranty"]],
    "accessory": [["Graphite", "Pale Grey", "Black", "White"], ["US layout", "Nordic layout", "UK layout"]],
    "console": [["Standard", "Digital Edition", "Bundle"]],
}
CONDITIONS = ["New", "Refurbished Grade A", "Refurbished Grade B", "Open Box"]

rows = []
for category, brand, models, axis in FAMILIES:
    for model in models:
        for combo in itertools.product(*AXES[axis], CONDITIONS):
            *variant, condition = combo
            suffix = "" if condition == "New" else f" ({condition})"
            rows.append((category, brand, f"{brand} {model} {' '.join(variant)}".strip() + suffix, condition))

out = Path(__file__).parent / "fixture" / "data" / "products.csv"
out.parent.mkdir(parents=True, exist_ok=True)
with out.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["id", "name", "brand", "category", "condition"])
    for i, (category, brand, name, condition) in enumerate(rows, 1):
        w.writerow([f"P{i:05d}", name, brand, category, condition])
print(len(rows), "rows ->", out)
