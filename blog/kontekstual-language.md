---
title: "Kontekstual: Indonesian programming language experiment"
author:
  name: M. Thio Saputra
date: "2026-10-18"
description: "The story behind Kontekstual, an Indonesian-syntax programming language experiment inspired by a school programming lesson and a goal of exploring classroom use."
image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&h=840&q=85"
imageAlt: "Computer screen showing source code in a development environment"
inLanguage: "en"
keywords:
  - "Kontekstual programming language"
  - "Indonesian programming language"
  - "programming education"
  - "beginner programming"
  - "SMK RPL"
---

<BlogCover src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&h=840&q=85" alt="Source code displayed on a computer screen" credit="Image via Unsplash" license-url="https://unsplash.com/license" />

# Kontekstual: code in the language we speak

<PostMeta date="2026-10-18"></PostMeta>
<PostTools></PostTools>

## Ide yang muncul sebelum tidur

Kontekstual gak dimulai dari roadmap pendidikan yang rapi atau ambisi bikin bahasa pemrograman baru sejak awal. Ceritanya jauh lebih sederhana: suatu malam, pas mau tidur, aku keinget kalau besok ada pelajaran pemrograman kejuruan di SMK. Materinya nyambung ke logika pemrograman, lalu muncul pertanyaan kecil:

**Gimana kalau sintaks bahasa pemrograman bisa dibaca menggunakan bahasa Indonesia?**

Daripada cuma kepikiran terus, aku coba bikin proyeknya. Ya, otak memilih menambah repo baru tepat saat waktunya istirahat. Prioritas memang kadang punya jalan sendiri.

Proyeknya bernama **[Kontekstual](https://github.com/flessan/kontekstual)**. Nama itu mewakili harapanku: kode seharusnya bisa dipahami sesuai konteks dan aturan yang jelas, bukan sekadar terlihat seperti kalimat biasa.

## Contoh kecilnya

Ini contoh program yang sedang aku eksplorasi:

```text
Tetapkan umur bernilai 17.
Tetapkan nama dengan nilai "Thio".
Tetapkan aktif bernilai benar.

Ubah umur menjadi umur + 3.

Jika umur lebih dari atau sama dengan 18, maka:
    Tampilkan "Anda diminta menghadap ke presiden, " + nama + "!".
    Tampilkan umur.

Tampilkan aktif.
```

Output-nya:

```text
Anda diminta menghadap ke presiden, Thio!
20
benar
```

Bagian menghadap presiden itu cuma contoh output yang sengaja absurd. Yang lebih penting adalah alur programnya: membuat variabel, mengubah nilainya, memeriksa kondisi, lalu menampilkan hasil.

Kontekstual menggunakan kata-kata seperti `Tetapkan`, `Jika`, dan `Tampilkan` supaya struktur program terasa lebih akrab untuk penutur bahasa Indonesia. Ekstensi berkas yang dipakai adalah `.konteks`.

## Bukan cuma mengganti keyword

Mengubah `let` menjadi `Tetapkan` saja gak otomatis membuat bahasa baru jadi bagus. Sintaksnya tetap harus konsisten, aturan grammar-nya harus tegas, dan compiler nantinya harus bisa memahami program tanpa menebak-nebak maksud penulisnya.

Itu sebabnya aku ingin mengerjakannya bertahap: memperjelas spesifikasi, memastikan aturan bahasa tidak saling bertabrakan, lalu mengembangkan implementasinya. Compiler native dan keluaran executable termasuk tujuan jangka panjang proyek, bukan klaim bahwa semuanya sudah selesai hari ini.

Bahasa Indonesia juga bukan pengganti universal untuk Python, JavaScript, atau bahasa lain. Kontekstual adalah eksperimen untuk mengeksplorasi cara mengajarkan dan mempelajari konsep pemrograman melalui sintaks yang lebih dekat dengan bahasa sehari-hari. Apakah pendekatan ini benar-benar membantu pemula? Itu masih perlu diuji.

## Kenapa aku ingin melibatkan sekolah?

Goal jangka panjangku adalah membuat Kontekstual berpotensi digunakan di sekolah-sekolah, terutama sebagai salah satu cara mengenalkan logika dan pemrograman dasar. Karena aku sendiri masih pelajar, ide ini berangkat dari pengalaman belajar yang aku alami langsung.

Tapi pengalaman sebagai pelajar saja belum cukup untuk menilai apakah bahasa ini efektif buat kelas yang sesungguhnya. Masukan dari guru RPL, guru Informatika, dosen, dan tenaga pendidik bisa membantu menemukan bagian yang membingungkan, materi yang perlu disederhanakan, atau justru alasan kenapa pendekatan ini kurang cocok untuk situasi tertentu.

Aku lebih memilih mendapat kritik sejak awal daripada telanjur membangun sesuatu yang terlihat menarik, tetapi ternyata gak membantu orang yang ingin belajar.

Kalau kamu tertarik dengan desain bahasa pemrograman, kamu bisa mengikuti perkembangannya di [repository Kontekstual](https://github.com/flessan/kontekstual). Grammar dan pengalaman pemula adalah dua area yang paling berguna untuk diberi masukan saat ini.

<EducatorInvite></EducatorInvite>

<PostNav></PostNav>
