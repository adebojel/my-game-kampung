import os
import json

models_dir = "www/assets/models"
glb_files = [f for f in os.listdir(models_dir) if f.endswith(".glb")]

characters = []
environment = []

# DAFTAR KATA KUNCI KATEGORI
char_keywords = ["man", "woman", "swat", "worker", "adventurer", "person", "character"]
house_keywords = ["house", "building", "tower", "castle", "hut", "wall", "store"]
tree_keywords = ["tree", "bush", "flower", "plant", "pine"]
vehicle_keywords = ["car", "suv", "bus", "truck", "motorcycle", "train", "taxi"]

for f in glb_files:
    filename_lower = f.lower()
    filepath = f"assets/models/{f}"

    # Filter Karakter Manusia
    if any(k in filename_lower for k in char_keywords):
        name = f.replace(".glb", "")
        characters.append({"name": f"👤 {name}", "file": filepath})
    # Filter Lingkungan / Properti
    else:
        scale = 1.8
        if any(k in filename_lower for k in house_keywords):
            scale = 3.0
        elif any(k in filename_lower for k in tree_keywords):
            scale = 2.0
        elif any(k in filename_lower for k in vehicle_keywords):
            scale = 2.5

        environment.append({"file": filepath, "scale": scale})

data = {
    "characters": characters,
    "environment": environment
}

output_path = "www/assets/models.json"
with open(output_path, "w", encoding="utf-8") as out:
    json.dump(data, out, indent=2, ensure_ascii=False)

print(f"Berhasil! Terdeteksi {len(characters)} Karakter & {len(environment)} Properti Lingkungan.")
