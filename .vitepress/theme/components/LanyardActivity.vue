<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

type Activity = { name?: string; type?: number; state?: string; details?: string; emoji?: { id?: string | null; name?: string; animated?: boolean } }
type Presence = {
  discord_status?: string
  discord_user?: { id: string; username?: string; global_name?: string | null; display_name?: string; avatar?: string | null }
  activities?: Activity[]
  active_on_discord_desktop?: boolean
  active_on_discord_mobile?: boolean
  active_on_discord_web?: boolean
  spotify?: { album?: string; album_art_url?: string; artist?: string; song?: string; track_id?: string; timestamps?: { start?: number; end?: number } } | null
}
type ApiResponse = { success: boolean; data?: Presence }

const endpoint = 'https://api.lanyard.rest/v1/users/776722084030054421'
const presence = ref<Presence | null>(null)
const loading = ref(true)
const unavailable = ref(false)
const now = ref(Date.now())
let refreshTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let activeRequest: AbortController | undefined

const user = computed(() => presence.value?.discord_user)
const status = computed(() => presence.value?.discord_status || 'offline')
const statusLabels: Record<string, string> = { online: 'Online', idle: 'Away', dnd: 'Do not disturb', offline: 'Offline' }
const statusLabel = computed(() => statusLabels[status.value] || 'Offline')
const avatarUrl = computed(() => {
  if (!user.value?.avatar) return ''
  const extension = user.value.avatar.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${user.value.id}/${user.value.avatar}.${extension}?size=128`
})
const activities = computed(() => presence.value?.activities || [])
const customStatus = computed(() => activities.value.find(a => a.type === 4))
const currentActivity = computed(() => activities.value.find(a => a.type !== 4 && a.name !== 'Spotify'))
const spotify = computed(() => presence.value?.spotify || null)
const spotifyUrl = computed(() => spotify.value?.track_id
  ? `https://open.spotify.com/track/${encodeURIComponent(spotify.value.track_id)}`
  : 'https://open.spotify.com/')
const songProgress = computed(() => {
  const t = spotify.value?.timestamps
  if (!t?.start || !t.end || t.end <= t.start) return 0
  return Math.max(0, Math.min(100, ((now.value - t.start) / (t.end - t.start)) * 100))
})
function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}
const elapsedTime = computed(() => spotify.value?.timestamps?.start
  ? formatTime((now.value - spotify.value.timestamps.start) / 1000) : '0:00')
