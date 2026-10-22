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

type PanelId = 'profile' | 'activity' | 'community'
type ProfileTab = 'board' | 'activity' | 'wishlist'
type LayoutPreset = 'balanced' | 'profile-focus' | 'activity-focus' | 'custom'
const profileTab = ref<ProfileTab>('activity')
const panelOrder = ref<PanelId[]>(['profile', 'activity', 'community'])
const layoutPreset = ref<LayoutPreset>('balanced')
const collapsedPanels = ref<PanelId[]>([])
const draggingPanel = ref<PanelId | null>(null)
const dragOverPanel = ref<PanelId | null>(null)
const selectedPanel = ref<PanelId | null>(null)
const wishlistItems = ref<Array<{ id: string; title: string; subtitle: string; url: string; image?: string }>>([])

const layoutPresets: Array<{ id: LayoutPreset; label: string; icon: string }> = [
  { id: 'balanced', label: 'Balanced', icon: 'fa-table-columns' },
  { id: 'profile-focus', label: 'Profile wide', icon: 'fa-id-card' },
  { id: 'activity-focus', label: 'Activity wide', icon: 'fa-sliders' }
]
const isCollapsed = (id: PanelId) => collapsedPanels.value.includes(id)
function toggleCollapsed(id: PanelId) {
  collapsedPanels.value = isCollapsed(id)
    ? collapsedPanels.value.filter(panel => panel !== id)
    : [...collapsedPanels.value, id]
}
function setLayoutPreset(preset: Exclude<LayoutPreset, 'custom'>) {
  layoutPreset.value = preset
  panelOrder.value = ['profile', 'activity', 'community']
}
function startPanelDrag(id: PanelId, event: DragEvent) {
  draggingPanel.value = id
  dragOverPanel.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
}
function overPanel(id: PanelId, event: DragEvent) {
  event.preventDefault()
  dragOverPanel.value = id
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}
function dropPanel(target: PanelId, event: DragEvent) {
  event.preventDefault()
  const transferId = event.dataTransfer?.getData('text/plain') as PanelId | undefined
  const source = draggingPanel.value || transferId
  if (source && source !== target && panelOrder.value.includes(source) && panelOrder.value.includes(target)) {
    const reordered = [...panelOrder.value]
    reordered.splice(reordered.indexOf(source), 1)
    reordered.splice(reordered.indexOf(target), 0, source)
    panelOrder.value = reordered
    layoutPreset.value = 'custom'
  }
  draggingPanel.value = null
  dragOverPanel.value = null
}
function endPanelDrag() {
  draggingPanel.value = null
  dragOverPanel.value = null
}
function selectPanelForSnap(id: PanelId) {
  if (typeof window === 'undefined' || !window.matchMedia('(max-width: 900px)').matches) return
  if (!selectedPanel.value) {
    selectedPanel.value = id
    return
  }
  if (selectedPanel.value === id) {
    selectedPanel.value = null
    return
  }
  const reordered = [...panelOrder.value]
  const from = reordered.indexOf(selectedPanel.value)
  const to = reordered.indexOf(id)
  if (from >= 0 && to >= 0) {
    ;[reordered[from], reordered[to]] = [reordered[to], reordered[from]]
    panelOrder.value = reordered
    layoutPreset.value = 'custom'
  }
  selectedPanel.value = null
}
function setProfileTab(tab: ProfileTab) {
  profileTab.value = tab
}
function addCurrentTrackToWishlist() {
  const track = spotify.value
  if (!track) return
  const id = track.track_id || `${track.song || 'track'}-${track.artist || 'artist'}`
  if (wishlistItems.value.some(item => item.id === id)) return
  wishlistItems.value.unshift({
    id,
    title: track.song || 'Unknown track',
    subtitle: track.artist || 'Unknown artist',
    url: spotifyUrl.value,
    image: track.album_art_url
  })
}
function removeWishlistItem(id: string) {
  wishlistItems.value = wishlistItems.value.filter(item => item.id !== id)
}
function ensureFontAwesome() {
  if (typeof document === 'undefined' || document.getElementById('thio-font-awesome-css')) return
  const link = document.createElement('link')
  link.id = 'thio-font-awesome-css'
  link.rel = 'stylesheet'
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css'
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}
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
  ensureFontAwesome()
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
        <span class="heading-kicker"><i class="fa-solid fa-circle-nodes" aria-hidden="true"></i> DISCORD PRESENCE</span>
        <h2 id="my-activity-title">My Activity</h2>
      </div>
      <div class="activity-actions">
        <a class="join-server" :href="inviteUrl" target="_blank" rel="noopener noreferrer">
          <i class="fa-brands fa-discord" aria-hidden="true"></i>
          <span>Join server</span>
          <i class="fa-solid fa-arrow-up-right-from-square action-arrow" aria-hidden="true"></i>
        </a>
        <button class="copy-server" type="button" :class="{ 'is-copied': copiedInvite, 'is-error': copyFailed }" :aria-label="copyButtonLabel" :title="copyButtonLabel" @click="copyInviteUrl">
          <i :class="copiedInvite ? 'fa-solid fa-check' : 'fa-regular fa-copy'" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <div class="layout-toolbar" aria-label="Layout controls">
      <span class="layout-toolbar-label"><i class="fa-solid fa-grip" aria-hidden="true"></i> SNAP LAYOUT</span>
      <div class="layout-presets">
        <button
          v-for="preset in layoutPresets"
          :key="preset.id"
          type="button"
          class="layout-preset"
          :class="{ 'is-active': layoutPreset === preset.id }"
          :aria-pressed="layoutPreset === preset.id"
          @click="setLayoutPreset(preset.id as Exclude<LayoutPreset, 'custom'>); selectedPanel = null"
        >
          <i class="fa-solid" :class="preset.icon" aria-hidden="true"></i>
          <span>{{ preset.label }}</span>
        </button>
        <span v-if="layoutPreset === 'custom'" class="custom-layout-note"><i class="fa-solid fa-check" aria-hidden="true"></i> Custom snapped layout</span>
      </div>
      <span class="drag-hint"><i class="fa-solid fa-arrow-pointer" aria-hidden="true"></i>{{ selectedPanel ? 'Tap another panel grip to swap' : 'Drag to snap · tap two grips on mobile' }}</span>
    </div>

    <div class="activity-layout" :class="'layout-' + layoutPreset">
      <article
        class="profile-card panel-window activity-reveal"
        :class="{ 'is-dragging': draggingPanel === 'profile', 'is-drop-target': dragOverPanel === 'profile', 'is-selected-for-snap': selectedPanel === 'profile', 'is-collapsed': isCollapsed('profile') }"
        :style="{ order: panelOrder.indexOf('profile') }"
        @dragover="overPanel('profile', $event)"
        @drop="dropPanel('profile', $event)"
      >
        <header class="window-bar">
          <span class="window-title"><i class="fa-solid fa-id-card" aria-hidden="true"></i> PROFILE</span>
          <div class="window-controls">
            <button class="drag-handle" type="button" draggable="true" aria-label="Drag profile panel to reorder" title="Drag to move · snaps into place" @dragstart="startPanelDrag('profile', $event)" @dragend="endPanelDrag" @click="selectPanelForSnap('profile')">
              <i class="fa-solid fa-grip-vertical" aria-hidden="true"></i>
            </button>
            <button class="window-control" type="button" :aria-label="isCollapsed('profile') ? 'Expand profile panel' : 'Collapse profile panel'" :title="isCollapsed('profile') ? 'Expand panel' : 'Minimize panel'" @click="toggleCollapsed('profile')">
              <i :class="isCollapsed('profile') ? 'fa-solid fa-chevron-down' : 'fa-solid fa-minus'" aria-hidden="true"></i>
            </button>
          </div>
        </header>

        <template v-if="!isCollapsed('profile')">
          <div class="profile-banner" aria-hidden="true"></div>
          <div class="profile-content">
            <div class="profile-avatar-line">
              <a class="avatar-wrap" :href="profileImage" target="_blank" rel="noopener noreferrer" aria-label="Open profile GIF">
                <img :src="profileImage" class="avatar" alt="Profile GIF" width="112" height="112" loading="lazy" />
                <span class="presence-orb" :data-status="status" :aria-label="statusLabel"></span>
              </a>
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
                  <i v-if="user?.primary_guild?.tag" class="fa-solid fa-certificate identity-verified" :aria-label="'Primary guild: ' + (user?.primary_guild?.tag || '')" role="img"></i>
                </div>
                <p class="identity-meta">
                  <span>{{ user?.username || 'thiosaputra' }}</span>
                  <span class="meta-dot">•</span><span>he</span>
                  <button v-if="user?.primary_guild?.tag" class="guild-tag" type="button" @click="copyInviteUrl" title="Copy community invite">
                    <i class="fa-solid fa-shield-halved tag-mark" aria-hidden="true"></i>{{ user.primary_guild.tag }}<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
                  </button>
                </p>
              </div>

              <div class="profile-activity-icons" aria-label="Presence indicators">
                <span class="mini-activity-icon" :title="platformLabel"><i :class="presence?.active_on_discord_mobile ? 'fa-solid fa-mobile-screen-button' : presence?.active_on_discord_web ? 'fa-solid fa-globe' : 'fa-solid fa-desktop'" aria-hidden="true"></i></span>
                <span class="mini-activity-icon" title="Discord presence"><i class="fa-brands fa-discord" aria-hidden="true"></i></span>
                <span class="mini-activity-icon" :class="{ 'is-active': spotify }" title="Spotify"><i class="fa-brands fa-spotify" aria-hidden="true"></i></span>
                <span class="mini-activity-icon" :class="{ 'is-active': currentActivity }" title="Rich Presence"><i class="fa-solid fa-heart" aria-hidden="true"></i></span>
                <span class="mini-activity-count">+1</span>
              </div>

              <div class="profile-actions">
                <a class="message-button" href="https://discord.com/users/776722084030054421" target="_blank" rel="noopener noreferrer">
                  <i class="fa-solid fa-comment-dots" aria-hidden="true"></i> Message
                </a>
                <a class="profile-icon-button" :href="inviteUrl" target="_blank" rel="noopener noreferrer" aria-label="Join community server" title="Join community server">
                  <i class="fa-solid fa-store" aria-hidden="true"></i>
                </a>
                <button class="profile-icon-button" type="button" :aria-label="copyButtonLabel" :title="copyButtonLabel" @click="copyInviteUrl">
                  <i :class="copiedInvite ? 'fa-solid fa-check' : 'fa-solid fa-ellipsis'" aria-hidden="true"></i>
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
                  <span class="connection-icon"><i class="fa-solid fa-globe" aria-hidden="true"></i></span>
                  <span>thio.cc.cd</span><i class="fa-solid fa-arrow-up-right-from-square connection-out" aria-hidden="true"></i>
                </a>
                <a href="https://github.com/flessan" target="_blank" rel="noopener noreferrer" class="connection-item">
                  <span class="connection-icon github-connection"><i class="fa-brands fa-github" aria-hidden="true"></i></span>
                  <span>Flessan on GitHub</span><i class="fa-solid fa-arrow-up-right-from-square connection-out" aria-hidden="true"></i>
                </a>
              </div>

              <div class="profile-presence-footer">
                <span class="presence-footer-dot" :data-status="status"></span>{{ statusLabel }} <span class="meta-dot">•</span> {{ platformLabel }}
                <span class="footer-sync"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Auto-sync</span>
              </div>
            </div>
          </div>
        </template>
      </article>

      <section
        class="activity-pane panel-window activity-reveal"
        :class="{ 'is-dragging': draggingPanel === 'activity', 'is-drop-target': dragOverPanel === 'activity', 'is-selected-for-snap': selectedPanel === 'activity', 'is-collapsed': isCollapsed('activity') }"
        :style="{ order: panelOrder.indexOf('activity'), '--reveal-delay': '90ms' }"
        aria-label="Discord activity"
        @dragover="overPanel('activity', $event)"
        @drop="dropPanel('activity', $event)"
      >
        <header class="window-bar">
          <span class="window-title"><i class="fa-solid fa-wave-square" aria-hidden="true"></i> ACTIVITY WINDOW</span>
          <div class="window-controls">
            <button class="drag-handle" type="button" draggable="true" aria-label="Drag activity panel to reorder" title="Drag to move · snaps into place" @dragstart="startPanelDrag('activity', $event)" @dragend="endPanelDrag" @click="selectPanelForSnap('activity')">
              <i class="fa-solid fa-grip-vertical" aria-hidden="true"></i>
            </button>
            <button class="window-control" type="button" :aria-label="isCollapsed('activity') ? 'Expand activity panel' : 'Collapse activity panel'" :title="isCollapsed('activity') ? 'Expand panel' : 'Minimize panel'" @click="toggleCollapsed('activity')">
              <i :class="isCollapsed('activity') ? 'fa-solid fa-chevron-down' : 'fa-solid fa-minus'" aria-hidden="true"></i>
            </button>
          </div>
        </header>

        <template v-if="!isCollapsed('activity')">
          <nav class="profile-tabs" aria-label="Profile sections">
            <button type="button" class="profile-tab" :class="{ 'is-active': profileTab === 'board' }" :aria-pressed="profileTab === 'board'" @click="setProfileTab('board')">Board</button>
            <button type="button" class="profile-tab" :class="{ 'is-active': profileTab === 'activity' }" :aria-pressed="profileTab === 'activity'" @click="setProfileTab('activity')">Activity<span v-if="spotify || currentActivity" class="tab-indicator"></span></button>
            <button type="button" class="profile-tab" :class="{ 'is-active': profileTab === 'wishlist' }" :aria-pressed="profileTab === 'wishlist'" @click="setProfileTab('wishlist')">Wishlist<span v-if="wishlistItems.length" class="wishlist-count">{{ wishlistItems.length }}</span></button>
          </nav>

          <div v-if="profileTab === 'activity'" class="tab-panel">
            <div class="activity-pane-heading">
              <h3>Current activity</h3>
              <span class="activity-refresh" :class="{ 'is-stale': unavailable }"><i class="fa-solid fa-circle" aria-hidden="true"></i>{{ unavailable ? 'Offline snapshot' : loading ? 'Syncing' : 'Live' }}</span>
            </div>

            <article class="activity-card spotify-activity">
              <div class="activity-card-heading">
                <i class="fa-brands fa-spotify activity-heading-brand" aria-hidden="true"></i>
                <span>Listening to Spotify</span><span class="spotify-tiny-mark" aria-hidden="true"><i class="fa-brands fa-spotify"></i></span>
                <i class="fa-solid fa-ellipsis activity-more" aria-hidden="true"></i>
              </div>
              <template v-if="spotify">
                <a class="activity-card-content" :href="spotifyUrl" target="_blank" rel="noopener noreferrer" :aria-label="'Open ' + spotify.song + ' in Spotify'">
                  <img v-if="spotify.album_art_url" :src="spotify.album_art_url" class="activity-artwork spotify-artwork" :alt="(spotify.album || 'Album') + ' artwork'" width="126" height="126" loading="lazy" />
                  <div v-else class="activity-artwork artwork-fallback"><i class="fa-solid fa-music" aria-hidden="true"></i></div>
                  <div class="activity-track-info">
                    <h4>{{ spotify.song || 'Unknown track' }}</h4><p>{{ spotify.artist || 'Unknown artist' }}</p>
                    <div class="activity-progress-line"><span>{{ elapsedTime }}</span><div class="activity-progress"><i :style="{ width: songProgress + '%' }"></i></div><span>{{ totalTime }}</span></div>
                  </div>
                  <i class="fa-solid fa-arrow-up-right-from-square activity-card-open" aria-hidden="true"></i>
                </a>
                <div class="activity-card-actions">
                  <button type="button" class="text-action" @click="addCurrentTrackToWishlist">
                    <i :class="wishlistItems.some(item => item.id === (spotify.track_id || (spotify.song || 'track') + '-' + (spotify.artist || 'artist'))) ? 'fa-solid fa-check' : 'fa-regular fa-bookmark'" aria-hidden="true"></i>
                    {{ wishlistItems.some(item => item.id === (spotify.track_id || (spotify.song || 'track') + '-' + (spotify.artist || 'artist'))) ? 'Saved to wishlist' : 'Save track' }}
                  </button>
                  <a class="text-action" :href="spotifyUrl" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-spotify" aria-hidden="true"></i> Open Spotify</a>
                </div>
              </template>
              <div v-else class="activity-empty">
                <span class="activity-empty-icon"><i class="fa-brands fa-spotify" aria-hidden="true"></i></span>
                <div><strong>Not listening to Spotify</strong><p>When a track starts playing, it'll appear here.</p></div>
              </div>
            </article>

            <article v-if="currentActivity" class="activity-card watching-activity">
              <div class="activity-card-heading">
                <i class="fa-solid fa-eye activity-heading-brand" aria-hidden="true"></i><span>Watching</span><span class="activity-more" aria-hidden="true">···</span>
              </div>
              <div class="activity-card-content">
                <a class="watching-image-link" :href="currentActivity.buttons?.includes('My Blog') ? 'https://thio.cc.cd/blog/' : profileImage" target="_blank" rel="noopener noreferrer" aria-label="Open activity details">
                  <img :src="profileImage" class="activity-artwork watching-artwork" alt="Rich Presence activity artwork" width="126" height="126" loading="lazy" />
                </a>
                <div class="activity-track-info watching-track-info">
                  <h4>{{ currentActivity.name || 'Rich Presence' }}</h4><p>{{ currentActivity.state || currentActivity.details || 'Active on Discord' }}</p>
                  <a v-if="currentActivity.buttons?.includes('My Blog')" class="watching-link" href="https://thio.cc.cd/blog/" target="_blank" rel="noopener noreferrer">My Blog <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
                  <span class="activity-duration"><i class="fa-solid fa-display" aria-hidden="true"></i>{{ activityElapsed }}</span>
                </div>
              </div>
              <div class="activity-card-actions">
                <a v-if="currentActivity.buttons?.includes('My Blog')" class="text-action" href="https://thio.cc.cd/blog/" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-book-open" aria-hidden="true"></i> Open My Blog</a>
                <button type="button" class="text-action" @click="setProfileTab('board')"><i class="fa-solid fa-user" aria-hidden="true"></i> View profile board</button>
              </div>
            </article>
            <div class="recent-activity">
              <div class="recent-heading"><h3>Recent activity</h3><span>Last 30 days</span></div>
              <p>Past activity isn't provided by the live presence API. <a href="https://support.discord.com/" target="_blank" rel="noopener noreferrer">Learn more</a></p>
              <a class="recent-placeholder" href="https://discord.com/users/776722084030054421" target="_blank" rel="noopener noreferrer">
                <span class="recent-game-icon"><i class="fa-brands fa-discord" aria-hidden="true"></i></span>
                <span><strong>Discord activity</strong><small>Open Flessann's Discord profile</small></span><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
              </a>
            </div>
          </div>

          <div v-else-if="profileTab === 'board'" class="tab-panel board-panel">
            <div class="board-hero">
              <span class="board-symbol"><i class="fa-solid fa-satellite-dish" aria-hidden="true"></i></span>
              <span class="detail-label">FLessann's corner</span>
              <h3>Good things happen here.</h3>
              <p>I'm {{ statusLabel.toLowerCase() }} on Discord, {{ spotify ? 'listening to ' + spotify.song : 'between tracks' }}, and always building something new.</p>
            </div>
            <div class="board-stats">
              <div><i class="fa-solid fa-headphones" aria-hidden="true"></i><span><strong>{{ spotify ? 'On repeat' : 'Quiet mode' }}</strong><small>Spotify status</small></span></div>
              <div><i class="fa-solid fa-heart" aria-hidden="true"></i><span><strong>{{ currentActivity?.state || 'Just chilling' }}</strong><small>Rich presence</small></span></div>
            </div>
            <div class="board-quick-links">
              <a href="https://thio.cc.cd/blog/" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-book-open" aria-hidden="true"></i><span><strong>Read my blog</strong><small>Projects, notes & things I make</small></span><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
              <button type="button" @click="copyInviteUrl"><i class="fa-brands fa-discord" aria-hidden="true"></i><span><strong>{{ copiedInvite ? 'Invite copied!' : 'Invite me to your server' }}</strong><small>Copy the community invite link</small></span><i :class="copiedInvite ? 'fa-solid fa-check' : 'fa-regular fa-copy'" aria-hidden="true"></i></button>
            </div>
          </div>

          <div v-else class="tab-panel wishlist-panel">
            <div class="wishlist-heading"><span class="wishlist-heart"><i class="fa-solid fa-bookmark" aria-hidden="true"></i></span><div><h3>Your little collection</h3><p>Save the currently playing track to keep it in this session.</p></div></div>
            <div v-if="wishlistItems.length" class="wishlist-list">
              <article v-for="item in wishlistItems" :key="item.id" class="wishlist-item">
                <img v-if="item.image" :src="item.image" alt="" width="54" height="54" />
                <span v-else class="wishlist-fallback"><i class="fa-solid fa-music" aria-hidden="true"></i></span>
                <span class="wishlist-item-copy"><strong>{{ item.title }}</strong><small>{{ item.subtitle }}</small></span>
                <a :href="item.url" target="_blank" rel="noopener noreferrer" class="wishlist-action" aria-label="Open saved track"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
                <button type="button" class="wishlist-action" aria-label="Remove from wishlist" @click="removeWishlistItem(item.id)"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
              </article>
            </div>
            <div v-else class="wishlist-empty"><i class="fa-regular fa-bookmark" aria-hidden="true"></i><h4>Nothing saved yet</h4><p>When a track is playing, tap Save track to add it here.</p><button type="button" class="primary-action" :disabled="!spotify" @click="addCurrentTrackToWishlist"><i class="fa-solid fa-plus" aria-hidden="true"></i> Save current track</button></div>
          </div>
        </template>
      </section>

      <article
        class="guild-card panel-window activity-reveal"
        :class="{ 'is-dragging': draggingPanel === 'community', 'is-drop-target': dragOverPanel === 'community', 'is-selected-for-snap': selectedPanel === 'community', 'is-collapsed': isCollapsed('community') }"
        :style="{ order: panelOrder.indexOf('community'), '--reveal-delay': '180ms' }"
        aria-label="Discord server widget"
        @dragover="overPanel('community', $event)"
        @drop="dropPanel('community', $event)"
      >
        <header class="window-bar">
          <span class="window-title"><i class="fa-brands fa-discord" aria-hidden="true"></i> COMMUNITY SERVER</span>
          <div class="window-controls">
            <button class="drag-handle" type="button" draggable="true" aria-label="Drag community panel to reorder" title="Drag to move · snaps into place" @dragstart="startPanelDrag('community', $event)" @dragend="endPanelDrag" @click="selectPanelForSnap('community')">
              <i class="fa-solid fa-grip-vertical" aria-hidden="true"></i>
            </button>
            <button class="window-control" type="button" :aria-label="isCollapsed('community') ? 'Expand community panel' : 'Collapse community panel'" :title="isCollapsed('community') ? 'Expand panel' : 'Minimize panel'" @click="toggleCollapsed('community')">
              <i :class="isCollapsed('community') ? 'fa-solid fa-chevron-down' : 'fa-solid fa-minus'" aria-hidden="true"></i>
            </button>
          </div>
        </header>
        <template v-if="!isCollapsed('community')">
          <div class="guild-topline">
            <a class="guild-brand-mark" :href="inviteUrl" target="_blank" rel="noopener noreferrer" aria-label="Join community server"><img :src="communityImage" alt="" width="48" height="48" loading="lazy" /></a>
            <div class="guild-heading-copy">
              <span class="detail-label">COMMUNITY SERVER</span>
              <h3>{{ guild?.name || 'Thio Saputra Places' }}</h3>
              <p><span class="guild-online-dot"></span><strong>{{ activeMemberCount }}</strong> members online <span class="guild-heading-divider">/</span> hang out with the community</p>
            </div>
            <a class="guild-join-link" :href="inviteUrl" target="_blank" rel="noopener noreferrer">Join community <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
          </div>
          <div class="guild-divider"></div>
          <div class="guild-columns">
            <div class="guild-channels">
              <h4><i class="fa-solid fa-hashtag" aria-hidden="true"></i> CHANNELS <span class="section-count">{{ sortedChannels.length }}</span></h4>
              <div v-if="sortedChannels.length" class="channel-list">
                <a v-for="channel in sortedChannels" :key="channel.id" class="channel-pill" :href="'https://discord.com/channels/' + (guild?.id || '1435463197418192906') + '/' + channel.id" target="_blank" rel="noopener noreferrer">
                  <i class="fa-solid fa-hashtag" aria-hidden="true"></i>{{ channel.name }}<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                </a>
              </div>
              <p v-else class="guild-muted">{{ guildLoading ? 'Loading channels…' : 'No public channels available.' }}</p>
            </div>
            <div class="guild-members">
              <h4><i class="fa-solid fa-users" aria-hidden="true"></i> AROUND RIGHT NOW <span class="section-count">{{ activeMembers.length }}</span></h4>
              <div v-if="activeMembers.length" class="member-list">
                <a v-for="member in activeMembers" :key="member.id" class="guild-member" :class="{ 'member-is-link': member.id.length > 10 }" :href="member.id.length > 10 ? 'https://discord.com/users/' + member.id : undefined" :aria-label="member.id.length > 10 ? 'Open Discord profile for ' + member.username : undefined" :target="member.id.length > 10 ? '_blank' : undefined" :rel="member.id.length > 10 ? 'noopener noreferrer' : undefined">
                  <span class="member-avatar-wrap">
                    <img v-if="member.avatar_url" :src="member.avatar_url" alt="" width="32" height="32" loading="lazy" />
                    <span v-else class="member-avatar-fallback">{{ (member.username || '?').slice(0, 1).toUpperCase() }}</span>
                    <span class="member-status-dot" :data-status="member.status || 'online'"></span>
                  </span>
                  <span class="member-name">{{ member.username }}</span><span v-if="member.game?.name" class="member-game">{{ member.game.name }}</span>
                </a>
              </div>
              <p v-else class="guild-muted">{{ guildLoading ? 'Finding members…' : 'No members to show right now.' }}</p>
            </div>
          </div>
          <div class="guild-bottomline">
            <p v-if="guildUnavailable"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Showing the latest available server snapshot.</p>
            <p v-else-if="guildLoading"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Connecting to Discord server widget…</p>
            <p v-else><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Server widget syncs automatically</p>
            <button class="text-action copy-inline-action" type="button" @click="copyInviteUrl"><i :class="copiedInvite ? 'fa-solid fa-check' : 'fa-regular fa-copy'" aria-hidden="true"></i> {{ copiedInvite ? 'Copied' : 'Copy invite' }}</button>
          </div>
        </template>
      </article>
    </div>
  </section>
