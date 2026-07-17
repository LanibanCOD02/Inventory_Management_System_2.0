from PIL import Image

def crop_transparent(image_path, output_path):
    img = Image.open(image_path).convert("RGBA")
    
    # Get the bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        # Crop the image to the bounding box
        img_cropped = img.crop(bbox)
        # Resize to exactly 163x64 as requested, using Lanczos resampling for best quality
        img_resized = img_cropped.resize((163, 64), Image.Resampling.LANCZOS)
        img_resized.save(output_path, "PNG")
        print(f"Cropped and resized to {img_resized.size}. Saved to {output_path}")
    else:
        print("Image is entirely transparent.")

crop_transparent("Logopix.png", "Logopix_cropped.png")