const totalTime = computed(() => {
  const t = spotify.value?.timestamps
  return t?.start && t.end ? formatTime((t.end - t.start) / 1000) : ''
})
const platformLabel = computed(() => {
  if (presence.value?.active_on_discord_desktop) return 'Discord desktop'
  if (presence.value?.active_on_discord_mobile) return 'Discord mobile'
  if (presence.value?.active_on_discord_web) return 'Discord web'
  return 'Discord presence'
})
function customEmojiUrl(activity?: Activity) {
  const emoji = activity?.emoji
  if (!emoji?.id) return ''
  return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=32`
}
async function fetchPresence() {
  activeRequest?.abort()
  const controller = new AbortController()
  activeRequest = controller
  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`Lanyard returned ${response.status}`)
    const result = await response.json() as ApiResponse
    if (!result.success || !result.data?.discord_user) throw new Error('Presence payload unavailable')
    presence.value = result.data
    unavailable.value = false
    now.value = Date.now()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return
    unavailable.value = true
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}
onMounted(() => {
  void fetchPresence()
  refreshTimer = setInterval(() => void fetchPresence(), 30_000)
  clockTimer = setInterval(() => { now.value = Date.now() }, 1_000)
})
onUnmounted(() => {
  activeRequest?.abort()
  if (refreshTimer) clearInterval(refreshTimer)
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<template>
  <section class="my-activity" aria-labelledby="my-activity-title">
    <header class="activity-heading">
      <div>
        <p class="activity-eyebrow">A little window into my world</p>
        <h2 id="my-activity-title">My Activity</h2>
      </div>
      <span class="live-label"><span class="live-dot"></span>LIVE</span>
    </header>
    <div v-if="loading && !presence" class="activity-loading" aria-live="polite">
      <span class="loading-dot"></span> Checking what I'm up to…
    </div>
    <div v-else class="activity-grid">
      <article class="presence-card">
        <div class="identity-row">
          <div class="avatar-wrap">
            <img v-if="avatarUrl" :src="avatarUrl" class="avatar" :alt="`${user?.display_name || user?.username || 'Discord'} avatar`" width="76" height="76" loading="lazy" />
            <span v-else class="avatar-fallback">{{ (user?.display_name || 'F').slice(0, 1) }}</span>
            <span class="presence-orb" :data-status="status"></span>
          </div>
          <div class="identity-copy">
            <h3>{{ user?.display_name || user?.global_name || user?.username || 'Flessann' }}</h3>
            <p class="username">@{{ user?.username || 'thiosaputra' }}</p>
            <p class="status-line"><span class="status-dot" :data-status="status"></span>{{ statusLabel }} <span class="separator">·</span> {{ platformLabel }}</p>
          </div>
        </div>
        <div v-if="customStatus?.state || customStatus?.emoji?.name" class="custom-status">
          <img v-if="customEmojiUrl(customStatus)" :src="customEmojiUrl(customStatus)" alt="" width="20" height="20" />
          <span v-else-if="customStatus?.emoji?.name">{{ customStatus.emoji.name }}</span>
          <span>{{ customStatus?.state }}</span>
        </div>
        <div v-else class="custom-status muted">{{ unavailable ? 'Presence is temporarily unavailable.' : 'No custom status right now.' }}</div>
        <div v-if="currentActivity" class="activity-detail">
          <span class="detail-label">CURRENTLY USING</span>
          <strong>{{ currentActivity.name }}</strong>
          <span v-if="currentActivity.details">{{ currentActivity.details }}</span>
          <span v-if="currentActivity.state">{{ currentActivity.state }}</span>
        </div>
        <p v-if="unavailable && presence" class="api-note">Can't refresh live presence; showing the last available snapshot.</p>
        <p class="footnote">Synced with Discord via Lanyard</p>
      </article>

      <article class="spotify-card">
        <template v-if="spotify">
          <div class="spotify-heading"><span class="spotify-mark">●</span><span>LISTENING ON SPOTIFY</span><span class="equalizer"><i></i><i></i><i></i><i></i></span></div>
          <a class="track-link" :href="spotifyUrl" target="_blank" rel="noopener noreferrer">
            <img v-if="spotify.album_art_url" :src="spotify.album_art_url" class="album-art" :alt="`${spotify.album || 'Album'} artwork`" width="104" height="104" loading="lazy" />
            <div v-else class="album-art album-fallback">♫</div>
            <div class="track-copy">
              <h3>{{ spotify.song || 'Unknown track' }}</h3>
              <p>{{ spotify.artist || 'Unknown artist' }}</p>
              <small>{{ spotify.album || 'Spotify' }}</small>
            </div>
            <span class="open-track">↗</span>
          </a>
          <div class="progress-area">
            <div class="progress-track"><span class="progress-fill" :style="{ width: `${songProgress}%` }"></span></div>
            <div class="track-times"><span>{{ elapsedTime }}</span><span>{{ totalTime }}</span></div>
          </div>
          <p class="spotify-caption">Currently playing · Opens in Spotify</p>
        </template>
        <template v-else>
          <div class="empty-music-mark">♫</div>
          <span class="detail-label empty-label">SPOTIFY</span>
          <h3 class="empty-title">Not listening to anything</h3>
          <p class="empty-description">When I play something, it'll show up here.</p>
        </template>
      </article>
    </div>
  </section>
</template>

<style scoped>
.my-activity { margin: 2.5rem 0 3rem; padding: 1.35rem; overflow: hidden; border: 1px solid var(--vp-c-divider); border-radius: 1.1rem; background: var(--vp-c-bg-alt); box-shadow: 0 16px 44px rgba(20,35,25,.045); }
.activity-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.1rem; }
.activity-eyebrow { margin: 0 0 .25rem; color: var(--vp-c-text-3); font-size: .72rem; font-weight: 650; letter-spacing: .09em; text-transform: uppercase; }
.activity-heading h2 { margin: 0 !important; padding: 0 !important; border: 0 !important; font-size: clamp(1.4rem,3vw,1.8rem); letter-spacing: -.04em; }
.live-label { display: inline-flex; align-items: center; gap: .45rem; padding: .35rem .6rem; border: 1px solid var(--vp-c-divider); border-radius: 999px; color: var(--vp-c-text-2); font-size: .66rem; font-weight: 750; letter-spacing: .1em; }
.live-dot, .loading-dot, .status-dot { width: .48rem; height: .48rem; flex: 0 0 auto; border-radius: 50%; background: #36b779; }
.live-dot { box-shadow: 0 0 0 3px rgba(54,183,121,.12); animation: breathe 2.6s ease-in-out infinite; }
.activity-grid { display: grid; grid-template-columns: minmax(0,.92fr) minmax(0,1.08fr); gap: .9rem; }
.presence-card, .spotify-card, .activity-loading { min-width: 0; border: 1px solid var(--vp-c-divider); border-radius: .9rem; background: var(--vp-c-bg); }
.presence-card { display: flex; flex-direction: column; padding: 1.1rem; }
.identity-row { display: flex; align-items: center; gap: .9rem; min-width: 0; }
.avatar-wrap { position: relative; flex: 0 0 76px; width: 76px; height: 76px; padding: 3px; border-radius: 50%; background: var(--vp-c-bg-soft); box-shadow: 0 0 0 1px var(--vp-c-divider); }
.avatar, .avatar-fallback { display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.avatar-fallback { display: grid; place-items: center; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-size: 1.8rem; font-weight: 750; }
.presence-orb { position: absolute; right: 3px; bottom: 3px; width: 17px; height: 17px; border: 3px solid var(--vp-c-bg); border-radius: 50%; background: #80848e; }
.status-dot[data-status="online"], .presence-orb[data-status="online"] { background: #23a55a; }
.status-dot[data-status="idle"], .presence-orb[data-status="idle"] { background: #f0b232; }
.status-dot[data-status="dnd"], .presence-orb[data-status="dnd"] { background: #f23f43; }
.status-dot[data-status="offline"], .presence-orb[data-status="offline"] { background: #80848e; }
.identity-copy { min-width: 0; }
.identity-copy h3, .track-copy h3 { margin: 0; overflow-wrap: anywhere; color: var(--vp-c-text-1); font-size: 1.04rem; font-weight: 750; letter-spacing: -.025em; line-height: 1.3; }
.username { margin: .12rem 0 .45rem; color: var(--vp-c-text-3); font-size: .8rem; }
.status-line { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem; margin: 0; color: var(--vp-c-text-2); font-size: .74rem; }
.separator { color: var(--vp-c-text-3); }
.custom-status { display: flex; align-items: flex-start; gap: .55rem; margin-top: 1.15rem; padding: .75rem .8rem; border-radius: .65rem; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); font-size: .88rem; line-height: 1.45; overflow-wrap: anywhere; }
.custom-status img { flex: 0 0 20px; width: 20px; height: 20px; object-fit: contain; }
.muted, .api-note, .footnote, .spotify-caption { color: var(--vp-c-text-3); }
.activity-detail { display: flex; flex-direction: column; gap: .22rem; margin-top: .75rem; padding: .75rem .8rem 0; color: var(--vp-c-text-2); font-size: .8rem; }
.activity-detail strong { color: var(--vp-c-text-1); font-size: .9rem; }
.detail-label { color: var(--vp-c-text-3); font-size: .65rem; font-weight: 750; letter-spacing: .1em; }
.api-note { margin: .8rem 0 0; font-size: .7rem; }
.footnote { margin: auto 0 0; padding-top: 1.1rem; font-size: .68rem; }
.spotify-card { display: flex; flex-direction: column; justify-content: center; padding: 1.1rem; }
.spotify-heading { display: flex; align-items: center; gap: .45rem; margin-bottom: 1rem; color: var(--vp-c-text-2); font-size: .66rem; font-weight: 750; letter-spacing: .09em; }
.spotify-mark { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; background: #1db954; color: #102c1a; font-size: .52rem; }
.equalizer { display: flex; align-items: center; gap: 2px; height: 14px; margin-left: auto; }
.equalizer i { display: block; width: 2px; height: 45%; border-radius: 2px; background: #1db954; animation: equalize 900ms ease-in-out infinite alternate; }
.equalizer i:nth-child(2) { height: 90%; animation-delay: -500ms; }
.equalizer i:nth-child(3) { height: 65%; animation-delay: -200ms; }
.equalizer i:nth-child(4) { height: 35%; animation-delay: -650ms; }
.track-link { display: flex; align-items: center; gap: .85rem; min-width: 0; color: inherit; text-decoration: none !important; }
.album-art { display: block; flex: 0 0 104px; width: 104px; height: 104px; border-radius: .65rem; object-fit: cover; box-shadow: 0 8px 22px rgba(0,0,0,.16); transition: transform 500ms cubic-bezier(.16,1,.3,1), box-shadow 500ms ease; }
.track-link:hover .album-art { transform: scale(1.035) rotate(-1deg); box-shadow: 0 12px 28px rgba(0,0,0,.2); }
.album-fallback { display: grid; place-items: center; background: var(--vp-c-bg-soft); color: #1db954; font-size: 2rem; }
.track-copy { flex: 1; min-width: 0; }
.track-copy h3 { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: clamp(.9rem,1.6vw,1.08rem); }
.track-copy p, .track-copy small { display: block; margin: .32rem 0 0; overflow-wrap: anywhere; color: var(--vp-c-text-2); font-size: .8rem; line-height: 1.45; }
.track-copy small { color: var(--vp-c-text-3); font-size: .72rem; }
.open-track { align-self: flex-start; color: var(--vp-c-text-3); font-size: 1rem; transition: color 180ms ease, transform 240ms ease; }
.track-link:hover .open-track { color: #1db954; transform: translate(2px,-2px); }
.progress-area { margin-top: 1.2rem; }
.progress-track { height: 4px; overflow: hidden; border-radius: 999px; background: var(--vp-c-bg-soft); }
.progress-fill { display: block; width: 0; height: 100%; border-radius: inherit; background: #1db954; transition: width 850ms linear; }
.track-times { display: flex; justify-content: space-between; margin-top: .4rem; color: var(--vp-c-text-3); font-size: .67rem; font-variant-numeric: tabular-nums; }
.spotify-caption { margin: .7rem 0 0; font-size: .68rem; }
.empty-music-mark { display: grid; place-items: center; align-self: center; width: 66px; height: 66px; margin-bottom: .65rem; border-radius: 50%; background: rgba(29,185,84,.1); color: #1db954; font-size: 1.9rem; }
.empty-label, .empty-title, .empty-description { text-align: center; }
.empty-title { margin: .35rem 0; color: var(--vp-c-text-1); font-size: 1rem; }
.empty-description { margin: 0; color: var(--vp-c-text-3); font-size: .8rem; }
.activity-loading { display: flex; align-items: center; gap: .7rem; padding: 1.25rem; color: var(--vp-c-text-2); font-size: .9rem; }
.loading-dot { animation: breathe 1.2s ease-in-out infinite; }
@keyframes breathe { 0%,100% { opacity: .55; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.08); } }
@keyframes equalize { from { transform: scaleY(.45); } to { transform: scaleY(1); } }
@media (max-width: 760px) {
  .my-activity { margin: 2rem 0 2.4rem; padding: 1rem; border-radius: .9rem; }
  .activity-grid { grid-template-columns: minmax(0,1fr); }
  .presence-card, .spotify-card { padding: 1rem; }
  .album-art { flex-basis: 84px; width: 84px; height: 84px; }
  .track-copy h3 { font-size: .95rem; }
}
@media (prefers-reduced-motion: reduce) {
  .live-dot, .equalizer i, .loading-dot { animation: none !important; }
  .track-link:hover .album-art, .track-link:hover .open-track { transform: none; }
}
</style>
