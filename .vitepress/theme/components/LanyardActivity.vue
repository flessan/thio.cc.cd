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
type GuildChannel = { id: string; name: string; position?: number }
type GuildMember = { id: string; username: string; status?: string; avatar_url?: string | null; game?: { name?: string } }
type GuildWidget = { id: string; name: string; instant_invite?: string; channels?: GuildChannel[]; members?: GuildMember[]; presence_count?: number }

const endpoint = 'https://api.lanyard.rest/v1/users/776722084030054421'
const profileImage = 'https://c.tenor.com/ysQdVrOy6ZkAAAAd/tenor.gif'
const communityImage = 'https://cdn.jsdelivr.net/gh/flessan/flessan/website/gudang/me.png'
const guildEndpoint = 'https://discord.com/api/guilds/1435463197418192906/widget.json'
const fallbackInvite = 'https://discord.com/invite/nZAMJ7BD'
const presence = ref<Presence | null>(null)
const guild = ref<GuildWidget | null>({
  id: '1435463197418192906',
  name: 'Thio Saputra Places',
  instant_invite: fallbackInvite,
  presence_count: 11,
  channels: [
    { id: '1435463198839935036', name: 'Lounge', position: 1 },
    { id: '1435463199070879764', name: 'Meeting Room', position: 2 }
  ],
  members: [
    { id: '0', username: 'Aspian', status: 'online' },
    { id: '1', username: 'DANZGAME', status: 'idle', game: { name: 'ROBLOX' } },
    { id: '2', username: 'FlaviBot 2', status: 'online' },
    { id: '3', username: 'Flessann', status: 'online' },
    { id: '4', username: 'Galaxyte', status: 'idle' },
    { id: '5', username: 'kythia', status: 'online' }
  ]
})
const guildLoading = ref(true)
const guildUnavailable = ref(false)
const loading = ref(true)
const unavailable = ref(false)
const now = ref(Date.now())
const copiedInvite = ref(false)
const copyFailed = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | undefined
let guildRefreshTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let copyResetTimer: ReturnType<typeof setTimeout> | undefined
let activeRequest: AbortController | undefined
let guildRequest: AbortController | undefined

const user = computed(() => presence.value?.discord_user)
const status = computed(() => presence.value?.discord_status || 'offline')
const statusLabels: Record<string, string> = { online: 'Online', idle: 'Away', dnd: 'Do not disturb', offline: 'Offline' }
const statusLabel = computed(() => statusLabels[status.value] || 'Offline')
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
const inviteUrl = computed(() => guild.value?.instant_invite || fallbackInvite)
const copyButtonLabel = computed(() => copiedInvite.value ? 'Tautan undangan tersalin' : copyFailed.value ? 'Gagal menyalin tautan undangan' : 'Salin tautan undangan')
async function copyInviteUrl() {
  copiedInvite.value = false
  copyFailed.value = false
  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    copiedInvite.value = true
  } catch {
    copyFailed.value = true
  }
  if (copyResetTimer) clearTimeout(copyResetTimer)
  copyResetTimer = setTimeout(() => {
    copiedInvite.value = false
    copyFailed.value = false
  }, 2200)
}
const sortedChannels = computed(() => [...(guild.value?.channels || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)))
const activeMembers = computed(() => (guild.value?.members || []).filter(member => member.status && member.status !== 'offline').slice(0, 6))
const activeMemberCount = computed(() => guild.value?.presence_count ?? activeMembers.value.length)
const guildStatusLabels: Record<string, string> = { online: 'Online', idle: 'Away', dnd: 'Do not disturb', offline: 'Offline' }
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
async function fetchGuildWidget() {
  guildRequest?.abort()
  const controller = new AbortController()
  guildRequest = controller
  try {
    const response = await fetch(guildEndpoint, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store'
    })
    if (!response.ok) throw new Error(`Discord widget returned ${response.status}`)
    const result = await response.json() as GuildWidget
    if (!result.id || !result.name) throw new Error('Discord widget payload unavailable')
    guild.value = result
    guildUnavailable.value = false
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return
    guildUnavailable.value = true
  } finally {
    if (!controller.signal.aborted) guildLoading.value = false
  }
}
onMounted(() => {
  void fetchPresence()
  void fetchGuildWidget()
  refreshTimer = setInterval(() => void fetchPresence(), 30_000)
  guildRefreshTimer = setInterval(() => void fetchGuildWidget(), 60_000)
  clockTimer = setInterval(() => { now.value = Date.now() }, 1_000)
})
onUnmounted(() => {
  activeRequest?.abort()
  guildRequest?.abort()
  if (refreshTimer) clearInterval(refreshTimer)
  if (guildRefreshTimer) clearInterval(guildRefreshTimer)
  if (clockTimer) clearInterval(clockTimer)
  if (copyResetTimer) clearTimeout(copyResetTimer)
})
</script>

