// Import Firebase Firestore
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "../firebase-config.js";

// Ambil slug dari URL
const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('slug');

// Fungsi untuk menghapus tag HTML dari string
function stripHtml(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
}

// Fungsi untuk memuat artikel berdasarkan slug
async function loadArticle() {
    if (!slug) {
        document.body.innerHTML = "<h1>Maaf Halaman Yang Anda Tuju Salah</h1>";
        return;
    }

    try {
        // Buat query untuk mengambil artikel berdasarkan slug
        const q = query(collection(db, "articles"), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);

        // Cek apakah artikel ditemukan
        if (!querySnapshot.empty) {
            const article = querySnapshot.docs[0].data();

            // Tampilkan data artikel ke elemen HTML
            document.getElementById("title").innerText = article.title;
            document.getElementById("titleKeterangan").innerText = article.titleKeterangan;
            document.getElementById("tanggalPembuatan").innerText = 
                new Date(article.tanggalPembuatan).toLocaleDateString('id-ID');
            document.getElementById("photoUrl").src = article.photoUrl;
            document.getElementById("photoUrl").alt = article.caption;
            document.getElementById("caption").innerText = article.caption;
            document.getElementById("articles").innerHTML = article.content;

            // Memperbarui <title> halaman
            document.title = article.title;

            // Sinkronisasi dengan meta tag og:title, og:description, dan og:image
            document.querySelector('meta[property="og:title"]').content = article.title;

            // Menghapus tag HTML dan simbol untuk og:description
            const plainTextContent = stripHtml(article.content);
            const firstSentence = plainTextContent.split('. ')[0].trim() + '.';
            document.querySelector('meta[property="og:description"]').content = firstSentence;

            document.querySelector('meta[property="og:image"]').content = article.photoUrl;
        } else {
            // Jika artikel tidak ditemukan
            document.body.innerHTML = "<h1>Artikel tidak ditemukan!</h1>";
        }
    } catch (error) {
        console.error("Gagal memuat artikel:", error);
        document.body.innerHTML = "<h1>Terjadi kesalahan saat memuat artikel.</h1>";
    }
}

// Panggil fungsi saat halaman dimuat
document.addEventListener("DOMContentLoaded", loadArticle);
