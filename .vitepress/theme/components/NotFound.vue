<script setup lang="ts">
function openSearch() {
  const btn = document.querySelector<HTMLElement>('.VPNavBarSearch button')
  if (btn) {
    btn.click()
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        '.VPLocalSearchBox input, .search-input'
      )
      input?.focus()
    }, 60)
  }
}
</script>

<template>
  <div class="nf">
    <img
      class="nf-art"
      src="/images/tako.png"
      alt="Artwork by Flessan"
      width="272"
      height="77"
      loading="lazy"
      decoding="async"
    />
    <p class="nf-code">404</p>
    <h1 class="nf-title">Page not found</h1>
    <p class="nf-text">
      This page doesn't exist - it may have been renamed, or never shipped.
      Search usually finds what you're looking for.
    </p>
    <div class="nf-actions">
      <button class="nf-btn nf-btn-primary" type="button" @click="openSearch">
        Search this site (Ctrl K)
      </button>
      <a class="nf-btn" href="/">Back to home</a>
    </div>
    <p class="nf-links">
      Popular pages:
      <a href="/news">News</a> ·
      <a href="/blog">Blog</a> ·
      <a href="/projects">Projects</a> ·
      <a href="/gdips">GDIPS</a> ·
      <a href="/now">Now</a> ·
      <a href="/about">About</a>
    </p>
  </div>
</template>

<style scoped>
.nf {
  padding: 4rem 1.5rem 6rem;
  max-width: 34rem;
  margin: 0 auto;
  text-align: center;
}

.nf-code {
  font-size: 4rem;
  font-weight: 700;
  color: var(--flessan-accent-ink);
  margin: 0;
  line-height: 1;
}

.nf-art {
  max-width: 272px;
  width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.nf-title {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0.8rem 0 0.6rem;
  padding-top: 0;
  border-top: none;
}

.nf-text {
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin: 0 auto 1.8rem;
}

.nf-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.7rem;
  margin-bottom: 2rem;
}

.nf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--flessan-card-border);
  border-radius: 10px;
  padding: 0.58rem 1.1rem;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  font-family: inherit;
  transition:
    background-color 200ms ease,
    border-color 220ms ease,
    color 180ms ease,
    transform 420ms var(--flessan-ease-out),
    box-shadow 320ms var(--flessan-ease-out);
}

.nf-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--flessan-shadow-sm);
}

.nf-btn-primary {
  border-color: var(--flessan-accent-fill);
  background: var(--flessan-accent-fill);
  color: var(--flessan-on-accent);
}

.nf-btn-primary:hover {
  border-color: var(--flessan-accent-fill-hover);
  background: var(--flessan-accent-fill-hover);
}

.nf-btn:not(.nf-btn-primary) {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.nf-btn:not(.nf-btn-primary):hover {
  border-color: var(--flessan-accent-line);
  color: var(--flessan-accent-ink);
}

@media (prefers-reduced-motion: reduce) {
  .nf-btn:hover {
    transform: none;
  }
}

.nf-links {
  color: var(--vp-c-text-3);
  font-size: 0.88rem;
}

.nf-links a {
  color: var(--vp-c-brand-1);
  font-weight: 500;
}
</style>
