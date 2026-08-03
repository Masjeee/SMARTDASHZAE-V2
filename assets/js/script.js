let globalDataRows = [];
let lineChartInstance = null;
let categoryChartInstance = null;
let sentimentChartInstance = null;

// GANTI URL DI BAWAH INI DENGAN WEB APP URL DARI GOOGLE APPS SCRIPT KAMU
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz4Jq0IJ9TbBqiANywb5WOp7A58MsSKGtAvG8TpEOm6U1QYbAo8ajRkakEOmazCiTIp/exec";

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
            
            if (document.body.classList.contains('sidebar-collapsed')) {
                localStorage.setItem('sidebar', 'collapsed');
            } else {
                localStorage.setItem('sidebar', 'expanded');
            }
        });
    }

    if (localStorage.getItem('sidebar') === 'collapsed') {
        document.body.classList.add('sidebar-collapsed');
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const toggleTimeline = document.getElementById('toggleTimeline');
    if (toggleTimeline) {
        toggleTimeline.addEventListener('click', function(e) {
            e.preventDefault();
            const submenu = document.getElementById('timelineSubmenu');
            if (submenu) {
                submenu.classList.toggle('open');
            }
        });
    }

    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', terapkanFilterTanggal);
    }

    // Inisialisasi Grafik Chart.js
    initCharts();

    // --- FITUR LOADING OVERLAY OTOMATIS ---
    // --- CUSTOM LOADING OVERLAY ---
    // --- CUSTOM LOADING OVERLAY DENGAN LOGO SMARTDASH ---
    let loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 9999; transition: opacity 0.4s ease;";
        
        loadingOverlay.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                <!-- Logo SmartDash dengan Animasi Berdenyut (Pulse) -->
                <img src="assets/icons/SmartDash Panjang.svg" alt="SmartDash Logo" style="width: 220px; height: auto; margin-bottom: 24px; animation: pulseLogo 1.5s ease-in-out infinite;">
                
                <!-- Lingkaran Spinner Modern -->
                <div style="width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.15); border-top: 3px solid #FF8225; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px;"></div>
                
                <!-- Teks Keterangan -->
                <p style="font-family: 'Manrope', sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; letter-spacing: 0.5px; margin: 0;">Memuat Data & Grafik...</p>
                <p style="font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 400; color: #94a3b8; margin-top: 6px;">Menghubungkan ke Google Spreadsheet...</p>
            </div>
            
            <style>
                @keyframes spin { 
                    0% { transform: rotate(0deg); } 
                    100% { transform: rotate(360deg); } 
                }
                @keyframes pulseLogo { 
                    0% { transform: scale(1); opacity: 0.85; } 
                    50% { transform: scale(1.06); opacity: 1; filter: drop-shadow(0 0 15px rgba(255, 130, 37, 0.4)); } 
                    100% { transform: scale(1); opacity: 0.85; } 
                }
            </style>
        `;
        document.body.appendChild(loadingOverlay);
    } else {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
    }

    // Mengambil data secara otomatis dari Google Apps Script (Live Spreadsheet)
    fetch(WEB_APP_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Gagal mengambil data dari Google Spreadsheet');
            }
            return response.json();
        })
        .then(data => {
            console.log("Data berhasil dimuat dari Spreadsheet:", data);
            
            let rawKomentar = data.komentar || [];
            let rawDm = data.dm || [];

            let formattedData = [];

            if (rawKomentar.length > 1) {
                let headersKomentar = rawKomentar[0];
                for (let i = 1; i < rawKomentar.length; i++) {
                    let rowObj = {};
                    headersKomentar.forEach((header, index) => {
                        rowObj[header] = rawKomentar[i][index];
                    });
                    formattedData.push(rowObj);
                }
            }

            if (rawDm.length > 1) {
                let headersDm = rawDm[0];
                for (let i = 1; i < rawDm.length; i++) {
                    let rowObj = {};
                    headersDm.forEach((header, index) => {
                        rowObj[header] = rawDm[i][index];
                    });
                    formattedData.push(rowObj);
                }
            }

            globalDataRows = formattedData; 
            
            if (globalDataRows.length > 0) {
                let dates = globalDataRows.map(r => r.Tanggal).filter(Boolean).sort();
                if (dates.length > 0) {
                    document.getElementById('startDate').value = dates[0];
                    document.getElementById('endDate').value = dates[dates.length - 1];
                    terapkanFilterTanggal();
                }
            }
        })
        .catch(error => {
            console.error('Terjadi kesalahan saat memuat data:', error);
            alert("Gagal memuat data dari Spreadsheet.");
        })
        .finally(() => {
            // Sembunyikan animasi loading setelah data selesai dimuat
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 300);
            }
        });
});

function initCharts() {
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    lineChartInstance = new Chart(ctxLine, {
        type: 'line',
        data: { 
            labels: [], 
            datasets: [{ 
                label: 'Total Kasus', 
                data: [], 
                borderColor: '#FF8225',          
                backgroundColor: 'rgba(180, 63, 63, 0.15)',
                borderWidth: 2.5,                        
                fill: true,                              
                tension: 0.4,                            
                pointRadius: 0,                          
                pointHoverRadius: 6                     
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { 
                x: { grid: { display: false }, ticks: { font: { size: 10 } } }, 
                y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } } 
            } 
        }
    });
    
    const ctxCategory = document.getElementById('donutCategory').getContext('2d');
    categoryChartInstance = new Chart(ctxCategory, {
        type: 'doughnut',
        data: { 
            labels: ['Lalu Lintas', 'Fasilitas', 'Struk Digital'], 
            datasets: [{ 
                data: [0, 0, 0], 
                backgroundColor: ['#F8EDED', '#FF8225', '#B43F3F'],
                borderWidth: 0,         
                borderColor: '#ffffff'   
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { boxWidth: 10, font: { size: 10 } } 
                } 
            } 
        }
    });

    const ctxSentiment = document.getElementById('donutSentiment').getContext('2d');
    sentimentChartInstance = new Chart(ctxSentiment, {
        type: 'doughnut',
        data: { 
            labels: ['Positif', 'Netral', 'Negatif'], 
            datasets: [{ 
                data: [0, 0, 0], 
                backgroundColor: ['#F8EDED', '#FF8225', '#B43F3F'],
                borderWidth: 0,         
                borderColor: '#ffffff'   
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { boxWidth: 10, font: { size: 10 } } 
                } 
            } 
        }
    });
}

function terapkanFilterTanggal() {
    let startStr = document.getElementById('startDate').value;
    let endStr = document.getElementById('endDate').value;
    
    if(!startStr || !endStr) {
        alert("Silakan tentukan tanggal awal dan akhir terlebih dahulu!");
        return;
    }

    let startDate = new Date(startStr);
    let endDate = new Date(endStr);
    endDate.setHours(23, 59, 59, 999);

    let filteredRows = globalDataRows.filter(r => {
        if(!r.Tanggal) return false;
        let rowDate = new Date(r.Tanggal);
        return rowDate >= startDate && rowDate <= endDate;
    });

    updateDashboardUI(filteredRows);
}

function updateDashboardUI(rows) {
    let countLalin = rows.filter(r => (r["Kategori"] || "").toLowerCase().includes("lalu lintas") || (r["Kategori"] || "").toLowerCase().includes("lalin")).length;
    let countFasilitas = rows.filter(r => (r["Kategori"] || "").toLowerCase().includes("fasilitas")).length;
    let countStruk = rows.filter(r => (r["Kategori"] || "").toLowerCase().includes("struk")).length;

    document.getElementById('val-lalin').innerText = countLalin;
    document.getElementById('val-fasilitas').innerText = countFasilitas;
    document.getElementById('val-struk').innerText = countStruk;

    let countPositif = rows.filter(r => {
        let s = (r["Klasifikasi_Manual"] || "").toLowerCase();
        return s === "positive" || s === "positif" || s === "apresiasi";
    }).length;

    let countNetral = rows.filter(r => {
        let s = (r["Klasifikasi_Manual"] || "").toLowerCase();
        return s === "neutral" || s === "netral" || s === "tanya";
    }).length;

    let countNegatif = rows.filter(r => {
        let s = (r["Klasifikasi_Manual"] || "").toLowerCase();
        return s === "negative" || s === "negatif" || s === "komplain";
    }).length;

    document.getElementById('val-positif').innerText = countPositif;
    document.getElementById('val-netral').innerText = countNetral;
    document.getElementById('val-negatif').innerText = countNegatif;

    if (categoryChartInstance) {
        categoryChartInstance.data.datasets[0].data = [countLalin, countFasilitas, countStruk];
        categoryChartInstance.update();
    }

    if (sentimentChartInstance) {
        sentimentChartInstance.data.datasets[0].data = [countPositif, countNetral, countNegatif];
        sentimentChartInstance.update();
    }

    let dateCounts = {};
    rows.forEach(r => {
        let tgl = r["Tanggal"];
        if (tgl) {
            let cleanDate = tgl.toString().substring(0, 10);
            dateCounts[cleanDate] = (dateCounts[cleanDate] || 0) + 1;
        }
    });

    let sortedDates = Object.keys(dateCounts).sort();
    let trendValues = sortedDates.map(d => dateCounts[d]);

    if (lineChartInstance) {
        lineChartInstance.data.labels = sortedDates;
        lineChartInstance.data.datasets[0].data = trendValues;
        lineChartInstance.update();
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById("sidebar-toggle");
    const closeBtn = document.getElementById("sidebar-close");
    const overlay = document.getElementById("sidebar-overlay");

    function toggleSidebar() {
        document.body.classList.toggle("sidebar-collapsed");
        if (document.body.classList.contains("sidebar-collapsed")) {
            localStorage.setItem('sidebar', 'collapsed');
        } else {
            localStorage.setItem('sidebar', 'expanded');
        }
    }

    if (toggleBtn) toggleBtn.addEventListener("click", toggleSidebar);
    if (closeBtn) closeBtn.addEventListener("click", toggleSidebar);
    if (overlay) overlay.addEventListener("click", toggleSidebar);
});

document.addEventListener("DOMContentLoaded", function () {
    const logos = document.querySelectorAll('.brand-logo, .main-logo-container img');
    const isDark = document.body.classList.contains('dark-mode');

    logos.forEach(img => {
        if (isDark) {
            img.src = img.src.replace('assets/icons/SmartDash Panjang.svg', 'assets/icons/ SmartDash Putih.svg'); 
        }
    });
});

// FITUR PROFIL: Menyesuaikan Nama Panjang & Inisial Akun yang Sedang Login
document.addEventListener("DOMContentLoaded", function() {
    const loggedInUser = localStorage.getItem('userName') || "Achmad Zaenudin";
    const loggedInRole = localStorage.getItem('userRole') || "Corporate Communications";

    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar');

    if (nameEl) nameEl.innerText = loggedInUser;
    if (roleEl) roleEl.innerText = loggedInRole;

    if (avatarEl) {
        let initials = loggedInUser
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
        avatarEl.innerText = initials;
    }
});