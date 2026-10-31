<template>
  <section class="home-hero" aria-labelledby="home-hero-title">
    <div class="home-hero__copy">
      <p class="home-hero__eyebrow"><span aria-hidden="true"></span> HELLO, INTERNET</p>
      <h1 id="home-hero-title">Hi, I'm <span>Flessan.</span><br />I build things for the internet.</h1>
      <p class="home-hero__description">
        A developer and curious builder from Banjarmasin, Indonesia. I work across web apps,
        automation, Linux, and community projects, then share what I learn along the way.
      </p>

      <div class="home-hero__actions">
        <a class="home-hero__button home-hero__button--primary" href="/projects">
          Explore projects <span aria-hidden="true">↗</span>
        </a>
        <a class="home-hero__button home-hero__button--secondary" href="/kerja">
          Open workspace <span aria-hidden="true">→</span>
        </a>
      </div>

      <div class="home-hero__skills" aria-label="Areas of interest">
        <span>Web development</span>
        <span>Automation</span>
        <span>Linux</span>
        <span>Open source</span>
      </div>
    </div>

    <div class="home-hero__visual">
      <div class="home-hero__visual-top">
        <span>THE WORKBENCH</span>
        <span>01 / 04</span>
      </div>
      <div class="home-hero__art-frame">
        <span class="home-hero__orbit home-hero__orbit--one" aria-hidden="true"></span>
        <span class="home-hero__orbit home-hero__orbit--two" aria-hidden="true"></span>
        <img
          src="/images/flessan-full.png"
          alt="Character artwork by Flessan"
          width="320"
          height="480"
          fetchpriority="high"
          decoding="async"
        />
      </div>
      <div class="home-hero__visual-bottom">
        <span class="home-hero__location"><span aria-hidden="true">●</span> BANJARMASIN, ID</span>
        <span>BUILD · LEARN · REPEAT</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-hero {
  --hero-ink: #1e2c23;
  --hero-muted: #657267;
  --hero-green: #2d6948;
  --hero-border: rgba(48, 83, 58, 0.15);
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(260px, 0.78fr);
  gap: clamp(1.4rem, 4vw, 3.4rem);
  align-items: stretch;
  width: 100%;
  min-height: 390px;
  margin: 1.1rem 0 2.6rem;
  overflow: hidden;
  border: 1px solid var(--hero-border);
  border-radius: 26px;
  background: #f3f6f0;
  color: var(--hero-ink);
  box-shadow: 0 16px 42px rgba(24, 42, 29, 0.055);
  animation: home-hero-enter 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.home-hero__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  padding: clamp(1.5rem, 4vw, 3.25rem);
}

.home-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 1.1rem;
  color: var(--hero-green);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.home-hero__eyebrow span {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 50%;
  background: #5a9a6e;
  box-shadow: 0 0 0 4px rgba(90, 154, 110, 0.13);
}

.home-hero h1 {
  max-width: 15ch;
  margin: 0;
  color: var(--hero-ink);
  font-size: clamp(2.25rem, 4.4vw, 3.65rem);
  font-weight: 790;
  letter-spacing: -0.065em;
  line-height: 1.035;
  text-wrap: balance;
}

.home-hero h1 span {
  color: var(--hero-green);
}

.home-hero__description {
  max-width: 37rem;
  margin: 1.15rem 0 0;
  color: var(--hero-muted);
  font-size: 0.94rem;
  line-height: 1.8;
}

.home-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.45rem;
}

.home-hero__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  min-height: 2.8rem;
  padding: 0.7rem 1rem;
  border: 1px solid transparent;
  border-radius: 11px;
  font-size: 0.82rem;
  font-weight: 720;
  text-decoration: none;
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), background-color 180ms ease, border-color 180ms ease, box-shadow 220ms ease;
}

.home-hero__button:hover {
  transform: translateY(-2px);
}

.home-hero__button--primary {
  border-color: var(--hero-green);
  background: var(--hero-green);
  color: #fff;
  box-shadow: 0 5px 13px rgba(35, 93, 59, 0.15);
}

.home-hero__button--primary:hover {
  background: #24583c;
  color: #fff;
  box-shadow: 0 9px 20px rgba(35, 93, 59, 0.19);
}

.home-hero__button--secondary {
  border-color: var(--hero-border);
  background: rgba(255, 255, 255, 0.72);
  color: var(--hero-ink);
}

.home-hero__button--secondary:hover {
  border-color: rgba(45, 105, 72, 0.4);
  background: #fff;
}

