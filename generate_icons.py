#!/usr/bin/env python3
"""Generate PWA icons and favicons for ImgDivider."""

from PIL import Image, ImageDraw
import os

OUTPUT_DIR = "src/assets/icons"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Icon sizes needed
SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512]

def create_icon(size):
    """Create a rounded-square icon with a grid motif."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background: gradient-ish using solid color with rounded corners
    padding = max(2, size // 32)
    radius = size // 6
    bg_color = (99, 102, 241, 255)  # Indigo accent
    shadow_color = (79, 70, 229, 255)

    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=radius,
        fill=bg_color
    )

    # Grid lines (2x2 grid)
    margin = size // 4
    line_color = (255, 255, 255, 230)
    line_width = max(2, size // 32)

    # Vertical line
    draw.line([(size // 2, margin), (size // 2, size - margin)],
              fill=line_color, width=line_width)
    # Horizontal line
    draw.line([(margin, size // 2), (size - margin, size // 2)],
              fill=line_color, width=line_width)

    # Rounded corners for grid cells
    cell_radius = max(2, size // 24)
    cell_size = (size - margin * 2 - line_width) // 2
    offset = line_width // 2

    # Top-left cell highlight
    draw.rounded_rectangle(
        [margin, margin, margin + cell_size, margin + cell_size],
        radius=cell_radius,
        fill=(255, 255, 255, 40)
    )

    # Bottom-right cell highlight
    start = size - margin - cell_size
    draw.rounded_rectangle(
        [start, start, size - margin, size - margin],
        radius=cell_radius,
        fill=(255, 255, 255, 40)
    )

    return img

# Generate all sizes
for sz in SIZES:
    icon = create_icon(sz)
    if sz in (16, 32):
        fname = f"favicon-{sz}.png"
    else:
        fname = f"icon-{sz}.png"
    path = os.path.join(OUTPUT_DIR, fname)
    icon.save(path, "PNG")
    print(f"Generated {fname}")

print("All icons generated successfully!")