</template>

<style scoped>
.my-activity {
  --discord-bg: #1e1f22;
  --discord-panel: #232428;
  --discord-card: #2b2d31;
  --discord-card-hover: #303238;
  --discord-border: #3f4147;
  --discord-text: #f2f3f5;
  --discord-text-soft: #dbdee1;
  --discord-muted: #949ba4;
  --discord-blue: #5865f2;
  margin: 2.5rem 0 3rem;
  padding: clamp(.75rem, 2vw, 1.25rem);
  overflow: hidden;
  border: 1px solid var(--discord-border);
  border-radius: 1.1rem;
  background: var(--discord-bg);
  color: var(--discord-text-soft);
  box-shadow: 0 18px 50px rgba(0,0,0,.13);
}
.my-activity :deep(i) { line-height: 1; }
.activity-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .85rem; }
.heading-copy { min-width: 0; }
.heading-kicker { display: flex; align-items: center; gap: .45rem; margin-bottom: .25rem; color: var(--discord-muted); font-size: .61rem; font-weight: 800; letter-spacing: .13em; }
.heading-kicker i { color: #8490ff; }
.activity-heading h2 { margin: 0 !important; padding: 0 !important; border: 0 !important; color: var(--discord-text); font-size: clamp(1.35rem, 3vw, 1.75rem); font-weight: 800; letter-spacing: -.05em; line-height: 1.15; }
.activity-actions { display: inline-flex; align-items: center; gap: .4rem; flex: 0 0 auto; }
.join-server { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 39px; padding: .56rem .75rem; border: 1px solid #4752c4; border-radius: .58rem; background: var(--discord-blue); color: #fff !important; font-size: .77rem; font-weight: 750; text-decoration: none !important; transition: transform 200ms ease, box-shadow 230ms ease, background-color 200ms ease; }
.join-server i { font-size: .95rem; }
.join-server:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(88,101,242,.24); background: #4752c4; }
.action-arrow { transition: transform 200ms ease; }
.join-server:hover .action-arrow { transform: translate(2px,-2px); }
.copy-server { display: grid; place-items: center; width: 39px; height: 39px; flex: 0 0 39px; padding: 0; border: 1px solid var(--discord-border); border-radius: .58rem; background: var(--discord-card); color: var(--discord-text-soft); cursor: pointer; transition: all 180ms ease; }
.copy-server:hover { transform: translateY(-1px); border-color: var(--discord-blue); background: var(--discord-card-hover); }
.copy-server.is-copied { border-color: #23a55a; color: #23a55a; }
.copy-server.is-error { border-color: #f23f43; color: #f23f43; }
.layout-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: .6rem 1rem; margin: 0 0 .9rem; padding: .55rem .65rem; border: 1px solid var(--discord-border); border-radius: .68rem; background: var(--discord-panel); }
.layout-toolbar-label { display: inline-flex; align-items: center; gap: .38rem; color: var(--discord-muted); font-size: .57rem; font-weight: 850; letter-spacing: .11em; white-space: nowrap; }
.layout-toolbar-label i { color: #8490ff; }
.layout-presets { display: flex; align-items: center; flex-wrap: wrap; gap: .28rem; }
.layout-preset { display: inline-flex; align-items: center; gap: .35rem; min-height: 28px; padding: .3rem .48rem; border: 1px solid transparent; border-radius: .42rem; background: transparent; color: var(--discord-muted); font: inherit; font-size: .65rem; cursor: pointer; transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease; }
.layout-preset:hover { color: var(--discord-text); background: var(--discord-card); }
.layout-preset.is-active { border-color: rgba(88,101,242,.42); background: rgba(88,101,242,.16); color: #c8ceff; }
.custom-layout-note { display: inline-flex; align-items: center; gap: .3rem; color: #23a55a; font-size: .61rem; }
.drag-hint { display: inline-flex; align-items: center; gap: .38rem; margin-left: auto; color: var(--discord-muted); font-size: .61rem; }
.activity-layout { display: grid; grid-template-columns: minmax(0, .96fr) minmax(0, 1.04fr); align-items: start; gap: .8rem; }
.activity-layout.layout-profile-focus { grid-template-columns: minmax(0, 1.18fr) minmax(0, .82fr); }
.activity-layout.layout-activity-focus { grid-template-columns: minmax(0, .78fr) minmax(0, 1.22fr); }
.activity-layout.layout-custom { grid-template-columns: minmax(0, .96fr) minmax(0, 1.04fr); }
.panel-window { min-width: 0; overflow: hidden; border: 1px solid var(--discord-border); border-radius: .88rem; background: var(--discord-panel); transition: border-color 180ms ease, box-shadow 200ms ease, opacity 200ms ease, transform 200ms ease; }
.panel-window:hover { border-color: #50525a; }
.panel-window.is-dragging { opacity: .42; transform: scale(.985); }
.panel-window.is-drop-target { border-color: #8490ff; box-shadow: 0 0 0 2px rgba(88,101,242,.22), 0 12px 30px rgba(0,0,0,.18); }
.panel-window.is-selected-for-snap { border-color: #8490ff; border-style: dashed; box-shadow: 0 0 0 2px rgba(88,101,242,.15); }
.panel-window.is-collapsed { align-self: start; }
.window-bar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; min-height: 36px; padding: .35rem .6rem .35rem .78rem; border-bottom: 1px solid var(--discord-border); background: #202125; }
.window-title { display: flex; align-items: center; gap: .42rem; color: var(--discord-muted); font-size: .57rem; font-weight: 850; letter-spacing: .12em; }
.window-title i { color: #8490ff; font-size: .72rem; }
.window-controls { display: inline-flex; align-items: center; gap: .25rem; }
.drag-handle, .window-control { display: grid; place-items: center; width: 27px; height: 25px; padding: 0; border: 1px solid transparent; border-radius: .36rem; background: transparent; color: var(--discord-muted); cursor: pointer; transition: all 160ms ease; }
.drag-handle { cursor: grab; }
.drag-handle:active { cursor: grabbing; }
.drag-handle:hover, .window-control:hover { border-color: var(--discord-border); background: var(--discord-card); color: var(--discord-text); }
.window-control:hover { color: #f0b232; }
.drag-handle i { font-size: .8rem; }
.profile-banner { position: relative; min-height: 168px; background: #e8f8ff; overflow: hidden; }
.profile-banner::after { position: absolute; right: 1.3rem; top: 1.1rem; width: 84px; height: 84px; border: 1px solid rgba(64,156,201,.12); border-radius: 50%; background: rgba(255,255,255,.12); content: ""; }
.profile-content { display: flex; flex: 1; flex-direction: column; min-width: 0; padding: 0 1.25rem 1.1rem; }
.profile-avatar-line { position: relative; display: flex; align-items: flex-end; gap: .85rem; min-width: 0; margin-top: -82px; }
.avatar-wrap { position: relative; z-index: 1; display: block; flex: 0 0 132px; width: 132px; height: 132px; padding: 6px; border: 7px solid var(--discord-panel); border-radius: 50%; background: var(--discord-panel); box-shadow: 0 0 0 1px rgba(255,255,255,.05); }
.avatar { display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.presence-orb { position: absolute; right: 3px; bottom: 5px; width: 24px; height: 24px; border: 4px solid var(--discord-panel); border-radius: 50%; background: #80848e; }
.presence-orb[data-status="online"] { background: #23a55a; }
.presence-orb[data-status="idle"] { background: #f0b232; }
.presence-orb[data-status="dnd"] { background: #f23f43; }
.profile-custom-status { position: relative; display: flex; align-items: center; gap: .38rem; max-width: calc(100% - 125px); min-width: 0; margin-bottom: 1.15rem; padding: .58rem .68rem; border: 1px solid #1a1b1e; border-radius: 999px; background: var(--discord-card); color: var(--discord-text); font-size: .76rem; box-shadow: 0 4px 13px rgba(0,0,0,.08); animation: bubble-appear 650ms cubic-bezier(.16,1,.3,1) both; }
.profile-custom-status > span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-emoji { flex: 0 0 auto; font-size: 1rem; }
.status-bubble-notch { position: absolute; left: -5px; bottom: 12px; width: 10px; height: 10px; border-left: 1px solid #1a1b1e; border-bottom: 1px solid #1a1b1e; background: var(--discord-card); transform: rotate(45deg); }
.profile-main { display: flex; flex-direction: column; gap: 1rem; padding: .65rem .1rem 0; }
.profile-name-block { min-width: 0; }
.identity-name-line { display: flex; align-items: center; gap: .42rem; min-width: 0; }
.identity-name-line h3 { margin: 0; overflow-wrap: anywhere; color: var(--discord-text); font-size: clamp(1.45rem, 2.6vw, 1.85rem); font-weight: 800; letter-spacing: -.045em; line-height: 1.18; }
.identity-verified { color: #5865f2; font-size: 1rem; }
.identity-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; margin: .45rem 0 0; color: var(--discord-text-soft); font-size: .83rem; }
.meta-dot { color: var(--discord-muted); }
.guild-tag { display: inline-flex; align-items: center; gap: .34rem; padding: .27rem .43rem; border: 1px solid var(--discord-border); border-radius: .45rem; background: var(--discord-card); color: var(--discord-text-soft); font: inherit; font-size: .68rem; font-weight: 750; cursor: pointer; }
.guild-tag:hover { border-color: var(--discord-blue); }
.tag-mark { color: #58c6ff; }
.guild-tag .fa-chevron-down { font-size: .6rem; }
.profile-activity-icons { display: flex; align-items: center; flex-wrap: wrap; gap: .24rem; }
.mini-activity-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: .43rem; background: var(--discord-card); color: #58c6ff; transition: transform 220ms ease, background-color 220ms ease; }
.mini-activity-icon i { font-size: .94rem; }
.mini-activity-icon:hover { transform: translateY(-2px); background: #35373d; }
.mini-activity-icon.is-active { color: #f2f3f5; background: #41434a; }
.mini-activity-count { display: grid; place-items: center; height: 28px; padding: 0 .45rem; border-radius: .43rem; background: var(--discord-card); color: var(--discord-text-soft); font-size: .72rem; font-weight: 750; }
.profile-actions { display: flex; align-items: center; gap: .5rem; }
.message-button { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; min-height: 39px; padding: .6rem .8rem; border: 1px solid #4752c4; border-radius: .55rem; background: var(--discord-blue); color: #fff !important; font-size: .78rem; font-weight: 750; text-decoration: none !important; transition: transform 200ms ease, background-color 200ms ease; }
.message-button:hover { transform: translateY(-1px); background: #4752c4; }
.profile-icon-button { display: grid; place-items: center; width: 39px; height: 39px; padding: 0; border: 1px solid var(--discord-border); border-radius: .55rem; background: var(--discord-card); color: var(--discord-text-soft); cursor: pointer; text-decoration: none !important; transition: transform 200ms ease, border-color 200ms ease, background-color 200ms ease; }
.profile-icon-button:hover { transform: translateY(-1px); border-color: var(--discord-blue); background: #35373d; }
.profile-bio { padding-top: .2rem; }
.profile-section-label { display: block; margin-bottom: .38rem; color: #b5bac1; font-size: .72rem; font-weight: 550; }
.profile-bio p { margin: .2rem 0; color: var(--discord-text-soft); font-size: .83rem; line-height: 1.5; overflow-wrap: anywhere; }
.profile-bio a { color: #00a8fc !important; text-decoration: none !important; }
.profile-bio a:hover { text-decoration: underline !important; }
.profile-detail-block { padding-top: .25rem; }
.profile-detail-block > p { margin: .45rem 0 0; color: var(--discord-text-soft); font-size: .82rem; }
.connections { padding-top: .05rem; }
.connection-item { display: flex; align-items: center; gap: .55rem; max-width: 100%; margin-top: .45rem; padding: .45rem .5rem; border: 1px solid var(--discord-border); border-radius: .6rem; color: var(--discord-text-soft) !important; text-decoration: none !important; transition: background-color 200ms ease, border-color 200ms ease; }
.connection-item:hover { border-color: var(--discord-blue); background: var(--discord-card); }
.connection-icon { display: grid; place-items: center; width: 29px; height: 29px; border-radius: .48rem; background: #f2f3f5; color: #232428; }
.connection-icon i { font-size: 1rem; }
.github-connection { background: #111214; color: white; }
.connection-out { margin-left: auto; color: var(--discord-muted); font-size: .75rem; }
.profile-presence-footer { display: flex; align-items: center; flex-wrap: wrap; gap: .4rem; margin-top: auto; padding-top: 1.15rem; color: var(--discord-muted); font-size: .66rem; }
.presence-footer-dot { width: .45rem; height: .45rem; border-radius: 50%; background: #80848e; }
.presence-footer-dot[data-status="online"] { background: #23a55a; }
.presence-footer-dot[data-status="idle"] { background: #f0b232; }
.presence-footer-dot[data-status="dnd"] { background: #f23f43; }
.footer-sync { display: inline-flex; align-items: center; gap: .3rem; margin-left: auto; }

.activity-pane { min-width: 0; }
.profile-tabs { display: flex; align-items: stretch; gap: 1.25rem; min-height: 43px; margin: .1rem .95rem 0; border-bottom: 1px solid var(--discord-border); }
.profile-tab { position: relative; display: inline-flex; align-items: center; gap: .35rem; padding: .1rem 0 .8rem; border: 0; background: transparent; color: #b5bac1; font: inherit; font-size: .8rem; font-weight: 750; cursor: pointer; white-space: nowrap; }
.profile-tab:hover { color: var(--discord-text); }
.profile-tab.is-active { color: var(--discord-text); }
.profile-tab.is-active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; border-radius: 2px; background: var(--discord-text); content: ""; animation: tab-line 220ms ease both; }
.tab-indicator { width: .35rem; height: .35rem; border-radius: 50%; background: #23a55a; }
.wishlist-count { display: grid; place-items: center; min-width: 17px; height: 17px; padding-inline: .2rem; border-radius: 99px; background: var(--discord-blue); color: white; font-size: .58rem; }
.tab-panel { padding: .1rem .95rem 1rem; animation: tab-enter 250ms ease both; }
.activity-pane-heading { display: flex; align-items: center; justify-content: space-between; gap: .8rem; margin: 1.05rem 0 .65rem; }
.activity-pane-heading h3, .recent-heading h3 { margin: 0; color: #b5bac1; font-size: .77rem; font-weight: 550; }
.activity-refresh { display: inline-flex; align-items: center; gap: .35rem; color: #23a55a; font-size: .6rem; font-weight: 750; text-transform: uppercase; letter-spacing: .08em; }
.activity-refresh i { font-size: .4rem; animation: status-pulse 1.8s ease-out infinite; }
.activity-refresh.is-stale { color: var(--discord-muted); }
.activity-card { overflow: hidden; margin-top: .65rem; padding: .85rem .9rem .65rem; border: 1px solid transparent; border-radius: .8rem; background: var(--discord-card); transition: border-color 230ms ease, transform 250ms ease, background-color 230ms ease; }
.activity-card:hover { transform: translateY(-1px); border-color: #41434a; background: var(--discord-card-hover); }
.activity-card-heading { display: flex; align-items: center; gap: .45rem; min-width: 0; margin-bottom: .65rem; color: var(--discord-text); font-size: .73rem; font-weight: 600; }
.activity-heading-brand { color: #dbdee1; font-size: .95rem; }
.spotify-tiny-mark { display: grid; place-items: center; width: 13px; height: 13px; margin-left: -.2rem; border-radius: 50%; background: #1db954; color: #12341e; font-size: .48rem; }
.activity-more { margin-left: auto; color: #b5bac1; font-size: .95rem; }
.activity-card-content { display: flex; align-items: center; gap: .8rem; min-width: 0; color: inherit; text-decoration: none !important; }
.activity-artwork { display: block; width: clamp(76px, 8.4vw, 126px); height: clamp(76px, 8.4vw, 126px); flex: 0 0 clamp(76px, 8.4vw, 126px); overflow: hidden; border-radius: .55rem; object-fit: cover; background: var(--discord-bg); }
.spotify-artwork, .watching-artwork { transition: transform 400ms cubic-bezier(.16,1,.3,1); }
.activity-card:hover .spotify-artwork, .watching-activity:hover .watching-artwork { transform: scale(1.025); }
.artwork-fallback { display: grid; place-items: center; color: #1db954; font-size: 2rem; }
.activity-track-info { flex: 1; min-width: 0; }
.activity-track-info h4 { margin: 0 0 .22rem; color: var(--discord-text); font-size: .86rem; font-weight: 750; letter-spacing: -.015em; line-height: 1.35; overflow-wrap: anywhere; }
.activity-track-info p { margin: 0; color: var(--discord-text-soft); font-size: .75rem; line-height: 1.4; overflow-wrap: anywhere; }
.activity-progress-line { display: flex; align-items: center; gap: .5rem; margin-top: .55rem; color: var(--discord-text-soft); font-size: .68rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.activity-progress { height: 3px; flex: 1; min-width: 20px; overflow: hidden; border-radius: 99px; background: #41434a; }
.activity-progress i { display: block; height: 100%; border-radius: inherit; background: var(--discord-text); transition: width 800ms linear; }
.activity-card-open { align-self: flex-start; color: var(--discord-muted); font-size: .72rem; }
.activity-card-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: .5rem; margin-top: .7rem; padding-top: .55rem; border-top: 1px solid rgba(255,255,255,.035); }
.text-action { display: inline-flex; align-items: center; gap: .35rem; padding: .25rem 0; border: 0; background: transparent; color: #b5bac1; font: inherit; font-size: .67rem; cursor: pointer; text-decoration: none !important; transition: color 180ms ease; }
.text-action:hover { color: var(--discord-text); }
.text-action i { font-size: .72rem; }
.activity-empty { display: flex; align-items: center; gap: .7rem; padding: .6rem 0 .1rem; }
.activity-empty-icon { display: grid; place-items: center; width: 45px; height: 45px; border-radius: .6rem; background: var(--discord-bg); color: #1db954; font-size: 1.3rem; }
.activity-empty strong { color: var(--discord-text); font-size: .78rem; }
.activity-empty p, .activity-card-empty p { margin: .2rem 0 0; color: #b5bac1; font-size: .7rem; }
.watching-type-icon { color: var(--discord-text-soft); }
.watching-type-icon i { font-size: .95rem; }
.watching-image-link { flex: 0 0 auto; }
.watching-link { display: inline-flex; align-items: center; gap: .3rem; margin-top: .35rem; color: #00a8fc !important; font-size: .66rem; text-decoration: none !important; }
.watching-link:hover { text-decoration: underline !important; }
.activity-duration { display: flex; align-items: center; gap: .35rem; margin-top: .35rem; color: #23a55a; font-size: .7rem; font-variant-numeric: tabular-nums; }
.activity-duration i { font-size: .65rem; }
.recent-activity { margin-top: 1.2rem; }
.recent-heading { display: flex; align-items: center; justify-content: space-between; gap: .7rem; }
.recent-heading span { color: var(--discord-muted); font-size: .61rem; }
.recent-activity > p { margin: .35rem 0 .7rem; color: #b5bac1; font-size: .71rem; line-height: 1.45; }
.recent-activity > p a { color: #00a8fc !important; text-decoration: none !important; }
.recent-placeholder { display: flex; align-items: center; gap: .7rem; padding: .65rem .75rem; border: 1px solid var(--discord-border); border-radius: .7rem; background: var(--discord-card); color: inherit; text-decoration: none !important; transition: background-color 200ms ease, transform 200ms ease; }
.recent-placeholder:hover { transform: translateY(-1px); background: var(--discord-card-hover); }
.recent-game-icon { display: grid; place-items: center; width: 48px; height: 48px; flex: 0 0 48px; border-radius: .55rem; background: #c5d8e8; color: #232428; }
.recent-placeholder > span:nth-child(2) { flex: 1; min-width: 0; }
.recent-placeholder strong, .recent-placeholder small { display: block; }
.recent-placeholder strong { color: var(--discord-text); font-size: .77rem; }
.recent-placeholder small { margin-top: .15rem; color: #b5bac1; font-size: .67rem; }
.recent-placeholder > i:last-child { color: var(--discord-muted); font-size: .72rem; }

.board-hero { padding: 1.2rem 0 .9rem; }
.board-symbol { display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: .9rem; border: 1px solid rgba(88,101,242,.3); border-radius: .85rem; background: rgba(88,101,242,.16); color: #9da6ff; }
.board-symbol i { font-size: 1.25rem; }
.board-hero h3 { margin: .4rem 0; color: var(--discord-text); font-size: 1.35rem; font-weight: 800; letter-spacing: -.04em; }
.board-hero p { margin: 0; color: var(--discord-text-soft); font-size: .82rem; line-height: 1.55; }
.board-stats { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .6rem; }
.board-stats > div { display: flex; align-items: center; gap: .55rem; min-width: 0; padding: .7rem; border: 1px solid var(--discord-border); border-radius: .65rem; background: var(--discord-card); }
.board-stats > div > i { color: #9da6ff; font-size: 1rem; }
.board-stats strong, .board-stats small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board-stats strong { color: var(--discord-text); font-size: .72rem; }
.board-stats small { margin-top: .12rem; color: var(--discord-muted); font-size: .62rem; }
.board-quick-links { display: grid; gap: .45rem; margin-top: .75rem; }
.board-quick-links > a, .board-quick-links > button { display: flex; align-items: center; gap: .65rem; min-width: 0; padding: .72rem; border: 1px solid var(--discord-border); border-radius: .65rem; background: var(--discord-card); color: var(--discord-text-soft); text-align: left; text-decoration: none !important; cursor: pointer; transition: border-color 180ms ease, background-color 180ms ease; }
.board-quick-links > a:hover, .board-quick-links > button:hover { border-color: var(--discord-blue); background: var(--discord-card-hover); }
.board-quick-links > a > i:first-child, .board-quick-links > button > i:first-child { width: 18px; color: #9da6ff; text-align: center; }
.board-quick-links > a > span, .board-quick-links > button > span { flex: 1; min-width: 0; }
.board-quick-links strong, .board-quick-links small { display: block; }
.board-quick-links strong { color: var(--discord-text); font-size: .75rem; }
.board-quick-links small { margin-top: .16rem; color: var(--discord-muted); font-size: .65rem; }
.board-quick-links > a > i:last-child, .board-quick-links > button > i:last-child { color: var(--discord-muted); font-size: .72rem; }
.wishlist-heading { display: flex; align-items: center; gap: .7rem; padding: 1.1rem 0 .8rem; }
.wishlist-heart { display: grid; place-items: center; width: 42px; height: 42px; border-radius: .7rem; background: rgba(88,101,242,.16); color: #9da6ff; }
.wishlist-heading h3 { margin: 0; color: var(--discord-text); font-size: .95rem; }
.wishlist-heading p { margin: .22rem 0 0; color: var(--discord-muted); font-size: .7rem; line-height: 1.4; }
.wishlist-list { display: grid; gap: .5rem; }
.wishlist-item { display: flex; align-items: center; gap: .55rem; min-width: 0; padding: .55rem; border: 1px solid var(--discord-border); border-radius: .7rem; background: var(--discord-card); }
.wishlist-item > img, .wishlist-fallback { display: grid; place-items: center; width: 48px; height: 48px; flex: 0 0 48px; border-radius: .45rem; object-fit: cover; background: var(--discord-bg); color: #1db954; }
.wishlist-item-copy { flex: 1; min-width: 0; }
.wishlist-item-copy strong, .wishlist-item-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wishlist-item-copy strong { color: var(--discord-text); font-size: .75rem; }
.wishlist-item-copy small { margin-top: .15rem; color: var(--discord-muted); font-size: .66rem; }
.wishlist-action { display: grid; place-items: center; width: 30px; height: 30px; flex: 0 0 30px; border: 1px solid var(--discord-border); border-radius: .45rem; background: var(--discord-panel); color: var(--discord-text-soft); text-decoration: none !important; cursor: pointer; }
.wishlist-action:hover { border-color: var(--discord-blue); color: var(--discord-text); }
.wishlist-empty { display: flex; flex-direction: column; align-items: center; padding: 1.5rem .7rem; text-align: center; }
.wishlist-empty > i { color: var(--discord-muted); font-size: 1.6rem; }
.wishlist-empty h4 { margin: .6rem 0 .25rem; color: var(--discord-text); font-size: .88rem; }
.wishlist-empty p { max-width: 17rem; margin: 0; color: var(--discord-muted); font-size: .7rem; line-height: 1.45; }
.primary-action { display: inline-flex; align-items: center; gap: .4rem; margin-top: .8rem; padding: .55rem .7rem; border: 1px solid #4752c4; border-radius: .55rem; background: var(--discord-blue); color: white; font: inherit; font-size: .72rem; cursor: pointer; }
.primary-action:disabled { opacity: .45; cursor: not-allowed; }

.guild-card { grid-column: 1 / -1; align-self: start; }
.guild-topline { display: flex; align-items: center; gap: .8rem; min-width: 0; padding: .9rem 1rem 0; }
.guild-brand-mark { display: grid; place-items: center; flex: 0 0 48px; width: 48px; height: 48px; overflow: hidden; border: 1px solid var(--discord-border); border-radius: .8rem; background: var(--discord-card); }
.guild-brand-mark img { display: block; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
.guild-heading-copy { min-width: 0; flex: 1; }
.detail-label { display: block; color: var(--discord-muted); font-size: .59rem; font-weight: 850; letter-spacing: .13em; }
.guild-heading-copy h3 { margin: .15rem 0 .22rem; color: var(--discord-text); font-size: 1rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.35; }
.guild-heading-copy p { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem; margin: 0; color: #b5bac1; font-size: .7rem; }
.guild-heading-copy p strong { color: var(--discord-text); font-weight: 800; }
.guild-heading-divider { color: var(--discord-muted); }
.guild-online-dot { width: .43rem; height: .43rem; border-radius: 50%; background: #23a55a; box-shadow: 0 0 0 3px rgba(35,165,90,.1); }
.guild-join-link { display: inline-flex; align-items: center; gap: .4rem; flex: 0 0 auto; padding: .5rem .68rem; border: 1px solid var(--discord-border); border-radius: .55rem; color: var(--discord-text) !important; font-size: .7rem; font-weight: 750; text-decoration: none !important; transition: border-color 200ms ease, background-color 200ms ease, transform 200ms ease; }
.guild-join-link i { font-size: .68rem; }
.guild-join-link:hover { transform: translateY(-1px); border-color: var(--discord-blue); background: var(--discord-card); }
.guild-divider { height: 1px; margin: .9rem 1rem; background: var(--discord-border); }
.guild-columns { display: grid; grid-template-columns: minmax(155px, .72fr) minmax(0, 1.28fr); gap: 1.25rem; padding: 0 1rem; }
.guild-channels h4, .guild-members h4 { display: flex; align-items: center; gap: .42rem; margin: 0 0 .65rem; color: var(--discord-muted); font-size: .6rem; font-weight: 850; letter-spacing: .11em; }
.guild-channels h4 > i, .guild-members h4 > i { font-size: .75rem; }
.section-count { display: inline-grid; place-items: center; min-width: 1.15rem; height: 1.15rem; padding-inline: .2rem; border-radius: .36rem; background: var(--discord-card); color: var(--discord-text-soft); font-size: .6rem; letter-spacing: 0; }
.channel-list { display: flex; flex-wrap: wrap; gap: .4rem; }
.channel-pill { display: inline-flex; align-items: center; gap: .36rem; padding: .43rem .55rem; border: 1px solid var(--discord-border); border-radius: .55rem; background: var(--discord-card); color: var(--discord-text-soft); font-size: .72rem; text-decoration: none !important; transition: border-color 200ms ease, transform 200ms ease; }
.channel-pill:hover { transform: translateY(-1px); border-color: var(--discord-blue); }
.channel-pill .fa-hashtag { color: var(--discord-muted); font-size: .76rem; }
.channel-pill .fa-chevron-right { color: var(--discord-muted); font-size: .62rem; }
.member-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem .85rem; }
.guild-member { display: flex; align-items: center; gap: .5rem; min-width: 0; color: inherit; text-decoration: none !important; }
.guild-member.member-is-link { cursor: pointer; }
.guild-member.member-is-link:hover .member-name { color: white; text-decoration: underline; }
.member-avatar-wrap { position: relative; display: block; flex: 0 0 32px; width: 32px; height: 32px; }
.member-avatar-wrap img, .member-avatar-fallback { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.member-avatar-fallback { background: var(--discord-card); color: var(--discord-text-soft); font-size: .72rem; font-weight: 800; }
.member-status-dot { position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px; border: 2px solid var(--discord-panel); border-radius: 50%; background: #23a55a; }
.member-status-dot[data-status="idle"] { background: #f0b232; }
.member-status-dot[data-status="dnd"] { background: #f23f43; }
.member-name { min-width: 0; overflow: hidden; color: var(--discord-text-soft); font-size: .75rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.member-game { flex: 0 0 auto; max-width: 34%; overflow: hidden; color: var(--discord-muted); font-size: .64rem; text-overflow: ellipsis; white-space: nowrap; }
.guild-muted { margin: .3rem 0 0; color: var(--discord-muted); font-size: .7rem; }
.guild-bottomline { display: flex; align-items: center; justify-content: space-between; gap: .7rem; margin: .95rem 1rem 0; padding: .75rem 0 .85rem; border-top: 1px solid var(--discord-border); }
.guild-bottomline p { display: flex; align-items: center; gap: .4rem; margin: 0; color: var(--discord-muted); font-size: .65rem; }
.guild-bottomline p > i { color: #23a55a; }
.copy-inline-action { margin-left: auto; }

@keyframes activity-enter { from { opacity: 0; transform: translateY(12px) scale(.995); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes bubble-appear { from { opacity: 0; transform: translateX(-6px) scale(.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes status-pulse { 0% { opacity: .65; transform: scale(.75); } 100% { opacity: 0; transform: scale(1.8); } }
@keyframes tab-line { from { transform: scaleX(.2); } to { transform: scaleX(1); } }
@keyframes tab-enter { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 900px) {
  .activity-layout, .activity-layout.layout-profile-focus, .activity-layout.layout-activity-focus, .activity-layout.layout-custom { grid-template-columns: minmax(0,1fr); }
  .profile-content { padding-inline: 1.2rem; }
  .activity-pane { width: 100%; }
  .guild-card { grid-column: auto; }
  .drag-hint { display: none; }
}
@media (max-width: 560px) {
  .my-activity { margin: 2rem 0 2.4rem; padding: .65rem; border-radius: .95rem; }
  .activity-heading { align-items: flex-start; flex-direction: column; gap: .8rem; }
  .activity-actions { width: 100%; }
  .join-server { min-height: 39px; flex: 1; padding: .55rem .7rem; font-size: .76rem; }
  .copy-server { width: 39px; height: 39px; }
  .layout-toolbar { align-items: flex-start; flex-direction: column; gap: .4rem; }
  .layout-presets { width: 100%; }
  .layout-preset { flex: 1; justify-content: center; padding-inline: .3rem; font-size: .59rem; }
  .layout-preset i { display: none; }
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
  .profile-actions { gap: .38rem; }
  .message-button { flex: 1; min-height: 38px; }
  .profile-icon-button { width: 38px; height: 38px; }
  .profile-tabs { gap: .9rem; margin-inline: .75rem; }
  .profile-tab { font-size: .75rem; }
  .tab-panel { padding-inline: .75rem; }
  .activity-card { padding: .7rem; }
  .activity-card-content { gap: .55rem; }
  .activity-artwork { width: 80px; height: 80px; flex-basis: 80px; border-radius: .5rem; }
  .activity-track-info h4 { font-size: .77rem; }
  .activity-track-info p { font-size: .68rem; }
  .activity-progress-line { gap: .3rem; font-size: .59rem; }
  .activity-progress { min-width: 22px; }
  .activity-card-actions { justify-content: flex-start; }
  .board-stats { grid-template-columns: minmax(0,1fr); }
  .guild-topline { align-items: flex-start; gap: .6rem; padding-inline: .8rem; }
  .guild-heading-copy h3 { font-size: .87rem; }
  .guild-heading-copy p { font-size: .63rem; }
  .guild-join-link { padding: .45rem; font-size: 0; }
  .guild-join-link i { font-size: .85rem; }
  .guild-divider { margin-inline: .8rem; }
  .guild-columns { grid-template-columns: minmax(0,1fr); gap: .95rem; padding-inline: .8rem; }
  .member-list { grid-template-columns: minmax(0,1fr); }
  .guild-bottomline { align-items: flex-start; flex-wrap: wrap; margin-inline: .8rem; }
}
@media (prefers-reduced-motion: reduce) {
  .my-activity *, .my-activity *::before, .my-activity *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
</style>
