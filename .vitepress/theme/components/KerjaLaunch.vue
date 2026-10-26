<template>
  <a class="kerja-launch" href="/kerja">
    <span class="launch-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.2 4.2" />
      </svg>
    </span>
    <span class="launch-copy">
      <span class="launch-eyebrow">PERSONAL WORKSPACE</span>
      <strong>Open Kerja</strong>
      <span>Google search, messaging, social media, and your daily shortcuts in one place.</span>
    </span>
    <span class="launch-action">Open workspace <span aria-hidden="true">↗</span></span>
  </a>
</template>

<style scoped>
.kerja-launch {
  display: flex;
  align-items: center;
  gap: 18px;
  margin: 25px 0 32px;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 18px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 150ms ease, transform 150ms ease, background-color 150ms ease;
}
.kerja-launch:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}
.launch-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 15px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.launch-icon svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}
.launch-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}
.launch-eyebrow {
  color: var(--vp-c-text-2);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.launch-copy strong {
  font-size: 18px;
  letter-spacing: -0.025em;
}
.launch-copy > span:last-child {
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.55;
}
.launch-action {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding: 10px 13px;
  border-radius: 10px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  font-size: 12px;
  font-weight: 650;
}
@media (max-width: 640px) {
  .kerja-launch {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 13px;
    padding: 16px;
  }
  .launch-icon {
    width: 42px;
    height: 42px;
  }
  .launch-copy {
    flex: 1 1 calc(100% - 60px);
  }
  .launch-copy strong {
    font-size: 16px;
  }
  .launch-action {
    margin-left: 55px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .kerja-launch { transition: none; }
  .kerja-launch:hover { transform: none; }
}
</style>
