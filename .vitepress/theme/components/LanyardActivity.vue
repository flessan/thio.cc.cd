<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

type Activity = {
  id?: string
  name?: string
  type?: number
  state?: string
  details?: string
  buttons?: string[]
  application_id?: string
  created_at?: number
  flags?: number
  timestamps?: { start?: number; end?: number }
  assets?: { large_image?: string; large_text?: string; small_image?: string; small_text?: string }
  emoji?: { id?: string | null; name?: string; animated?: boolean }
}
type Presence = {
  discord_status?: string
  discord_user?: { id: string; username?: string; global_name?: string | null; display_name?: string; avatar?: string | null; primary_guild?: { tag?: string | null; identity_enabled?: boolean } }
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
const presence = ref<Presence | null>({
  discord_status: 'online',
  discord_user: {
    id: '776722084030054421',
    username: 'thiosaputra',
    global_name: 'Flessann',
    display_name: 'Flessann',
    avatar: '37ee0b92f93540c784be1cb6beaff1d7',
    primary_guild: { tag: '㏌tel', identity_enabled: true }
  },
  activities: [
    { id: 'custom', name: 'Custom Status', state: 'please do disturb', type: 4, emoji: { name: '✅' }, created_at: 1792653069632 },
    {
      id: 'spotify:1',
      name: 'Spotify',
      type: 2,
      details: 'Together',
      state: 'S3RL; Fatshaudi; Luca Rain',
      flags: 48,
      sync_id: '4WTdbZ7pN4n9JkDuFhxFXU',
      assets: { large_image: 'spotify:ab67616d0000b2736fde4f0cda187a1b212f58a8', large_text: 'Together' },
      timestamps: { start: 1792653004212, end: 1792653197712 }
    },
    {
      id: '222a7dd77fa745b4',
      application_id: '1540699723852152872',
      name: 'in Love with',
      type: 3,
      state: 'Miyuki Takara',
      buttons: ['My Blog'],
      timestamps: { start: 1792598400759 },
      flags: 1
    }
  ],
  active_on_discord_desktop: true,
  active_on_discord_mobile: false,
  active_on_discord_web: false,
  spotify: {
    album: 'Together',
    album_art_url: 'https://i.scdn.co/image/ab67616d0000b2736fde4f0cda187a1b212f58a8',
    artist: 'S3RL; Fatshaudi; Luca Rain',
    song: 'Together',
    timestamps: { start: 1792653004212, end: 1792653197712 },
    track_id: '4WTdbZ7pN4n9JkDuFhxFXU'
  }
})
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
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl.value)
      copiedInvite.value = true
    } else {
      throw new Error('Clipboard API unavailable')
    }
  } catch {
    try {
      const field = document.createElement('textarea')
      field.value = inviteUrl.value
      field.setAttribute('readonly', '')
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      const success = document.execCommand('copy')
      field.remove()
      if (!success) throw new Error('Copy command failed')
      copiedInvite.value = true
    } catch {
      copyFailed.value = true
    }
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
      <div class="heading-copy">
        <span class="heading-kicker"><span class="kicker-pulse"></span> DISCORD PRESENCE</span>
        <h2 id="my-activity-title">My Activity</h2>
        <p class="heading-subtitle">A live snapshot of what I'm doing right now.</p>
      </div>
      <div class="activity-actions">
        <a class="join-server" :href="inviteUrl" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5c2.7-.9 5.3-.9 8 0l1.1 2.1c1.5 1.1 2.1 3.2 2.4 5.8-1.7 1.4-3.1 2.2-4.6 2.6l-1-1.3c-1.2.3-2.4.3-3.7 0l-1 1.3c-1.5-.4-2.9-1.2-4.6-2.6.3-2.6.9-4.7 2.4-5.8L8 5.5Z"/><path d="M9 11.5h.01M15 11.5h.01"/></svg>
          <span>Join server</span>
          <svg class="action-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>
        </a>
        <button class="copy-server" type="button" :class="{ 'is-copied': copiedInvite, 'is-error': copyFailed }" :aria-label="copyButtonLabel" :title="copyButtonLabel" @click="copyInviteUrl">
          <svg v-if="copiedInvite" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V5.8A1.8 1.8 0 0 0 14.2 4H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></svg>
        </button>
      </div>
    </header>

    <div v-if="loading && !presence" class="activity-loading" aria-live="polite">
      <span class="loading-spinner"></span>
      <span><strong>Connecting to Discord</strong><small>Fetching the latest presence…</small></span>
    </div>

    <div v-else class="activity-grid">
      <article class="profile-card activity-reveal">
        <div class="profile-banner">
          <span class="banner-label">PERSONAL SPACE</span>
          <svg class="banner-symbol" viewBox="0 0 80 80" aria-hidden="true">
            <path d="M14 51c12-2 16-16 28-18s17 8 25-8M9 63c14-2 22-10 28-19s17-10 31-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
            <circle cx="62" cy="18" r="5" fill="currentColor"/>
          </svg>
        </div>
        <div class="profile-content">
          <div class="profile-identity">
            <div class="avatar-wrap">
              <img :src="profileImage" class="avatar" alt="Profile GIF" width="88" height="88" loading="lazy" />
              <span class="presence-orb" :data-status="status" :aria-label="statusLabel"></span>
            </div>
            <div class="identity-copy">
              <div class="identity-name-line">
                <h3>{{ user?.display_name || user?.global_name || user?.username || 'Flessann' }}</h3>
                <svg v-if="user?.primary_guild?.tag" class="identity-verified" viewBox="0 0 24 24" :aria-label="'Primary guild: ' + user.primary_guild.tag" role="img"><path d="m12 2 2.4 2.1 3.2-.1.9 3.1 2.6 1.8-1.1 3 1.1 3-2.6 1.8-.9 3.1-3.2-.1L12 22l-2.4-2.1-3.2.1-.9-3.1-2.6-1.8 1.1-3-1.1-3 2.6-1.8.9-3.1 3.2.1L12 2Z"/><path d="m8.5 12.2 2.2 2.2 4.8-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <p class="username">@{{ user?.username || 'thiosaputra' }}</p>
              <div class="identity-badges">
                <span class="presence-badge" :data-status="status"><span class="status-dot"></span>{{ statusLabel }}</span>
                <span v-if="user?.primary_guild?.tag" class="guild-tag"><span class="tag-mark">◆</span>{{ user.primary_guild.tag }}</span>
              </div>
            </div>
          </div>

          <div class="profile-device-row">
            <span class="device-icon">
              <svg v-if="presence?.active_on_discord_mobile" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M10 18.5h4"/></svg>
              <svg v-else-if="presence?.active_on_discord_web" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8m-4-4v4M3 8h18"/></svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-7-7h14"/></svg>
            </span>
            <span class="device-copy"><strong>{{ platformLabel }}</strong><small>{{ unavailable ? 'Showing last known activity' : loading ? 'Refreshing presence…' : 'Presence updates automatically' }}</small></span>
            <span class="live-indicator" :class="{ 'is-stale': unavailable }"><i></i>{{ unavailable ? 'LAST SEEN' : loading ? 'SYNCING' : 'LIVE' }}</span>
          </div>

          <div class="custom-status">
            <span class="status-emoji">{{ customStatus?.emoji?.name || '✦' }}</span>
            <div class="custom-status-copy">
              <span class="detail-label">CUSTOM STATUS</span>
              <p>{{ customStatus?.state || (unavailable ? 'Presence is temporarily unavailable.' : 'No custom status right now.') }}</p>
            </div>
            <svg class="status-sparkle" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm7 12 .9 3.1L23 18l-3.1.9L19 22l-.9-3.1L15 18l3.1-.9L19 14Z"/></svg>
          </div>
          <p v-if="unavailable && presence" class="snapshot-note">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>
            Live refresh is unavailable; showing the last known snapshot.
          </p>
        </div>
      </article>

      <div class="presence-stack">
        <article class="spotify-card activity-reveal" style="--reveal-delay: 90ms">
          <div class="panel-heading">
            <div class="panel-heading-icon spotify-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9.2c4.8-1.5 10.8-.8 14.2 1.4M6 12.7c3.8-1.1 8.2-.5 11.4 1.3M7.1 16c2.8-.7 5.6-.3 8.1 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <div class="panel-heading-copy"><span class="detail-label">NOW PLAYING</span><h3>On repeat</h3></div>
            <span v-if="spotify" class="equalizer" aria-label="Playing"><i></i><i></i><i></i><i></i></span>
            <span v-else class="quiet-pill">IDLE</span>
          </div>

          <template v-if="spotify">
            <a class="track-link" :href="spotifyUrl" target="_blank" rel="noopener noreferrer">
              <div class="album-wrap">
                <img v-if="spotify.album_art_url" :src="spotify.album_art_url" class="album-art" :alt="(spotify.album || 'Album') + ' cover art'" width="112" height="112" loading="lazy" />
                <div v-else class="album-art album-fallback">♫</div>
                <span class="album-play-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 10 6-10 6V6Z"/></svg></span>
              </div>
              <div class="track-copy">
                <h3>{{ spotify.song || 'Unknown track' }}</h3>
                <p>{{ spotify.artist || 'Unknown artist' }}</p>
                <span class="album-name">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 0 13-2v14M4 9l13-2"/><circle cx="7" cy="19" r="3"/><circle cx="17" cy="17" r="3"/></svg>
                  {{ spotify.album || 'Spotify' }}
                </span>
              </div>
              <span class="open-track" aria-label="Open in Spotify">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>
              </span>
            </a>
            <div class="progress-area">
              <div class="progress-track"><span class="progress-fill" :style="{ width: songProgress + '%' }"></span></div>
              <div class="track-times"><span>{{ elapsedTime }}</span><span>{{ totalTime }}</span></div>
            </div>
            <div class="spotify-footer"><span class="spotify-live-dot"></span>Listening via Spotify</div>
          </template>
          <div v-else class="empty-state">
            <span class="empty-state-icon">♫</span>
            <div><strong>It's quiet for now</strong><p>Spotify activity will show up here when I listen.</p></div>
          </div>
        </article>

        <article v-if="currentActivity" class="rich-activity-card activity-reveal" style="--reveal-delay: 170ms">
          <div class="rich-activity-top">
            <span class="rich-app-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11Z"/></svg>
            </span>
            <div class="rich-heading"><span class="detail-label">ALSO HAPPENING</span><h3>{{ currentActivity.name || 'Rich Presence' }}</h3></div>
            <span class="activity-type-pill">ACTIVITY</span>
          </div>
          <div class="rich-activity-body">
            <div class="rich-activity-art">
              <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 41s-16-9.2-16-22a9 9 0 0 1 16-5.6A9 9 0 0 1 40 19c0 12.8-16 22-16 22Z"/><path d="M17 23.5c2.1 2.1 4.2 3.1 7 3.1s4.9-1 7-3.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </div>
            <div class="rich-activity-copy">
              <span class="rich-activity-overline">WITH</span>
              <h4>{{ currentActivity.state || currentActivity.details || 'Something special' }}</h4>
              <p v-if="currentActivity.details && currentActivity.details !== currentActivity.state">{{ currentActivity.details }}</p>
              <a v-if="currentActivity.buttons?.includes('My Blog')" class="rich-activity-button" href="https://thio.cc.cd/blog/" target="_blank" rel="noopener noreferrer">
                My Blog
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>
              </a>
              <span v-else-if="currentActivity.buttons?.length" class="rich-activity-button is-static">{{ currentActivity.buttons[0] }}</span>
            </div>
          </div>
        </article>

        <article v-else class="rich-activity-card idle-activity activity-reveal" style="--reveal-delay: 170ms">
          <span class="idle-star">✦</span><div><span class="detail-label">OTHER ACTIVITY</span><h3>One thing at a time</h3><p>No other app activity to show right now.</p></div>
        </article>
      </div>

      <article class="guild-card activity-reveal" style="--reveal-delay: 240ms" aria-label="Discord server widget">
        <div class="guild-topline">
          <div class="guild-brand-mark" aria-hidden="true">
            <img :src="communityImage" alt="" width="48" height="48" loading="lazy" />
          </div>
          <div class="guild-heading-copy">
            <span class="detail-label">COMMUNITY SERVER</span>
            <h3>{{ guild?.name || 'Thio Saputra Places' }}</h3>
            <p><span class="guild-online-dot"></span><strong>{{ activeMemberCount }}</strong> members online <span class="guild-heading-divider">/</span> hang out with the community</p>
          </div>
          <a class="guild-join-link" :href="inviteUrl" target="_blank" rel="noopener noreferrer">
            Join community
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>
          </a>
        </div>

        <div class="guild-divider"></div>

        <div class="guild-columns">
          <div class="guild-channels">
            <h4><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3 7 21M17 3l-2 18M4 8h17M3 16h17"/></svg> CHANNELS <span class="section-count">{{ sortedChannels.length }}</span></h4>
            <div v-if="sortedChannels.length" class="channel-list">
              <span v-for="channel in sortedChannels" :key="channel.id" class="channel-pill"><span aria-hidden="true">#</span>{{ channel.name }}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></span>
            </div>
            <p v-else class="guild-muted">{{ guildLoading ? 'Loading channels…' : 'No public channels available.' }}</p>
          </div>

          <div class="guild-members">
            <h4><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5.5a3 3 0 0 1 0 5.8m2 3a5 5 0 0 1 3 4.7V20"/></svg> AROUND RIGHT NOW <span class="section-count">{{ activeMembers.length }}</span></h4>
            <div v-if="activeMembers.length" class="member-list">
              <div v-for="member in activeMembers" :key="member.id" class="guild-member">
                <div class="member-avatar-wrap">
                  <img v-if="member.avatar_url" :src="member.avatar_url" :alt="''" width="32" height="32" loading="lazy" />
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
        <div class="guild-bottomline">
          <p v-if="guildUnavailable"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg> Showing the latest available server snapshot.</p>
          <p v-else-if="guildLoading"><span class="loading-dot"></span> Connecting to Discord server widget…</p>
          <p v-else><span class="guild-online-dot"></span> Server widget syncs automatically</p>
          <span class="guild-server-id">DISCORD COMMUNITY</span>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.my-activity {
  --activity-accent: var(--vp-c-brand-1);
  margin: 2.5rem 0 3rem;
  padding: clamp(1rem, 2.5vw, 1.5rem);
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 1.25rem;
  background: var(--vp-c-bg-alt);
  box-shadow: 0 16px 44px rgba(20, 35, 25, .045);
}
.activity-heading { display: flex; align-items: center; justify-content: space-between; gap: 1.2rem; margin-bottom: 1.25rem; }
.heading-copy { min-width: 0; }
.heading-kicker { display: flex; align-items: center; gap: .45rem; margin-bottom: .28rem; color: var(--vp-c-text-3); font-size: .65rem; font-weight: 800; letter-spacing: .14em; }
.kicker-pulse { position: relative; width: .43rem; height: .43rem; border-radius: 50%; background: #23a55a; }
.kicker-pulse::after { position: absolute; inset: -4px; border: 1px solid #23a55a; border-radius: inherit; content: ""; animation: status-pulse 1.8s ease-out infinite; }
.activity-heading h2 { margin: 0 !important; padding: 0 !important; border: 0 !important; color: var(--vp-c-text-1); font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 800; letter-spacing: -.055em; line-height: 1.12; }
.heading-subtitle { margin: .42rem 0 0; color: var(--vp-c-text-2); font-size: .82rem; }
.activity-actions { display: inline-flex; align-items: center; gap: .45rem; flex: 0 0 auto; }
.join-server { display: inline-flex; align-items: center; justify-content: center; gap: .55rem; min-height: 42px; padding: .65rem .85rem; border: 1px solid var(--vp-c-brand-1); border-radius: .75rem; background: var(--vp-c-brand-1); color: #fff !important; font-size: .8rem; font-weight: 750; text-decoration: none !important; box-shadow: 0 5px 14px rgba(40, 100, 65, .1); transition: transform 220ms ease, box-shadow 260ms ease, background-color 220ms ease; }
.join-server svg { width: 18px; height: 18px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.join-server svg:first-child { fill: currentColor; stroke-width: .7; }
.join-server:hover { transform: translateY(-2px); box-shadow: 0 9px 22px rgba(40, 100, 65, .19); background: var(--vp-c-brand-2); }
.action-arrow { transition: transform 220ms ease; }
.join-server:hover .action-arrow { transform: translate(2px, -2px); }
.copy-server { display: grid; place-items: center; flex: 0 0 auto; width: 42px; height: 42px; padding: 0; border: 1px solid var(--vp-c-divider); border-radius: .75rem; background: var(--vp-c-bg); color: var(--vp-c-text-2); cursor: pointer; transition: color 200ms ease, border-color 200ms ease, background-color 200ms ease, transform 200ms ease; }
.copy-server svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.copy-server:hover { transform: translateY(-1px); border-color: var(--vp-c-brand-1); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }
.copy-server.is-copied { border-color: #23a55a; color: #23a55a; }
.copy-server.is-error { border-color: #f23f43; color: #f23f43; }
.activity-grid { display: grid; grid-template-columns: minmax(0, .91fr) minmax(0, 1.09fr); align-items: stretch; gap: .9rem; }
.activity-reveal { animation: activity-enter 650ms cubic-bezier(.16, 1, .3, 1) both; animation-delay: var(--reveal-delay, 0ms); }
.profile-card, .spotify-card, .rich-activity-card, .guild-card, .activity-loading { min-width: 0; overflow: hidden; border: 1px solid var(--vp-c-divider); border-radius: 1rem; background: var(--vp-c-bg); }
.profile-card { display: flex; flex-direction: column; }
.profile-banner { position: relative; display: flex; align-items: flex-start; justify-content: space-between; min-height: 88px; padding: 1rem 1.15rem; overflow: hidden; background: var(--vp-c-brand-1); color: #fff; }
.banner-label { position: relative; z-index: 1; padding: .35rem .5rem; border: 1px solid rgba(255,255,255,.33); border-radius: .45rem; background: rgba(0,0,0,.08); font-size: .6rem; font-weight: 800; letter-spacing: .13em; }
.banner-symbol { position: absolute; right: 1rem; bottom: -.3rem; width: 92px; height: 92px; color: rgba(255,255,255,.42); transform: rotate(-6deg); transition: transform 600ms cubic-bezier(.16,1,.3,1); }
.profile-card:hover .banner-symbol { transform: rotate(5deg) scale(1.08); }
.profile-content { display: flex; flex: 1; flex-direction: column; padding: 0 1.1rem 1.1rem; }
.profile-identity { display: flex; align-items: flex-end; gap: .9rem; min-width: 0; margin-top: -34px; }
.avatar-wrap { position: relative; z-index: 1; flex: 0 0 88px; width: 88px; height: 88px; padding: 4px; border: 1px solid var(--vp-c-divider); border-radius: 1.2rem; background: var(--vp-c-bg); box-shadow: 0 6px 18px rgba(0,0,0,.09); }
.avatar { display: block; width: 100%; height: 100%; border-radius: .9rem; object-fit: cover; }
.presence-orb { position: absolute; right: -4px; bottom: -4px; width: 20px; height: 20px; border: 4px solid var(--vp-c-bg); border-radius: 50%; background: #80848e; box-shadow: 0 0 0 1px var(--vp-c-divider); }
.presence-orb[data-status="online"] { background: #23a55a; }
.presence-orb[data-status="idle"] { background: #f0b232; }
.presence-orb[data-status="dnd"] { background: #f23f43; }
.presence-orb[data-status="offline"] { background: #80848e; }
.identity-copy { min-width: 0; padding-bottom: .2rem; }
.identity-name-line { display: flex; align-items: center; gap: .35rem; min-width: 0; }
.identity-name-line h3 { margin: 0; overflow-wrap: anywhere; color: var(--vp-c-text-1); font-size: 1.18rem; font-weight: 800; letter-spacing: -.045em; line-height: 1.25; }
.identity-verified { width: 17px; height: 17px; flex: 0 0 auto; fill: var(--vp-c-brand-1); color: #fff; }
.username { margin: .18rem 0 0; color: var(--vp-c-text-3); font-size: .78rem; }
.identity-badges { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .5rem; }
.presence-badge, .guild-tag { display: inline-flex; align-items: center; gap: .32rem; padding: .24rem .44rem; border: 1px solid var(--vp-c-divider); border-radius: .42rem; background: var(--vp-c-bg-alt); color: var(--vp-c-text-2); font-size: .65rem; font-weight: 700; }
.status-dot { width: .4rem; height: .4rem; border-radius: 50%; background: #80848e; }
.presence-badge[data-status="online"] .status-dot { background: #23a55a; box-shadow: 0 0 0 2px rgba(35,165,90,.1); }
.presence-badge[data-status="idle"] .status-dot { background: #f0b232; }
.presence-badge[data-status="dnd"] .status-dot { background: #f23f43; }
.presence-badge[data-status="offline"] .status-dot { background: #80848e; }
.guild-tag { border-color: rgba(88,101,242,.22); background: rgba(88,101,242,.07); color: var(--vp-c-text-1); }
.tag-mark { color: #5865f2; font-size: .6rem; }
.profile-device-row { display: flex; align-items: center; gap: .65rem; margin-top: 1.2rem; padding: .7rem .75rem; border: 1px solid var(--vp-c-divider); border-radius: .72rem; background: var(--vp-c-bg-alt); }
.device-icon { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 34px; border-radius: .6rem; background: var(--vp-c-bg); color: var(--vp-c-text-2); }
.device-icon svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.device-copy { display: flex; flex: 1; flex-direction: column; gap: .12rem; min-width: 0; }
.device-copy strong { color: var(--vp-c-text-1); font-size: .75rem; font-weight: 750; }
.device-copy small { color: var(--vp-c-text-3); font-size: .65rem; }
.live-indicator { display: inline-flex; align-items: center; gap: .3rem; flex: 0 0 auto; color: #23a55a; font-size: .6rem; font-weight: 850; letter-spacing: .09em; }
.live-indicator i { width: .35rem; height: .35rem; border-radius: 50%; background: currentColor; }
.live-indicator.is-stale { color: var(--vp-c-text-3); }
.custom-status { position: relative; display: flex; align-items: center; gap: .7rem; margin-top: .75rem; padding: .85rem .8rem; overflow: hidden; border: 1px solid var(--vp-c-divider); border-radius: .72rem; background: var(--vp-c-bg); }
.status-emoji { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 36px; border-radius: .65rem; background: var(--vp-c-bg-alt); font-size: 1.1rem; }
.custom-status-copy { position: relative; z-index: 1; min-width: 0; }
.detail-label { display: block; color: var(--vp-c-text-3); font-size: .59rem; font-weight: 850; letter-spacing: .13em; }
.custom-status-copy p { margin: .2rem 0 0; overflow-wrap: anywhere; color: var(--vp-c-text-1); font-size: .83rem; font-weight: 650; }
.status-sparkle { width: 31px; height: 31px; flex: 0 0 auto; margin-left: auto; fill: var(--vp-c-brand-1); opacity: .15; transition: transform 500ms ease, opacity 300ms ease; }
.profile-card:hover .status-sparkle { transform: rotate(22deg) scale(1.15); opacity: .32; }
.snapshot-note { display: flex; align-items: flex-start; gap: .4rem; margin: .65rem 0 0; color: var(--vp-c-text-3); font-size: .65rem; line-height: 1.45; }
.snapshot-note svg { width: 14px; height: 14px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.7; }
.presence-stack { display: flex; flex-direction: column; gap: .9rem; min-width: 0; }
.spotify-card { padding: 1.05rem; }
.panel-heading { display: flex; align-items: center; gap: .65rem; margin-bottom: .9rem; }
.panel-heading-icon { display: grid; place-items: center; width: 37px; height: 37px; flex: 0 0 37px; border-radius: .68rem; }
.spotify-icon { background: rgba(29,185,84,.12); color: #1db954; }
.panel-heading-icon svg { width: 24px; height: 24px; }
.panel-heading-copy { min-width: 0; }
.panel-heading-copy h3 { margin: .13rem 0 0; color: var(--vp-c-text-1); font-size: .95rem; font-weight: 800; letter-spacing: -.025em; }
.equalizer { display: flex; align-items: center; gap: 3px; height: 17px; margin-left: auto; }
.equalizer i { display: block; width: 3px; height: 45%; border-radius: 3px; background: #1db954; animation: equalize 900ms ease-in-out infinite alternate; }
.equalizer i:nth-child(2) { height: 90%; animation-delay: -500ms; }
.equalizer i:nth-child(3) { height: 65%; animation-delay: -200ms; }
.equalizer i:nth-child(4) { height: 35%; animation-delay: -650ms; }
.quiet-pill { margin-left: auto; padding: .27rem .4rem; border: 1px solid var(--vp-c-divider); border-radius: .4rem; color: var(--vp-c-text-3); font-size: .57rem; font-weight: 800; letter-spacing: .1em; }
.track-link { display: flex; align-items: center; gap: .8rem; min-width: 0; color: inherit; text-decoration: none !important; }
.album-wrap { position: relative; flex: 0 0 92px; width: 92px; height: 92px; }
.album-art { display: block; width: 92px; height: 92px; border: 1px solid var(--vp-c-divider); border-radius: .75rem; object-fit: cover; box-shadow: 0 7px 17px rgba(0,0,0,.12); transition: transform 460ms cubic-bezier(.16,1,.3,1), box-shadow 460ms ease; }
.track-link:hover .album-art { transform: translateY(-2px) rotate(-2deg) scale(1.035); box-shadow: 0 12px 25px rgba(0,0,0,.17); }
.album-fallback { display: grid; place-items: center; background: var(--vp-c-bg-alt); color: #1db954; font-size: 2rem; }
.album-play-icon { position: absolute; right: .35rem; bottom: .35rem; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: #1db954; color: #102c1a; opacity: 0; transform: translateY(4px) scale(.9); transition: opacity 220ms ease, transform 260ms ease; }
.album-play-icon svg { width: 16px; height: 16px; fill: currentColor; }
.track-link:hover .album-play-icon { opacity: 1; transform: translateY(0) scale(1); }
.track-copy { flex: 1; min-width: 0; }
.track-copy h3 { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; margin: 0; color: var(--vp-c-text-1); font-size: clamp(.95rem,1.65vw,1.12rem); font-weight: 800; letter-spacing: -.04em; line-height: 1.22; overflow-wrap: anywhere; }
.track-copy p { display: block; margin: .35rem 0 .45rem; overflow: hidden; color: var(--vp-c-text-2); font-size: .75rem; text-overflow: ellipsis; white-space: nowrap; }
.album-name { display: flex; align-items: center; gap: .3rem; overflow: hidden; color: var(--vp-c-text-3); font-size: .66rem; text-overflow: ellipsis; white-space: nowrap; }
.album-name svg { width: 14px; height: 14px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.65; stroke-linecap: round; stroke-linejoin: round; }
.open-track { display: grid; place-items: center; width: 28px; height: 28px; flex: 0 0 28px; border: 1px solid var(--vp-c-divider); border-radius: .5rem; color: var(--vp-c-text-3); transition: color 200ms ease, border-color 200ms ease, transform 240ms ease; }
.open-track svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.track-link:hover .open-track { transform: translate(2px,-2px); border-color: #1db954; color: #1db954; }
.progress-area { margin-top: .9rem; }
.progress-track { height: 4px; overflow: hidden; border-radius: 999px; background: var(--vp-c-bg-soft); }
.progress-fill { display: block; width: 0; height: 100%; border-radius: inherit; background: #1db954; transition: width 850ms linear; }
.track-times { display: flex; justify-content: space-between; margin-top: .36rem; color: var(--vp-c-text-3); font-size: .62rem; font-variant-numeric: tabular-nums; }
.spotify-footer { display: flex; align-items: center; gap: .38rem; margin-top: .7rem; color: var(--vp-c-text-3); font-size: .64rem; }
.spotify-live-dot { width: .42rem; height: .42rem; border-radius: 50%; background: #1db954; box-shadow: 0 0 0 3px rgba(29,185,84,.1); }
.empty-state { display: flex; align-items: center; gap: .75rem; padding: .3rem 0 .15rem; }
.empty-state-icon { display: grid; place-items: center; width: 48px; height: 48px; flex: 0 0 48px; border-radius: .8rem; background: var(--vp-c-bg-alt); color: #1db954; font-size: 1.5rem; }
.empty-state strong { color: var(--vp-c-text-1); font-size: .82rem; }
.empty-state p { margin: .2rem 0 0; color: var(--vp-c-text-3); font-size: .72rem; }
.rich-activity-card { padding: .9rem 1rem 1rem; }
.rich-activity-top { display: flex; align-items: center; gap: .6rem; }
.rich-app-icon { display: grid; place-items: center; width: 35px; height: 35px; flex: 0 0 35px; border-radius: .65rem; background: rgba(232,78,111,.1); color: #e84e6f; }
.rich-app-icon svg { width: 20px; height: 20px; fill: currentColor; }
.rich-heading { flex: 1; min-width: 0; }
.rich-heading h3 { margin: .12rem 0 0; color: var(--vp-c-text-1); font-size: .88rem; font-weight: 800; letter-spacing: -.025em; }
.activity-type-pill { padding: .28rem .4rem; border: 1px solid var(--vp-c-divider); border-radius: .42rem; color: var(--vp-c-text-3); font-size: .54rem; font-weight: 800; letter-spacing: .08em; }
.rich-activity-body { display: flex; align-items: center; gap: .8rem; margin-top: .8rem; padding: .8rem; border: 1px solid var(--vp-c-divider); border-radius: .78rem; background: var(--vp-c-bg-alt); }
.rich-activity-art { display: grid; place-items: center; width: 62px; height: 62px; flex: 0 0 62px; border: 1px solid rgba(232,78,111,.17); border-radius: .8rem; background: rgba(232,78,111,.08); color: #e84e6f; transition: transform 420ms cubic-bezier(.16,1,.3,1); }
.rich-activity-card:hover .rich-activity-art { transform: rotate(-5deg) scale(1.05); }
.rich-activity-art svg { width: 42px; height: 42px; fill: currentColor; }
.rich-activity-copy { min-width: 0; }
.rich-activity-overline { color: var(--vp-c-text-3); font-size: .58rem; font-weight: 850; letter-spacing: .13em; }
.rich-activity-copy h4 { margin: .16rem 0 .1rem; overflow-wrap: anywhere; color: var(--vp-c-text-1); font-size: 1rem; font-weight: 850; letter-spacing: -.035em; line-height: 1.2; }
.rich-activity-copy p { margin: .15rem 0 0; color: var(--vp-c-text-2); font-size: .7rem; }
.rich-activity-button { display: inline-flex; align-items: center; gap: .32rem; margin-top: .52rem; padding: .37rem .5rem; border: 1px solid var(--vp-c-divider); border-radius: .46rem; background: var(--vp-c-bg); color: var(--vp-c-text-1) !important; font-size: .66rem; font-weight: 750; text-decoration: none !important; transition: border-color 200ms ease, transform 200ms ease, background-color 200ms ease; }
.rich-activity-button svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.rich-activity-button:hover { transform: translateY(-1px); border-color: var(--vp-c-brand-1); background: var(--vp-c-bg); }
.rich-activity-button.is-static { color: var(--vp-c-text-3) !important; }
.idle-activity { display: flex; align-items: center; gap: .8rem; }
.idle-star { display: grid; place-items: center; width: 42px; height: 42px; border-radius: .7rem; background: var(--vp-c-bg-alt); color: var(--vp-c-text-3); font-size: 1.4rem; }
.idle-activity h3 { margin: .15rem 0; color: var(--vp-c-text-1); font-size: .85rem; }
.idle-activity p { margin: 0; color: var(--vp-c-text-3); font-size: .7rem; }

.guild-card { grid-column: 1 / -1; min-width: 0; padding: 1.1rem 1.2rem 1rem; border: 1px solid var(--vp-c-divider); border-radius: 1rem; background: var(--vp-c-bg); transition: border-color 260ms ease, box-shadow 320ms ease, transform 320ms cubic-bezier(.16,1,.3,1); }
.guild-card:hover { border-color: color-mix(in srgb, var(--vp-c-brand-1) 44%, var(--vp-c-divider)); box-shadow: 0 10px 26px rgba(20,35,25,.055); transform: translateY(-2px); }
.guild-topline { display: flex; align-items: center; gap: .85rem; min-width: 0; }
.guild-brand-mark { display: grid; place-items: center; flex: 0 0 48px; width: 48px; height: 48px; overflow: hidden; border: 1px solid var(--vp-c-divider); border-radius: .85rem; background: var(--vp-c-bg-alt); }
.guild-brand-mark img { display: block; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
.guild-heading-copy { min-width: 0; flex: 1; }
.guild-heading-copy h3 { margin: .15rem 0 .22rem; color: var(--vp-c-text-1); font-size: 1.03rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.35; }
.guild-heading-copy p { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem; margin: 0; color: var(--vp-c-text-2); font-size: .72rem; }
.guild-heading-copy p strong { color: var(--vp-c-text-1); font-weight: 800; }
.guild-heading-divider { color: var(--vp-c-text-3); }
.guild-online-dot { width: .43rem; height: .43rem; border-radius: 50%; background: #23a55a; box-shadow: 0 0 0 3px rgba(35,165,90,.1); }
.guild-join-link { display: inline-flex; align-items: center; gap: .4rem; flex: 0 0 auto; padding: .55rem .7rem; border: 1px solid var(--vp-c-divider); border-radius: .65rem; color: var(--vp-c-text-1) !important; font-size: .72rem; font-weight: 750; text-decoration: none !important; transition: border-color 200ms ease, background-color 200ms ease, transform 200ms ease; }
.guild-join-link svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; transition: transform 200ms ease; }
.guild-join-link:hover { transform: translateY(-1px); border-color: var(--vp-c-brand-1); background: var(--vp-c-bg-alt); }
.guild-join-link:hover svg { transform: translate(2px,-2px); }
.guild-divider { height: 1px; margin: .95rem 0; background: var(--vp-c-divider); }
.guild-columns { display: grid; grid-template-columns: minmax(155px, .72fr) minmax(0, 1.28fr); gap: 1.3rem; }
.guild-channels h4, .guild-members h4 { display: flex; align-items: center; gap: .42rem; margin: 0 0 .65rem; color: var(--vp-c-text-3); font-size: .6rem; font-weight: 850; letter-spacing: .11em; }
.guild-channels h4 > svg, .guild-members h4 > svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.section-count { display: inline-grid; place-items: center; min-width: 1.15rem; height: 1.15rem; padding-inline: .2rem; border-radius: .36rem; background: var(--vp-c-bg-alt); color: var(--vp-c-text-2); font-size: .6rem; letter-spacing: 0; }
.channel-list { display: flex; flex-wrap: wrap; gap: .4rem; }
.channel-pill { display: inline-flex; align-items: center; gap: .36rem; padding: .45rem .55rem; border: 1px solid var(--vp-c-divider); border-radius: .55rem; background: var(--vp-c-bg-alt); color: var(--vp-c-text-2); font-size: .73rem; transition: border-color 200ms ease, transform 200ms ease; }
.channel-pill:hover { transform: translateY(-1px); border-color: var(--vp-c-brand-1); }
.channel-pill > span { color: var(--vp-c-text-3); font-size: .9rem; font-weight: 800; }
.channel-pill > svg { width: 12px; height: 12px; margin-left: .12rem; fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.member-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem .85rem; }
.guild-member { display: flex; align-items: center; gap: .5rem; min-width: 0; }
.member-avatar-wrap { position: relative; flex: 0 0 32px; width: 32px; height: 32px; }
.member-avatar-wrap img, .member-avatar-fallback { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.member-avatar-fallback { background: var(--vp-c-bg-alt); color: var(--vp-c-text-2); font-size: .72rem; font-weight: 800; }
.member-status-dot { position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px; border: 2px solid var(--vp-c-bg); border-radius: 50%; background: #23a55a; }
.member-status-dot[data-status="idle"] { background: #f0b232; }
.member-status-dot[data-status="dnd"] { background: #f23f43; }
.member-name { min-width: 0; overflow: hidden; color: var(--vp-c-text-1); font-size: .75rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.member-game { flex: 0 0 auto; max-width: 34%; overflow: hidden; color: var(--vp-c-text-3); font-size: .64rem; text-overflow: ellipsis; white-space: nowrap; }
.guild-muted { margin: .3rem 0 0; color: var(--vp-c-text-3); font-size: .7rem; }
.guild-bottomline { display: flex; align-items: center; justify-content: space-between; gap: .7rem; margin-top: .95rem; padding-top: .75rem; border-top: 1px solid var(--vp-c-divider); }
.guild-bottomline p { display: flex; align-items: center; gap: .4rem; margin: 0; color: var(--vp-c-text-3); font-size: .65rem; }
.guild-bottomline p > svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.7; }
.guild-server-id { color: var(--vp-c-text-3); font-size: .55rem; font-weight: 850; letter-spacing: .12em; }
.loading-dot { width: .4rem; height: .4rem; border-radius: 50%; background: #23a55a; animation: status-pulse 1.8s ease-out infinite; }
.activity-loading { display: flex; align-items: center; gap: .85rem; padding: 1.2rem; color: var(--vp-c-text-2); }
.loading-spinner { width: 24px; height: 24px; flex: 0 0 24px; border: 2px solid var(--vp-c-divider); border-top-color: var(--vp-c-brand-1); border-radius: 50%; animation: spin .9s linear infinite; }
.activity-loading span:last-child { display: flex; flex-direction: column; gap: .2rem; }
.activity-loading strong { color: var(--vp-c-text-1); font-size: .83rem; }
.activity-loading small { color: var(--vp-c-text-3); font-size: .7rem; }

@keyframes activity-enter { from { opacity: 0; transform: translateY(13px) scale(.992); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes status-pulse { 0% { opacity: .6; transform: scale(.75); } 100% { opacity: 0; transform: scale(1.8); } }
@keyframes equalize { from { transform: scaleY(.4); } to { transform: scaleY(1); } }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 820px) {
  .activity-grid { grid-template-columns: minmax(0, 1fr); }
  .profile-content { padding: 0 1rem 1rem; }
  .profile-banner { min-height: 78px; }
  .presence-stack { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: stretch; }
  .spotify-card, .rich-activity-card { height: 100%; }
  .rich-activity-body { align-items: flex-start; }
  .guild-card { grid-column: auto; }
}
@media (max-width: 560px) {
  .my-activity { margin: 2rem 0 2.4rem; padding: .8rem; border-radius: 1rem; }
  .activity-heading { align-items: flex-start; flex-direction: column; gap: .9rem; }
  .heading-subtitle { max-width: 27rem; }
  .activity-actions { width: 100%; }
  .join-server { min-height: 40px; flex: 1; padding: .6rem .7rem; font-size: .76rem; }
  .copy-server { width: 40px; height: 40px; border-radius: .7rem; }
  .profile-banner { min-height: 70px; padding: .8rem; }
  .profile-identity { align-items: flex-end; gap: .7rem; margin-top: -28px; }
  .avatar-wrap { flex-basis: 76px; width: 76px; height: 76px; border-radius: 1rem; }
  .avatar { border-radius: .75rem; }
  .identity-name-line h3 { font-size: 1.05rem; }
  .identity-badges { gap: .25rem; }
  .presence-badge, .guild-tag { font-size: .6rem; }
  .profile-device-row { gap: .5rem; margin-top: 1rem; padding: .6rem; }
  .device-icon { width: 30px; height: 30px; flex-basis: 30px; }
  .device-copy small { font-size: .61rem; }
  .live-indicator { font-size: .55rem; }
  .presence-stack { display: flex; }
  .spotify-card, .rich-activity-card { height: auto; padding: .9rem; }
  .album-wrap { flex-basis: 78px; width: 78px; height: 78px; }
  .album-art { width: 78px; height: 78px; border-radius: .65rem; }
  .track-link { gap: .65rem; }
  .track-copy h3 { font-size: 1rem; }
  .open-track { width: 25px; height: 25px; flex-basis: 25px; }
  .rich-activity-body { gap: .65rem; padding: .65rem; }
  .rich-activity-art { width: 52px; height: 52px; flex-basis: 52px; }
  .rich-activity-art svg { width: 36px; height: 36px; }
  .guild-card { padding: .9rem; }
  .guild-topline { align-items: flex-start; gap: .6rem; }
  .guild-brand-mark { flex-basis: 42px; width: 42px; height: 42px; border-radius: .7rem; }
  .guild-heading-copy h3 { font-size: .9rem; }
  .guild-heading-copy p { font-size: .65rem; }
  .guild-join-link { padding: .48rem; font-size: 0; }
  .guild-join-link svg { width: 17px; height: 17px; }
  .guild-columns { grid-template-columns: minmax(0, 1fr); gap: 1rem; }
  .member-list { grid-template-columns: minmax(0, 1fr); }
  .guild-bottomline { align-items: flex-start; }
  .guild-server-id { max-width: 5.5rem; text-align: right; }
}
@media (prefers-reduced-motion: reduce) {
  .my-activity *, .my-activity *::before, .my-activity *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
</style>
