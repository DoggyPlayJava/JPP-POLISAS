import { Step } from 'react-joyride';

// ── Kumpulan Langkah Tutorial Berpusat (Interactive Tour Fasa 2) ──
// Copywriting telah disunting untuk gaya premium, padat dan berinformasi.

export const TOUR_STEPS: Record<string, Step[]> = {
  // 1. Modul Utama & Sistem
  PORTAL_MAIN: [
    {
      target: 'body',
      title: '✨ Ekosistem Digital POLISAS',
      content: 'Selamat datang! Platform pintar ini direka khas untuk menghubungkan anda dengan semua kemudahan kampus. Mari kita lihat fungsi utama dalam 30 saat.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-navbar-profile',
      title: '⚙️ Profil & Kawalan',
      content: 'Sesuaikan identiti anda. Tukar nama panggilan, kemaskini gambar profil, tukar kata laluan, atau log keluar dengan selamat di sini.',
      placement: 'bottom',
    },
    {
      target: '.tour-qa-polyservices',
      title: '⚡ PolyServices',
      content: 'Akses pantas ke perkhidmatan on-demand. Dari tempahan bilik ke khidmat cetakan, semuanya di hujung jari.',
      placement: 'bottom',
    },
    {
      target: '.tour-qa-kebajikan',
      title: '🛡️ E-Kebajikan',
      content: 'Perlu lapor kerosakan fasiliti? Atau perlukan sokongan tabung siswa? Hantar aduan rasmi anda terus ke panel pengurusan.',
      placement: 'bottom',
    },
    {
      target: '.tour-qa-qr',
      title: '📸 Pengimbas Merit',
      content: 'Kumpul mata merit dengan mudah! Hanya imbas kod QR setiap kali anda menghadiri program atau aktiviti rasmi kampus.',
      placement: 'bottom',
    },
    {
      target: '.tour-qa-takwim',
      title: '🗓️ Takwim Institusi',
      content: 'Jangan terlepas sebarang tarikh penting. Semak senarai cuti, peperiksaan dan jadual program berpusat secara terus.',
      placement: 'bottom',
    },
    {
      target: '.tour-mod-ekpp',
      title: '🏛️ Sistem Kelab (EKPP)',
      content: 'Sertai kelab dan persatuan! Jika anda adalah wakil pengurusan, seluruh pentadbiran aktiviti dan ahli bermula dari sini.',
      placement: 'bottom',
    },
    {
      target: '.tour-mod-keusahawanan',
      title: '💡 PolyMart & Perniagaan',
      content: 'Mula menjana pendapatan. Ruang khas untuk urus niaga, mempromosi bisnes pelajar dan ekosistem e-Dagang kampus.',
      placement: 'bottom',
    },
    {
      target: '.tour-mod-akademik',
      title: '🎓 E-Akademik',
      content: 'Ruang digital pencapaian anda. Pantau keluk pointer HPNM, tebus mata merit, dan lihat anugerah yang telah disahkan.',
      placement: 'bottom',
    },
    {
      target: '.tour-bottomnav-fab',
      title: '🧭 Navigasi Pintar (FAB)',
      content: 'Tersesat? Tekan butang tambah (+) ini untuk memanggil menu pintas. Akses semua sistem pada bila-bila masa.',
      placement: 'top',
    },
    {
      target: '.tour-help-button',
      title: '🔄 Butang Bantuan',
      content: 'Akhir sekali, jika anda ingin mengulang tutorial ini di mana-mana halaman, hanya klik butang (?) ini.',
      placement: 'bottom',
    }
  ],

  SETTINGS_PAGE: [
    {
      target: '.tour-settings-profile',
      title: '👤 Maklumat Peribadi',
      content: 'Pastikan profil anda sentiasa dikemaskini. Muat naik gambar terbaru dan betulkan maklumat penting.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '.tour-settings-logout',
      title: '🚪 Log Keluar',
      content: 'Penting: Sentiasa log keluar sistem sekiranya anda menggunakan peranti awam atau komputer makmal untuk keselamatan akaun.',
      placement: 'right',
    }
  ],

  // 2. Modul e-Keusahawanan
  KEUSAHAWANAN_DASHBOARD: [
    {
      target: 'body',
      title: '💼 Pusat Kawalan Perniagaan',
      content: 'Pusat pemerintahan utama untuk bisnes anda. Pantau kewangan, prestasi jualan, dan status inventori secara berpusat.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-business-switcher',
      title: '🏢 Tukar Perniagaan',
      content: 'Mempunyai lebih daripada satu bisnes? Gunakan fungsi ini untuk menukar profil perniagaan yang ingin diuruskan.',
      placement: 'bottom',
    },
    {
      target: '.tour-sales-metric',
      title: '💰 Metrik Jualan Bulanan',
      content: 'Pemantauan kewangan masa nyata (real-time). Lihat jumlah pendapatan yang dijana sepanjang bulan ini sekilas pandang.',
      placement: 'bottom',
    },
    {
      target: '.tour-sales-chart',
      title: '📈 Carta Prestasi',
      content: 'Analisis trend pembelian pelanggan anda dalam tempoh 30 hari kebelakangan untuk strategi pemasaran yang lebih tepat.',
      placement: 'top',
    },
    {
      target: '.tour-low-stock',
      title: '⚠️ Amaran Stok Rendah',
      content: 'Sistem akan memberitahu anda secara automatik apabila baki inventori hampir habis. Jangan lepaskan peluang jualan!',
      placement: 'left',
    }
  ],

  KEUSAHAWANAN_URUS: [
    {
      target: '.tour-urus-nav',
      title: '🎨 Navigasi Pengurusan',
      content: 'Panel kawalan penuh perniagaan anda. Setiap tab mewakili satu aspek kritikal — daripada identiti jenama, kakitangan, hingga ke ciri-ciri premium.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-urus-add',
      title: '👥 Pengurusan Staf',
      content: 'Senaraikan pekerja, luluskan akses pekerja baru, dan tentukan siapa yang boleh membuka sistem Terminal POS.',
      placement: 'bottom',
    },
    {
      target: '.tour-urus-setting',
      title: '⚙️ Ciri & Promosi',
      content: 'Aktifkan fungsi premium seperti sistem Kupon Diskaun dan Sesi Tunai (Cash Register) untuk mengawal aliran duit secara ketat.',
      placement: 'bottom',
    }
  ],

  KEUSAHAWANAN_PRODUCT: [
    {
      target: '.tour-pos-product-add',
      title: '➕ Tambah Produk',
      content: 'Masukkan inventori baru. Lengkapkan harga, muat naik gambar yang menarik, dan tetapkan imbasan barcode.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-pos-product-category',
      title: '📦 Katalog Inventori',
      content: 'Tapis dan urus produk mengikut kategori. Semak baki stok dan ubah harga dengan pantas.',
      placement: 'top',
    },
    {
      target: '.tour-pos-product-stock',
      title: '📊 Pemantauan Stok',
      content: 'Pantau kuantiti inventori secara langsung. Sistem akan memaparkan amaran apabila stok menipis.',
      placement: 'top',
    }
  ],

  KEUSAHAWANAN_ORDER: [
    {
      target: '.tour-pos-order-create',
      title: '🛒 Troli & Pesanan',
      content: 'Sistem mesin daftar tunai (cashier) anda. Tambah item, imbas QR pelanggan PolyMart, dan kira jumlah bayaran secara automatik.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '.tour-pos-order-payment',
      title: '💳 Pengesahan Pembayaran',
      content: 'Pilih kaedah bayaran (Tunai, QR, Online) dan sahkan transaksi. Baki akan dikira secara automatik.',
      placement: 'top',
    }
  ],

  // 3. Modul EKPP (Kelab & Majlis Perwakilan Pelajar)
  EKPP_DASHBOARD: [
    {
      target: '.tour-kelab-stats',
      title: '📊 Prestasi Kelab',
      content: 'Paparan pantas mengenai tahap keaktifan persatuan, bilangan ahli semasa, dan pencapaian terkini.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-kelab-tasks',
      title: '✅ Pengurusan Tugasan',
      content: 'Senarai tugasan ahli kelab. Serah tugasan untuk kumpul mata merit dan pantau perkembangan pasukan.',
      placement: 'top',
    }
  ],

  EKPP_AKTIVITI: [
    {
      target: 'body',
      title: '🚀 Pusat Pengurusan Aktiviti',
      content: 'Nota Penting: Pengurusan data di sini amat kritikal kerana semua maklumat akan dikompilasi secara automatik untuk Laporan Bulanan Kelab.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-tab-aktiviti',
      title: '⚡ Aktiviti Kelab',
      content: 'Gunakan tab ini untuk merekod program dalaman kelab (contoh: Mesyuarat AJK, latihan) yang tidak memerlukan bajet / kelulusan rasmi.',
      placement: 'bottom',
    },
    {
      target: '.tour-tab-takwim',
      title: '📅 Takwim Rasmi',
      content: 'Ini adalah senarai program berskala besar yang telah diluluskan secara rasmi oleh sistem HEP & JPP.',
      placement: 'bottom',
    },
    {
      target: '.tour-tab-statistik',
      title: '📈 Analitik Penuh',
      content: 'Lihat graf prestasi penganjuran kelab. Ia mengukur sejauh mana keaktifan kelab berdasarkan bilangan bulan.',
      placement: 'bottom',
    }
  ],

  EKPP_LAPORAN: [
    {
      target: '.tour-tab-laporan-semua',
      title: '📤 Arkib Laporan Bulanan',
      content: 'Senarai penuh laporan bulanan kelab anda. Muat naik dokumen rasmi seperti Laporan Kewangan atau Minit Mesyuarat dan hantar kepada JPP untuk semakan.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-laporan-card',
      title: '📄 Kad Laporan',
      content: 'Setiap kad mewakili satu bulan laporan. Klik untuk melihat, kemaskini, atau auto-jana PDF laporan profesional secara automatik.',
      placement: 'top',
    }
  ],

  EKPP_AHLI: [ // Target: MT/Presiden/Penasihat
    {
      target: '.tour-senarai-mt',
      title: '👑 Pengurusan Hierarki',
      content: 'Uruskan AJK anda di sini. Presiden boleh menukar status peranan pelajar biasa kepada Majlis Tertinggi (MT) secara rasmi.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-permohonan-baru',
      title: '📨 Peti Masuk Keahlian',
      content: 'Apabila pelajar baru memohon untuk menyertai persatuan, permohonan tersebut akan disaring dan diluluskan di tab ini.',
      placement: 'top',
    }
  ],

  EKPP_SEMAKAN: [ // Target: KPP/JPP
    {
      target: '.tour-semakan-menunggu',
      title: '📋 Panel Kelulusan',
      content: 'Bilik kebal Majlis Perwakilan Pelajar (JPP). Segala laporan bulanan yang dihantar oleh kelab perlu disemak ketepatannya sebelum diluluskan.',
      placement: 'bottom',
      disableBeacon: true,
    }
  ],

  // 4. Modul e-Kebajikan (Aduan & Bantuan)
  KEBAJIKAN_DASHBOARD: [
    {
      target: 'body',
      title: '🛡️ E-Kebajikan',
      content: 'Selamat datang ke pusat aduan dan kebajikan pelajar. Di sini anda boleh melaporkan kerosakan fasiliti dan memantau status tindakan pihak pengurusan.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-kebajikan-metrics',
      title: '📊 Rumusan Aduan',
      content: 'Pantau kesihatan fasiliti secara real-time. Ketahui berapa banyak laporan yang telah diselesaikan oleh pihak penyelenggara.',
      placement: 'bottom',
    }
  ],

  KEBAJIKAN_SUBMIT: [
    {
      target: 'body',
      title: '📝 Borang Aduan Baharu',
      content: 'Laporkan kerosakan fasiliti kampus di sini. Isi maklumat dengan tepat supaya pihak penyelenggara boleh bertindak dengan segera.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-aduan-kategori',
      title: '🏢 Kategori Kerosakan',
      content: 'Pastikan anda memilih lokasi dan jenis kerosakan yang tepat agar laporan ini dihantar ke jabatan yang betul (contoh: Pembangunan atau Asrama).',
      placement: 'bottom',
    },
    {
      target: '.tour-aduan-gambar',
      title: '📸 Bukti Bergambar',
      content: 'Tindakan yang cepat memerlukan bukti yang jelas. Muat naik gambar kawasan yang rosak untuk memudahkan siasatan.',
      placement: 'top',
    }
  ],

  KEBAJIKAN_TICKETS: [
    {
      target: 'body',
      title: '📋 Aduan Saya',
      content: 'Di sini anda boleh memantau semua aduan yang telah dihantar. Semak status terkini dan berkomunikasi terus dengan Exco JPP.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-ticket-status',
      title: '💬 Kemaskini & Perbualan',
      content: 'Aduan anda tidak akan diabaikan! Semak status terkini dan anda juga boleh berkomunikasi secara terus (direct chat) dengan Exco JPP untuk follow-up kes ini.',
      placement: 'bottom',
    }
  ],

  // 5. Modul PolyMaps (Navigasi GPS POLISAS)
  POLYMAPS_PAGE: [
    {
      target: 'body',
      title: '🗺️ PolyMaps — Navigasi Kampus',
      content: 'Selamat datang ke sistem pemetaan POLISAS! Cari bangunan, dewan kuliah, asrama, atau kemudahan terdekat dengan bantuan GPS.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-polymaps-search',
      title: '🔎 Enjin Carian Ruang',
      content: 'Cari dengan pantas. Masukkan nama bangunan, dewan kuliah atau asrama, dan kecerdasan pemetaan kami akan mengesan lokasi persis di dalam kampus.',
      placement: 'bottom',
    },
    {
      target: '.tour-polymaps-quick',
      title: '⚡ Penapisan Pintas',
      content: 'Keperluan mendesak? Akses penapis pintar untuk mengimbas zon kafeteria, surau atau tandas dengan radius terdekat berpandukan satelit GPS.',
      placement: 'bottom',
    }
  ],

  // 6. Modul PolyTask (Freelance Pelajar)
  POLYTASK_BOARD: [
    {
      target: 'body',
      title: '💼 PolyTask — Pasaran Gig Kampus',
      content: 'Selamat datang ke PolyTask! Platform freelance eksklusif pelajar POLISAS. Cipta tugasan, terima bidaan, dan jana pendapatan sampingan.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-step-board-main',
      title: '📋 Hab Pasaran Gig',
      content: 'Terokai permintaan tempatan. Tinjau tawaran kerja gig yang selari dengan keupayaan anda untuk mengukuhkan ekosistem ekonomi mikro kampus.',
      placement: 'top',
    }
  ],

  POLYTASK_MYJOBS: [
    {
      target: 'body',
      title: '📦 Tugasan Saya',
      content: 'Halaman ini memaparkan semua tugasan yang anda telah cipta. Pantau status dan berinteraksi dengan tasker yang telah membida.',
      placement: 'center',
      disableBeacon: true,
    }
  ],

  // 7. Modul e-Akademik (HPNM & Anugerah)
  AKADEMIK_CGPA: [
    {
      target: '.tour-akademik-cgpa',
      title: '📊 Pemantauan HPNM',
      content: 'Pantau keluk pointer anda setiap semester. Masukkan keputusan peperiksaan atau muat naik slip PDF untuk pengekstrakan automatik.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-akademik-merit',
      title: '🏅 Koleksi Merit',
      content: 'Lihat baki mata merit terkumpul anda. Sertai lebih banyak aktiviti untuk meningkatkan skor dan kelayakan anugerah!',
      placement: 'top',
    }
  ],

  // NOTE: AKADEMIK_PENCAPAIAN — halaman ini belum mempunyai .tour-* class.
  // Selector akan ditambah apabila halaman AkademikPencapaian dikemas kini.

  // 8. Modul PolyMart (Perniagaan Mikro Pelajar)
  POLYMART_LAYOUT: [
    {
      target: 'body',
      title: '🛍️ PolyMart Marketplace',
      content: 'Selamat datang ke pusat e-dagang kampus! Sokong perniagaan rakan pelajar dengan membeli makanan, minuman, dan barangan menarik di sini.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-polymart-categories',
      title: '🔍 Carian & Kategori',
      content: 'Tapis produk mengikut kategori dengan pantas untuk mencari apa yang anda inginkan tanpa perlu meleret (scroll) tanpa henti.',
      placement: 'bottom',
    },
    {
      target: '.tour-polymart-cart',
      title: '🛒 Troli Anda',
      content: 'Segala barangan yang anda pilih akan dikumpul di sini. Buat pengesahan pesanan dan bayar menggunakan tunai, QR Pay, atau perbankan internet.',
      placement: 'bottom',
    },
    {
      target: '.tour-polymart-vendor',
      title: '🏪 Papan Pemuka Vendor',
      content: 'Hanya untuk Peniaga: Anda boleh mengakses panel pengurusan jualan dan menguruskan pesanan pelanggan dari tab ini.',
      placement: 'bottom',
    },
    {
      target: '.tour-polymart-mobile-nav',
      title: '📱 Navigasi Pantas',
      content: 'Gunakan bar menu di bawah untuk menyemak status pesanan semasa anda, sejarah pembelian, atau kembali ke halaman utama.',
      placement: 'top',
    }
  ],

  // 10. Modul PolyRent (Sewa Bilik/Rumah Pelajar)
  POLYRENT_PAGE: [
    {
      target: 'body',
      title: '🏠 Selamat Datang ke PolyRent!',
      content: 'Platform sewa bilik eksklusif pelajar POLISAS. Cari bilik yang sesuai, simpan kegemaran anda, dan hubungi tuan rumah terus dalam aplikasi ini.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-polyrent-search',
      title: '🔍 Cari Bilik Dengan Pantas',
      content: 'Taip nama kawasan atau jalan (cth: "Beserah", "Balok") untuk menapis senarai iklan dalam masa nyata.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-polyrent-tabs',
      title: '🔀 Dua Mod Pencarian',
      content: '"Iklan Rumah" — tuan rumah yang iklankan bilik kosong. "Pelajar Mencari" — pelajar yang sedang mencari teman sewa atau bilik.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-polyrent-filters',
      title: '⚡ Tapis Ikut Keperluan',
      content: 'Tapis iklan mengikut jantina yang diperlukan (Lelaki / Perempuan / Campuran), atau tekan ❤️ untuk melihat semua iklan yang telah anda simpan.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-polyrent-card',
      title: '📋 Kad Iklan Bilik',
      content: 'Tekan pada mana-mana kad untuk melihat butiran penuh — gambar, kemudahan, jarak ke POLISAS, dan maklumat hubungi tuan rumah.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '.tour-polyrent-wishlist',
      title: '❤️ Simpan Iklan Kegemaran',
      content: 'Tekan ikon hati untuk menyimpan iklan yang menarik. Senarai simpanan anda akan kekal walaupun anda tutup aplikasi.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '.tour-polyrent-add',
      title: '📢 Tuan Rumah? Iklankan Sekarang!',
      content: 'Punya bilik kosong? Cipta iklan dalam masa 3 minit. Tetapkan harga, muat naik gambar, dan sambungkan dengan In-App Chat untuk pelajar hubungi anda terus.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-polyrent-calculator',
      title: '🧮 Kalkulator Sewa Bijak',
      content: 'Tidak pasti berapa mampu bayar? Gunakan kalkulator ini untuk menganggar bajet sewa, utiliti, dan deposit awal dengan mudah.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-polyrent-menu',
      title: '⚙️ Urus Iklan Anda',
      content: 'Buka menu untuk mengurus iklan yang anda terbitkan, kemaskini kekosongan bilik, atau tutup iklan yang sudah penuh.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '.tour-help-button',
      title: '✅ Anda Sudah Bersedia!',
      content: 'Tutorial selesai. Jika perlukan bantuan lagi, tekan butang (?) ini untuk ulang panduan ini.',
      placement: 'top',
      disableBeacon: true,
    },
  ],

  // TODO: Halaman Kafeteria belum dibina sebagai page standalone.
  // Fungsi kafeteria diakses melalui PolyMaps (filter Kafe).
  // Selector akan ditambah apabila halaman KafeteriaPage dicipta.

  // 10. Modul Sistem WiFi POLISAS
  // TODO: Halaman WiFi belum dibina sebagai page standalone.
  // Selector akan ditambah apabila halaman WiFiPage dicipta.
};
