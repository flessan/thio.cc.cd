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
  padding: 1rem 1.1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--fl-r-md);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 220ms var(--flessan-ease-out),
    box-shadow 240ms var(--flessan-ease-out);
}

.kerja-launch:hover {
  border-color: var(--vp-c-text-3);
  transform: translateY(-2px);
  box-shadow: var(--flessan-shadow-md);
}

.launch-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--fl-accent-line);
  border-radius: 10px;
  background: var(--fl-accent-soft);
  color: var(--fl-accent-ink);
}

.launch-icon svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.launch-copy {
  display: grid;
  min-width: 0;
  gap: 0.15rem;
}

.launch-eyebrow {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.launch-copy strong {
  color: var(--vp-c-text-1);
  font-size: 0.96rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.launch-desc {
  overflow: hidden;
  color: var(--vp-c-text-2);
  font-size: 0.79rem;
  line-height: 1.55;
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
  padding: 0.2rem 0.45rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 0.62rem;
  white-space: nowrap;
}

.launch-arrow {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  color: var(--vp-c-text-2);
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    transform 220ms var(--flessan-ease-out);
}

.launch-arrow svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.kerja-launch:hover .launch-arrow {
  border-color: var(--fl-accent);
  background: var(--fl-accent);
  color: var(--fl-on-accent);
  transform: translateX(2px);
}

@media (max-width: 720px) {
  .kerja-launch {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.8rem;
  }

  .launch-copy {
    flex: 1 1 calc(100% - 56px);
  }

  .launch-desc {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .launch-meta {
    margin-left: 0;
    padding-left: 3.1rem;
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
