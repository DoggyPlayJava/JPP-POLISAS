import { Step } from 'react-joyride';
import i18n from '@/lib/i18n';

// ── Kumpulan Langkah Tutorial Berpusat (Interactive Tour Fasa 2) ──
// Dilokalisasikan sepenuhnya dengan sokongan dwibahasa (BM/EN).

export function getTourSteps(t: (key: string, fallback: string) => string = (k, f) => i18n.t(k, f)): Record<string, Step[]> {
  return {
    PORTAL_MAIN: [
      {
        target: 'body',
        title: t('portal:tour_portal_main_0_title', '✨ Ekosistem Digital POLISAS'),
        content: t('portal:tour_portal_main_0_content', 'Selamat datang! Platform pintar ini direka khas untuk menghubungkan anda dengan semua kemudahan kampus. Mari kita lihat fungsi utama dalam 30 saat.'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-navbar-profile',
        title: t('portal:tour_portal_main_1_title', '⚙️ Profil & Kawalan'),
        content: t('portal:tour_portal_main_1_content', 'Sesuaikan identiti anda. Tukar nama panggilan, kemaskini gambar profil, tukar kata laluan, atau log keluar dengan selamat di sini.'),
        placement: 'bottom',
      },
      {
        target: '.tour-qa-polyservices',
        title: t('portal:tour_portal_main_2_title', '⚡ PolyServices'),
        content: t('portal:tour_portal_main_2_content', 'Akses pantas ke perkhidmatan on-demand. Dari tempahan bilik ke khidmat cetakan, semuanya di hujung jari.'),
        placement: 'bottom',
      },
      {
        target: '.tour-qa-kebajikan',
        title: t('portal:tour_portal_main_3_title', '🛡️ E-Kebajikan'),
        content: t('portal:tour_portal_main_3_content', 'Perlu lapor kerosakan fasiliti? Atau perlukan sokongan tabung siswa? Hantar aduan rasmi anda terus ke panel pengurusan.'),
        placement: 'bottom',
      },
      {
        target: '.tour-qa-qr',
        title: t('portal:tour_portal_main_4_title', '📸 Pengimbas Merit'),
        content: t('portal:tour_portal_main_4_content', 'Kumpul mata merit dengan mudah! Hanya imbas kod QR setiap kali anda menghadiri program atau aktiviti rasmi kampus.'),
        placement: 'bottom',
      },
      {
        target: '.tour-qa-takwim',
        title: t('portal:tour_portal_main_5_title', '🗓️ Takwim Institusi'),
        content: t('portal:tour_portal_main_5_content', 'Jangan terlepas sebarang tarikh penting. Semak senarai cuti, peperiksaan dan jadual program berpusat secara terus.'),
        placement: 'bottom',
      },
      {
        target: '.tour-mod-ekpp',
        title: t('portal:tour_portal_main_6_title', '🏛️ Sistem Kelab (EKPP)'),
        content: t('portal:tour_portal_main_6_content', 'Sertai kelab dan persatuan! Jika anda adalah wakil pengurusan, seluruh pentadbiran aktiviti dan ahli bermula dari sini.'),
        placement: 'bottom',
      },
      {
        target: '.tour-mod-keusahawanan',
        title: t('portal:tour_portal_main_7_title', '💡 PolyMart & Perniagaan'),
        content: t('portal:tour_portal_main_7_content', 'Mula menjana pendapatan. Ruang khas untuk urus niaga, mempromosi bisnes pelajar dan ekosistem e-Dagang kampus.'),
        placement: 'bottom',
      },
      {
        target: '.tour-mod-akademik',
        title: t('portal:tour_portal_main_8_title', '🎓 E-Akademik'),
        content: t('portal:tour_portal_main_8_content', 'Ruang digital pencapaian anda. Pantau keluk pointer HPNM, tebus mata merit, dan lihat anugerah yang telah disahkan.'),
        placement: 'bottom',
      },
      {
        target: '.tour-bottomnav-fab',
        title: t('portal:tour_portal_main_9_title', '🧭 Navigasi Pintar (FAB)'),
        content: t('portal:tour_portal_main_9_content', 'Tersesat? Tekan butang tambah (+) ini untuk memanggil menu pintas. Akses semua sistem pada bila-bila masa.'),
        placement: 'top',
      },
      {
        target: '.tour-help-button',
        title: t('portal:tour_portal_main_10_title', '🔄 Butang Bantuan'),
        content: t('portal:tour_portal_main_10_content', 'Akhir sekali, jika anda ingin mengulang tutorial ini di mana-mana halaman, hanya klik butang (?) ini.'),
        placement: 'bottom',
      }
    ],

    SETTINGS_PAGE: [
      {
        target: '.tour-settings-profile',
        title: t('portal:tour_settings_page_0_title', '👤 Maklumat Peribadi'),
        content: t('portal:tour_settings_page_0_content', 'Pastikan profil anda sentiasa dikemaskini. Muat naik gambar terbaru dan betulkan maklumat penting.'),
        placement: 'right',
        disableBeacon: true,
      },
      {
        target: '.tour-settings-logout',
        title: t('portal:tour_settings_page_1_title', '🚪 Log Keluar'),
        content: t('portal:tour_settings_page_1_content', 'Penting: Sentiasa log keluar sistem sekiranya anda menggunakan peranti awam atau komputer makmal untuk keselamatan akaun.'),
        placement: 'right',
      }
    ],

    KEUSAHAWANAN_DASHBOARD: [
      {
        target: 'body',
        title: t('portal:tour_keusahawanan_dashboard_0_title', '💼 Pusat Kawalan Perniagaan'),
        content: t('portal:tour_keusahawanan_dashboard_0_content', 'Pusat pemerintahan utama untuk bisnes anda. Pantau kewangan, prestasi jualan, dan status inventori secara berpusat.'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-business-switcher',
        title: t('portal:tour_keusahawanan_dashboard_1_title', '🏢 Tukar Perniagaan'),
        content: t('portal:tour_keusahawanan_dashboard_1_content', 'Mempunyai lebih daripada satu bisnes? Gunakan fungsi ini untuk menukar profil perniagaan yang ingin diuruskan.'),
        placement: 'bottom',
      },
      {
        target: '.tour-sales-metric',
        title: t('portal:tour_keusahawanan_dashboard_2_title', '💰 Metrik Jualan Bulanan'),
        content: t('portal:tour_keusahawanan_dashboard_2_content', 'Pemantauan kewangan masa nyata (real-time). Lihat jumlah pendapatan yang dijana sepanjang bulan ini sekilas pandang.'),
        placement: 'bottom',
      },
      {
        target: '.tour-sales-chart',
        title: t('portal:tour_keusahawanan_dashboard_3_title', '📈 Carta Prestasi'),
        content: t('portal:tour_keusahawanan_dashboard_3_content', 'Analisis trend pembelian pelanggan anda dalam tempoh 30 hari kebelakangan untuk strategi pemasaran yang lebih tepat.'),
        placement: 'top',
      },
      {
        target: '.tour-low-stock',
        title: t('portal:tour_keusahawanan_dashboard_4_title', '⚠️ Amaran Stok Rendah'),
        content: t('portal:tour_keusahawanan_dashboard_4_content', 'Sistem akan memberitahu anda secara automatik apabila baki inventori hampir habis. Jangan lepaskan peluang jualan!'),
        placement: 'left',
      }
    ],

    KEUSAHAWANAN_URUS: [
      {
        target: '.tour-urus-nav',
        title: t('portal:tour_keusahawanan_urus_0_title', '🎨 Navigasi Pengurusan'),
        content: t('portal:tour_keusahawanan_urus_0_content', 'Panel kawalan penuh perniagaan anda. Setiap tab mewakili satu aspek kritikal — daripada identiti jenama, kakitangan, hingga ke ciri-ciri premium.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-urus-add',
        title: t('portal:tour_keusahawanan_urus_1_title', '👥 Pengurusan Staf'),
        content: t('portal:tour_keusahawanan_urus_1_content', 'Senaraikan pekerja, luluskan akses pekerja baru, dan tentukan siapa yang boleh membuka sistem Terminal POS.'),
        placement: 'bottom',
      },
      {
        target: '.tour-urus-setting',
        title: t('portal:tour_keusahawanan_urus_2_title', '⚙️ Ciri & Promosi'),
        content: t('portal:tour_keusahawanan_urus_2_content', 'Aktifkan fungsi premium seperti sistem Kupon Diskaun dan Sesi Tunai (Cash Register) untuk mengawal aliran duit secara ketat.'),
        placement: 'bottom',
      }
    ],

    KEUSAHAWANAN_PRODUCT: [
      {
        target: '.tour-pos-product-add',
        title: t('portal:tour_keusahawanan_product_0_title', '➕ Tambah Produk'),
        content: t('portal:tour_keusahawanan_product_0_content', 'Masukkan inventori baru. Lengkapkan harga, muat naik gambar yang menarik, dan tetapkan imbasan barcode.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-pos-product-category',
        title: t('portal:tour_keusahawanan_product_1_title', '📦 Katalog Inventori'),
        content: t('portal:tour_keusahawanan_product_1_content', 'Tapis dan urus produk mengikut kategori. Semak baki stok dan ubah harga dengan pantas.'),
        placement: 'top',
      },
      {
        target: '.tour-pos-product-stock',
        title: t('portal:tour_keusahawanan_product_2_title', '📊 Pemantauan Stok'),
        content: t('portal:tour_keusahawanan_product_2_content', 'Pantau kuantiti inventori secara langsung. Sistem akan memaparkan amaran apabila stok menipis.'),
        placement: 'top',
      }
    ],

    KEUSAHAWANAN_ORDER: [
      {
        target: '.tour-pos-order-create',
        title: t('portal:tour_keusahawanan_order_0_title', '🛒 Troli & Pesanan'),
        content: t('portal:tour_keusahawanan_order_0_content', 'Sistem mesin daftar tunai (cashier) anda. Tambah item, imbas QR pelanggan PolyMart, dan kira jumlah bayaran secara automatik.'),
        placement: 'left',
        disableBeacon: true,
      },
      {
        target: '.tour-pos-order-payment',
        title: t('portal:tour_keusahawanan_order_1_title', '💳 Pengesahan Pembayaran'),
        content: t('portal:tour_keusahawanan_order_1_content', 'Pilih kaedah bayaran (Tunai, QR, Online) dan sahkan transaksi. Baki akan dikira secara automatik.'),
        placement: 'top',
      }
    ],

    EKPP_DASHBOARD: [
      {
        target: '.tour-kelab-stats',
        title: t('portal:tour_ekpp_dashboard_0_title', '📊 Prestasi Kelab'),
        content: t('portal:tour_ekpp_dashboard_0_content', 'Paparan pantas mengenai tahap keaktifan persatuan, bilangan ahli semasa, dan pencapaian terkini.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-kelab-tasks',
        title: t('portal:tour_ekpp_dashboard_1_title', '✅ Pengurusan Tugasan'),
        content: t('portal:tour_ekpp_dashboard_1_content', 'Senarai tugasan ahli kelab. Serah tugasan untuk kumpul mata merit dan pantau perkembangan pasukan.'),
        placement: 'top',
      }
    ],

    EKPP_AKTIVITI: [
      {
        target: 'body',
        title: t('portal:tour_ekpp_aktiviti_0_title', '🚀 Pusat Pengurusan Aktiviti'),
        content: t('portal:tour_ekpp_aktiviti_0_content', 'Nota Penting: Pengurusan data di sini amat kritikal kerana semua maklumat akan dikompilasi secara automatik untuk Laporan Bulanan Kelab.'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-tab-aktiviti',
        title: t('portal:tour_ekpp_aktiviti_1_title', '⚡ Aktiviti Kelab'),
        content: t('portal:tour_ekpp_aktiviti_1_content', 'Gunakan tab ini untuk merekod program dalaman kelab (contoh: Mesyuarat AJK, latihan) yang tidak memerlukan bajet / kelulusan rasmi.'),
        placement: 'bottom',
      },
      {
        target: '.tour-tab-takwim',
        title: t('portal:tour_ekpp_aktiviti_2_title', '📅 Takwim Rasmi'),
        content: t('portal:tour_ekpp_aktiviti_2_content', 'Ini adalah senarai program berskala besar yang telah diluluskan secara rasmi oleh sistem HEP & JPP.'),
        placement: 'bottom',
      },
      {
        target: '.tour-tab-statistik',
        title: t('portal:tour_ekpp_aktiviti_3_title', '📈 Analitik Penuh'),
        content: t('portal:tour_ekpp_aktiviti_3_content', 'Lihat graf prestasi penganjuran kelab. Ia mengukur sejauh mana keaktifan kelab berdasarkan bilangan bulan.'),
        placement: 'bottom',
      }
    ],

    EKPP_LAPORAN: [
      {
        target: '.tour-tab-laporan-semua',
        title: t('portal:tour_ekpp_laporan_0_title', '📤 Arkib Laporan Bulanan'),
        content: t('portal:tour_ekpp_laporan_0_content', 'Senarai penuh laporan bulanan kelab anda. Muat naik dokumen rasmi seperti Laporan Kewangan atau Minit Mesyuarat dan hantar kepada JPP untuk semakan.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-laporan-card',
        title: t('portal:tour_ekpp_laporan_1_title', '📄 Kad Laporan'),
        content: t('portal:tour_ekpp_laporan_1_content', 'Setiap kad mewakili satu bulan laporan. Klik untuk melihat, kemaskini, atau auto-jana PDF laporan profesional secara automatik.'),
        placement: 'top',
      }
    ],

    EKPP_AHLI: [
      {
        target: '.tour-senarai-mt',
        title: t('portal:tour_ekpp_ahli_0_title', '👑 Pengurusan Hierarki'),
        content: t('portal:tour_ekpp_ahli_0_content', 'Uruskan AJK anda di sini. Presiden boleh menukar status peranan pelajar biasa kepada Majlis Tertinggi (MT) secara rasmi.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-permohonan-baru',
        title: t('portal:tour_ekpp_ahli_1_title', '📨 Peti Masuk Keahlian'),
        content: t('portal:tour_ekpp_ahli_1_content', 'Apabila pelajar baru memohon untuk menyertai persatuan, permohonan tersebut akan disaring dan diluluskan di tab ini.'),
        placement: 'top',
      }
    ],

    EKPP_SEMAKAN: [
      {
        target: '.tour-semakan-menunggu',
        title: t('portal:tour_ekpp_semakan_0_title', '📋 Panel Kelulusan'),
        content: t('portal:tour_ekpp_semakan_0_content', 'Bilik kebal Jawatankuasa Perwakilan Pelajar (JPP). Segala laporan bulanan yang dihantar oleh kelab perlu disemak ketepatannya sebelum diluluskan.'),
        placement: 'bottom',
        disableBeacon: true,
      }
    ],

    KEBAJIKAN_DASHBOARD: [
      {
        target: 'body',
        title: t('portal:tour_kebajikan_dashboard_0_title', '🛡️ E-Kebajikan'),
        content: t('portal:tour_kebajikan_dashboard_0_content', 'Selamat datang ke pusat aduan dan kebajikan pelajar. Di sini anda boleh melaporkan kerosakan fasiliti dan memantau status tindakan pihak pengurusan.'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-kebajikan-metrics',
        title: t('portal:tour_kebajikan_dashboard_1_title', '📊 Rumusan Aduan'),
        content: t('portal:tour_kebajikan_dashboard_1_content', 'Pantau kesihatan fasiliti secara real-time. Ketahui berapa banyak laporan yang telah diselesaikan oleh pihak penyelenggara.'),
        placement: 'bottom',
      }
    ],

    KEBAJIKAN_SUBMIT: [
      {
        target: 'body',
        title: t('portal:tour_kebajikan_submit_0_title', '📝 Borang Aduan Baharu'),
        content: t('portal:tour_kebajikan_submit_0_content', 'Laporkan kerosakan fasiliti kampus di sini. Isi maklumat dengan tepat supaya pihak penyelenggara boleh bertindak dengan segera.'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-aduan-kategori',
        title: t('portal:tour_kebajikan_submit_1_title', '🏢 Kategori Kerosakan'),
        content: t('portal:tour_kebajikan_submit_1_content', 'Pastikan anda memilih lokasi dan jenis kerosakan yang tepat agar laporan ini dihantar ke jabatan yang betul (contoh: Pembangunan atau Asrama).'),
        placement: 'bottom',
      },
      {
        target: '.tour-aduan-gambar',
        title: t('portal:tour_kebajikan_submit_2_title', '📸 Bukti Bergambar'),
        content: t('portal:tour_kebajikan_submit_2_content', 'Tindakan yang cepat memerlukan bukti yang jelas. Muat naik gambar kawasan yang rosak untuk memudahkan siasatan.'),
        placement: 'top',
      }
    ],

    KEBAJIKAN_TICKETS: [
      {
        target: 'body',
        title: t('portal:tour_kebajikan_tickets_0_title', '📋 Aduan Saya'),
        content: t('portal:tour_kebajikan_tickets_0_content', 'Di sini anda boleh memantau semua aduan yang telah dihantar. Semak status terkini dan berkomunikasi terus dengan Exco JPP.'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-ticket-status',
        title: t('portal:tour_kebajikan_tickets_1_title', '💬 Kemaskini & Perbualan'),
        content: t('portal:tour_kebajikan_tickets_1_content', 'Aduan anda tidak akan diabaikan! Semak status terkini dan anda juga boleh berkomunikasi secara terus (direct chat) dengan Exco JPP untuk follow-up kes ini.'),
        placement: 'bottom',
      }
    ],

    POLYMAPS_PAGE: [
      {
        target: 'body',
        title: t('portal:tour_polymaps_page_0_title', '🗺️ PolyMaps — Navigasi Kampus'),
        content: t('portal:tour_polymaps_page_0_content', 'Selamat datang ke sistem pemetaan POLISAS! Cari bangunan, dewan kuliah, asrama, atau kemudahan terdekat dengan bantuan GPS.'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-polymaps-search',
        title: t('portal:tour_polymaps_page_1_title', '🔎 Enjin Carian Ruang'),
        content: t('portal:tour_polymaps_page_1_content', 'Cari dengan pantas. Masukkan nama bangunan, dewan kuliah atau asrama, dan kecerdasan pemetaan kami akan mengesan lokasi persis di dalam kampus.'),
        placement: 'bottom',
      },
      {
        target: '.tour-polymaps-quick',
        title: t('portal:tour_polymaps_page_2_title', '⚡ Penapisan Pintas'),
        content: t('portal:tour_polymaps_page_2_content', 'Keperluan mendesak? Akses penapis pintar untuk mengimbas zon kafeteria, surau atau tandas dengan radius terdekat berpandukan satelit GPS.'),
        placement: 'bottom',
      }
    ],

    POLYTASK_BOARD: [
      {
        target: 'body',
        title: t('portal:tour_polytask_board_0_title', '💼 PolyTask — Pasaran Gig Kampus'),
        content: t('portal:tour_polytask_board_0_content', 'Selamat datang ke PolyTask! Platform freelance eksklusif pelajar POLISAS. Cipta tugasan, terima bidaan, dan jana pendapatan sampingan.'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-step-board-main',
        title: t('portal:tour_polytask_board_1_title', '📋 Hab Pasaran Gig'),
        content: t('portal:tour_polytask_board_1_content', 'Terokai permintaan tempatan. Tinjau tawaran kerja gig yang selari dengan keupayaan anda untuk mengukuhkan ekosistem ekonomi mikro kampus.'),
        placement: 'top',
      }
    ],

    POLYTASK_MYJOBS: [
      {
        target: 'body',
        title: t('portal:tour_polytask_myjobs_0_title', '📦 Tugasan Saya'),
        content: t('portal:tour_polytask_myjobs_0_content', 'Halaman ini memaparkan semua tugasan yang anda telah cipta. Pantau status dan berinteraksi dengan tasker yang telah membida.'),
        placement: 'center',
        disableBeacon: true,
      }
    ],

    AKADEMIK_CGPA: [
      {
        target: '.tour-akademik-cgpa',
        title: t('portal:tour_akademik_cgpa_0_title', '📊 Pemantauan HPNM'),
        content: t('portal:tour_akademik_cgpa_0_content', 'Pantau keluk pointer anda setiap semester. Masukkan keputusan peperiksaan atau muat naik slip PDF untuk pengekstrakan automatik.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-akademik-merit',
        title: t('portal:tour_akademik_cgpa_1_title', '🏅 Koleksi Merit'),
        content: t('portal:tour_akademik_cgpa_1_content', 'Lihat baki mata merit terkumpul anda. Sertai lebih banyak aktiviti untuk meningkatkan skor dan kelayakan anugerah!'),
        placement: 'top',
      }
    ],

    POLYMART_LAYOUT: [
      {
        target: 'body',
        title: t('portal:tour_polymart_layout_0_title', '🛍️ PolyMart Marketplace'),
        content: t('portal:tour_polymart_layout_0_content', 'Selamat datang ke pusat e-dagang kampus! Sokong perniagaan rakan pelajar dengan membeli makanan, minuman, dan barangan menarik di sini.'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-polymart-categories',
        title: t('portal:tour_polymart_layout_1_title', '🔍 Carian & Kategori'),
        content: t('portal:tour_polymart_layout_1_content', 'Tapis produk mengikut kategori dengan pantas untuk mencari apa yang anda inginkan tanpa perlu meleret (scroll) tanpa henti.'),
        placement: 'bottom',
      },
      {
        target: '.tour-polymart-cart',
        title: t('portal:tour_polymart_layout_2_title', '🛒 Troli Anda'),
        content: t('portal:tour_polymart_layout_2_content', 'Segala barangan yang anda pilih akan dikumpul di sini. Buat pengesahan pesanan dan bayar menggunakan tunai, QR Pay, atau perbankan internet.'),
        placement: 'bottom',
      },
      {
        target: '.tour-polymart-vendor',
        title: t('portal:tour_polymart_layout_3_title', '🏪 Papan Pemuka Vendor'),
        content: t('portal:tour_polymart_layout_3_content', 'Hanya untuk Peniaga: Anda boleh mengakses panel pengurusan jualan dan menguruskan pesanan pelanggan dari tab ini.'),
        placement: 'bottom',
      },
      {
        target: '.tour-polymart-mobile-nav',
        title: t('portal:tour_polymart_layout_4_title', '📱 Navigasi Pantas'),
        content: t('portal:tour_polymart_layout_4_content', 'Gunakan bar menu di bawah untuk menyemak status pesanan semasa anda, sejarah pembelian, atau kembali ke halaman utama.'),
        placement: 'top',
      }
    ],

    POLYRENT_PAGE: [
      {
        target: 'body',
        title: t('portal:tour_polyrent_page_0_title', '🏠 Selamat Datang ke PolyRent!'),
        content: t('portal:tour_polyrent_page_0_content', 'Platform sewa bilik eksklusif pelajar POLISAS. Cari bilik yang sesuai, simpan kegemaran anda, dan hubungi tuan rumah terus dalam aplikasi ini.'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-polyrent-search',
        title: t('portal:tour_polyrent_page_1_title', '🔍 Cari Bilik Dengan Pantas'),
        content: t('portal:tour_polyrent_page_1_content', 'Taip nama kawasan atau jalan (cth: "Beserah", "Balok") untuk menapis senarai iklan dalam masa nyata.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-polyrent-tabs',
        title: t('portal:tour_polyrent_page_2_title', '🔀 Dua Mod Pencarian'),
        content: t('portal:tour_polyrent_page_2_content', '"Iklan Rumah" — tuan rumah yang iklankan bilik kosong. "Pelajar Mencari" — pelajar yang sedang mencari teman sewa atau bilik.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-polyrent-filters',
        title: t('portal:tour_polyrent_page_3_title', '⚡ Tapis Ikut Keperluan'),
        content: t('portal:tour_polyrent_page_3_content', 'Tapis iklan mengikut jantina yang diperlukan (Lelaki / Perempuan / Campuran), atau tekan ❤️ untuk melihat semua iklan yang telah anda simpan.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-polyrent-card',
        title: t('portal:tour_polyrent_page_4_title', '📋 Kad Iklan Bilik'),
        content: t('portal:tour_polyrent_page_4_content', 'Tekan pada mana-mana kad untuk melihat butiran penuh — gambar, kemudahan, jarak ke POLISAS, dan maklumat hubungi tuan rumah.'),
        placement: 'top',
        disableBeacon: true,
      },
      {
        target: '.tour-polyrent-wishlist',
        title: t('portal:tour_polyrent_page_5_title', '❤️ Simpan Iklan Kegemaran'),
        content: t('portal:tour_polyrent_page_5_content', 'Tekan ikon hati untuk menyimpan iklan yang menarik. Senarai simpanan anda akan kekal walaupun anda tutup aplikasi.'),
        placement: 'top',
        disableBeacon: true,
      },
      {
        target: '.tour-polyrent-add',
        title: t('portal:tour_polyrent_page_6_title', '📢 Tuan Rumah? Iklankan Sekarang!'),
        content: t('portal:tour_polyrent_page_6_content', 'Punya bilik kosong? Cipta iklan dalam masa 3 minit. Tetapkan harga, muat naik gambar, dan sambungkan dengan In-App Chat untuk pelajar hubungi anda terus.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-polyrent-calculator',
        title: t('portal:tour_polyrent_page_7_title', '🧮 Kalkulator Sewa Bijak'),
        content: t('portal:tour_polyrent_page_7_content', 'Tidak pasti berapa mampu bayar? Gunakan kalkulator ini untuk menganggar bajet sewa, utiliti, dan deposit awal dengan mudah.'),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.tour-polyrent-menu',
        title: t('portal:tour_polyrent_page_8_title', '⚙️ Urus Iklan Anda'),
        content: t('portal:tour_polyrent_page_8_content', 'Buka menu untuk mengurus iklan yang anda terbitkan, kemaskini kekosongan bilik, atau tutup iklan yang sudah penuh.'),
        placement: 'top',
        disableBeacon: true,
      },
      {
        target: '.tour-help-button',
        title: t('portal:tour_polyrent_page_9_title', '✅ Anda Sudah Bersedia!'),
        content: t('portal:tour_polyrent_page_9_content', 'Tutorial selesai. Jika perlukan bantuan lagi, tekan butang (?) ini untuk ulang panduan ini.'),
        placement: 'top',
        disableBeacon: true,
      },
    ],
  };
}

export const TOUR_STEPS: Record<string, Step[]> = new Proxy({} as Record<string, Step[]>, {
  get(_target, prop: string) {
    const live = getTourSteps();
    return live[prop];
  },
  has(_target, prop: string) {
    const live = getTourSteps();
    return prop in live;
  },
  ownKeys() {
    const live = getTourSteps();
    return Reflect.ownKeys(live);
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    const live = getTourSteps();
    if (prop in live) {
      return {
        value: live[prop],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }
    return undefined;
  }
});
