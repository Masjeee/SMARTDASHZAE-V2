import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials

def sync_sheets_to_json():
    # 1. Autentikasi menggunakan file creds.json
    scope = [
        'https://spreadsheets.google.com/feeds',
        'https://www.googleapis.com/auth/drive'
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name('creds.json', scope)
    client = gspread.authorize(creds)

    sheet_name = "SMART DASH 2026"
    try:
        spreadsheet = client.open(sheet_name)
    except Exception as e:
        print(f"Gagal membuka spreadsheet: {e}")
        return

    all_data = []

    # 2. Ambil data dari tab "DATA MENTAH DM"
    try:
        sheet_dm = spreadsheet.worksheet("DATA MENTAH DM")
        data_dm = sheet_dm.get_all_records()
        all_data.extend(data_dm)
    except Exception as e:
        print(f"Catatan: Gagal memuat tab DATA MENTAH DM: {e}")

    # 3. Ambil data dari tab "KOMENTAR"
    try:
        sheet_komentar = spreadsheet.worksheet("KOMENTAR")
        data_komentar = sheet_komentar.get_all_records()
        all_data.extend(data_komentar)
    except Exception as e:
        print(f"Catatan: Gagal memuat tab KOMENTAR: {e}")

    # 4. SIMPAN KE FILE data.json (INI YANG DIBACA OLEH DASHBOARD)
    output_filename = "data.json"
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=4)
    
    print(f"Sukses! {len(all_data)} baris data disimpan ke {output_filename}")

if __name__ == "__main__":
    sync_sheets_to_json()
