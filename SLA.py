import streamlit as st
import pandas as pd
import datetime

# Konfigurasi Halaman Dashboard
st.set_page_config(
    page_title="SLA Pesan & Analisis Komplain - SMARTDASH",
    page_icon="📊",
    layout="wide"
)

st.title("📊 SLA Pesan & Analisis Komplain")
st.write("Monitoring performa respon admin, kategori, dan tonality dengan filter per tahun.")

# Sidebar / Filter Tanggal per Tahun
st.sidebar.header("Filter Periode Waktu")
col_f1, col_f2, col_f3 = st.sidebar.columns(3)

with st.sidebar:
    st.subheader("Periode Tahun 2024")
    start_2024 = st.date_input("Dari Tanggal (2024)", datetime.date(2024, 1, 1), key="s24")
    end_2024 = st.date_input("Sampai Tanggal (2024)", datetime.date(2024, 4, 30), key="e24")

    st.subheader("Periode Tahun 2025")
    start_2025 = st.date_input("Dari Tanggal (2025)", datetime.date(2025, 1, 1), key="s25")
    end_2025 = st.date_input("Sampai Tanggal (2025)", datetime.date(2025, 4, 30), key="e25")

    st.subheader("Periode Tahun 2026")
    start_2026 = st.date_input("Dari Tanggal (2026)", datetime.date(2026, 1, 1), key="s26")
    end_2026 = st.date_input("Sampai Tanggal (2026)", datetime.date(2026, 4, 30), key="e26")

    apply_btn = st.button("Terapkan & Bandingkan")

# Simulasi / Load Data (Hubungkan ke file CSV/Excel atau Web App Anda)
@st.cache_data 
def load_data():
    # Masukkan link CSV Google Sheets langsung ke dalam pandas
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmhQw8lGi2QE-1ag38831k7cNgqQbeiW_Ywc95AoYh0VvzZjNmMqeAvRJ77gbgAw/pub?output=csv"
    df = pd.read_csv(url)
    return df

df = load_data()
df["Tanggal"] = pd.to_datetime(df["Tanggal"])

# Filter data berdasarkan input dari masing-masing tahun
df_2024 = df[(df["Tanggal"].dt.year == 2024) & (df["Tanggal"].dt.date >= start_2024) & (df["Tanggal"].dt.date <= end_2024)]
df_2025 = df[(df["Tanggal"].dt.year == 2025) & (df["Tanggal"].dt.date >= start_2025) & (df["Tanggal"].dt.date <= end_2025)]
df_2026 = df[(df["Tanggal"].dt.year == 2026) & (df["Tanggal"].dt.date >= start_2026) & (df["Tanggal"].dt.date <= end_2026)]

df_combined = pd.concat([df_2024, df_2025, df_2026])

# Kartu Statistik Ringkasan
col1, col2, col3 = st.columns(3)
with col1:
    st.metric(label="TOTAL KELUHAN TERFILTER", value=len(df_combined))
with col2:
    top_tonality = df_combined["Tonality"].mode()[0] if not df_combined.empty else "-"
    st.metric(label="TONALITY TERBANYAK", value=top_tonality)
with col3:
    st.metric(label="STATUS ENGINE PYTHON", value="Aktif & Terhubung", delta="Online")

st.markdown("---")

# Visualisasi Grafik Perbandingan Volume per Tahun
st.subheader("Volume Keluhan & Tren SLA per Tahun")
chart_data = pd.DataFrame({
    "Tahun": ["2024", "2025", "2026"],
    "Jumlah Keluhan": [len(df_2024), len(df_2025), len(df_2026)]
})
st.bar_chart(chart_data.set_index("Tahun"))

# Tabel Rincian Data
st.subheader("Tabel Rincian Respon & Klasifikasi Pesan")
st.dataframe(df_combined, use_container_width=True)