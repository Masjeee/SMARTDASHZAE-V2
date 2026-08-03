let globalDataRows = [];
let lineChartInstance = null;
let categoryChartInstance = null;
let sentimentChartInstance = null;

// GANTI URL DI BAWAH INI DENGAN WEB APP URL DARI GOOGLE APPS SCRIPT KAMU
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz4Jq0IJ9TbBqiANywb5WOp7A58MsSKGtAvG8TpEOm6U1QYbAo8ajRkakEOmazCiTIp/exec";

// --- SEMUA INISIALISASI UTAMA DIJADIKAN SATU DI SINI ---
document.addEventListener("DOMContentLoaded", function () {
    
    // 1. Inisialisasi Sidebar Toggle & State
    const toggleBtn = document.getElementById('sidebar-toggle');
    const closeBtn = document.getElementById("sidebar-close");
    const overlay = document.getElementById("sidebar-overlay");
    
    function toggleSidebar() {
        document.body.classList.toggle('sidebar-collapsed');
        if (document.body.classList.contains('sidebar-collapsed')) {
            localStorage.setItem('sidebar', 'collapsed');
        } else {
            localStorage.setItem('sidebar', 'expanded');
        }
    }

    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    if (closeBtn) closeBtn.addEventListener("click", toggleSidebar);
    if (overlay) overlay.addEventListener("click", toggleSidebar);

    if (localStorage.getItem('sidebar') === 'collapsed') {
        document.body.classList.add('sidebar-collapsed');
    }

    // 2. Inisialisasi Timeline Submenu
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

    // 3. Inisialisasi Filter Tanggal
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', terapkanFilterTanggal);
    }

    // 4. Inisialisasi Profil Pengguna
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

    // 5. Inisialisasi Tema Logo (Dark/Light mode check)
    const logos = document.querySelectorAll('.brand-logo, .main-logo-container img');
    const isDark = document.body.classList.contains('dark-mode');
    logos.forEach(img => {
        if (isDark) {
            img.src = img.src.replace('assets/icons/SmartDash Panjang.svg', 'assets/icons/ SmartDash Putih.svg'); 
        }
    });

    // 6. Inisialisasi Grafik Chart.js
    initCharts();

    // 7. Mengambil Data dari Google Apps Script (Live Spreadsheet)
    fetch(WEB_APP_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Gagal mengambil data dari Google Spreadsheet');
            }
            return response.json();
        })
        .then(data => {
            console.log("Data berhasil dimuat dari Spreadsheet:", data);
            
            // Sesuaikan properti 'performance' dengan backend doGet Apps Script kamu
            let rawData = data.performance || data.komentar || [];
            let formattedData = [];

            if (rawData.length > 1) {
                let headers = rawData[0];
                for (let i = 1; i < rawData.length; i++) {
                    let rowObj = {};
                    headers.forEach((header, index) => {
                        rowObj[header] = rawData[i][index];
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
            // Sembunyikan loading overlay setelah selesai
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 300);
            }
        });
});

// --- FUNGSI PENDUKUNG (CHARTS & FILTER) ---

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