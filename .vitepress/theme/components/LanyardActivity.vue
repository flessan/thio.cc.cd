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
  sync_id?: string
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
const activityElapsed = computed(() => {
  const started = currentActivity.value?.timestamps?.start
  if (!started || now.value < started) return '00:00:00'
  const elapsed = Math.floor((now.value - started) / 1000)
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
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

    <div v-else class="activity-layout">
      <article class="profile-card activity-reveal">
        <div class="profile-banner" aria-hidden="true"></div>
        <div class="profile-content">
          <div class="profile-avatar-line">
            <div class="avatar-wrap">
              <img :src="profileImage" class="avatar" alt="Profile GIF" width="112" height="112" loading="lazy" />
              <span class="presence-orb" :data-status="status" :aria-label="statusLabel"></span>
            </div>
            <div class="profile-custom-status">
              <span class="status-emoji">{{ customStatus?.emoji?.name || '✦' }}</span>
              <span>{{ customStatus?.state || (unavailable ? 'Presence is temporarily unavailable.' : 'No custom status right now.') }}</span>
              <span class="status-bubble-notch" aria-hidden="true"></span>
            </div>
          </div>

          <div class="profile-main">
            <div class="profile-name-block">
              <div class="identity-name-line">
                <h3>{{ user?.display_name || user?.global_name || user?.username || 'Flessann' }}</h3>
                <svg v-if="user?.primary_guild?.tag" class="identity-verified" viewBox="0 0 24 24" :aria-label="'Primary guild: ' + (user?.primary_guild?.tag || '')" role="img"><path d="m12 2 2.4 2.1 3.2-.1.9 3.1 2.6 1.8-1.1 3 1.1 3-2.6 1.8-.9 3.1-3.2-.1L12 22l-2.4-2.1-3.2.1-.9-3.1-2.6-1.8 1.1-3-1.1-3 2.6-1.8.9-3.1 3.2.1L12 2Z"/><path d="m8.5 12.2 2.2 2.2 4.8-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <p class="identity-meta">
                <span>{{ user?.username || 'thiosaputra' }}</span>
                <span class="meta-dot">•</span><span>he</span>
                <span v-if="user?.primary_guild?.tag" class="guild-tag"><span class="tag-mark">◆</span>{{ user.primary_guild.tag }}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></span>
              </p>
            </div>

            <div class="profile-activity-icons" aria-label="Presence indicators">
              <span class="mini-activity-icon" :title="platformLabel">
                <svg v-if="presence?.active_on_discord_mobile" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M10 18.5h4"/></svg>
                <svg v-else-if="presence?.active_on_discord_web" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8m-4-4v4M3 8h18"/></svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-7-7h14"/></svg>
              </span>
              <span class="mini-activity-icon" title="Discord status">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 6.6A16 16 0 0 1 10 5.7l.5 1a14 14 0 0 1 3 0l.5-1a16 16 0 0 1 2.8.9c1.8 2.7 2.6 5.5 2.5 8.3a11 11 0 0 1-3.5 1.8l-.8-1.3c.5-.2.9-.4 1.3-.7-2.7 1.2-5.5 1.2-8.2 0 .4.3.8.5 1.3.7l-.8 1.3a11 11 0 0 1-3.5-1.8c-.1-2.8.7-5.6 2.5-8.3Z"/><circle cx="9.2" cy="11.4" r="1"/><circle cx="14.8" cy="11.4" r="1"/></svg>
              </span>
              <span class="mini-activity-icon" :class="{ 'is-active': spotify }" title="Spotify">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9.2c4.8-1.5 10.8-.8 14.2 1.4M6 12.7c3.8-1.1 8.2-.5 11.4 1.3M7.1 16c2.8-.7 5.6-.3 8.1 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </span>
              <span class="mini-activity-icon" :class="{ 'is-active': currentActivity }" title="Rich Presence">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11Z"/></svg>
              </span>
              <span class="mini-activity-count">+1</span>
            </div>

            <div class="profile-actions">
              <a class="message-button" href="https://discord.com/users/776722084030054421" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.1-.6L4 20l1.5-4A7.5 7.5 0 1 1 20 11.5Z"/></svg>
                Message
              </a>
              <a class="profile-icon-button" :href="inviteUrl" target="_blank" rel="noopener noreferrer" aria-label="Join community server" title="Join community server">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5 6 5h12l2 3.5v10H4v-10Z"/><path d="M4 9h16M9 13h6m-6 3h4"/></svg>
              </a>
              <button class="profile-icon-button" type="button" :aria-label="copyButtonLabel" :title="copyButtonLabel" @click="copyInviteUrl">
                <svg v-if="copiedInvite" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
              </button>
            </div>

            <div class="profile-bio">
              <span class="profile-section-label">About me</span>
              <p>please disturb meh, i'm friendly :)</p>
              <p>pls join if you want: <a :href="inviteUrl" target="_blank" rel="noopener noreferrer">thio.cc.cd/discord</a></p>
            </div>

            <div class="profile-detail-block">
              <span class="profile-section-label">Member Since</span>
              <p>Nov 13, 2020</p>
            </div>

            <div class="profile-detail-block connections">
              <span class="profile-section-label">Connections</span>
              <a href="https://thio.cc.cd" target="_blank" rel="noopener noreferrer" class="connection-item">
                <span class="connection-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg></span>
                <span>thio.cc.cd</span>
                <svg class="connection-out" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>
              </a>
            </div>

            <div class="profile-presence-footer">
              <span class="presence-footer-dot" :data-status="status"></span>
              {{ statusLabel }} <span class="meta-dot">•</span> {{ platformLabel }}
            </div>
          </div>
        </div>
      </article>

      <section class="activity-pane activity-reveal" style="--reveal-delay: 100ms" aria-label="Discord activity">
        <nav class="profile-tabs" aria-label="Profile sections">
          <span class="profile-tab">Board</span>
          <span class="profile-tab is-active" aria-current="page">Activity</span>
          <span class="profile-tab">Wishlist</span>
        </nav>

        <div class="activity-pane-heading">
          <h3>Current activity</h3>
          <span class="activity-refresh" :class="{ 'is-stale': unavailable }"><i></i>{{ unavailable ? 'Offline snapshot' : loading ? 'Syncing' : 'Live' }}</span>
        </div>

        <article class="activity-card spotify-activity">
          <div class="activity-card-heading">
            <div class="activity-type-icon spotify-type-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9.2c4.8-1.5 10.8-.8 14.2 1.4M6 12.7c3.8-1.1 8.2-.5 11.4 1.3M7.1 16c2.8-.7 5.6-.3 8.1 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <span>Listening to Spotify</span>
            <span class="spotify-tiny-mark" aria-hidden="true">●</span>
            <span class="activity-more" aria-hidden="true">···</span>
          </div>
          <template v-if="spotify">
            <a class="activity-card-content" :href="spotifyUrl" target="_blank" rel="noopener noreferrer">
              <img v-if="spotify.album_art_url" :src="spotify.album_art_url" class="activity-artwork spotify-artwork" :alt="(spotify.album || 'Album') + ' artwork'" width="126" height="126" loading="lazy" />
              <div v-else class="activity-artwork artwork-fallback">♫</div>
              <div class="activity-track-info">
                <h4>{{ spotify.song || 'Unknown track' }}</h4>
                <p>{{ spotify.artist || 'Unknown artist' }}</p>
                <div class="activity-progress-line">
                  <span>{{ elapsedTime }}</span>
                  <div class="activity-progress"><i :style="{ width: songProgress + '%' }"></i></div>
                  <span>{{ totalTime }}</span>
                </div>
              </div>
            </a>
          </template>
          <div v-else class="activity-empty">
            <span class="activity-empty-icon">♫</span>
            <div><strong>Not listening to Spotify</strong><p>When a track starts playing, it'll appear here.</p></div>
          </div>
        </article>

        <article v-if="currentActivity" class="activity-card watching-activity">
          <div class="activity-card-heading">
            <span class="watching-type-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/></svg></span>
            <span>Watching</span>
            <span class="activity-more" aria-hidden="true">···</span>
          </div>
          <div class="activity-card-content">
            <img :src="profileImage" class="activity-artwork watching-artwork" alt="Rich Presence activity artwork" width="126" height="126" loading="lazy" />
            <div class="activity-track-info watching-track-info">
              <h4>{{ currentActivity.name || 'Rich Presence' }}</h4>
              <p>{{ currentActivity.state || currentActivity.details || 'Active on Discord' }}</p>
              <a v-if="currentActivity.buttons?.includes('My Blog')" class="watching-link" href="https://thio.cc.cd/blog/" target="_blank" rel="noopener noreferrer">My Blog <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></a>
              <span class="activity-duration"><i></i>{{ activityElapsed }}</span>
            </div>
          </div>
        </article>
        <article v-else class="activity-card activity-card-empty">
          <span class="watching-type-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/></svg></span>
          <div><h4>No other activity</h4><p>Other app activity will appear here when available.</p></div>
        </article>

        <div class="recent-activity">
          <div class="recent-heading">
            <h3>Recent activity</h3>
            <span>Last 30 days</span>
          </div>
          <p>You'll see recent activity here as it becomes available. <a href="https://support.discord.com/" target="_blank" rel="noopener noreferrer">Learn more</a></p>
          <div class="recent-placeholder">
            <span class="recent-game-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10a4 4 0 0 1 3.9 3.1l1 4.3a2.5 2.5 0 0 1-4.3 2.2L15 15H9l-2.6 2.6a2.5 2.5 0 0 1-4.3-2.2l1-4.3A4 4 0 0 1 7 8Z"/><path d="M7 10v4m-2-2h4m7-.5h.01M18 13.5h.01"/></svg></span>
            <div><h4>Discord activity</h4><p>Games and apps appear here when Discord shares them.</p></div>
          </div>
        </div>
      </section>

      <article class="guild-card activity-reveal" style="--reveal-delay: 180ms" aria-label="Discord server widget">
        <div class="guild-topline">
          <div class="guild-brand-mark" aria-hidden="true"><img :src="communityImage" alt="" width="48" height="48" loading="lazy" /></div>
          <div class="guild-heading-copy">
            <span class="detail-label">COMMUNITY SERVER</span>
            <h3>{{ guild?.name || 'Thio Saputra Places' }}</h3>
            <p><span class="guild-online-dot"></span><strong>{{ activeMemberCount }}</strong> members online <span class="guild-heading-divider">/</span> hang out with the community</p>
          </div>
          <a class="guild-join-link" :href="inviteUrl" target="_blank" rel="noopener noreferrer">Join community <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></a>
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
                  <img v-if="member.avatar_url" :src="member.avatar_url" alt="" width="32" height="32" loading="lazy" />
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
  --vp-c-bg: #232428;
  --vp-c-bg-alt: #1e1f22;
  --vp-c-bg-soft: #2b2d31;
  --vp-c-text-1: #f2f3f5;
  --vp-c-text-2: #dbdee1;
  --vp-c-text-3: #949ba4;
  --vp-c-divider: #3f4147;
  --vp-c-brand-1: #5865f2;
  --vp-c-brand-2: #4752c4;
  --vp-c-brand-3: #5865f2;
  --vp-c-brand-soft: rgba(88,101,242,.16);
  margin: 2.5rem 0 3rem;
  padding: clamp(.85rem, 2.2vw, 1.35rem);
  overflow: hidden;
  border: 1px solid #3f4147;
  border-radius: 1.2rem;
  background: #1e1f22;
  color: #dbdee1;
  box-shadow: 0 18px 50px rgba(0,0,0,.13);
}
.activity-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.1rem; }
.heading-copy { min-width: 0; }
.heading-kicker { display: flex; align-items: center; gap: .45rem; margin-bottom: .26rem; color: #949ba4; font-size: .62rem; font-weight: 800; letter-spacing: .14em; }
.kicker-pulse { position: relative; width: .43rem; height: .43rem; border-radius: 50%; background: #23a55a; }
.kicker-pulse::after { position: absolute; inset: -4px; border: 1px solid #23a55a; border-radius: inherit; content: ""; animation: status-pulse 1.8s ease-out infinite; }
.activity-heading h2 { margin: 0 !important; padding: 0 !important; border: 0 !important; color: #f2f3f5; font-size: clamp(1.4rem, 3vw, 1.8rem); font-weight: 800; letter-spacing: -.05em; line-height: 1.15; }
.activity-actions { display: inline-flex; align-items: center; gap: .42rem; flex: 0 0 auto; }
.join-server { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 40px; padding: .58rem .78rem; border: 1px solid #4752c4; border-radius: .58rem; background: #5865f2; color: #fff !important; font-size: .78rem; font-weight: 750; text-decoration: none !important; transition: transform 220ms ease, box-shadow 260ms ease, background-color 220ms ease; }
.join-server svg { width: 17px; height: 17px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.join-server svg:first-child { fill: currentColor; stroke-width: .7; }
.join-server:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(88,101,242,.25); background: #4752c4; }
.action-arrow { transition: transform 220ms ease; }
.join-server:hover .action-arrow { transform: translate(2px,-2px); }
.copy-server { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 40px; padding: 0; border: 1px solid #3f4147; border-radius: .58rem; background: #2b2d31; color: #dbdee1; cursor: pointer; transition: color 200ms ease, border-color 200ms ease, background-color 200ms ease, transform 200ms ease; }
.copy-server svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.copy-server:hover { transform: translateY(-1px); border-color: #5865f2; background: #303238; }
.copy-server.is-copied { border-color: #23a55a; color: #23a55a; }
.copy-server.is-error { border-color: #f23f43; color: #f23f43; }
.activity-layout { display: grid; grid-template-columns: minmax(0, .96fr) minmax(0, 1.04fr); align-items: stretch; gap: .85rem; }
.activity-reveal { animation: activity-enter 620ms cubic-bezier(.16,1,.3,1) both; animation-delay: var(--reveal-delay, 0ms); }
.profile-card, .activity-pane, .guild-card, .activity-loading { min-width: 0; overflow: hidden; border: 1px solid #3f4147; border-radius: .9rem; background: #232428; }
.profile-card { display: flex; flex-direction: column; }
.profile-banner { position: relative; min-height: 168px; background: #e8f8ff; }
.profile-banner::after { position: absolute; right: 1.3rem; top: 1.1rem; width: 84px; height: 84px; border: 1px solid rgba(64,156,201,.12); border-radius: 50%; background: rgba(255,255,255,.12); content: ""; }
.profile-content { display: flex; flex: 1; flex-direction: column; min-width: 0; padding: 0 1.35rem 1.2rem; }
.profile-avatar-line { position: relative; display: flex; align-items: flex-end; gap: .85rem; min-width: 0; margin-top: -82px; }
.avatar-wrap { position: relative; z-index: 1; flex: 0 0 132px; width: 132px; height: 132px; padding: 6px; border: 7px solid #232428; border-radius: 50%; background: #232428; box-shadow: 0 0 0 1px rgba(255,255,255,.05); }
.avatar { display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.presence-orb { position: absolute; right: 3px; bottom: 5px; width: 24px; height: 24px; border: 4px solid #232428; border-radius: 50%; background: #80848e; }
.presence-orb[data-status="online"] { background: #23a55a; }
.presence-orb[data-status="idle"] { background: #f0b232; }
.presence-orb[data-status="dnd"] { background: #f23f43; }
.presence-orb[data-status="offline"] { background: #80848e; }
.profile-custom-status { position: relative; display: flex; align-items: center; gap: .38rem; max-width: calc(100% - 125px); min-width: 0; margin-bottom: 1.15rem; padding: .58rem .68rem; border: 1px solid #1a1b1e; border-radius: 999px; background: #2b2d31; color: #f2f3f5; font-size: .77rem; box-shadow: 0 4px 13px rgba(0,0,0,.08); animation: bubble-appear 650ms cubic-bezier(.16,1,.3,1) both; }
.status-emoji { flex: 0 0 auto; font-size: 1rem; }
.profile-custom-status > span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-bubble-notch { position: absolute; left: -5px; bottom: 12px; width: 10px; height: 10px; border-left: 1px solid #1a1b1e; border-bottom: 1px solid #1a1b1e; background: #2b2d31; transform: rotate(45deg); }
.profile-main { display: flex; flex-direction: column; gap: 1rem; padding: .65rem .1rem 0; }
.profile-name-block { min-width: 0; }
.identity-name-line { display: flex; align-items: center; gap: .42rem; min-width: 0; }
.identity-name-line h3 { margin: 0; overflow-wrap: anywhere; color: #f2f3f5; font-size: clamp(1.45rem, 2.6vw, 1.85rem); font-weight: 800; letter-spacing: -.045em; line-height: 1.18; }
.identity-verified { width: 18px; height: 18px; flex: 0 0 auto; fill: #5865f2; color: white; }
.identity-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; margin: .45rem 0 0; color: #dbdee1; font-size: .83rem; }
.meta-dot { color: #949ba4; }
.guild-tag { display: inline-flex; align-items: center; gap: .34rem; padding: .27rem .43rem; border: 1px solid #3f4147; border-radius: .45rem; background: #2b2d31; color: #dbdee1; font-size: .68rem; font-weight: 750; }
.tag-mark { color: #58c6ff; font-size: .58rem; }
.guild-tag svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.8; }
.profile-activity-icons { display: flex; align-items: center; gap: .24rem; }
.mini-activity-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: .43rem; background: #2b2d31; color: #58c6ff; transition: transform 220ms ease, background-color 220ms ease; }
.mini-activity-icon svg { width: 18px; height: 18px; fill: currentColor; }
.mini-activity-icon:hover { transform: translateY(-2px); background: #35373d; }
.mini-activity-icon.is-active { color: #f2f3f5; background: #41434a; }
.mini-activity-count { display: grid; place-items: center; height: 28px; padding: 0 .45rem; border-radius: .43rem; background: #2b2d31; color: #dbdee1; font-size: .72rem; font-weight: 750; }
.profile-actions { display: flex; align-items: center; gap: .5rem; }
.message-button { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; min-height: 39px; padding: .6rem .8rem; border: 1px solid #4752c4; border-radius: .55rem; background: #5865f2; color: #fff !important; font-size: .78rem; font-weight: 750; text-decoration: none !important; transition: transform 200ms ease, background-color 200ms ease; }
.message-button svg { width: 17px; height: 17px; fill: currentColor; }
.message-button:hover { transform: translateY(-1px); background: #4752c4; }
.profile-icon-button { display: grid; place-items: center; width: 39px; height: 39px; padding: 0; border: 1px solid #3f4147; border-radius: .55rem; background: #2b2d31; color: #dbdee1; cursor: pointer; transition: transform 200ms ease, border-color 200ms ease, background-color 200ms ease; }
.profile-icon-button svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.profile-icon-button:hover { transform: translateY(-1px); border-color: #5865f2; background: #35373d; }
.profile-bio { padding-top: .2rem; }
.profile-section-label { display: block; margin-bottom: .38rem; color: #b5bac1; font-size: .72rem; font-weight: 550; }
.profile-bio p { margin: .2rem 0; color: #dbdee1; font-size: .83rem; line-height: 1.5; overflow-wrap: anywhere; }
.profile-bio a { color: #00a8fc !important; text-decoration: none !important; }
.profile-bio a:hover { text-decoration: underline !important; }
.profile-detail-block { padding-top: .25rem; }
.profile-detail-block > p { margin: .45rem 0 0; color: #dbdee1; font-size: .82rem; }
.connections { padding-top: .05rem; }
.connection-item { display: flex; align-items: center; gap: .55rem; max-width: 100%; margin-top: .45rem; padding: .45rem .5rem; border: 1px solid #3f4147; border-radius: .6rem; color: #dbdee1 !important; text-decoration: none !important; transition: background-color 200ms ease, border-color 200ms ease; }
.connection-item:hover { border-color: #5865f2; background: #2b2d31; }
.connection-icon { display: grid; place-items: center; width: 29px; height: 29px; border-radius: .48rem; background: #f2f3f5; color: #232428; }
.connection-icon svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.65; stroke-linecap: round; }
.connection-out { width: 15px; height: 15px; margin-left: auto; fill: none; stroke: #949ba4; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.profile-presence-footer { display: flex; align-items: center; gap: .4rem; margin-top: auto; padding-top: 1.15rem; color: #949ba4; font-size: .66rem; }
.presence-footer-dot { width: .45rem; height: .45rem; border-radius: 50%; background: #80848e; }
.presence-footer-dot[data-status="online"] { background: #23a55a; }
.presence-footer-dot[data-status="idle"] { background: #f0b232; }
.presence-footer-dot[data-status="dnd"] { background: #f23f43; }

.activity-pane { padding: 1.1rem; }
.profile-tabs { display: flex; align-items: stretch; gap: 1.2rem; min-height: 43px; border-bottom: 1px solid #3f4147; }
.profile-tab { position: relative; display: inline-flex; align-items: flex-start; padding: .14rem 0 .85rem; color: #b5bac1; font-size: .82rem; font-weight: 700; white-space: nowrap; }
.profile-tab.is-active { color: #f2f3f5; }
.profile-tab.is-active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; border-radius: 2px; background: #f2f3f5; content: ""; }
.activity-pane-heading { display: flex; align-items: center; justify-content: space-between; gap: .8rem; margin: 1.1rem 0 .65rem; }
.activity-pane-heading h3, .recent-heading h3 { margin: 0; color: #b5bac1; font-size: .77rem; font-weight: 550; }
.activity-refresh { display: inline-flex; align-items: center; gap: .35rem; color: #23a55a; font-size: .6rem; font-weight: 750; text-transform: uppercase; letter-spacing: .08em; }
.activity-refresh i { width: .38rem; height: .38rem; border-radius: 50%; background: currentColor; animation: status-pulse 1.8s ease-out infinite; }
.activity-refresh.is-stale { color: #949ba4; }
.activity-card { overflow: hidden; margin-top: .65rem; padding: .85rem .9rem .9rem; border: 1px solid transparent; border-radius: .8rem; background: #2b2d31; transition: border-color 230ms ease, transform 250ms ease, background-color 230ms ease; }
.activity-card:hover { transform: translateY(-1px); border-color: #41434a; background: #303238; }
.activity-card-heading { display: flex; align-items: center; gap: .45rem; min-width: 0; margin-bottom: .65rem; color: #f2f3f5; font-size: .73rem; font-weight: 600; }
.activity-type-icon { display: grid; place-items: center; width: 18px; height: 18px; flex: 0 0 18px; border-radius: .3rem; }
.activity-type-icon svg { width: 17px; height: 17px; }
.spotify-type-icon { color: #dbdee1; }
.spotify-type-icon svg { fill: none; }
.spotify-tiny-mark { display: grid; place-items: center; width: 13px; height: 13px; margin-left: -.2rem; border-radius: 50%; background: #1db954; color: #12341e; font-size: .48rem; }
.activity-more { margin-left: auto; color: #b5bac1; font-size: 1.3rem; font-weight: 800; letter-spacing: .06em; line-height: .7; }
.activity-card-content { display: flex; align-items: center; gap: .8rem; min-width: 0; color: inherit; text-decoration: none !important; }
.activity-artwork { display: block; width: clamp(80px, 9vw, 126px); height: clamp(80px, 9vw, 126px); flex: 0 0 clamp(80px, 9vw, 126px); overflow: hidden; border-radius: .55rem; object-fit: cover; background: #1e1f22; }
.spotify-artwork { transition: transform 400ms cubic-bezier(.16,1,.3,1); }
.activity-card:hover .spotify-artwork { transform: scale(1.025); }
.artwork-fallback { display: grid; place-items: center; color: #1db954; font-size: 2rem; }
.activity-track-info { flex: 1; min-width: 0; }
.activity-track-info h4 { margin: 0 0 .22rem; color: #f2f3f5; font-size: .86rem; font-weight: 750; letter-spacing: -.015em; line-height: 1.35; overflow-wrap: anywhere; }
.activity-track-info p { margin: 0; color: #dbdee1; font-size: .75rem; line-height: 1.4; overflow-wrap: anywhere; }
.activity-progress-line { display: flex; align-items: center; gap: .5rem; margin-top: .55rem; color: #dbdee1; font-size: .68rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.activity-progress { height: 3px; flex: 1; min-width: 20px; overflow: hidden; border-radius: 99px; background: #41434a; }
.activity-progress i { display: block; height: 100%; border-radius: inherit; background: #f2f3f5; transition: width 800ms linear; }
.watching-type-icon { display: grid; place-items: center; width: 20px; height: 20px; flex: 0 0 20px; color: #dbdee1; }
.watching-type-icon svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.65; stroke-linecap: round; stroke-linejoin: round; }
.watching-artwork { transition: transform 400ms cubic-bezier(.16,1,.3,1); }
.watching-activity:hover .watching-artwork { transform: scale(1.025); }
.watching-link { display: inline-flex; align-items: center; gap: .3rem; margin-top: .35rem; color: #00a8fc !important; font-size: .66rem; text-decoration: none !important; }
.watching-link svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.watching-link:hover { text-decoration: underline !important; }
.activity-duration { display: flex; align-items: center; gap: .35rem; margin-top: .35rem; color: #23a55a; font-size: .7rem; font-variant-numeric: tabular-nums; }
.activity-duration i { display: block; width: 12px; height: 7px; border-radius: 2px; background: #23a55a; }
.activity-empty { display: flex; align-items: center; gap: .7rem; padding: .6rem 0 .1rem; }
.activity-empty-icon { display: grid; place-items: center; width: 45px; height: 45px; border-radius: .6rem; background: #1e1f22; color: #1db954; font-size: 1.4rem; }
.activity-empty strong { color: #f2f3f5; font-size: .78rem; }
.activity-empty p, .activity-card-empty p { margin: .2rem 0 0; color: #b5bac1; font-size: .7rem; }
.activity-card-empty { display: flex; align-items: center; gap: .65rem; }
.activity-card-empty h4 { margin: 0; color: #f2f3f5; font-size: .8rem; }
.recent-activity { margin-top: 1.25rem; }
.recent-heading { display: flex; align-items: center; justify-content: space-between; gap: .7rem; }
.recent-heading span { color: #949ba4; font-size: .61rem; }
.recent-activity > p { margin: .35rem 0 .7rem; color: #b5bac1; font-size: .71rem; line-height: 1.45; }
.recent-activity > p a { color: #00a8fc !important; text-decoration: none !important; }
.recent-placeholder { display: flex; align-items: center; gap: .7rem; padding: .65rem .75rem; border: 1px solid #3f4147; border-radius: .7rem; background: #2b2d31; }
.recent-game-icon { display: grid; place-items: center; width: 51px; height: 51px; flex: 0 0 51px; transform: rotate(-7deg); background: linear-gradient(145deg, #e7edf6, #8fa6bc); color: #232428; }
.recent-game-icon svg { width: 28px; height: 28px; fill: currentColor; }
.recent-placeholder h4 { margin: 0; color: #f2f3f5; font-size: .77rem; }
.recent-placeholder p { margin: .15rem 0 0; color: #b5bac1; font-size: .67rem; line-height: 1.4; }
.guild-card { grid-column: 1 / -1; min-width: 0; padding: 1rem 1.15rem .9rem; border-radius: .9rem; transition: border-color 260ms ease, box-shadow 320ms ease, transform 320ms cubic-bezier(.16,1,.3,1); }
.guild-card:hover { border-color: #5865f2; box-shadow: 0 10px 26px rgba(0,0,0,.12); transform: translateY(-2px); }
.guild-topline { display: flex; align-items: center; gap: .8rem; min-width: 0; }
.guild-brand-mark { display: grid; place-items: center; flex: 0 0 48px; width: 48px; height: 48px; overflow: hidden; border: 1px solid #3f4147; border-radius: .8rem; background: #2b2d31; }
.guild-brand-mark img { display: block; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
.guild-heading-copy { min-width: 0; flex: 1; }
.guild-heading-copy h3 { margin: .15rem 0 .22rem; color: #f2f3f5; font-size: 1rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.35; }
.guild-heading-copy p { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem; margin: 0; color: #b5bac1; font-size: .7rem; }
.guild-heading-copy p strong { color: #f2f3f5; font-weight: 800; }
.guild-heading-divider { color: #949ba4; }
.guild-online-dot { width: .43rem; height: .43rem; border-radius: 50%; background: #23a55a; box-shadow: 0 0 0 3px rgba(35,165,90,.1); }
.detail-label { display: block; color: #949ba4; font-size: .59rem; font-weight: 850; letter-spacing: .13em; }
.guild-join-link { display: inline-flex; align-items: center; gap: .4rem; flex: 0 0 auto; padding: .5rem .68rem; border: 1px solid #3f4147; border-radius: .55rem; color: #f2f3f5 !important; font-size: .7rem; font-weight: 750; text-decoration: none !important; transition: border-color 200ms ease, background-color 200ms ease, transform 200ms ease; }
.guild-join-link svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; transition: transform 200ms ease; }
.guild-join-link:hover { transform: translateY(-1px); border-color: #5865f2; background: #2b2d31; }
.guild-join-link:hover svg { transform: translate(2px,-2px); }
.guild-divider { height: 1px; margin: .9rem 0; background: #3f4147; }
.guild-columns { display: grid; grid-template-columns: minmax(155px, .72fr) minmax(0, 1.28fr); gap: 1.25rem; }
.guild-channels h4, .guild-members h4 { display: flex; align-items: center; gap: .42rem; margin: 0 0 .65rem; color: #949ba4; font-size: .6rem; font-weight: 850; letter-spacing: .11em; }
.guild-channels h4 > svg, .guild-members h4 > svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.section-count { display: inline-grid; place-items: center; min-width: 1.15rem; height: 1.15rem; padding-inline: .2rem; border-radius: .36rem; background: #2b2d31; color: #dbdee1; font-size: .6rem; letter-spacing: 0; }
.channel-list { display: flex; flex-wrap: wrap; gap: .4rem; }
.channel-pill { display: inline-flex; align-items: center; gap: .36rem; padding: .43rem .55rem; border: 1px solid #3f4147; border-radius: .55rem; background: #2b2d31; color: #dbdee1; font-size: .72rem; transition: border-color 200ms ease, transform 200ms ease; }
.channel-pill:hover { transform: translateY(-1px); border-color: #5865f2; }
.channel-pill > span { color: #949ba4; font-size: .9rem; font-weight: 800; }
.channel-pill > svg { width: 12px; height: 12px; margin-left: .12rem; fill: none; stroke: #949ba4; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.member-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem .85rem; }
.guild-member { display: flex; align-items: center; gap: .5rem; min-width: 0; }
.member-avatar-wrap { position: relative; flex: 0 0 32px; width: 32px; height: 32px; }
.member-avatar-wrap img, .member-avatar-fallback { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.member-avatar-fallback { background: #2b2d31; color: #dbdee1; font-size: .72rem; font-weight: 800; }
.member-status-dot { position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px; border: 2px solid #232428; border-radius: 50%; background: #23a55a; }
.member-status-dot[data-status="idle"] { background: #f0b232; }
.member-status-dot[data-status="dnd"] { background: #f23f43; }
.member-name { min-width: 0; overflow: hidden; color: #dbdee1; font-size: .75rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.member-game { flex: 0 0 auto; max-width: 34%; overflow: hidden; color: #949ba4; font-size: .64rem; text-overflow: ellipsis; white-space: nowrap; }
.guild-muted { margin: .3rem 0 0; color: #949ba4; font-size: .7rem; }
.guild-bottomline { display: flex; align-items: center; justify-content: space-between; gap: .7rem; margin-top: .95rem; padding-top: .75rem; border-top: 1px solid #3f4147; }
.guild-bottomline p { display: flex; align-items: center; gap: .4rem; margin: 0; color: #949ba4; font-size: .65rem; }
.guild-bottomline p > svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.7; }
.guild-server-id { color: #949ba4; font-size: .55rem; font-weight: 850; letter-spacing: .12em; }
.loading-dot { width: .4rem; height: .4rem; border-radius: 50%; background: #23a55a; animation: status-pulse 1.8s ease-out infinite; }
.activity-loading { display: flex; align-items: center; gap: .85rem; padding: 1.2rem; color: #dbdee1; }
.loading-spinner { width: 24px; height: 24px; flex: 0 0 24px; border: 2px solid #3f4147; border-top-color: #5865f2; border-radius: 50%; animation: spin .9s linear infinite; }
.activity-loading span:last-child { display: flex; flex-direction: column; gap: .2rem; }
.activity-loading strong { color: #f2f3f5; font-size: .83rem; }
.activity-loading small { color: #949ba4; font-size: .7rem; }

@keyframes activity-enter { from { opacity: 0; transform: translateY(12px) scale(.995); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes bubble-appear { from { opacity: 0; transform: translateX(-6px) scale(.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes status-pulse { 0% { opacity: .65; transform: scale(.75); } 100% { opacity: 0; transform: scale(1.8); } }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .activity-layout { grid-template-columns: minmax(0, 1fr); }
  .profile-card { min-height: 0; }
  .profile-content { padding-inline: 1.2rem; }
  .profile-main { gap: .9rem; }
  .profile-banner { min-height: 150px; }
  .activity-pane { padding: 1rem; }
  .activity-artwork { width: 112px; height: 112px; flex-basis: 112px; }
  .guild-card { grid-column: auto; }
}
@media (max-width: 560px) {
  .my-activity { margin: 2rem 0 2.4rem; padding: .7rem; border-radius: 1rem; }
  .activity-heading { align-items: flex-start; flex-direction: column; gap: .8rem; }
  .activity-actions { width: 100%; }
  .join-server { min-height: 40px; flex: 1; padding: .6rem .7rem; font-size: .76rem; }
  .copy-server { width: 40px; height: 40px; }
  .profile-banner { min-height: 118px; }
  .profile-content { padding: 0 .85rem .9rem; }
  .profile-avatar-line { align-items: flex-end; gap: .55rem; margin-top: -65px; }
  .avatar-wrap { flex-basis: 104px; width: 104px; height: 104px; padding: 5px; border-width: 6px; }
  .presence-orb { right: 1px; bottom: 2px; width: 21px; height: 21px; }
  .profile-custom-status { max-width: calc(100% - 94px); margin-bottom: .8rem; padding: .48rem .55rem; font-size: .7rem; }
  .profile-main { gap: .85rem; padding-top: .7rem; }
  .identity-name-line h3 { font-size: 1.45rem; }
  .profile-activity-icons { gap: .2rem; }
  .mini-activity-icon, .mini-activity-count { width: 26px; height: 26px; }
  .mini-activity-icon svg { width: 16px; height: 16px; }
  .profile-actions { gap: .38rem; }
  .message-button { flex: 1; min-height: 38px; }
  .profile-icon-button { width: 38px; height: 38px; }
  .activity-pane { padding: .85rem; }
  .profile-tabs { gap: 1rem; }
  .activity-card { padding: .75rem; }
  .activity-card-content { gap: .65rem; }
  .activity-artwork { width: 86px; height: 86px; flex-basis: 86px; border-radius: .5rem; }
  .activity-track-info h4 { font-size: .78rem; }
  .activity-track-info p { font-size: .7rem; }
  .activity-progress-line { flex-wrap: wrap; gap: .35rem; font-size: .62rem; }
  .activity-progress { min-width: 50px; }
  .guild-card { padding: .85rem; }
  .guild-topline { align-items: flex-start; gap: .6rem; }
  .guild-brand-mark { flex-basis: 42px; width: 42px; height: 42px; }
  .guild-heading-copy h3 { font-size: .88rem; }
  .guild-heading-copy p { font-size: .64rem; }
  .guild-join-link { padding: .45rem; font-size: 0; }
  .guild-join-link svg { width: 17px; height: 17px; }
  .guild-columns { grid-template-columns: minmax(0, 1fr); gap: .95rem; }
  .member-list { grid-template-columns: minmax(0, 1fr); }
  .guild-bottomline { align-items: flex-start; }
  .guild-server-id { max-width: 5.5rem; text-align: right; }
}
@media (prefers-reduced-motion: reduce) {
  .my-activity *, .my-activity *::before, .my-activity *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
</style>
