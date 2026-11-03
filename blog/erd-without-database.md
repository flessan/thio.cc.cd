---
title: "ERD tetap berguna meski aplikasinya tanpa database"
author:
  name: M. Thio Saputra
date: "2026-11-03"
description: "Catatan singkat dari tugas kejuruan: mengapa rancangan ERD tetap masuk akal ketika aplikasi Android memakai data konstan dan tidak menyimpan data ke database."
image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&h=840&q=85"
imageAlt: "Catatan dan dokumen perencanaan di atas meja kerja"
inLanguage: "id"
keywords:
  - "ERD"
  - "Android Studio"
  - "tugas kejuruan"
  - "data konstan"
  - "pemodelan data"
---

<BlogCover src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&h=840&q=85" alt="Catatan dan dokumen perencanaan di atas meja kerja" credit="Image via Unsplash" license-url="https://unsplash.com/license" />

# ERD tetap berguna meski aplikasinya tanpa database

<PostMeta date="2026-11-03"></PostMeta>
<PostTools></PostTools>

Ada satu hal menarik dari tugas kejuruan yang sedang aku kerjakan: rancangan ERD tetap diminta, tetapi aplikasi Android-nya tidak menggunakan database dan datanya bersifat konstan.

Awalnya terdengar bertentangan. Buat apa menggambar hubungan antardata kalau aplikasinya tidak akan menyimpan data ke MySQL, SQLite, atau database lain?

Ternyata dua hal itu menjawab pertanyaan yang berbeda.

## ERD menjelaskan struktur, bukan teknologi penyimpanan

ERD atau *Entity Relationship Diagram* membantu menjelaskan objek apa saja yang ada di dalam sebuah sistem dan bagaimana objek tersebut saling berhubungan. Diagram itu bisa dipakai sebelum kita memutuskan apakah datanya akan disimpan di database, file, API, atau bahkan ditulis langsung sebagai data tetap di dalam aplikasi.

Jadi, ERD tidak otomatis berarti proyek harus memiliki database yang berjalan. ERD adalah rancangan model data; database hanyalah salah satu cara untuk menyimpan model tersebut.

## Contoh sederhana: aplikasi pengatur prioritas

Misalnya aplikasi yang dibuat adalah pengatur prioritas kegiatan. Kita bisa memulai dengan beberapa entitas konseptual:

- **Tugas** menyimpan nama kegiatan, deskripsi, dan status.
- **Prioritas** menjelaskan tingkat urgensi, misalnya rendah, sedang, atau tinggi.
- **Kategori** mengelompokkan kegiatan, seperti sekolah, pribadi, atau pekerjaan.

Satu tugas dapat memiliki satu prioritas dan satu kategori. Hubungan itu tetap bisa digambarkan di ERD walaupun daftar tugas, prioritas, dan kategori nantinya hanya berupa data konstan di source code.

Contoh tersebut masih sebatas ilustrasi model, bukan keputusan final tentang aplikasi yang akan dibuat. Yang penting, kita bisa menjelaskan alasan di balik setiap entitas dan relasinya.

## Tanpa database bukan berarti tanpa struktur

Kalau data memang tidak berubah, aplikasi bisa memakai model atau daftar objek yang didefinisikan langsung di kode. Tampilan kemudian membaca data tersebut dan menyajikannya kepada pengguna.

Konsekuensinya juga perlu ditulis dengan jujur: perubahan data mungkin memerlukan perubahan source code dan build aplikasi baru. Kita tidak boleh menjanjikan fitur tambah, edit, atau hapus permanen kalau memang tidak ada tempat untuk menyimpan perubahan itu.

Justru di sini batas proyek menjadi jelas. Kita bisa fokus pada alur layar, navigasi, validasi input, dan cara menyajikan data tanpa berpura-pura memiliki sistem penyimpanan yang sebenarnya tidak diminta.

## Rancangannya tetap harus bisa dijelaskan

Menurutku, pelajaran terpentingnya bukan soal boleh atau tidak memakai database. Yang lebih penting adalah memahami perbedaan antara model data, data yang sedang ditampilkan, dan tempat data itu disimpan.

ERD membantu kita berpikir sebelum mulai menyusun layout di Android Studio. Setelah modelnya jelas, implementasi bisa mengikuti batas tugas dengan lebih rapi. Tidak semua proyek sekolah harus dibuat sebesar aplikasi produksi; yang penting setiap keputusan punya alasan dan hasilnya sesuai kebutuhan.

<PostNav></PostNav>
