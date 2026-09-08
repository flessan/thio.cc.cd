<script setup>
import WitaClock from './WitaClock.vue'
</script>

<template>
  <section class="hero full-bleed">
    <div class="hero-glow hero-glow-red" aria-hidden="true"></div>
    <div class="hero-glow hero-glow-blue" aria-hidden="true"></div>
    <div class="hero-grid-bg" aria-hidden="true"></div>

    <div class="hero-inner">
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="hero-eyebrow">
            <span class="mono">~/flessan</span>
            <span class="hero-halo">halo, saya</span>
          </p>

          <h1 class="hero-name">M.&nbsp;Thio&nbsp;Saputra</h1>

          <p class="hero-alias">
            known online as <strong class="hero-alias-strong">Flessan</strong>
            <span class="mono hero-alias-handle">@flessan</span>
          </p>

          <p class="hero-tagline">
            Developer, student, musician, editor — and maker of small things that
            become larger systems.
          </p>

          <p class="hero-intro">
            Self-taught developer from Banjarmasin, South Kalimantan. I build
            community-driven projects like
            <a href="/gdips">GDIPS</a>, small tools and experiments across the web —
            and I learn by making things real.
          </p>

          <div class="hero-actions">
            <a href="/projects" class="hero-btn hero-btn-primary">Explore my work</a>
            <a href="/about" class="hero-btn hero-btn-ghost">Who is Flessan?</a>
          </div>

          <ul class="hero-meta mono">
            <li class="hero-meta-item">Banjarmasin, ID</li>
            <li class="hero-meta-item hero-meta-dot" aria-hidden="true">·</li>
            <li class="hero-meta-item"><WitaClock /></li>
            <li class="hero-meta-item hero-meta-dot" aria-hidden="true">·</li>
            <li class="hero-meta-item">SMKN 4 · RPL</li>
          </ul>
        </div>

        <div class="hero-art">
          <div class="hero-avatar">
            <img
              src="/images/flessan-full.png"
              alt="Illustration of Flessan — black hair, red jacket"
              width="320"
              height="480"
            />
          </div>
          <div class="hero-tako">
            <img src="/images/tako.jpg" alt="TAKO, the blue octopus mascot" />
            <span class="mono">TAKO</span>
          </div>
        </div>
      </div>

      <ul class="hero-stats">
        <li class="hero-stat">
          <strong class="hero-stat-num mono">47</strong>
          <span class="hero-stat-label">public repos</span>
        </li>
        <li class="hero-stat">
          <strong class="hero-stat-num mono">500+</strong>
          <span class="hero-stat-label">GD levels beaten</span>
        </li>
        <li class="hero-stat">
          <strong class="hero-stat-num mono">2023</strong>
          <span class="hero-stat-label">coding in public since</span>
        </li>
        <li class="hero-stat">
          <strong class="hero-stat-num mono">GDIPS</strong>
          <span class="hero-stat-label">founder</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding: 4.5rem 0 3.5rem;
  margin-top: -1px;
  border-bottom: 1px solid var(--vp-c-divider);
  background:
    radial-gradient(1200px 500px at 85% -10%, rgba(30, 156, 215, 0.09), transparent 60%),
    radial-gradient(1000px 600px at -10% 0%, rgba(200, 16, 46, 0.13), transparent 55%),
    var(--vp-c-bg);
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}

.hero-glow-red {
  width: 420px;
  height: 420px;
  left: -120px;
  top: -140px;
  background: rgba(200, 16, 46, 0.22);
}

.hero-glow-blue {
  width: 340px;
  height: 340px;
  right: -80px;
  bottom: -160px;
  background: rgba(30, 156, 215, 0.14);
}

.hero-grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--vp-c-divider) 1px, transparent 1px),
    linear-gradient(90deg, var(--vp-c-divider) 1px, transparent 1px);
  background-size: 44px 44px;
  opacity: 0.25;
  mask-image: radial-gradient(720px 480px at 30% 20%, black, transparent 75%);
  -webkit-mask-image: radial-gradient(720px 480px at 30% 20%, black, transparent 75%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  max-width: 72rem;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.hero-grid {
  display: grid;
  gap: 3rem;
  align-items: center;
}

@media (min-width: 960px) {
  .hero-grid {
    grid-template-columns: 1.25fr 0.75fr;
  }
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: var(--vp-c-brand-1);
  margin-bottom: 1.1rem;
}

.hero-eyebrow .mono {
  font-weight: 500;
  letter-spacing: 0.02em;
}

.hero-halo {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base);
}

.hero-name {
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin: 0 0 0.6rem;
  color: var(--vp-c-text-1);
}

.hero-alias {
  font-size: 1.05rem;
  color: var(--vp-c-text-2);
  margin: 0 0 1.4rem;
}

.hero-alias-strong {
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.hero-alias-handle {
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
  margin-left: 0.35rem;
}

.hero-tagline {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 0.9rem;
  max-width: 34rem;
}

.hero-intro {
  color: var(--vp-c-text-2);
  margin: 0 0 1.8rem;
  max-width: 34rem;
  line-height: 1.7;
}

.hero-intro a {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  text-decoration: none;
}

.hero-intro a:hover {
  text-decoration: underline;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-bottom: 1.6rem;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: 0.6rem;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  border: 1px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.hero-btn-primary {
  background: var(--vp-c-brand-3);
  color: #fff;
  box-shadow: 0 8px 24px -10px rgba(200, 16, 46, 0.65);
}

.hero-btn-primary:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-1px);
}

.hero-btn-ghost {
  border-color: var(--vp-c-border);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.hero-btn-ghost:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.hero-meta-dot {
  opacity: 0.5;
}

.hero-art {
  position: relative;
  display: flex;
  justify-content: center;
}

.hero-avatar {
  position: relative;
  border-radius: 1.25rem;
  overflow: hidden;
  border: 1px solid var(--vp-c-border);
  background:
    radial-gradient(260px 200px at 50% 85%, rgba(200, 16, 46, 0.25), transparent 70%),
    var(--vp-c-bg-alt);
  box-shadow: 0 24px 60px -30px rgba(200, 16, 46, 0.45);
  transform: rotate(1.5deg);
  transition: transform 0.25s ease;
}

.hero-avatar:hover {
  transform: rotate(0deg) translateY(-4px);
}

.hero-avatar img {
  display: block;
  width: min(260px, 60vw);
  height: auto;
}

.hero-tako {
  position: absolute;
  right: 8%;
  bottom: -14px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 0.75rem;
  padding: 0.4rem 0.65rem;
  box-shadow: 0 12px 30px -12px rgba(0, 0, 0, 0.5);
  font-size: 0.72rem;
  color: var(--flessan-blue);
  font-weight: 700;
}

.hero-tako img {
  width: 44px;
  height: auto;
  border-radius: 0.4rem;
  display: block;
}

.hero-stats {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  list-style: none;
  padding: 0;
  margin: 3rem 0 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.9rem;
  overflow: hidden;
  background: var(--vp-c-divider);
}

@media (min-width: 768px) {
  .hero-stats {
    grid-template-columns: repeat(4, 1fr);
  }
}

.hero-stat {
  background: var(--vp-c-bg);
  padding: 1.1rem 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.hero-stat-num {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.hero-stat-label {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}
</style>