<template>
  <section class="my-activity" aria-labelledby="my-activity-title">
    <header class="activity-heading">
      <h2 id="my-activity-title">My Activity</h2>
      <div class="activity-actions">
        <a class="join-server" :href="inviteUrl" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5c2.7-.9 5.3-.9 8 0l1.1 2.1c1.5 1.1 2.1 3.2 2.4 5.8-1.7 1.4-3.1 2.2-4.6 2.6l-1-1.3c-1.2.3-2.4.3-3.7 0l-1 1.3c-1.5-.4-2.9-1.2-4.6-2.6.3-2.6.9-4.7 2.4-5.8L8 5.5Z"/><path d="M9 11.5h.01M15 11.5h.01"/></svg>
          <span>Join server</span>
          <span class="join-arrow" aria-hidden="true">↗</span>
        </a>
        <button class="copy-server" type="button" :class="{ 'is-copied': copiedInvite, 'is-error': copyFailed }" :aria-label="copyButtonLabel" :title="copyButtonLabel" @click="copyInviteUrl">
          <svg v-if="copiedInvite" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V5.8A1.8 1.8 0 0 0 14.2 4H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></svg>
        </button>
      </div>
    </header>
    <div v-if="loading && !presence" class="activity-loading" aria-live="polite">
      <span class="loading-dot"></span> Checking what I'm up to…
    </div>
    <div v-else class="activity-grid">
      <article class="presence-card">
        <div class="identity-row">
          <div class="avatar-wrap">
            <img :src="profileImage" class="avatar" alt="Profile GIF" width="76" height="76" loading="lazy" />
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

      <article class="guild-card" aria-label="Discord server widget">
        <div class="guild-topline">
          <div class="guild-brand-mark" aria-hidden="true">
            <img :src="communityImage" alt="" width="46" height="46" loading="lazy" />
          </div>
          <div class="guild-heading-copy">
            <span class="detail-label">COMMUNITY SERVER</span>
            <h3>{{ guild?.name || 'Thio Saputra Places' }}</h3>
            <p><span class="guild-online-dot"></span>{{ activeMemberCount }} members online</p>
          </div>
          <a class="guild-join-link" :href="inviteUrl" target="_blank" rel="noopener noreferrer">Join <span aria-hidden="true">↗</span></a>
        </div>

        <div class="guild-divider"></div>

        <div class="guild-columns">
          <div class="guild-channels">
            <h4>CHANNELS</h4>
            <div v-if="sortedChannels.length" class="channel-list">
              <span v-for="channel in sortedChannels" :key="channel.id" class="channel-pill">
                <span aria-hidden="true">#</span>{{ channel.name }}
              </span>
            </div>
            <p v-else class="guild-muted">{{ guildLoading ? 'Loading channels…' : 'No public channels available.' }}</p>
          </div>

          <div class="guild-members">
            <h4>AROUND RIGHT NOW <span>{{ activeMembers.length }}</span></h4>
            <div v-if="activeMembers.length" class="member-list">
              <div v-for="member in activeMembers" :key="member.id" class="guild-member">
                <div class="member-avatar-wrap">
                  <img v-if="member.avatar_url" :src="member.avatar_url" :alt="''" width="30" height="30" loading="lazy" />
                  <span v-else class="member-avatar-fallback">{{ (member.username || '?').slice(0, 1).toUpperCase() }}</span>
                  <span class="member-status-dot" :data-status="member.status || 'online'"></span>
                </div>
                <span class="member-name">{{ member.username }}</span>
                <span v-if="member.game?.name" class="member-game">{{ member.game.name }}</span>
              </div>
            </div>
            <p v-else class="guild-muted">{{ guildLoading ? 'Finding members…' : 'No members to show right now.' }}</p>
          </div>
        </div>

        <p v-if="guildUnavailable" class="guild-footnote">Showing the latest available server snapshot. Live widget data could not be refreshed.</p>
        <p v-else-if="guildLoading" class="guild-footnote">Connecting to Discord server widget…</p>
        <p v-else class="guild-footnote">Live server data · Updated automatically</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.my-activity { margin: 2.5rem 0 3rem; padding: 1.35rem; overflow: hidden; border: 1px solid var(--vp-c-divider); border-radius: 1.1rem; background: var(--vp-c-bg-alt); box-shadow: 0 16px 44px rgba(20,35,25,.045); }
