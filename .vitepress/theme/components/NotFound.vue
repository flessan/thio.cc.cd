<script setup lang="ts">
import { useData } from 'vitepress'
import TerminalWindow from './TerminalWindow.vue'

const { site } = useData()
</script>

<template>
  <div class="nf">
    <div class="nf-inner">
      <p class="nf-eyebrow mono">flessan@thio:~$</p>
      <h1 class="nf-title">
        404 <span class="nf-dash">—</span> nyasar?
      </h1>
      <p class="nf-desc">
        This page doesn't exist (yet?). It happens — my bugs have character.
      </p>
      <p class="nf-desc">
        <em>"Not the biggest. Not the fanciest. But built with heart."</em> —
        sometimes links break with heart too.
      </p>
      <div class="nf-actions">
        <a class="nf-btn nf-btn-primary" href="/">Kembali ke rumah</a>
        <a class="nf-btn nf-btn-ghost" href="/projects">Lihat proyek</a>
        <a class="nf-btn nf-btn-ghost" href="/blog">Baca blog</a>
      </div>
      <div class="nf-term">
        <TerminalWindow />
      </div>
      <p class="nf-foot mono">
        // {{ site.title }} · {{ site.titleTemplate?.toString().replace(':title', '404') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.nf {
  min-height: 80vh;
  display: flex;
  align-items: flex-start;
  padding: 6rem 1.5rem 4rem;
  background: radial-gradient(900px 420px at 70% -10%, rgba(200, 16, 46, 0.12), transparent 65%),
    var(--vp-c-bg);
}

.nf-inner {
  max-width: 44rem;
  margin: 0 auto;
  width: 100%;
}

.nf-eyebrow {
  color: var(--vp-c-text-3);
  margin: 0 0 1rem;
  font-size: 0.85rem;
}

.nf-title {
  font-size: clamp(2.2rem, 6vw, 3.2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 1.1rem;
  color: var(--vp-c-text-1);
}

.nf-dash {
  color: var(--vp-c-brand-1);
}

.nf-desc {
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin: 0 0 0.6rem;
}

.nf-desc em {
  color: var(--vp-c-text-1);
}

.nf-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin: 1.8rem 0 2.6rem;
}

.nf-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.6rem 1.15rem;
  border-radius: 0.6rem;
  font-weight: 700;
  font-size: 0.92rem;
  text-decoration: none;
  border: 1px solid transparent;
  transition: transform 0.15s ease, background 0.15s ease;
}

.nf-btn-primary {
  background: var(--vp-c-brand-3);
  color: #fff;
}

.nf-btn-primary:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-1px);
}

.nf-btn-ghost {
  border-color: var(--vp-c-border);
  color: var(--vp-c-text-1);
}

.nf-btn-ghost:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}

.nf-term {
  margin-bottom: 1.6rem;
}

.nf-foot {
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
}
</style>
