import os
import json
import pandas as pd

# Tentukan spesifik ke folder media/posts atau your_instagram_activity/media
# Sesuaikan path ini dengan folder khusus postingan/reels kamu
target_folder = "konten/your_instagram_activity/media" 
excel_output_path = "detail_konten_astratoltamer.xlsx"

all_dataframes = []

print("Menyaring arsip khusus konten postingan/reels...")

if os.path.exists(target_folder):
    for dirpath, _, filenames in os.walk(target_folder):
        for filename in filenames:
            # Pastikan hanya membaca file json yang relevan dengan postingan/media utama
            if filename.endswith(".json") and "liked" not in filename and "comment" not in filename:
                file_path = os.path.join(dirpath, filename)
                try:
                    with open(file_path, "r", encoding="utf-8") as file:
                        data = json.load(file)

                    if isinstance(data, dict):
                        possible_keys = [k for k in data.keys() if isinstance(data[k], list)]
                        if possible_keys:
                            target_key = possible_keys[0]
                            data_list = data[target_key]
                        else:
                            data_list = [data]
                    elif isinstance(data, list):
                        data_list = data
                    else:
                        continue

                    if data_list:
                        df = pd.json_normalize(data_list)
                        df["_jenis_file"] = filename
                        all_dataframes.append(df)
                        print(f"Berhasil memuat konten dari: {filename}")

                except Exception as e:
                    print(f"Gagal memproses {filename}: {e}")

    if all_dataframes:
        master_df = pd.concat(all_dataframes, ignore_index=True, sort=False)
        master_df.to_excel(excel_output_path, index=False, engine="openpyxl")
        print(f"\nBerhasil! Data konten yang dipublish tersimpan di: {excel_output_path}")
    else:
        print("\nTidak ditemukan file JSON postingan yang sesuai di folder tersebut.")
else:
    print(f"\nFolder '{target_folder}' tidak ditemukan. Pastikan path foldernya sudah benar.")