.activity-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.1rem; }
.activity-heading h2 { margin: 0 !important; padding: 0 !important; border: 0 !important; font-size: clamp(1.4rem,3vw,1.8rem); letter-spacing: -.04em; }
.join-server { display: inline-flex; align-items: center; gap: .5rem; flex: 0 0 auto; padding: .7rem .9rem; border: 1px solid var(--vp-c-brand-1); border-radius: .75rem; background: var(--vp-c-brand-3); color: #fff !important; font-size: .82rem; font-weight: 700; text-decoration: none !important; box-shadow: 0 5px 14px rgba(40,100,65,.12); transition: transform 220ms ease, box-shadow 260ms ease, background-color 220ms ease; }
.activity-actions { display: inline-flex; align-items: center; gap: .45rem; flex: 0 0 auto; }
.join-server svg { width: 19px; height: 19px; flex: 0 0 auto; fill: currentColor; }
.copy-server { display: grid; place-items: center; flex: 0 0 auto; width: 42px; height: 42px; padding: 0; border: 1px solid var(--vp-c-divider); border-radius: .75rem; background: var(--vp-c-bg); color: var(--vp-c-text-2); cursor: pointer; transition: color 200ms ease, border-color 200ms ease, background-color 200ms ease, transform 200ms ease; }
.copy-server svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.copy-server:hover { transform: translateY(-1px); border-color: var(--vp-c-brand-1); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }
.copy-server.is-copied { border-color: #23a55a; color: #23a55a; }
.copy-server.is-error { border-color: #f23f43; color: #f23f43; }
.join-server svg path:first-child { fill: currentColor; }
.join-server svg path:last-child { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.join-arrow { transition: transform 220ms ease; }
.join-server:hover { transform: translateY(-2px); box-shadow: 0 9px 22px rgba(40,100,65,.2); background: var(--vp-c-brand-2); }
.join-server:hover .join-arrow { transform: translate(2px,-2px); }
.loading-dot, .status-dot { width: .48rem; height: .48rem; flex: 0 0 auto; border-radius: 50%; background: #36b779; }
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

.guild-card { grid-column: 1 / -1; min-width: 0; margin-top: .1rem; padding: 1.15rem 1.2rem 1rem; border: 1px solid var(--vp-c-divider); border-radius: .9rem; background: var(--vp-c-bg); transition: border-color 260ms ease, box-shadow 320ms ease, transform 320ms cubic-bezier(.16,1,.3,1); }
.guild-card:hover { border-color: color-mix(in srgb, var(--vp-c-brand-1) 44%, var(--vp-c-divider)); box-shadow: 0 10px 26px rgba(20,35,25,.055); transform: translateY(-2px); }
.guild-topline { display: flex; align-items: center; gap: .85rem; min-width: 0; }
.guild-brand-mark { display: grid; place-items: center; flex: 0 0 46px; width: 46px; height: 46px; border-radius: 14px; background: #5865f2; color: #fff; }
.guild-brand-mark img { display: block; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
.guild-heading-copy { min-width: 0; flex: 1; }
.guild-heading-copy h3 { margin: .18rem 0 .22rem; color: var(--vp-c-text-1); font-size: 1.03rem; font-weight: 750; letter-spacing: -.025em; line-height: 1.35; }
.guild-heading-copy p { display: flex; align-items: center; gap: .4rem; margin: 0; color: var(--vp-c-text-2); font-size: .78rem; }
.guild-online-dot { width: .45rem; height: .45rem; border-radius: 50%; background: #23a55a; box-shadow: 0 0 0 3px rgba(35,165,90,.1); }
.guild-join-link { display: inline-flex; align-items: center; gap: .4rem; flex: 0 0 auto; padding: .5rem .7rem; border: 1px solid var(--vp-c-divider); border-radius: .65rem; color: var(--vp-c-text-1) !important; font-size: .78rem; font-weight: 700; text-decoration: none !important; transition: border-color 200ms ease, background-color 200ms ease; }
.guild-join-link:hover { border-color: var(--vp-c-brand-1); background: var(--vp-c-bg-soft); }
.guild-divider { height: 1px; margin: 1rem 0; background: var(--vp-c-divider); }
.guild-columns { display: grid; grid-template-columns: minmax(150px,.72fr) minmax(0,1.28fr); gap: 1.35rem; }
.guild-channels h4, .guild-members h4 { display: flex; align-items: center; gap: .45rem; margin: 0 0 .65rem; color: var(--vp-c-text-3); font-size: .64rem; font-weight: 750; letter-spacing: .1em; }
.guild-members h4 span { display: inline-grid; place-items: center; min-width: 1.2rem; height: 1.2rem; padding-inline: .2rem; border-radius: 999px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-2); font-size: .65rem; }
.channel-list { display: flex; flex-wrap: wrap; gap: .4rem; }
.channel-pill { display: inline-flex; align-items: center; gap: .38rem; padding: .42rem .55rem; border: 1px solid var(--vp-c-divider); border-radius: .55rem; background: var(--vp-c-bg-alt); color: var(--vp-c-text-2); font-size: .76rem; }
.channel-pill > span { color: var(--vp-c-text-3); font-size: .92rem; font-weight: 700; }
.member-list { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .6rem .8rem; }
.guild-member { display: flex; align-items: center; gap: .5rem; min-width: 0; }
.member-avatar-wrap { position: relative; flex: 0 0 30px; width: 30px; height: 30px; }
.member-avatar-wrap img, .member-avatar-fallback { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }
.member-avatar-fallback { background: var(--vp-c-bg-soft); color: var(--vp-c-text-2); font-size: .72rem; font-weight: 700; }
.member-status-dot { position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px; border: 2px solid var(--vp-c-bg); border-radius: 50%; background: #23a55a; }
.member-status-dot[data-status="idle"] { background: #f0b232; }
.member-status-dot[data-status="dnd"] { background: #f23f43; }
.member-name { min-width: 0; overflow: hidden; color: var(--vp-c-text-1); font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
.member-game { flex: 0 0 auto; max-width: 34%; overflow: hidden; color: var(--vp-c-text-3); font-size: .67rem; text-overflow: ellipsis; white-space: nowrap; }
.guild-muted, .guild-footnote { color: var(--vp-c-text-3); font-size: .7rem; }
.guild-muted { margin: .3rem 0 0; }
.guild-footnote { margin: 1rem 0 0; }
@keyframes breathe { 0%,100% { opacity: .55; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.08); } }
@keyframes equalize { from { transform: scaleY(.45); } to { transform: scaleY(1); } }
@media (max-width: 760px) {
  .my-activity { margin: 2rem 0 2.4rem; padding: 1rem; border-radius: .9rem; }
  .activity-grid { grid-template-columns: minmax(0,1fr); }
  .activity-heading { align-items: center; }
  .activity-actions { gap: .35rem; }
  .join-server { padding: .6rem .7rem; font-size: .76rem; }
  .join-server svg { width: 17px; height: 17px; }
  .copy-server { width: 38px; height: 38px; border-radius: .65rem; }
  .copy-server svg { width: 18px; height: 18px; }
  .presence-card, .spotify-card { padding: 1rem; }
  .album-art { flex-basis: 84px; width: 84px; height: 84px; }
  .track-copy h3 { font-size: .95rem; }
  .guild-card { padding: 1rem; }
  .guild-topline { gap: .65rem; }
  .guild-brand-mark { flex-basis: 40px; width: 40px; height: 40px; border-radius: 12px; }
  .guild-heading-copy h3 { font-size: .92rem; }
  .guild-join-link { padding: .45rem .55rem; font-size: .73rem; }
  .guild-columns { grid-template-columns: minmax(0,1fr); gap: 1rem; }
  .member-list { grid-template-columns: minmax(0,1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .live-dot, .equalizer i, .loading-dot { animation: none !important; }
  .track-link:hover .album-art, .track-link:hover .open-track { transform: none; }
}
</style>
