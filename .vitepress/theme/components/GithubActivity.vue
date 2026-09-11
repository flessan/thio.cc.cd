<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 5 })

interface GhEvent {
  type: string
  repo: { name: string }
  created_at: string
  payload: {
    commits?: unknown[]
    size?: number
    ref_type?: string
    action?: string
  }
}

interface Row {
  text: string
  repo: string
  when: string
}

const CACHE_KEY = 'flessan:activity'
const TTL = 5 * 60 * 1000

const rows = ref<Row[] | null>(null)
const failed = ref(false)
const updated = ref('')

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

function describe(e: GhEvent): string {
  switch (e.type) {
    case 'PushEvent': {
      const n = e.payload?.commits?.length ?? e.payload?.size ?? 1
      return `Pushed ${n} commit${n === 1 ? '' : 's'} to`
    }
    case 'CreateEvent':
      return `Created ${e.payload?.ref_type ?? 'repository'} in`
    case 'WatchEvent':
      return 'Starred'
    case 'ForkEvent':
      return 'Forked'
    case 'IssuesEvent':
      return `${cap(e.payload?.action ?? 'updated')} an issue in`
    case 'IssueCommentEvent':
      return 'Commented on an issue in'
    case 'PullRequestEvent':
      return `${cap(e.payload?.action ?? 'updated')} a pull request in`
    case 'PullRequestReviewEvent':
      return 'Reviewed a pull request in'
    case 'ReleaseEvent':
      return 'Published a release in'
    case 'PublicEvent':
      return 'Open-sourced'
    default:
      return `${e.type.replace(/Event$/, '')} in`
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function mapRows(events: GhEvent[]): Row[] {
  return events.slice(0, props.limit).map((e) => ({
    text: describe(e),
    repo: e.repo.name,
    when: relTime(e.created_at)
  }))
}

async function load() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { ts, data } = JSON.parse(cached)
      if (Date.now() - ts < TTL) {
        rows.value = mapRows(data)
        updated.value = new Date(ts).toLocaleTimeString()
        return
      }
    }
  } catch {
    /* ignore cache errors */
  }

  try {
    const res = await fetch(
      'https://api.github.com/users/flessan/events/public?per_page=30',
      { headers: { Accept: 'application/vnd.github+json' } }
    )
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as GhEvent[]
    rows.value = mapRows(data)
    updated.value = new Date().toLocaleTimeString()
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }))
    } catch {
      /* storage full or blocked - fine */
    }
  } catch {
    // rate-limited or offline: show nothing rather than a broken section
    failed.value = true
  }
}

onMounted(load)
</script>

<template>
  <div v-if="rows && rows.length" class="gh-activity">
    <h2 class="gh-activity-title">Live from GitHub</h2>
    <ul class="gh-activity-list">
      <li v-for="(row, i) in rows" :key="i" class="gh-activity-item">
        <span class="gh-activity-text">
          {{ row.text }}
          <a
            :href="`https://github.com/${row.repo}`"
            target="_blank"
            rel="noopener"
          >{{ row.repo }}</a>
        </span>
        <span class="gh-activity-when">{{ row.when }}</span>
      </li>
    </ul>
    <p class="gh-activity-note">
      Recent public activity, fetched live from the GitHub API
      <template v-if="updated">(cached {{ updated }})</template>. See the full
      history on <a href="https://github.com/flessan" target="_blank" rel="noopener">GitHub</a>.
    </p>
  </div>
</template>

<style scoped>
.gh-activity-title {
  margin: 2.5rem 0 0.8rem;
  border-top: none;
  padding-top: 0;
}

.gh-activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--vp-c-divider);
}

.gh-activity-item {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.4rem 1rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.gh-activity-text {
  color: var(--vp-c-text-2);
  font-size: 0.92rem;
  overflow-wrap: anywhere;
}

.gh-activity-when {
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
  white-space: nowrap;
}

.gh-activity-note {
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
  margin: 0.6rem 0 0;
}
</style>
