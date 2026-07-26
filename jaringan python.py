from datetime import datetime, timedelta, timezone
import os
import re
import config
from flask import Flask, jsonify, request
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import requests
from flask_cors import CORS

VERIFY_TOKEN = config.VERIFY_TOKEN
USER_ACCESS_TOKEN = config.USER_ACCESS_TOKEN
VALID_IG_BUSINESS_ID = config.VALID_IG_BUSINESS_ID

app = Flask(__name__)
CORS(app)

# Konfigurasi Google Sheets API
SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive",
]
CREDS_FILE = "creds.json"

# Zona waktu WIB (UTC +7)
WIB = timezone(timedelta(hours=7))


@app.route("/api/ig-latest", methods=["GET"])
def ig_latest():
    try:
        url = f"https://graph.facebook.com/v19.0/{VALID_IG_BUSINESS_ID}/media?fields=id,caption,media_url,thumbnail_url,permalink,timestamp&limit=3&access_token={USER_ACCESS_TOKEN}"
        response = requests.get(url)

        if response.status_code == 200:
            posts = response.json().get("data", [])
            result = []
            for post in posts:
                img_url = post.get("media_url") or post.get("thumbnail_url", "")
                result.append(
                    {
                        "image_url": img_url,
                        "caption": post.get("caption", "Tidak ada caption"),
                        "permalink": post.get("permalink", "#"),
                    }
                )
            return jsonify(result), 200
        else:
            return jsonify({"error": "Gagal dari IG", "details": response.json()}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def analyze_sentiment(text):
    if not text:
        return "Neutral"
    text_lower = str(text).lower()

    negative_words = [
        "rusak", "parah", "kecewa", "buruk", "lama", "lambat", "gagal", "error",
        "benci", "payah", "komplain", "protes", "ancur", "hancur", "kacau",
        "mengecewakan", "bikin emosi", "macet", "padat", "antre", "antrian",
        "mengular", "tersendat", "buntu", "bloq", "blokir", "saldo", "potong",
        "gagal tap", "tdk bisa", "tidak bisa", "error reader", "gardu mati",
        "buka tutup", "laka", "kecelakaan", "lubang", "berlubang", "anjlok",
        "gelombang", "genangan", "banjir", "penerangan", "gelap", "pju mati",
        "lampu mati", "kotor", "bau", "pesing", "jorok", "toilet kotor",
        "mushola kotor", "bocor", "ganggu", "terkendala", "masalah", "trouble",
        "expired", "kadaluarsa", "truk", "jalur kanan", "lajur kanan", "lane hoger"
    ]

    positive_words = [
        "terima kasih", "terimakasih", "makasih", "thx", "thanks", "mantap",
        "mantap jiwa", "bagus", "hebat", "cepat", "tanggap", "responsif",
        "membantu", "keren", "terbaik", "salut", "lancar", "bersih", "nyaman",
        "aman", "ramah", "jelas", "paham", "sukses", "top", "keren banget",
        "puas", "terbantu"
    ]

    for word in negative_words:
        if word in text_lower:
            return "Negative"

    for word in positive_words:
        if word in text_lower:
            return "Positive"

    return "Neutral"


def log_to_spreadsheet(sheet_name, row_data):
    """Fungsi universal untuk mencatat data ke worksheet tertentu (DM atau Komentar)"""
    try:
        creds = ServiceAccountCredentials.from_json_keyfile_name(
            CREDS_FILE, SCOPE
        )
        client = gspread.authorize(creds)
        spreadsheet = client.open("SMART DASH 2026")
        sheet = spreadsheet.worksheet(sheet_name)
        sheet.append_row(row_data)
        print(f"[GOOGLE SHEETS] Data berhasil disinkronkan ke '{sheet_name}'!")
    except Exception as e:
        print(f"Gagal sinkronisasi ke Google Sheets ({sheet_name}): {e}")


def auto_categorize(text):
    """Otomatis mengkategorikan pesan berdasarkan keyword"""
    if not text:
        return "Lain-lain"

    text = str(text).lower()

    lalin_keywords = [
        "macet", "kemacetan", "padat", "antre", "antrian", "mengular", "tersendat",
        "buntu", "gerbang tol", "gtr", "gardu", "transaksi", "tap", "gagal tap",
        "pintu tol", "e-toll", "etoll", "saldo", "e-money", "emoney", "flazz",
        "brizzi", "kartu", "katu tol", "expired", "kadaluarsa", "saldo kurang",
        "potong saldo", "petugas", "patroli", "derek", "bantuan", "pjr",
        "kecelakaan", "laka", "evakuasi", "contraflow", "rekayasa", "buka tutup", "pohon tumbang"
    ]
    fasilitas_keywords = [
        "rest area", "restarea", "toilet", "kamar mandi", "wc", "mushola", "masjid",
        "spbu", "bbm", "parkir", "parkiran", "tenant", "kuliner", "warung",
        "jalan berlubang", "lubang", "aspal", "retak", "gelombang", "anjlok",
        "lampu", "penerangan", "pju", "gelap", "rambu", "guardrail", "pagar tol",
        "sampah", "kebersihan", "kotor", "bau", "pesing", "genangan", "banjir"
    ]
    struk_keywords = [
        "struk", "receipt", "digital", "cetak", "download", "unduh", "history",
        "riwayat transaksi", "mutasi", "slip", "bukti bayar", "print out", "email",
        "aplikasi", "web", "website", "situs", "link", "tautan", "error",
        "gagal kirim", "tidak muncul", "hilang", "akses"
    ]

    for kw in lalin_keywords:
        if kw in text:
            return "Lalu Lintas"

    for kw in fasilitas_keywords:
        if kw in text:
            return "Fasilitas"

    for kw in struk_keywords:
        if kw in text:
            return "Struk Digital"

    return "Lain-lain"


def extract_topic(text):
    """Menentukan sub-topik singkat dari isi pesan"""
    if not text:
        return "Umum"
    text_lower = text.lower()
    if "macet" in text_lower or "padat" in text_lower:
        return "Kepadatan Lalin"
    elif "saldo" in text_lower or "etoll" in text_lower or "e-toll" in text_lower:
        return "Uang Elektronik"
    elif "toilet" in text_lower or "mushola" in text_lower or "rest area" in text_lower:
        return "Fasilitas Rest Area"
    elif "lubang" in text_lower or "aspal" in text_lower:
        return "Kondisi Jalan"
    elif "struk" in text_lower or "digital" in text_lower:
        return "Struk Digital"
    return "Keluhan Umum"


def post_id(url_or_message):
    if not url_or_message:
        return "-"
    match = re.search(r"/(?:p|reel|posts|share)/([A-Za-z0-9_-]+)", str(url_or_message))
    if match:
        return match.group(1)
    return "No Post ID"


@app.route("/webhook", methods=["GET", "POST"])
def webhook():
    if request.method == "GET":
        mode = request.args.get("hub.mode")
        token = request.args.get("hub.verify_token")
        challenge = request.args.get("hub.challenge")

        if mode and token:
            if mode == "subscribe" and token == VERIFY_TOKEN:
                print("WEBHOOK_VERIFIED")
                return challenge, 200
            else:
                return "Verification failed", 403
        return "Invalid request", 400

    elif request.method == "POST":
        data = request.get_json()
        try:
            if data.get("object") == "instagram":
                for entry in data.get("entry", []):

                    # A. MENANGANI EVENT DM (MESSAGING)
                    messaging_events = entry.get("messaging", [])
                    for event in messaging_events:
                        if "message" in event and "text" in event["message"]:
                            sender_id = event["sender"]["id"]
                            sender_name = get_ig_username(sender_id, USER_ACCESS_TOKEN)
                            message_text = event["message"]["text"]

                            response_text, needs_admin = generate_bot_response(message_text.lower())
                            if needs_admin:
                                response_text += "\n\n(Pesan kamu telah diteruskan kepada Tim Admin kami. Mohon menunggu sebentar)"

                            send_instagram_message(sender_id, response_text)

                            kategori = auto_categorize(message_text)
                            topik = extract_topic(message_text)
                            sentimen = analyze_sentiment(message_text)

                            tanggal = datetime.now(WIB).strftime("%Y-%m-%d")
                            waktu = datetime.now(WIB).strftime("%H:%M:%S")

                            dm_row = [
                                tanggal, waktu, sender_name, message_text,
                                kategori, topik, sentimen,
                            ]
                            log_to_spreadsheet("DATA MENTAH DM", dm_row)

                    # B. MENANGANI EVENT KOMENTAR (CHANGES / COMMENTS)
                    changes_events = entry.get("changes", [])
                    for change in changes_events:
                        if change.get("field") == "comments":
                            value = change.get("value", {})
                            comment_text = value.get("text", "")
                            commenter_name = value.get("from", {}).get("username", "Unknown")

                            post_id_value = post_id(comment_text)

                            tanggal = datetime.now(WIB).strftime("%Y-%m-%d")
                            waktu = datetime.now(WIB).strftime("%H:%M:%S")

                            kategori = auto_categorize(comment_text)
                            topik = extract_topic(comment_text)
                            sentimen = analyze_sentiment(comment_text)

                            comment_row = [
                                tanggal, waktu, commenter_name, comment_text,
                                kategori, topik, sentimen, post_id_value,
                            ]
                            log_to_spreadsheet("KOMENTAR", comment_row)

        except Exception as e:
            print(f"Error memproses webhook: {e}")

        return "EVENT_RECEIVED", 200


def get_ig_username(sender_id, access_token):
    try:
        url = f"https://graph.facebook.com/v19.0/{sender_id}?fields=name,username&access_token={access_token}"
        res = requests.get(url)
        if res.status_code == 200:
            data = res.json()
            return data.get("username") or data.get("name") or sender_id
    except Exception:
        pass
    return sender_id


def generate_bot_response(text):
    if "struk" in text or "digital" in text or "transaksi" in text or "saldo" in text:
        return (
            "Halo Sahabat Astra Infra,\n\n"
            "Terima kasih telah menghubungi kami. Mohon berikan informasi berikut untuk pengecekan lebih lanjut:\n\n"
            "1. Nomor Uang Elektronik (UE) yang digunakan\n"
            "2. Gerbang Masuk\n"
            "3. Gerbang Keluar\n"
            "4. Tanggal perjalanan\n\n"
            "Kami akan membantu Kakak segera setelah data diterima. Jika ada pertanyaan lebih lanjut, silakan hubungi Call Center +62 254 207878.\n\n"
            "Hormat kami,\nAstra Tol Tangerang-Merak"
        ), False
    elif "website" in text or "web" in text or "error" in text or "situs" in text:
        return (
            "Halo Sahabat Astra Infra,\n\n"
            "Saat ini website kami sedang mengalami gangguan sementara. Tim kami sedang bekerja untuk memperbaikinya. Mohon maaf atas ketidaknyamanannya. Kami akan update segera setelah website kembali normal. Terima kasih atas pengertiannya! 😊\n\n"
            "Jika ada pertanyaan lebih lanjut, silakan hubungi Call Center +62 254 207878.\n\n"
            "Hormat kami,\nAstra Tol Tangerang-Merak"
        ), False
    elif "bantuan" in text or "darurat" in text or "admin" in text:
        return (
            "Halo Sahabat Astra Infra,\n\n"
            "Mohon segera menghubungi call center kami untuk mendapatkan bantuan lebih lanjut dari tim terkait:\n\n"
            "📞 0254-207878 (Telepon & WhatsApp Call Only)\n"
            "📞 0800-1777-879 (Bebas Pulsa)\n\n"
            "Hormat kami,\nAstra Tol Tangerang-Merak"
        ), True
    else:
        return (
            "Halo Sahabat Astra Infra,\n\n"
            "Pertanyaan Kamu memerlukan bantuan khusus dari Tim Layanan Pelanggan kami."
        ), True


def send_instagram_message(recipient_id, text_message):
    url = f"https://graph.facebook.com/v19.0/{VALID_IG_BUSINESS_ID}/messages?access_token={USER_ACCESS_TOKEN}"
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": text_message},
    }
    response = requests.post(url, json=payload)
    print(f"[IG SEND] Response: {response.status_code}, {response.text}")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)