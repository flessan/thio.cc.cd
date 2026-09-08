<script setup>
defineProps({
  project: { type: Object, required: true }
})
</script>

<template>
  <article class="project-card">
    <header class="project-card-head">
      <h3 class="project-name mono">{{ project.name }}</h3>
      <ul class="project-tags mono">
        <li v-for="tag in project.tags" :key="tag">{{ tag }}</li>
      </ul>
    </header>
    <p class="project-desc">{{ project.desc }}</p>
    <footer class="project-links mono">
      <a v-if="project.repo" :href="project.repo" target="_blank" rel="noopener">
        GitHub <span aria-hidden="true">↗</span>
      </a>
      <a v-if="project.home" :href="project.home" target="_blank" rel="noopener">
        Visit <span aria-hidden="true">↗</span>
      </a>
    </footer>
  </article>
</template>

<style scoped>
.project-card {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 0.9rem;
  background: var(--vp-c-bg-alt);
  padding: 1.25rem 1.35rem;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.project-card:hover {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 45%, var(--vp-c-border));
  transform: translateY(-2px);
  box-shadow: 0 18px 40px -26px rgba(200, 16, 46, 0.4);
}

.project-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.9rem;
}

.project-name {
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
  letter-spacing: -0.01em;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.project-tags li {
  font-size: 0.66rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-border);
  border-radius: 99px;
  padding: 0.14rem 0.55rem;
}

.project-desc {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  line-height: 1.6;
  flex: 1;
}

.project-links {
  display: flex;
  gap: 1.1rem;
  margin-top: 0.15rem;
  font-size: 0.78rem;
}

.project-links a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
}

.project-links a:hover {
  text-decoration: underline;
}
</style>
