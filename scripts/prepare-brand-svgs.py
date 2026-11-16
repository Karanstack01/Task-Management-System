import os
import xml.etree.ElementTree as ET

sd_dir = os.path.join("public", "sd")
color_path = os.path.join(sd_dir, "stackdrove-color.svg")
inverse_path = os.path.join(sd_dir, "stackdrove-inverse.svg")

with open(color_path, "r", encoding="utf-8") as f:
    color_content = f.read()

with open(inverse_path, "r", encoding="utf-8") as f:
    inverse_content = f.read()

# 1. Full logo trimmed viewBox="150 1580 4080 1060"
color_full = color_content.replace('viewBox="0 0 4358 4358" width="4358" height="4358"', 'viewBox="150 1580 4080 1060"')
with open(os.path.join(sd_dir, "stackdrove-logo-light.svg"), "w", encoding="utf-8") as f:
    f.write(color_full)

inverse_full = inverse_content.replace('viewBox="0 0 4358 4358" width="4358" height="4358"', 'viewBox="150 1580 4080 1060"')
with open(os.path.join(sd_dir, "stackdrove-logo-dark.svg"), "w", encoding="utf-8") as f:
    f.write(inverse_full)

# 2. Mark icon trimmed viewBox="140 1580 860 1060"
def make_mark(src_file, out_file, fill_color):
    tree = ET.parse(src_file)
    root = tree.getroot()
    paths = root.findall('.//{http://www.w3.org/2000/svg}path')[:2]
    new_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="140 1580 860 1060" role="img" aria-label="StackDrove icon">\n'
    for p in paths:
        d = p.attrib.get('d', '')
        new_svg += f'  <path fill="{fill_color}" d="{d}" />\n'
    new_svg += '</svg>'
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(new_svg)

make_mark(color_path, os.path.join(sd_dir, "stackdrove-mark-light.svg"), "#0C132B")
make_mark(inverse_path, os.path.join(sd_dir, "stackdrove-mark-dark.svg"), "#FFFFFF")
make_mark(inverse_path, os.path.join(sd_dir, "stackdrove-mark-chartreuse.svg"), "#D4F20D")
make_mark(inverse_path, os.path.join(sd_dir, "stackdrove-mark-blue.svg"), "#2357D6")

print("Successfully generated all brand SVG assets in public/sd/")

