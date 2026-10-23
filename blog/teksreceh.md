---
title: "teksreceh: Indonesian internet text generator"
author:
  name: M. Thio Saputra
date: "2026-09-01"
description: "teksreceh is an Indonesian internet text generator for alay, UwU, Rimsvek, binary text, and other playful ways of typing online."
image: /images/covers/teksreceh.png
imageAlt: "Cover artwork for teksreceh, a collection of Indonesian internet text styles"
inLanguage: "id"
keywords:
  - "teksreceh"
  - "generator teks receh"
  - "bahasa alay"
  - "budaya internet Indonesia"
  - "text transformer"
---

<BlogCover src="/images/covers/teksreceh.png" alt="Cover for teksreceh, a collection of Indonesian internet text styles" />

# teksreceh: a museum of +62 typing

<PostMeta date="2026-09-01"></PostMeta>
<PostTools></PostTools>

Internet Indonesia punya cara ngetiknya sendiri. Ada era huruf gede-kecil campur, vokal dipanjangin, angka jadi pengganti huruf, sampai gaya tulisan yang kalau dibaca keras-keras malah bikin kita mempertanyakan keputusan hidup.

**[teksreceh](https://github.com/flessan/teksreceh)**, dengan tagline “Generator Teks Paling Ngaco Se-Indonesia”, adalah caraku mengumpulkan gaya-gaya itu jadi sesuatu yang bisa dimainkan lagi. Bukan karena semua teks harus berguna. Kadang iseng juga termasuk alasan yang valid buat bikin web app.

## Museum kecilnya berisi apa?

Tool yang live di [text.thio.qzz.io](https://text.thio.qzz.io) punya beberapa transformasi:

- **Alay**: gaya tulisan internet era 2010-an yang penuh variasi huruf dan angka.
- **UwU**: versi super cute, dengan energi yang mungkin terlalu kuat untuk percakapan kantor.
- **Rimsvek**: teks yang dibalik, dicerminkan, atau diputar sesuai transformasinya.
- **Binary**: mengubah teks menjadi representasi biner.
- Ada juga gaya bahasa Jaksel dan copypasta grup WhatsApp.

Tinggal masukkan teks, lalu lihat hasilnya. Gak perlu menekan tombol Generate untuk setiap perubahan; transformasi berjalan langsung saat teks diubah.

## Dibangun sederhana, diproses di browser

teksreceh memakai React 19, Vite, dan Tailwind CSS, lalu di-deploy ke Cloudflare Pages. Salah satu keputusan yang sengaja dipertahankan adalah pemrosesan di sisi browser: teks yang dimasukkan diubah secara lokal tanpa backend khusus atau pelacakan yang dibutuhkan oleh fitur transformasinya.

Prinsipnya juga sederhana: halaman utama tetap mudah dipakai, opsi tambahan gak harus memenuhi layar sejak awal, dan tampilannya mesti terasa nyaman di ponsel. Tool mungil seperti ini gak butuh tujuh menu buat mengubah satu kalimat.

## Kenapa namanya “receh”?

Receh itu humor murah meriah, kadang lucunya tipis, kadang bahkan gak ada, tapi tetap dikirim ke grup chat dengan penuh keyakinan. Teks receh kurang lebih begitu: teks yang diubah untuk alasan yang gak produktif sama sekali, dan justru itu poinnya.

Repo-nya menggunakan lisensi GPL-3.0 dan terbuka untuk kontribusi. Kalau ingat gaya teks yang belum ada, atau nemu transformasi yang perlu diperbaiki, kamu bisa membuka issue di [repository teksreceh](https://github.com/flessan/teksreceh).

Coba langsung di [text.thio.qzz.io](https://text.thio.qzz.io). Gunakan dengan bertanggung jawab. Atau minimal, jangan kirim hasil UwU ke grup keluarga tanpa mempertimbangkan konsekuensinya.

<PostNav></PostNav>
