<template>
  <a class="kerja-launch" href="/kerja">
    <span class="launch-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <rect x="3.5" y="5" width="17" height="14" rx="3" />
        <path d="M3.5 9.5h17M7.5 14.5h4" />
      </svg>
    </span>

    <span class="launch-copy">
      <span class="launch-eyebrow">Personal workspace</span>
      <strong>Everything I use, one keystroke away</strong>
      <span class="launch-desc">
        Search across ten engines, jump to pinned tools, and find any of the
        33 shortcuts with a command palette.
      </span>
    </span>

    <span class="launch-meta">
      <span class="launch-pill">⌘K palette</span>
      <span class="launch-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 12h13M12.5 6.5L19 12l-6.5 5.5" /></svg>
      </span>
    </span>
  </a>
</template>

<style scoped>
.kerja-launch {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.8rem 0 2.2rem;
  padding: clamp(1rem, 2.4vw, 1.35rem);
  border: 0;
  border-radius: var(--md-shape-2xl);
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  text-decoration: none;
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-medium) var(--md-ease-spring),
    box-shadow var(--md-duration-medium) var(--md-ease-standard);
}

.kerja-launch:hover {
  transform: translateY(-2px);
  box-shadow: var(--md-elevation-2);
}

.kerja-launch:active {
  transform: scale(0.995);
}

.launch-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--md-on-primary-container) 12%, transparent);
  color: var(--md-on-primary-container);
}

.launch-icon svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.launch-copy {
  display: grid;
  min-width: 0;
  gap: 0.18rem;
}

.launch-eyebrow {
  color: color-mix(in srgb, var(--md-on-primary-container) 70%, transparent);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.launch-copy strong {
  color: var(--md-on-primary-container);
  font-size: 1.02rem;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.launch-desc {
  overflow: hidden;
  color: color-mix(in srgb, var(--md-on-primary-container) 80%, transparent);
  font-size: 0.8rem;
  line-height: 1.6;
  text-overflow: ellipsis;
}

.launch-meta {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.55rem;
  margin-left: auto;
}

.launch-pill {
  padding: 0.25rem 0.6rem;
  border: 0;
  border-radius: var(--md-shape-full);
  background: color-mix(in srgb, var(--md-on-primary-container) 12%, transparent);
  color: var(--md-on-primary-container);
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  white-space: nowrap;
}

.launch-arrow {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: var(--md-primary);
  color: var(--md-on-primary);
  transition:
    background-color var(--md-duration-short) var(--md-ease-standard),
    transform var(--md-duration-medium) var(--md-ease-spring);
}

.launch-arrow svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.kerja-launch:hover .launch-arrow {
  transform: translateX(3px);
}

@media (max-width: 720px) {
  .kerja-launch {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.8rem;
  }

  .launch-copy {
    flex: 1 1 calc(100% - 64px);
  }

  .launch-desc {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .launch-meta {
    margin-left: 0;
    padding-left: 3.6rem;
  }

  .launch-pill {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kerja-launch,
  .launch-arrow {
    transition: none;
  }

  .kerja-launch:hover {
    transform: none;
  }
}
</style>
