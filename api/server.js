// api/server.js

const express = require('express');
const path = require('path');
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require("firebase/firestore");
require('dotenv').config(); // Untuk memuat variabel lingkungan dari .env

// Fungsi untuk menyandikan karakter HTML guna mencegah XSS
function escapeHtml(text) {
    if (typeof text !== 'string') {
        return text;
    }
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Fungsi untuk menghapus semua tag HTML dari teks
function stripHtmlTags(text) {
    return text.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

// Inisialisasi aplikasi Express
const app = express();

// Middleware untuk menyajikan file statis dari direktori 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware untuk parsing JSON dan URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware logging (opsional, untuk debugging)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Konfigurasi Firebase menggunakan Environment Variables
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID // Ini opsional
};

// Inisialisasi Firebase
initializeApp(firebaseConfig);
const db = getFirestore();

// === Redirect dari URL lama ke URL baru ===

// Redirect dari URL lama ke URL baru untuk Artikel
app.get('/artikel-home.html', (req, res) => {
    const slug = req.query.slug;
    console.log(`Redirecting /artikel-home.html?slug=${slug} to /artikel-home/${slug}`);
    if (slug) {
        return res.redirect(301, `/artikel-home/${encodeURIComponent(slug)}`);
    } else {
        return res.status(400).send("Bad Request: Missing 'slug' parameter.");
    }
});

// Redirect dari URL lama ke URL baru untuk Berita
app.get('/berita-home.html', (req, res) => {
    const slug = req.query.slug;
    console.log(`Redirecting /berita-home.html?slug=${slug} to /berita-home/${slug}`);
    if (slug) {
        return res.redirect(301, `/berita-home/${encodeURIComponent(slug)}`);
    } else {
        return res.status(400).send("Bad Request: Missing 'slug' parameter.");
    }
});

// === Rute Dinamis untuk Artikel ===
app.get('/artikel-home/:slug', async (req, res) => {
    const slug = req.params.slug;
    console.log(`Menerima permintaan untuk artikel dengan slug: ${slug}`);

    if (!slug) {
        console.log("Slug tidak diberikan.");
        return res.status(400).send("Bad Request: Missing 'slug' parameter.");
    }

    try {
        const q = query(collection(db, "articles"), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);
        console.log(`Jumlah dokumen ditemukan: ${querySnapshot.size}`);
        const articleDoc = querySnapshot.empty ? null : querySnapshot.docs[0];
        const article = articleDoc ? articleDoc.data() : null;

        if (article) {
            console.log(`Artikel ditemukan: ${article.title}`);
            // Sanitasi data untuk keamanan dan pemurnian konten
            const title = escapeHtml(article.title);
            const titleKeterangan = escapeHtml(article.titleKeterangan);
            let photoUrl = escapeHtml(article.photoUrl);
            const content = escapeHtml(article.content);
            const tanggalPembuatan = escapeHtml(article.tanggalPembuatan || ''); // Asumsikan ada field tanggal

            // Pastikan photoUrl adalah absolute URL
            if (photoUrl && !photoUrl.startsWith('http')) {
                photoUrl = `https://sekawanfc.fun/${photoUrl.replace(/^\/+/, '')}`;
            }

            // Jika photoUrl kosong, sediakan fallback gambar default
            if (!photoUrl) {
                photoUrl = 'https://sekawanfc.fun/default-image.jpg'; // Sediakan gambar default
            }

            // Bersihkan konten dari tag HTML untuk meta tag deskripsi
            const cleanedContent = stripHtmlTags(article.content);

            // Meta tags OG yang dihasilkan di server
            const metaTags = `
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${cleanedContent.substring(0, 160)}" /> <!-- Ambil 160 karakter pertama -->
                <meta property="og:image" content="${photoUrl}" />
                <meta property="og:image:width" content="1200">
                <meta property="og:image:height" content="630">
                <meta property="og:type" content="article" />
                <meta property="og:url" content="https://sekawanfc.fun/artikel-home/${encodeURIComponent(slug)}" />
            `;

            // Mengirimkan HTML yang berisi meta tag OG dan konten artikel
            res.send(`
                <!DOCTYPE html>
                <html lang="id" translate="no">
                <head>
                    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
                    <meta http-equiv="Pragma" content="no-cache">
                    <meta http-equiv="Expires" content="0">

                    <!-- Google Analytics -->
                    <script async src="https://www.googletagmanager.com/gtag/js?id=G-CD0MHD1RBP"></script>
                    <script>
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-CD0MHD1RBP');
                    </script>
                    <!-- Link Preview -->
                    ${metaTags}
                    <!-- Cache Control -->
                    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
                    <meta http-equiv="Pragma" content="no-cache">
                    <meta http-equiv="Expires" content="-5">

                    <!-- Viewport and Meta -->
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <meta charset="UTF-8">
                    <meta name="google" content="notranslate">

                    <!-- Bootstrap and Styles -->
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"
                        integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
                    <link rel="stylesheet" href="/css/style.css">
                    <link rel="stylesheet" href="/css/loading.css">
                    <link rel="stylesheet" href="/css/berita.css">
                    <link rel="stylesheet" href="/css/play-audio.css">

                    <!-- Icons -->
                    <link rel="apple-touch-icon" sizes="57x57" href="/icon/apple-icon-57x57.png">
                    <link rel="apple-touch-icon" sizes="60x60" href="/icon/apple-icon-60x60.png">
                    <link rel="apple-touch-icon" sizes="72x72" href="/icon/apple-icon-72x72.png">
                    <link rel="apple-touch-icon" sizes="76x76" href="/icon/apple-icon-76x76.png">
                    <link rel="apple-touch-icon" sizes="114x114" href="/icon/apple-icon-114x114.png">
                    <link rel="apple-touch-icon" sizes="120x120" href="/icon/apple-icon-120x120.png">
                    <link rel="apple-touch-icon" sizes="144x144" href="/icon/apple-icon-144x144.png">
                    <link rel="apple-touch-icon" sizes="152x152" href="/icon/apple-icon-152x152.png">
                    <link rel="apple-touch-icon" sizes="180x180" href="/icon/apple-icon-180x180.png">
                    <link rel="icon" type="image/png" sizes="192x192" href="/icon/android-icon-192x192.png">
                    <link rel="icon" type="image/png" sizes="32x32" href="/icon/favicon-32x32.png">
                    <link rel="icon" type="image/png" sizes="96x96" href="/icon/favicon-96x96.png">
                    <link rel="icon" type="image/png" sizes="16x16" href="/icon/favicon-16x16.png">
                    <link rel="manifest" href="/manifest.json">
                    <meta name="msapplication-TileColor" content="#ffffff">
                    <meta name="msapplication-TileImage" content="/icon/ms-icon-144x144.png">
                    <meta name="theme-color" content="#ffffff">

                    <!-- Firebase -->
                    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
                    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
                    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>

                    <title>${title}</title>
                </head>

                <body>
                    <div class="mobile-only">
                        <div class="content-wrapper">
                            <!-- Wrapper -->
                            <div class="wrapper">
                                <!-- LOADING SCREEN -->
                                <div id="loading-screen" class="background">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <img class="loading-logo" src="/SekawanFC.jpg" alt="Loading...">
                                    <img class="loading-wait" src="/img/loading4.gif" alt="Loading...">
                                </div>
                                <!-- END LOADING SCREEN -->

                                <div id="main-content" style="display: none;">
                                    <!-- Navbar -->
                                    <nav class="navbar navbar-expand-lg custom-navbar">
                                        <div class="container-fluid">
                                            <a class="navbar-brand text-white fw-bold" href="/index.html">
                                                <div class="d-flex align-items-center">
                                                    <img src="/SekawanFC.jpg" alt="Icon" class="icon-img" width="40" height="40">
                                                    <span class="ms-2">SEKAWAN FC</span>
                                                </div>
                                            </a>
                                            <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
                                                data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
                                                aria-expanded="false" aria-label="Toggle navigation">
                                                <span class="navbar-toggler-icon"></span>
                                            </button>
                                            <div class="collapse navbar-collapse" id="navbarSupportedContent">
                                                <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
                                                    <li class="nav-item">
                                                        <a class="nav-link" style="color: white;" aria-current="page"
                                                            href="/index.html">Home</a>
                                                    </li>
                                                    <li class="nav-item">
                                                        <a class="nav-link" style="color: white;" href="/profil.html">Profil</a>
                                                    </li>
                                                    <li class="nav-item dropdown">
                                                        <a class="nav-link dropdown-toggle" href="#" role="button"
                                                            data-bs-toggle="dropdown" aria-expanded="false"
                                                            style="color: white;">Informasi</a>
                                                        <ul class="dropdown-menu">
                                                            <li><a class="dropdown-item" href="/berita-home">Berita</a></li>
                                                            <li><a class="dropdown-item" href="/artikel-home">Artikel</a></li>
                                                        </ul>
                                                    </li>
                                                    <li class="nav-item">
                                                        <a class="nav-link" id="login-logout-link" style="color: white;"
                                                            href="/login.html">Masuk / Daftar</a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </nav>
                                    <!-- End Navbar -->
                                </div>

                                <!-- Konten Artikel -->
                                <div class="judul-halaman">
                                    <h1 id="title" class="detail-title">${title}</h1>
                                    <div class="title-keterangan">
                                        <p id="titleKeterangan">${titleKeterangan}</p>
                                        <p id="tanggalPembuatan">${tanggalPembuatan}</p>
                                    </div>
                                </div>
                                <div class="container-foto">
                                    <img id="photoUrl" class="custom-foto" src="${photoUrl}" alt="Foto Artikel">
                                </div>
                                <p id="caption" class="keterangan-foto"></p>
                                <!-- PLAY AUDIO -->
                                <div class="audio-player-container desktop-only">
                                    <div class="audio-player-title">MENDENGARKAN ISI HALAMAN</div>
                                    <div class="audio-player">
                                        <div class="controls">
                                            <button id="play-btn" class="btn-play">&#9658;</button> <!-- Simbol Play -->
                                            <button id="pause-btn" class="btn-pause">&#10074;&#10074;</button> <!-- Simbol Pause -->
                                            <button id="stop-btn" class="btn-stop">&#9632;</button> <!-- Simbol Stop -->
                                        </div>
                                    </div>
                                </div>
                                <!-- END PLAY AUDIO -->
                                <div class="isi-halaman">
                                    <div id="articles">${content}</div>
                                </div>
                                <!-- End Artikel -->

                                <!-- Tombol tautan -->
                                <div class="container-tautan">
                                    <!-- Ikon untuk Salin Tautan menggunakan gambar -->
                                    <span id="copyLink" class="link-icon">
                                        <img src="/img/icon-link.png" alt="Ikon Share Link" class="icon-link">
                                        Share Link
                                    </span>
                                    <!-- Pesan Notifikasi -->
                                    <div id="tautan-notification" class="tautan-notification">
                                        Tautan sudah di copy dan siap di paste, silahkan share
                                    </div>
                                </div>
                                <!-- End Tombol tautan -->

                                <!-- FOOTER -->
                                <footer class="custom-footer">
                                    <div class="footer-content">
                                        <div class="footer-section">
                                            <h6>Ikuti Kami</h6>
                                            <div class="social-icons">
                                                <a href="https://www.facebook.com/sekawanfc" class="social-icon" target="_blank">
                                                    <img src="https://w7.pngwing.com/pngs/670/159/png-transparent-facebook-logo-social-media-facebook-computer-icons-linkedin-logo-facebook-icon-media-internet-facebook-icon.png"
                                                        alt="Ikon Facebook" class="icon-image">
                                                </a>
                                                <a href="https://www.instagram.com/sekawanfc" class="social-icon" target="_blank">
                                                    <img src="https://cdn.pixabay.com/photo/2016/08/09/17/52/instagram-1581266_1280.jpg"
                                                        alt="Ikon Instagram" class="icon-image">
                                                </a>
                                            </div>
                                        </div>
                                        <div class="footer-section">
                                            <h6>Hubungi Kami</h6>
                                            <p class="footer-email">Email: <a class="footer-email-link"
                                                    href="mailto:admin@sekawanfc.com">admin@sekawanfc.com</a></p>
                                            <p class="footer-telephone">Telepon: +62 813 363 06253</p>
                                        </div>
                                    </div>
                                    <div class="footer-bottom">
                                        <p class="footer-bottom-copyright">Copyright &copy; 2024 SekawanFC, All rights reserved</p>
                                        <p class="footer-bottom-dibuat">Dibuat oleh BithDev</p>
                                    </div>
                                </footer>
                                <!-- END FOOTER -->
                            </div>
                            <!-- SCRIPTS -->
                            <div class="container-js">
                                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
                                    integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
                                    crossorigin="anonymous"></script>
                                <script src="/js/pencarian.js"></script>
                                <script src="/js/hapus-cookie.js"></script>
                                <script src="/js/splash-screen-start.js"></script>
                                <script src="/js/kunci-layar.js"></script>
                                <script type="module" src="/firebase-config.js"></script>
                                <script src="/js/share-link.js"></script>
                                <script src="/js/cek-login.js"></script>
                                <script type="module" src="/ujicoba-website.js"></script>
                                <script type="module" src="/js/api-artikel.js"></script>
                                <script src="/js/play-audio.js"></script>

                                <script>
                                    window.splashScreenApiUrl = 'https://script.googleusercontent.com/macros/echo?user_content_key=Ug4_RY3Q1GjQImtwch8hiiU37tiqDCIMi8bTKHj97_WxEAvt8cdY5oa_0Y6dp_E2w5y237mVYqBpQaI3A6pP_BXAylj9M2Ilm5_BxDlH2jW0nuo2oDemN9CCS2h10ox_1xSncGQajx_ryfhECjZEnFnDUwtuW5IHw5CPwpfhqpJZUQvB1wU_QDcMWPm2k5WgJ9OtqX5w07gpJuDy0PbvOMRplWdFUiYiu_oV8kxVeaRFvnZ3JX3SHg&lib=MOgvvvmbSEQE02bq4Gi45tbleS6DrsjUUV';
                                </script>
                            </div>
                            <!-- END SCRIPTS -->

                            <!-- Service Worker -->
                            <script>
                                if ('serviceWorker' in navigator) {
                                    window.addEventListener('load', function () {
                                        navigator.serviceWorker.register('/service-worker.js').then(function (registration) {
                                            // console.log('Service Worker registered with scope:', registration.scope); // Pesan ini telah dikomentari
                                        }, function (error) {
                                            console.error('Service Worker registration failed:', error); // Tetap tampilkan error untuk debugging
                                        });
                                    });
                                }
                            </script>
                            <!-- END Service Worker -->
                        </div>
                    </div>
                </body>

                </html>
            `);
        } else {
            console.log(`Tidak ada artikel yang ditemukan untuk slug: ${slug}`);
            res.status(404).send(`
                <!DOCTYPE html>
                <html lang="id">
                <head>
                    <meta charset="UTF-8">
                    <title>Artikel Tidak Ditemukan</title>
                    <style>
                        body { 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            height: 100vh; 
                            background-color: #f8d7da; 
                            color: #721c24; 
                            font-family: Arial, sans-serif; 
                        }
                        h1 {
                            color: #721c24;
                        }
                    </style>
                </head>
                <body>
                    <h1>Slug tidak ditemukan di URL!</h1>
                </body>
                </html>
            `);
        }
    } catch (error) {
        console.error("Error fetching artikel:", error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Error</title>
                <style>
                    body { 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        background-color: #f8d7da; 
                        color: #721c24; 
                        font-family: Arial, sans-serif; 
                    }
                    h1 {
                        color: #721c24;
                    }
                </style>
            </head>
            <body>
                <h1>Terjadi kesalahan saat memuat artikel.</h1>
            </body>
            </html>
        `);
    }
});

// === Rute Dinamis untuk Berita ===
app.get('/berita-home/:slug', async (req, res) => {
    const slug = req.params.slug;
    console.log(`Menerima permintaan untuk berita dengan slug: ${slug}`);

    if (!slug) {
        console.log("Slug tidak diberikan.");
        return res.status(400).send("Bad Request: Missing 'slug' parameter.");
    }

    try {
        const q = query(collection(db, "berita"), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);
        console.log(`Jumlah dokumen ditemukan: ${querySnapshot.size}`);
        const beritaDoc = querySnapshot.empty ? null : querySnapshot.docs[0];
        const berita = beritaDoc ? beritaDoc.data() : null;

        if (berita) {
            console.log(`Berita ditemukan: ${berita.title}`);
            // Sanitasi data untuk keamanan dan pemurnian konten
            const title = escapeHtml(berita.title);
            const titleKeterangan = escapeHtml(berita.titleKeterangan);
            let photoUrl = escapeHtml(berita.photoUrl);
            const content = escapeHtml(berita.content);
            const tanggalPembuatan = escapeHtml(berita.tanggalPembuatan || '');

            // Validasi dan proses URL gambar (photoUrl)
            if (photoUrl && !photoUrl.startsWith('http')) {
                photoUrl = `https://sekawanfc.fun/${photoUrl.replace(/^\/+/, '')}`;
            }

            // Jika photoUrl kosong, sediakan fallback gambar default
            if (!photoUrl) {
                photoUrl = 'https://sekawanfc.fun/default-image.jpg'; // Sediakan gambar default
            }

            // Bersihkan konten dari tag HTML untuk meta tag deskripsi
            const cleanedContent = stripHtmlTags(berita.content);

            // Meta tags OG yang dihasilkan di server untuk preview link di media sosial
            const metaTags = `
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${cleanedContent.substring(0, 160)}" /> <!-- Ambil 160 karakter pertama -->
                <meta property="og:image" content="${photoUrl}" />
                <meta property="og:image:width" content="1200">
                <meta property="og:image:height" content="630">
                <meta property="og:type" content="article" />
                <meta property="og:url" content="https://sekawanfc.fun/berita-home/${encodeURIComponent(slug)}" />
            `;

            // Mengirimkan HTML yang berisi meta tag OG dan konten berita
            res.send(`
                <!DOCTYPE html>
                <html lang="id" translate="no">
                <head>
                    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
                    <meta http-equiv="Pragma" content="no-cache">
                    <meta http-equiv="Expires" content="0">

                    <!-- Google Analytics -->
                    <script async src="https://www.googletagmanager.com/gtag/js?id=G-CD0MHD1RBP"></script>
                    <script>
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-CD0MHD1RBP');
                    </script>
                    <!-- Link Preview -->
                    ${metaTags}
                    <!-- Cache Control -->
                    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
                    <meta http-equiv="Pragma" content="no-cache">
                    <meta http-equiv="Expires" content="-5">

                    <!-- Viewport and Meta -->
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <meta charset="UTF-8">
                    <meta name="google" content="notranslate">

                    <!-- Bootstrap and Styles -->
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"
                        integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
                    <link rel="stylesheet" href="/css/style.css">
                    <link rel="stylesheet" href="/css/loading.css">
                    <link rel="stylesheet" href="/css/berita.css">
                    <link rel="stylesheet" href="/css/play-audio.css">

                    <!-- Icons -->
                    <link rel="apple-touch-icon" sizes="57x57" href="/icon/apple-icon-57x57.png">
                    <link rel="apple-touch-icon" sizes="60x60" href="/icon/apple-icon-60x60.png">
                    <link rel="apple-touch-icon" sizes="72x72" href="/icon/apple-icon-72x72.png">
                    <link rel="apple-touch-icon" sizes="76x76" href="/icon/apple-icon-76x76.png">
                    <link rel="apple-touch-icon" sizes="114x114" href="/icon/apple-icon-114x114.png">
                    <link rel="apple-touch-icon" sizes="120x120" href="/icon/apple-icon-120x120.png">
                    <link rel="apple-touch-icon" sizes="144x144" href="/icon/apple-icon-144x144.png">
                    <link rel="apple-touch-icon" sizes="152x152" href="/icon/apple-icon-152x152.png">
                    <link rel="apple-touch-icon" sizes="180x180" href="/icon/apple-icon-180x180.png">
                    <link rel="icon" type="image/png" sizes="192x192" href="/icon/android-icon-192x192.png">
                    <link rel="icon" type="image/png" sizes="32x32" href="/icon/favicon-32x32.png">
                    <link rel="icon" type="image/png" sizes="96x96" href="/icon/favicon-96x96.png">
                    <link rel="icon" type="image/png" sizes="16x16" href="/icon/favicon-16x16.png">
                    <link rel="manifest" href="/manifest.json">
                    <meta name="msapplication-TileColor" content="#ffffff">
                    <meta name="msapplication-TileImage" content="/icon/ms-icon-144x144.png">
                    <meta name="theme-color" content="#ffffff">

                    <!-- Firebase -->
                    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
                    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
                    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>

                    <title>${title}</title>
                </head>

                <body>
                    <div class="mobile-only">
                        <div class="content-wrapper">
                            <!-- Wrapper -->
                            <div class="wrapper">
                                <!-- LOADING SCREEN -->
                                <div id="loading-screen" class="background">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <img class="loading-logo" src="/SekawanFC.jpg" alt="Loading...">
                                    <img class="loading-wait" src="/img/loading4.gif" alt="Loading...">
                                </div>
                                <!-- END LOADING SCREEN -->

                                <div id="main-content" style="display: none;">
                                    <!-- Navbar -->
                                    <nav class="navbar navbar-expand-lg custom-navbar">
                                        <div class="container-fluid">
                                            <a class="navbar-brand text-white fw-bold" href="/index.html">
                                                <div class="d-flex align-items-center">
                                                    <img src="/SekawanFC.jpg" alt="Icon" class="icon-img" width="40" height="40">
                                                    <span class="ms-2">SEKAWAN FC</span>
                                                </div>
                                            </a>
                                            <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
                                                data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
                                                aria-expanded="false" aria-label="Toggle navigation">
                                                <span class="navbar-toggler-icon"></span>
                                            </button>
                                            <div class="collapse navbar-collapse" id="navbarSupportedContent">
                                                <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
                                                    <li class="nav-item">
                                                        <a class="nav-link" style="color: white;" aria-current="page"
                                                            href="/index.html">Home</a>
                                                    </li>
                                                    <li class="nav-item">
                                                        <a class="nav-link" style="color: white;" href="/profil.html">Profil</a>
                                                    </li>
                                                    <li class="nav-item dropdown">
                                                        <a class="nav-link dropdown-toggle" href="#" role="button"
                                                            data-bs-toggle="dropdown" aria-expanded="false"
                                                            style="color: white;">Informasi</a>
                                                        <ul class="dropdown-menu">
                                                            <li><a class="dropdown-item" href="/berita-home">Berita</a></li>
                                                            <li><a class="dropdown-item" href="/artikel-home">Artikel</a></li>
                                                        </ul>
                                                    </li>
                                                    <li class="nav-item">
                                                        <a class="nav-link" id="login-logout-link" style="color: white;"
                                                            href="/login.html">Masuk / Daftar</a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </nav>
                                    <!-- End Navbar -->
                                </div>

                                <!-- Konten Berita -->
                                <div class="judul-halaman">
                                    <h1 id="title" class="detail-title">${title}</h1>
                                    <div class="title-keterangan">
                                        <p id="titleKeterangan">${titleKeterangan}</p>
                                        <p id="tanggalPembuatan">${tanggalPembuatan}</p>
                                    </div>
                                </div>
                                <div class="container-foto">
                                    <img id="photoUrl" class="custom-foto" src="${photoUrl}" alt="Foto Berita">
                                </div>
                                <p id="caption" class="keterangan-foto"></p>
                                <!-- PLAY AUDIO -->
                                <div class="audio-player-container desktop-only">
                                    <div class="audio-player-title">MENDENGARKAN ISI HALAMAN</div>
                                    <div class="audio-player">
                                        <div class="controls">
                                            <button id="play-btn" class="btn-play">&#9658;</button> <!-- Simbol Play -->
                                            <button id="pause-btn" class="btn-pause">&#10074;&#10074;</button> <!-- Simbol Pause -->
                                            <button id="stop-btn" class="btn-stop">&#9632;</button> <!-- Simbol Stop -->
                                        </div>
                                    </div>
                                </div>
                                <!-- END PLAY AUDIO -->
                                <div class="isi-halaman">
                                    <div id="articles">${content}</div>
                                </div>
                                <!-- End Berita -->

                                <!-- Tombol tautan -->
                                <div class="container-tautan">
                                    <!-- Ikon untuk Salin Tautan menggunakan gambar -->
                                    <span id="copyLink" class="link-icon">
                                        <img src="/img/icon-link.png" alt="Ikon Share Link" class="icon-link">
                                        Share Link
                                    </span>
                                    <!-- Pesan Notifikasi -->
                                    <div id="tautan-notification" class="tautan-notification">
                                        Tautan sudah di copy dan siap di paste, silahkan share
                                    </div>
                                </div>
                                <!-- End Tombol tautan -->

                                <!-- FOOTER -->
                                <footer class="custom-footer">
                                    <div class="footer-content">
                                        <div class="footer-section">
                                            <h6>Ikuti Kami</h6>
                                            <div class="social-icons">
                                                <a href="https://www.facebook.com/sekawanfc" class="social-icon" target="_blank">
                                                    <img src="https://w7.pngwing.com/pngs/670/159/png-transparent-facebook-logo-social-media-facebook-computer-icons-linkedin-logo-facebook-icon-media-internet-facebook-icon.png"
                                                        alt="Ikon Facebook" class="icon-image">
                                                </a>
                                                <a href="https://www.instagram.com/sekawanfc" class="social-icon" target="_blank">
                                                    <img src="https://cdn.pixabay.com/photo/2016/08/09/17/52/instagram-1581266_1280.jpg"
                                                        alt="Ikon Instagram" class="icon-image">
                                                </a>
                                            </div>
                                        </div>
                                        <div class="footer-section">
                                            <h6>Hubungi Kami</h6>
                                            <p class="footer-email">Email: <a class="footer-email-link"
                                                    href="mailto:admin@sekawanfc.com">admin@sekawanfc.com</a></p>
                                            <p class="footer-telephone">Telepon: +62 813 363 06253</p>
                                        </div>
                                    </div>
                                    <div class="footer-bottom">
                                        <p class="footer-bottom-copyright">Copyright &copy; 2024 SekawanFC, All rights reserved</p>
                                        <p class="footer-bottom-dibuat">Dibuat oleh BithDev</p>
                                    </div>
                                </footer>
                                <!-- END FOOTER -->
                            </div>
                            <!-- SCRIPTS -->
                            <div class="container-js">
                                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
                                    integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
                                    crossorigin="anonymous"></script>
                                <script src="/js/pencarian.js"></script>
                                <script src="/js/hapus-cookie.js"></script>
                                <script src="/js/splash-screen-start.js"></script>
                                <script src="/js/kunci-layar.js"></script>
                                <script type="module" src="/firebase-config.js"></script>
                                <script src="/js/share-link.js"></script>
                                <script src="/js/cek-login.js"></script>
                                <script type="module" src="/ujicoba-website.js"></script>
                                <script type="module" src="/js/api-artikel.js"></script>
                                <script src="/js/play-audio.js"></script>

                                <script>
                                    window.splashScreenApiUrl = 'https://script.googleusercontent.com/macros/echo?user_content_key=Ug4_RY3Q1GjQImtwch8hiiU37tiqDCIMi8bTKHj97_WxEAvt8cdY5oa_0Y6dp_E2w5y237mVYqBpQaI3A6pP_BXAylj9M2Ilm5_BxDlH2jW0nuo2oDemN9CCS2h10ox_1xSncGQajx_ryfhECjZEnFnDUwtuW5IHw5CPwpfhqpJZUQvB1wU_QDcMWPm2k5WgJ9OtqX5w07gpJuDy0PbvOMRplWdFUiYiu_oV8kxVeaRFvnZ3JX3SHg&lib=MOgvvvmbSEQE02bq4Gi45tbleS6DrsjUUV';
                                </script>
                            </div>
                            <!-- END SCRIPTS -->

                            <!-- Service Worker -->
                            <script>
                                if ('serviceWorker' in navigator) {
                                    window.addEventListener('load', function () {
                                        navigator.serviceWorker.register('/service-worker.js').then(function (registration) {
                                            // console.log('Service Worker registered with scope:', registration.scope); // Pesan ini telah dikomentari
                                        }, function (error) {
                                            console.error('Service Worker registration failed:', error); // Tetap tampilkan error untuk debugging
                                        });
                                    });
                                }
                            </script>
                            <!-- END Service Worker -->
                        </div>
                    </div>
                </body>

                </html>
            `);
        } else {
            console.log(`Tidak ada berita yang ditemukan untuk slug: ${slug}`);
            res.status(404).send(`
                <!DOCTYPE html>
                <html lang="id">
                <head>
                    <meta charset="UTF-8">
                    <title>Berita Tidak Ditemukan</title>
                    <style>
                        body { 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            height: 100vh; 
                            background-color: #f8d7da; 
                            color: #721c24; 
                            font-family: Arial, sans-serif; 
                        }
                        h1 {
                            color: #721c24;
                        }
                    </style>
                </head>
                <body>
                    <h1>Slug tidak ditemukan di URL!</h1>
                </body>
                </html>
            `);
        }
    } catch (error) {
        console.error("Error fetching berita:", error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Error</title>
                <style>
                    body { 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        background-color: #f8d7da; 
                        color: #721c24; 
                        font-family: Arial, sans-serif; 
                    }
                    h1 {
                        color: #721c24;
                    }
                </style>
            </head>
            <body>
                <h1>Terjadi kesalahan saat memuat berita.</h1>
            </body>
            </html>
        `);
    }
});

// Menambahkan Rute Root untuk Pengujian
app.get('/', (req, res) => {
    res.send('Server Express Berjalan dengan Baik!');
});

// Menetapkan Port
const PORT = process.env.PORT || 3000;

// Menjalankan Server dan Mendengarkan pada Port Tertentu
app.listen(PORT, () => {
    console.log(`Server berjalan pada port ${PORT}`);
});

// Mengekspor aplikasi Express
module.exports = app;