.home-hero__skills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 1.55rem;
}

.home-hero__skills span {
  padding: 0.34rem 0.58rem;
  border: 1px solid rgba(48, 83, 58, 0.12);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.55);
  color: #536257;
  font-size: 0.68rem;
  font-weight: 620;
}

.home-hero__visual {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  min-height: 390px;
  padding: 1.15rem 1.3rem 1rem;
  overflow: hidden;
  border-left: 1px solid rgba(48, 83, 58, 0.11);
  background: #e5ede3;
}

.home-hero__visual-top,
.home-hero__visual-bottom {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  color: #657769;
  font-size: 0.59rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.home-hero__art-frame {
  position: relative;
  display: flex;
  flex: 1;
  align-items: flex-end;
  justify-content: center;
  min-height: 0;
  margin: 0.8rem 0;
}

.home-hero__art-frame img {
  position: relative;
  z-index: 1;
  display: block;
  width: min(100%, 290px);
  max-height: 330px;
  object-fit: contain;
  object-position: center bottom;
  border-radius: 0;
  filter: drop-shadow(0 14px 16px rgba(36, 54, 40, 0.12));
  animation: home-art-arrive 900ms 120ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.home-hero__orbit {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(74%, 260px);
  aspect-ratio: 1;
  border: 1px solid rgba(59, 103, 69, 0.15);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.home-hero__orbit--two {
  width: min(92%, 320px);
  border-style: dashed;
  border-color: rgba(59, 103, 69, 0.12);
}

.home-hero__location {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.home-hero__location span {
  color: #4f9364;
  font-size: 0.48rem;
}

@keyframes home-hero-enter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes home-art-arrive {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-color-scheme: dark) {
  :global(html.dark) .home-hero {
    --hero-ink: #e8efe9;
    --hero-muted: #a7b5aa;
    --hero-green: #a3d1b0;
    --hero-border: rgba(190, 215, 194, 0.14);
    background: #202a23;
    box-shadow: 0 16px 42px rgba(0, 0, 0, 0.14);
  }

  :global(html.dark) .home-hero__visual {
    border-left-color: rgba(190, 215, 194, 0.1);
    background: #28372d;
  }

  :global(html.dark) .home-hero__visual-top,
  :global(html.dark) .home-hero__visual-bottom {
    color: #a8b9ac;
  }

  :global(html.dark) .home-hero__skills span {
    border-color: rgba(190, 215, 194, 0.13);
    background: rgba(13, 22, 16, 0.18);
    color: #c5d4c8;
  }

  :global(html.dark) .home-hero__button--primary {
    background: #3b7853;
    border-color: #3b7853;
    color: #fff;
  }

  :global(html.dark) .home-hero__button--primary:hover {
    background: #498b62;
  }

  :global(html.dark) .home-hero__button--secondary {
    border-color: rgba(190, 215, 194, 0.18);
    background: rgba(13, 22, 16, 0.22);
    color: #e8efe9;
  }

  :global(html.dark) .home-hero__button--secondary:hover {
    background: rgba(13, 22, 16, 0.38);
  }

  :global(html.dark) .home-hero__orbit {
    border-color: rgba(185, 211, 190, 0.16);
  }
}

@media (max-width: 760px) {
  .home-hero {
    grid-template-columns: 1fr;
    gap: 0;
    margin-bottom: 2.2rem;
    border-radius: 21px;
  }

  .home-hero__copy {
    padding: 1.65rem 1.4rem 1.55rem;
  }

  .home-hero h1 {
    max-width: 13ch;
    font-size: clamp(2.35rem, 10vw, 3.3rem);
  }

  .home-hero__visual {
    min-height: 230px;
    padding: 0.9rem 1rem 0.8rem;
    border-top: 1px solid rgba(48, 83, 58, 0.11);
    border-left: 0;
  }

  .home-hero__art-frame img {
    width: min(70%, 210px);
    max-height: 220px;
  }
}

@media (max-width: 420px) {
  .home-hero__actions {
    width: 100%;
  }

  .home-hero__button {
    flex: 1 1 auto;
    padding-inline: 0.75rem;
    font-size: 0.76rem;
  }

  .home-hero__visual-bottom {
    font-size: 0.52rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-hero,
  .home-hero__art-frame img {
    animation: none;
  }

  .home-hero__button {
    transition: none;
  }

  .home-hero__button:hover {
    transform: none;
  }
}
</style>
