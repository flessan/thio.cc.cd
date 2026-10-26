<script setup lang="ts">
import { ref } from 'vue'

const invitation = 'Aku lagi ngembangin Kontekstual, bahasa pemrograman dengan sintaks Bahasa Indonesia. Ide awalnya kepikiran pas mau tidur, karena besoknya ada pelajaran pemrograman kejuruan di SMK. Goal jangka panjangnya, aku pengin mengeksplorasi apakah pendekatan ini bisa membantu pembelajaran pemrograman dasar di sekolah. Kalau kamu kenal guru Informatika/RPL, dosen, atau tenaga pendidik, boleh bantu share ke mereka? Masukan jujur dari orang yang terlibat langsung di pendidikan bakal berguna banget buat menguji dan mengembangkan idenya.'
const copied = ref(false)
const feedback = ref('')

async function copyInvitation() {
  try {
    await navigator.clipboard.writeText(invitation)
    copied.value = true
    feedback.value = 'Teks ajakan berhasil disalin.'
  } catch {
    copied.value = false
    feedback.value = 'Clipboard tidak tersedia di browser ini. Kamu tetap bisa menyalin teks di atas secara manual.'
  }
}
</script>

<template>
  <aside class="educator-invite" aria-labelledby="educator-invite-title">
    <p class="eyebrow">BUTUH PERSPEKTIF PENDIDIK</p>
    <h2 id="educator-invite-title">Kenal guru, dosen, atau tenaga pendidik?</h2>
    <p class="intro">
      Kontekstual masih dikembangkan. Aku pengin mengujinya dengan masukan dari orang yang
      berpengalaman mendampingi proses belajar, bukan cuma mengandalkan asumsi pembuatnya.
    </p>
    <div class="invitation">
      <p>{{ invitation }}</p>
      <button type="button" @click="copyInvitation">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
        </svg>
        {{ copied ? 'Teks tersalin' : 'Salin teks ajakan' }}
      </button>
    </div>
    <p v-if="feedback" class="feedback" role="status">{{ feedback }}</p>
    <a class="project-link" href="https://github.com/flessan/kontekstual" target="_blank" rel="noreferrer">
      Lihat proyek Kontekstual <span aria-hidden="true">↗</span>
    </a>
  </aside>
</template>

<style scoped>
.educator-invite {
  margin: 2.5rem 0;
  padding: clamp(1.1rem, 3vw, 1.6rem);
  border: 1px solid var(--vp-c-divider);
  border-radius: 1rem;
  background: var(--vp-c-bg-alt);
}
.eyebrow {
  margin: 0 0 0.55rem;
  color: var(--vp-c-brand-1);
  font-size: 0.73rem;
  font-weight: 750;
  letter-spacing: 0.08em;
}
.educator-invite h2 {
  margin: 0 0 0.6rem;
  font-size: 1.35rem;
  line-height: 1.35;
}
.intro {
  margin: 0 0 1rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}
.invitation {
  padding: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.75rem;
  background: var(--vp-c-bg);
}
.invitation p {
  margin: 0 0 0.9rem;
  white-space: pre-wrap;
  font-size: 0.9rem;
  line-height: 1.7;
}
.invitation button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.25rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.55rem;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 650;
  cursor: pointer;
}
.invitation button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.invitation svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.feedback {
  margin: 0.6rem 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
}
.project-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
  font-size: 0.9rem;
  font-weight: 650;
  text-decoration: none;
}
.project-link:hover {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
</style>
