<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

type Activity = {
  application_id?: string | null
  assets?: { large_image?: string | null; large_text?: string | null; small_image?: string | null; small_text?: string | null }
  buttons?: string[]
  content_classification?: { data?: unknown; loaded?: boolean } | null
  created_at?: number
  details?: string | null
  emoji?: { id?: string | null; name?: string; animated?: boolean } | null
  flags?: number
  id?: string
  name?: string
  official_game_id?: string | number | null
  party?: { id?: string; [key: string]: unknown } | null
  platform?: string
  session_id?: string
  state?: string | null
  sync_id?: string
  timestamps?: { start?: number; end?: number }
  type?: number
}
type AvatarDecorationData = { asset?: string; expires_at?: number | null; sku_id?: string }
type PrimaryGuild = { badge?: string | null; identity_enabled?: boolean; identity_guild_id?: string | null; tag?: string | null }
type DiscordUser = {
  avatar?: string | null
  avatar_decoration_data?: AvatarDecorationData | null
  bot?: boolean
  collectibles?: unknown
  discriminator?: string
  display_name?: string | null
  display_name_styles?: unknown
  global_name?: string | null
  id: string
  primary_guild?: PrimaryGuild | null
  public_flags?: number
  username?: string
  vad_colors?: unknown
}
type Spotify = {
  album?: string
  album_art_url?: string
  artist?: string
  song?: string
  track_id?: string
  timestamps?: { start?: number; end?: number }
}
type Presence = {
  active_on_discord_desktop?: boolean
  active_on_discord_embedded?: boolean
  active_on_discord_mobile?: boolean
  active_on_discord_vr?: boolean
  active_on_discord_web?: boolean
  activities?: Activity[]
  discord_status?: string
  discord_user?: DiscordUser
  kv?: Record<string, string>
  listening_to_spotify?: boolean
  spotify?: Spotify | null
}
type ApiResponse = { success: boolean; data?: Presence }
type GuildChannel = { id: string; name: string; position?: number }
type GuildMember = { id: string; username: string; status?: string; avatar_url?: string | null; game?: { name?: string } }
type GuildWidget = { id: string; name: string; instant_invite?: string; channels?: GuildChannel[]; members?: GuildMember[]; presence_count?: number }

const endpoint = 'https://api.lanyard.rest/v1/users/776722084030054421'
const profileImage = 'https://c.tenor.com/ysQdVrOy6ZkAAAAd/tenor.gif'
const watchingInLoveImage = 'https://c.tenor.com/RkqInYxSNLcAAAAd/tenor.gif'
const communityImage = 'https://cdn.jsdelivr.net/gh/flessan/flessan/website/gudang/me.png'
const guildEndpoint = 'https://discord.com/api/guilds/1435463197418192906/widget.json'
const fallbackInvite = 'https://discord.com/invite/nZAMJ7BD'
const presence = ref<Presence | null>(null)
const guild = ref<GuildWidget | null>(null)
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
let lanyardSocket: WebSocket | undefined
let lanyardHeartbeatTimer: ReturnType<typeof setInterval> | undefined
let lanyardReconnectTimer: ReturnType<typeof setTimeout> | undefined
let keepLanyardSocketOpen = false

const user = computed(() => presence.value?.discord_user)
const status = computed(() => presence.value?.discord_status || 'offline')
const statusLabels: Record<string, string> = { online: 'Online', idle: 'Away', dnd: 'Do not disturb', offline: 'Offline' }
const statusLabel = computed(() => statusLabels[status.value] || 'Offline')
const activities = computed(() => presence.value?.activities || [])
const customStatus = computed(() => activities.value.find(a => a.type === 4))
const richActivities = computed(() => activities.value.filter(a => a.type !== 4 && a.name !== 'Spotify'))
const currentActivity = computed(() => richActivities.value[0] || null)
const activePlatforms = computed(() => [
  { id: 'desktop', label: 'Discord desktop', icon: 'fa-solid fa-desktop', active: Boolean(presence.value?.active_on_discord_desktop) },
  { id: 'mobile', label: 'Discord mobile', icon: 'fa-solid fa-mobile-screen-button', active: Boolean(presence.value?.active_on_discord_mobile) },
  { id: 'web', label: 'Discord web', icon: 'fa-solid fa-globe', active: Boolean(presence.value?.active_on_discord_web) },
  { id: 'embedded', label: 'Discord embedded', icon: 'fa-solid fa-window-maximize', active: Boolean(presence.value?.active_on_discord_embedded) },
  { id: 'vr', label: 'Discord VR', icon: 'fa-solid fa-vr-cardboard', active: Boolean(presence.value?.active_on_discord_vr) }
].filter(platform => platform.active))
const spotify = computed(() => {
  if (presence.value?.listening_to_spotify === false) return null
  if (presence.value?.spotify) return presence.value.spotify
  const activity = activities.value.find(item => item.name === 'Spotify')
  if (!activity) return null
  const imageKey = activity.assets?.large_image || ''
  const albumArtUrl = imageKey.startsWith('spotify:') ? `https://i.scdn.co/image/${imageKey.slice('spotify:'.length)}` : ''
  return {
    album: activity.assets?.large_text || '',
    album_art_url: albumArtUrl,
    artist: activity.state || '',
    song: activity.details || '',
    track_id: activity.sync_id || '',
    timestamps: activity.timestamps
  }
})
const profileKv = computed(() => Object.entries(presence.value?.kv || {})
  .filter(([key, value]) =>
    /^[a-zA-Z0-9_]{1,255}$/.test(key) &&
    !/secret|token|password|credential|api_?key/i.test(key) &&
    !['bio', 'pronouns'].includes(key.toLowerCase()) &&
    typeof value === 'string' &&
    Boolean(value.trim())
  )
  .slice(0, 4))
function kvLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase())
}
function kvHref(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}
function activityElapsedFor(activity?: Activity | null) {
  const started = activity?.timestamps?.start
  if (!started || now.value < started) return ''
  const elapsed = Math.floor((now.value - started) / 1000)
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
const activityElapsed = computed(() => activityElapsedFor(currentActivity.value) || '00:00')
function activityTypeLabel(activity: Activity) {
  if (activity.type === 0) return 'Playing'
  if (activity.type === 1) return 'Streaming'
  if (activity.type === 2) return 'Listening to'
  if (activity.type === 3) return 'Watching'
  if (activity.type === 4) return 'Custom status'
  if (activity.type === 5) return 'Competing'
  return activity.name || 'Activity'
}
function activityIconClass(activity: Activity) {
  if (activity.type === 0) return 'fa-solid fa-gamepad'
  if (activity.type === 1) return 'fa-solid fa-tower-broadcast'
  if (activity.type === 3) return 'fa-solid fa-eye'
  if (activity.type === 5) return 'fa-solid fa-trophy'
  return 'fa-solid fa-display'
}
function activityTitle(activity: Activity) {
  if (activity.type === 0 && activity.details) return activity.details.replace(/^Playing\s+/i, '').trim()
  if (activity.type === 3 && activity.state) return activity.state
  return activity.details || activity.state || activity.name || 'Discord activity'
}
function activitySubtitle(activity: Activity) {
  if (activity.type === 0) return activity.state || 'Playing on desktop'
  if (activity.type === 3) return activity.name || 'Discord Rich Presence'
  return activity.state || activity.assets?.large_text || ''
}
function activityFallbackImage(activity: Activity) {
  return activity.type === 3 ? watchingInLoveImage : ''
}

function activityArtworkUrl(activity: Activity) {
  // Discord's Watching activity is the "Watching in Love" card requested here.
  // Prefer this explicit GIF over the remote activity artwork in the API payload.
  if (activity.type === 3) return watchingInLoveImage
  return activityAssetUrl(activity) || activityFallbackImage(activity)
}
function activityAssetUrl(activity?: Activity | null, assetKey: 'large_image' | 'small_image' = 'large_image') {
  const raw = activity?.assets?.[assetKey]
  if (!raw) return ''

  // Lanyard/Discord external proxy assets include the original URL after
  // "mp:external/<proxy-key>/https/" (or "http/"). Use that source directly.
  if (raw.startsWith('mp:external/')) {
    const match = raw.match(/^mp:external\/[^/]+\/(https?)\/(.+)$/i)
    if (match) {
      try {
        const originalUrl = new URL(`${match[1]}://${match[2]}`)
        if (originalUrl.protocol === 'https:' || originalUrl.protocol === 'http:') {
          return originalUrl.href
        }
      } catch {
        // Fall back to Discord's media proxy if the embedded source is malformed.
      }
    }
    return `https://media.discordapp.net/external/${raw.slice('mp:external/'.length)}?width=360&height=360&quality=85`
  }

  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('spotify:')) return ''
  if (/^\d+$/.test(raw) && activity?.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${raw}.png?size=96`
  }
  return ''
}
function activityMenuKey(activity: Activity) {
  return activity.id || activity.name || 'activity'
}
function onActivityImageError(event: Event) {
  if (event.currentTarget instanceof HTMLImageElement) event.currentTarget.style.display = 'none'
}
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
const platformLabel = computed(() => activePlatforms.value.length
  ? activePlatforms.value.map(platform => platform.label.replace('Discord ', '')).join(' + ')
  : 'Discord presence')
const inviteUrl = computed(() => guild.value?.instant_invite || fallbackInvite)
const copyButtonLabel = computed(() => copiedInvite.value ? 'Tautan undangan tersalin' : copyFailed.value ? 'Gagal menyalin tautan undangan' : 'Salin tautan undangan')

// Social links template: replace URLs or add entries here when you are ready.
const socialLinks = [
  { id: 'github', label: 'GitHub', icon: 'fa-brands fa-github', url: 'https://github.com/flessan' },
  { id: 'discord', label: 'Discord', icon: 'fa-brands fa-discord', url: 'https://discord.com/users/776722084030054421' },
  { id: 'instagram', label: 'Instagram', icon: 'fa-brands fa-instagram', url: 'https://instagram.com/YOUR_USERNAME' },
  { id: 'youtube', label: 'YouTube', icon: 'fa-brands fa-youtube', url: 'https://youtube.com/@YOUR_CHANNEL' },
  { id: 'tiktok', label: 'TikTok', icon: 'fa-brands fa-tiktok', url: 'https://tiktok.com/@YOUR_USERNAME' },
  { id: 'x', label: 'X', icon: 'fa-brands fa-x-twitter', url: 'https://x.com/YOUR_USERNAME' },
  { id: 'telegram', label: 'Telegram', icon: 'fa-brands fa-telegram', url: 'https://t.me/YOUR_USERNAME' }
] as const

type ActivityMenu = string | null
const activeActivityMenu = ref<ActivityMenu>(null)
const activityMenuNotice = ref('')
const copiedProfileLink = ref(false)
let profileLinkResetTimer: ReturnType<typeof setTimeout> | undefined
let activityMenuNoticeTimer: ReturnType<typeof setTimeout> | undefined

function toggleActivityMenu(menu: Exclude<ActivityMenu, null>) {
  activeActivityMenu.value = activeActivityMenu.value === menu ? null : menu
  activityMenuNotice.value = ''
}
function closeActivityMenu() {
  activeActivityMenu.value = null
}
async function copyDiscordProfileLink() {
  copiedProfileLink.value = await writeClipboard('https://discord.com/users/776722084030054421')
  if (profileLinkResetTimer) clearTimeout(profileLinkResetTimer)
  profileLinkResetTimer = setTimeout(() => { copiedProfileLink.value = false }, 2200)
}
function handleActivityOutside(event: MouseEvent) {
  if (!(event.target instanceof Element)) return
  if (!event.target.closest('.activity-menu-wrap')) closeActivityMenu()
}
async function writeClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Continue with the compatibility fallback below.
  }
  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const success = document.execCommand('copy')
    field.remove()
    return success
  } catch {
    return false
  }
}
async function copyActivityDetails(kind: string) {
  const activity = richActivities.value.find(item => activityMenuKey(item) === kind) || currentActivity.value
  const value = kind === 'spotify'
    ? [spotify.value?.song, spotify.value?.artist, spotify.value?.album ? `Album: ${spotify.value.album}` : '', spotifyUrl.value].filter(Boolean).join(' — ')
    : [activity?.name, activity?.details, activity?.state, activity?.platform ? `Platform: ${activity.platform}` : '', activity?.timestamps?.start ? `Started: ${new Date(activity.timestamps.start).toISOString()}` : '', activity?.assets?.large_text, activity?.buttons?.join(', ')].filter(Boolean).join(' — ')
  const copied = await writeClipboard(value)
  closeActivityMenu()
  activityMenuNotice.value = copied ? 'Details copied to clipboard' : 'Could not copy details'
  if (activityMenuNoticeTimer) clearTimeout(activityMenuNoticeTimer)
  activityMenuNoticeTimer = setTimeout(() => { activityMenuNotice.value = '' }, 2400)
}

function revealPixelImage(image: HTMLImageElement) {
  if (!image.naturalWidth || !image.naturalHeight || typeof window === 'undefined') return
  const source = image.currentSrc || image.src
  if (!source || image.dataset.pixelSource === source) return

  const parent = image.parentElement
  if (!parent) return
  const rect = image.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return

  const parentStyle = window.getComputedStyle(parent)
  if (parentStyle.position === 'static') {
    parent.dataset.pixelRestorePosition = parent.style.position
    parent.style.position = 'relative'
  }

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  const outputWidth = Math.max(8, Math.round(rect.width * pixelRatio))
  const outputHeight = Math.max(8, Math.round(rect.height * pixelRatio))
  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  canvas.className = 'nes-pixel-overlay'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.left = String(rect.left - parentRect.left + parent.scrollLeft - parent.clientLeft) + 'px'
  canvas.style.top = String(rect.top - parentRect.top + parent.scrollTop - parent.clientTop) + 'px'
  canvas.style.width = String(rect.width) + 'px'
  canvas.style.height = String(rect.height) + 'px'
  canvas.style.borderRadius = window.getComputedStyle(image).borderRadius

  const context = canvas.getContext('2d')
  if (!context) {
    if (!parent.querySelector('.nes-pixel-overlay') && parent.dataset.pixelRestorePosition !== undefined) {
      parent.style.position = parent.dataset.pixelRestorePosition
      delete parent.dataset.pixelRestorePosition
    }
    return
  }

  const scratch = document.createElement('canvas')
  const scratchContext = scratch.getContext('2d')
  if (!scratchContext) {
    if (!parent.querySelector('.nes-pixel-overlay') && parent.dataset.pixelRestorePosition !== undefined) {
      parent.style.position = parent.dataset.pixelRestorePosition
      delete parent.dataset.pixelRestorePosition
    }
    return
  }

  const sourceWidth = image.naturalWidth
  const sourceHeight = image.naturalHeight
  const targetRatio = rect.width / rect.height
  const sourceRatio = sourceWidth / sourceHeight
  let cropX = 0
  let cropY = 0
  let cropWidth = sourceWidth
  let cropHeight = sourceHeight
  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio
    cropX = (sourceWidth - cropWidth) / 2
  } else {
    cropHeight = sourceWidth / targetRatio
    cropY = (sourceHeight - cropHeight) / 2
  }

  const previousVisibility = image.style.visibility
  const levels = [0.035, 0.055, 0.085, 0.13, 0.2, 0.3, 0.43, 0.59, 0.76, 1]
  const duration = 620
  let lastLevel = -1
  let frameId = 0
  let fallbackTimer = 0
  let finished = false

  const cleanup = () => {
    if (finished) return
    finished = true
    if (frameId) cancelAnimationFrame(frameId)
    if (fallbackTimer) window.clearTimeout(fallbackTimer)
    canvas.remove()
    image.style.visibility = previousVisibility
    if (!parent.querySelector('.nes-pixel-overlay') && parent.dataset.pixelRestorePosition !== undefined) {
      parent.style.position = parent.dataset.pixelRestorePosition
      delete parent.dataset.pixelRestorePosition
    }
  }

  const drawLevel = (level: number) => {
    const sampleWidth = Math.max(8, Math.round(outputWidth * levels[level]))
    const sampleHeight = Math.max(8, Math.round(sampleWidth / targetRatio))
    scratch.width = sampleWidth
    scratch.height = sampleHeight
    scratchContext.imageSmoothingEnabled = true
    scratchContext.clearRect(0, 0, sampleWidth, sampleHeight)
    scratchContext.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, sampleWidth, sampleHeight)

    context.imageSmoothingEnabled = false
    context.clearRect(0, 0, outputWidth, outputHeight)
    context.drawImage(scratch, 0, 0, outputWidth, outputHeight)
    lastLevel = level
  }

  const animate = (timestamp: number) => {
    if (!canvas.isConnected) {
      cleanup()
      return
    }
    const elapsed = Math.min(1, Math.max(0, (timestamp - startedAt) / duration))
    const level = Math.min(levels.length - 1, Math.floor(elapsed * (levels.length - 1) + 0.0001))
    if (level !== lastLevel) drawLevel(level)
    if (elapsed >= 1) {
      cleanup()
      return
    }
    frameId = requestAnimationFrame(animate)
  }

  const startedAt = performance.now()
  try {
    drawLevel(0)
  } catch {
    if (!parent.querySelector('.nes-pixel-overlay') && parent.dataset.pixelRestorePosition !== undefined) {
      parent.style.position = parent.dataset.pixelRestorePosition
      delete parent.dataset.pixelRestorePosition
    }
    return
  }

  // Hide the source while the one-to-one canvas sharpens; this avoids a ghosted
  // double image and the misaligned "second picture" effect of an overlay fade.
  image.style.visibility = 'hidden'
  image.dataset.pixelSource = source
  parent.appendChild(canvas)
  frameId = requestAnimationFrame(animate)
  fallbackTimer = window.setTimeout(cleanup, duration + 350)
}
function onPixelImageLoad(event: Event) {
  if (event.currentTarget instanceof HTMLImageElement) revealPixelImage(event.currentTarget)
}
const vPixelReveal = {
  mounted(image: HTMLImageElement) {
    image.addEventListener('load', onPixelImageLoad)
    if (image.complete && image.naturalWidth) requestAnimationFrame(() => revealPixelImage(image))
  },
  updated(image: HTMLImageElement) {
    if (image.complete && image.naturalWidth && image.dataset.pixelSource !== (image.currentSrc || image.src)) {
      requestAnimationFrame(() => revealPixelImage(image))
    }
  },
  unmounted(image: HTMLImageElement) {
    image.removeEventListener('load', onPixelImageLoad)
  }
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
  loading.value = true
  unavailable.value = false
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
function clearLanyardHeartbeat() {
  if (lanyardHeartbeatTimer) clearInterval(lanyardHeartbeatTimer)
  lanyardHeartbeatTimer = undefined
}
function scheduleLanyardReconnect() {
  if (!keepLanyardSocketOpen || lanyardReconnectTimer) return
  lanyardReconnectTimer = setTimeout(() => {
    lanyardReconnectTimer = undefined
    connectLanyardSocket()
  }, 5000)
}
function connectLanyardSocket() {
  if (!keepLanyardSocketOpen || typeof WebSocket === 'undefined') return
  if (lanyardSocket && (lanyardSocket.readyState === WebSocket.OPEN || lanyardSocket.readyState === WebSocket.CONNECTING)) return
  try {
    const socket = new WebSocket('wss://api.lanyard.rest/socket')
    lanyardSocket = socket
    socket.addEventListener('message', (event) => {
      let message: { op?: number; t?: string; d?: unknown }
      try {
        message = JSON.parse(String(event.data))
      } catch {
        return
      }

      // Lanyard Opcode 1 is Hello; subscribe to this user, then heartbeat at its requested interval.
      if (message.op === 1) {
        const hello = message.d as { heartbeat_interval?: number } | undefined
        if (socket.readyState !== WebSocket.OPEN) return
        socket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: '776722084030054421' } }))
        clearLanyardHeartbeat()
        const heartbeatInterval = hello?.heartbeat_interval && hello.heartbeat_interval > 0
          ? hello.heartbeat_interval
          : 30000
        lanyardHeartbeatTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ op: 3 }))
        }, heartbeatInterval)
        return
      }

      if (message.op !== 0 || (message.t !== 'INIT_STATE' && message.t !== 'PRESENCE_UPDATE')) return
      const payload = message.d
      if (!payload || typeof payload !== 'object') return
      const record = payload as Record<string, unknown>
      const update = ('discord_user' in record
        ? payload
        : record['776722084030054421']) as Presence | undefined
      if (update?.discord_user) {
        presence.value = update
        unavailable.value = false
        loading.value = false
        now.value = Date.now()
      }
    })
    socket.addEventListener('close', () => {
      if (lanyardSocket === socket) lanyardSocket = undefined
      clearLanyardHeartbeat()
      scheduleLanyardReconnect()
    })
    socket.addEventListener('error', () => {
      try { socket.close() } catch { /* reconnect is handled by the close event */ }
    })
  } catch {
    scheduleLanyardReconnect()
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
  keepLanyardSocketOpen = true
  connectLanyardSocket()
  refreshTimer = setInterval(() => void fetchPresence(), 60_000)
  guildRefreshTimer = setInterval(() => void fetchGuildWidget(), 60_000)
  clockTimer = setInterval(() => { now.value = Date.now() }, 1_000)
})
onUnmounted(() => {
  keepLanyardSocketOpen = false
  activeRequest?.abort()
  guildRequest?.abort()
  if (lanyardReconnectTimer) clearTimeout(lanyardReconnectTimer)
  clearLanyardHeartbeat()
  lanyardSocket?.close()
  lanyardSocket = undefined
  if (refreshTimer) clearInterval(refreshTimer)
  if (guildRefreshTimer) clearInterval(guildRefreshTimer)
  if (clockTimer) clearInterval(clockTimer)
  if (copyResetTimer) clearTimeout(copyResetTimer)
  if (activityMenuNoticeTimer) clearTimeout(activityMenuNoticeTimer)
  if (profileLinkResetTimer) clearTimeout(profileLinkResetTimer)
})
</script>

<template>
  <section class="my-activity" aria-labelledby="my-activity-title" @click="handleActivityOutside" @keydown.esc="closeActivityMenu">
    <header class="activity-heading">
      <div class="heading-copy">
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

    <div v-if="loading && !presence" class="activity-loading" aria-live="polite">
      <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
      <span>Connecting to Discord…</span>
    </div>
    <div v-else-if="!presence" class="activity-api-error" role="status">
      <span class="activity-api-error-icon"><i class="fa-solid fa-satellite-dish" aria-hidden="true"></i></span>
      <div>
        <strong>Discord presence unavailable</strong>
        <p>Lanyard did not return a usable presence response. No placeholder activity is shown.</p>
      </div>
      <button type="button" class="activity-retry-button" @click="fetchPresence"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Retry</button>
    </div>

    <div v-else class="activity-layout">
      <article class="profile-card reveal-card">
        <div class="profile-banner" aria-hidden="true"></div>
        <div class="profile-content">
          <div class="profile-avatar-line">
            <a class="avatar-wrap" :href="profileImage" target="_blank" rel="noopener noreferrer" aria-label="Open profile GIF">
              <img :src="profileImage" class="avatar" alt="Profile GIF" width="112" height="112" loading="lazy" v-pixel-reveal />
              <span class="presence-orb" :data-status="status" :aria-label="statusLabel"></span>
            </a>
            <div class="profile-custom-status" :title="customStatus?.state || ''">
              <img v-if="customStatus?.emoji?.id" :src="customEmojiUrl(customStatus)" class="status-emoji-image" :alt="customStatus.emoji?.name || 'Custom status emoji'" width="16" height="16" loading="lazy" v-pixel-reveal />
              <span v-else class="status-emoji">{{ customStatus?.emoji?.name || '✦' }}</span>
              <span>{{ customStatus?.state || (unavailable ? 'Presence is temporarily unavailable.' : 'No custom status right now.') }}</span>
            </div>
          </div>

          <div class="profile-main">
            <div class="profile-name-block">
              <div class="identity-name-line">
                <h3>{{ user?.display_name || user?.global_name || user?.username || 'Flessann' }}</h3>
                <i v-if="user?.primary_guild?.tag && user.primary_guild.identity_enabled" class="fa-solid fa-circle-check identity-verified" :aria-label="'Verified primary guild: ' + (user?.primary_guild?.tag || '')" role="img" title="Verified primary guild"></i>
              </div>
              <p class="identity-meta">
                <span>{{ user?.username || 'thiosaputra' }}</span>
                <span class="meta-dot">•</span><span>{{ presence?.kv?.pronouns || 'he' }}</span>
                <span v-if="user?.primary_guild?.tag" class="guild-tag" :title="'Primary guild: ' + user.primary_guild.tag">
                  <i class="fa-solid fa-shield-halved tag-mark" aria-hidden="true"></i>{{ user.primary_guild.tag }}
                  <i class="fa-solid fa-chevron-down guild-tag-chevron" aria-hidden="true"></i>
                </span>
              </p>
            </div>

            <div class="profile-activity-icons" aria-label="Presence indicators">
              <span v-for="platform in activePlatforms" :key="platform.id" class="mini-activity-icon" :title="platform.label"><i :class="platform.icon" aria-hidden="true"></i></span>
              <span v-if="!activePlatforms.length" class="mini-activity-icon" title="No active Discord client reported"><i class="fa-solid fa-circle-minus" aria-hidden="true"></i></span>
              <span class="mini-activity-icon" title="Discord"><i class="fa-brands fa-discord" aria-hidden="true"></i></span>
              <a v-if="spotify" class="mini-activity-icon is-active" :href="spotifyUrl" target="_blank" rel="noopener noreferrer" title="Open currently playing track in Spotify"><i class="fa-brands fa-spotify" aria-hidden="true"></i></a>
              <span class="mini-activity-count">+1</span>
            </div>

            <div class="profile-actions">
              <a class="message-button" href="https://discord.com/users/776722084030054421" target="_blank" rel="noopener noreferrer">
                <i class="fa-solid fa-comment-dots" aria-hidden="true"></i> Message
              </a>
              <a class="profile-icon-button" :href="inviteUrl" target="_blank" rel="noopener noreferrer" aria-label="Join community server" title="Join community server">
                <i class="fa-brands fa-discord" aria-hidden="true"></i>
              </a>
              <div class="activity-menu-wrap profile-menu-wrap">
                <button class="profile-icon-button profile-menu-trigger" type="button" aria-haspopup="menu" :aria-expanded="activeActivityMenu === 'profile'" aria-label="More profile actions" title="More profile actions" @click.stop="toggleActivityMenu('profile')">
                  <i class="fa-solid fa-ellipsis" aria-hidden="true"></i>
                </button>
                <div v-if="activeActivityMenu === 'profile'" class="activity-menu profile-quick-menu" role="menu" @click.stop>
                  <div class="profile-quick-menu-heading">
                    <span class="profile-quick-menu-icon"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i></span>
                    <span><strong>Quick actions</strong><small>Flessann's corner of the web</small></span>
                  </div>
                  <button class="activity-menu-item" type="button" role="menuitem" @click="copyInviteUrl">
                    <i :class="copiedInvite ? 'fa-solid fa-check' : 'fa-regular fa-copy'" aria-hidden="true"></i>
                    <span>{{ copiedInvite ? 'Invite link copied' : 'Copy server invite' }}</span>
                  </button>
                  <button class="activity-menu-item" type="button" role="menuitem" @click="copyDiscordProfileLink">
                    <i :class="copiedProfileLink ? 'fa-solid fa-check' : 'fa-brands fa-discord'" aria-hidden="true"></i>
                    <span>{{ copiedProfileLink ? 'Discord profile link copied' : 'Copy Discord profile link' }}</span>
                  </button>
                  <a class="activity-menu-item" href="https://thio.cc.cd" target="_blank" rel="noopener noreferrer" role="menuitem" @click="closeActivityMenu">
                    <i class="fa-solid fa-globe" aria-hidden="true"></i><span>Visit website</span><i class="fa-solid fa-arrow-up-right-from-square menu-external" aria-hidden="true"></i>
                  </a>
                  <a class="activity-menu-item" href="https://github.com/flessan" target="_blank" rel="noopener noreferrer" role="menuitem" @click="closeActivityMenu">
                    <i class="fa-brands fa-github" aria-hidden="true"></i><span>Explore GitHub</span><i class="fa-solid fa-arrow-up-right-from-square menu-external" aria-hidden="true"></i>
                  </a>
                </div>
              </div>
            </div>

            <div class="profile-bio">
              <span class="profile-section-label">Bio</span>
              <p>{{ presence?.kv?.bio || "please disturb meh, i'm friendly :)" }}</p>
              <p>pls join if you want: <a :href="inviteUrl" target="_blank" rel="noopener noreferrer">thio.cc.cd/discord</a></p>
            </div>

            <div v-if="profileKv.length" class="profile-detail-block profile-kv-block">
              <span class="profile-section-label">Live profile details</span>
              <dl class="profile-kv-list">
                <div v-for="item in profileKv" :key="item[0]" class="profile-kv-item">
                  <dt>{{ kvLabel(item[0]) }}</dt>
                  <dd>
                    <a v-if="kvHref(item[1])" :href="kvHref(item[1])" target="_blank" rel="noopener noreferrer">{{ item[1] }}</a>
                    <span v-else>{{ item[1] }}</span>
                  </dd>
                </div>
              </dl>
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
              <div class="connections-social-grid" aria-label="Social profiles">
                <a
                  v-for="social in socialLinks"
                  :key="social.id"
                  class="connection-social-link"
                  :data-network="social.id"
                  :href="social.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="social.label"
                  :title="social.label"
                ><i :class="social.icon" aria-hidden="true"></i><span>{{ social.label }}</span><i class="fa-solid fa-arrow-up-right-from-square connection-out" aria-hidden="true"></i></a>
              </div>
            </div>

            <div class="profile-presence-footer">
              <span class="presence-footer-dot" :data-status="status"></span>{{ statusLabel }} <span class="meta-dot">•</span> {{ platformLabel }}
              <span class="footer-sync"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Auto-sync</span>
            </div>
          </div>
        </div>
      </article>

      <section class="activity-pane reveal-card" aria-label="Discord activity">
        <div class="activity-pane-heading">
          <h3>Current activity</h3>
        </div>

        <article class="activity-card spotify-activity">
          <div class="activity-card-heading">
            <i class="fa-brands fa-spotify activity-heading-brand" aria-hidden="true"></i>
            <span>Listening to Spotify</span>
            <i class="fa-brands fa-spotify spotify-tiny-mark" aria-hidden="true"></i>
            <div class="activity-menu-wrap">
              <button class="activity-more-button" type="button" aria-haspopup="menu" :aria-expanded="activeActivityMenu === 'spotify'" aria-label="Spotify activity options" title="More Spotify actions" @click.stop="toggleActivityMenu('spotify')"><i class="fa-solid fa-ellipsis" aria-hidden="true"></i></button>
              <div v-if="activeActivityMenu === 'spotify'" class="activity-menu" role="menu" @click.stop>
                <a class="activity-menu-item" :href="spotifyUrl" target="_blank" rel="noopener noreferrer" role="menuitem" @click="closeActivityMenu"><i class="fa-brands fa-spotify" aria-hidden="true"></i><span>Open in Spotify</span><i class="fa-solid fa-arrow-up-right-from-square menu-external" aria-hidden="true"></i></a>
                <button class="activity-menu-item" type="button" role="menuitem" @click="copyActivityDetails('spotify')"><i class="fa-regular fa-copy" aria-hidden="true"></i><span>Copy track details</span></button>
                <button class="activity-menu-item" type="button" role="menuitem" @click="closeActivityMenu"><i class="fa-solid fa-xmark" aria-hidden="true"></i><span>Close menu</span></button>
              </div>
            </div>
          </div>
          <template v-if="spotify">
            <a class="activity-card-content" :href="spotifyUrl" target="_blank" rel="noopener noreferrer" :aria-label="'Open ' + spotify.song + ' in Spotify'">
              <img v-if="spotify.album_art_url" :src="spotify.album_art_url" class="activity-artwork spotify-artwork" :alt="(spotify.album || 'Album') + ' artwork'" width="126" height="126" loading="lazy" v-pixel-reveal />
              <div v-else class="activity-artwork artwork-fallback"><i class="fa-solid fa-music" aria-hidden="true"></i></div>
              <div class="activity-track-info">
                <h4>{{ spotify.song || 'Unknown track' }}</h4>
                <p>{{ spotify.artist || 'Unknown artist' }}</p>
                <div class="activity-progress-line">
                  <span>{{ elapsedTime }}</span>
                  <div class="activity-progress"><i :style="{ width: songProgress + '%' }"></i></div>
                  <span>{{ totalTime }}</span>
                </div>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square activity-card-open" aria-hidden="true"></i>
            </a>
          </template>
          <div v-else class="activity-empty">
            <span class="activity-empty-icon"><i class="fa-brands fa-spotify" aria-hidden="true"></i></span>
            <div><strong>Not listening to Spotify</strong><p>When a track starts playing, it'll appear here.</p></div>
          </div>
          <div v-if="spotify" class="activity-card-actions">
            <a class="text-action" :href="spotifyUrl" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-spotify" aria-hidden="true"></i> Open Spotify</a>
          </div>
        </article>

        <article v-for="activity in richActivities" :key="activityMenuKey(activity)" class="activity-card rich-presence-card">
          <div class="activity-card-heading">
            <i :class="activityIconClass(activity) + ' activity-heading-brand'" aria-hidden="true"></i>
            <span>{{ activityTypeLabel(activity) }}</span>
            <span class="activity-app-name">{{ activity.name }}</span>
            <div class="activity-menu-wrap">
              <button class="activity-more-button" type="button" aria-haspopup="menu" :aria-expanded="activeActivityMenu === activityMenuKey(activity)" :aria-label="'Options for ' + (activity.name || 'activity')" :title="'More ' + (activity.name || 'activity') + ' actions'" @click.stop="toggleActivityMenu(activityMenuKey(activity))"><i class="fa-solid fa-ellipsis" aria-hidden="true"></i></button>
              <div v-if="activeActivityMenu === activityMenuKey(activity)" class="activity-menu" role="menu" @click.stop>
                <button class="activity-menu-item" type="button" role="menuitem" @click="copyActivityDetails(activityMenuKey(activity))"><i class="fa-regular fa-copy" aria-hidden="true"></i><span>Copy activity details</span></button>
                <button class="activity-menu-item" type="button" role="menuitem" @click="closeActivityMenu"><i class="fa-solid fa-xmark" aria-hidden="true"></i><span>Close menu</span></button>
              </div>
            </div>
          </div>
          <div class="activity-card-content rich-presence-content">
            <div class="rich-artwork-wrap">
              <span class="rich-artwork-fallback"><i :class="activityIconClass(activity)" aria-hidden="true"></i></span>
              <img
                v-if="activityArtworkUrl(activity)"
                :src="activityArtworkUrl(activity)"
                class="activity-artwork rich-artwork"
                :alt="activity.assets?.large_text || activity.name || 'Activity artwork'"
                loading="lazy"
                v-pixel-reveal
                @error="onActivityImageError"
              />
              <img
                v-if="activityAssetUrl(activity, 'small_image')"
                :src="activityAssetUrl(activity, 'small_image')"
                class="rich-artwork-badge"
                :alt="activity.assets?.small_text || ''"
                loading="lazy"
                v-pixel-reveal
                @error="onActivityImageError"
              />
            </div>
            <div class="activity-track-info rich-presence-info">
              <span v-if="activity.type !== 3" class="rich-app-label">{{ activity.name || 'Rich Presence' }}</span>
              <h4>{{ activityTitle(activity) }}</h4>
              <p v-if="activitySubtitle(activity)">{{ activitySubtitle(activity) }}</p>
              <div v-if="activity.platform || activityElapsedFor(activity)" class="activity-meta-row">
                <span v-if="activity.platform" class="activity-platform-pill"><i class="fa-solid fa-display" aria-hidden="true"></i>{{ activity.platform }}</span>
                <span v-if="activityElapsedFor(activity)" class="activity-duration"><i class="fa-regular fa-clock" aria-hidden="true"></i>{{ activityElapsedFor(activity) }}</span>
              </div>
            </div>
          </div>
          <div v-if="activity.buttons?.length" class="rich-activity-actions">
            <a
              v-for="button in activity.buttons"
              :key="button"
              class="rich-action-button is-api-label"
              href="https://discord.com/users/776722084030054421"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="button + ' — open Flessann’s Discord profile'"
              :title="'Open Flessann’s Discord profile (' + button + ')'"
            >
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>{{ button }}
            </a>
          </div>
        </article>

        <p v-if="activityMenuNotice" class="activity-menu-notice" role="status"><i :class="activityMenuNotice.startsWith('Details copied') ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info'" aria-hidden="true"></i> {{ activityMenuNotice }}</p>
        <p v-if="unavailable && presence" class="activity-footnote"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Live refresh is unavailable; showing the last known snapshot.</p>
      </section>
    </div>

    <article class="guild-card reveal-card" aria-label="Discord server widget">
        <div class="guild-topline">
          <a class="guild-brand-mark" :href="inviteUrl" target="_blank" rel="noopener noreferrer" aria-label="Join community server">
            <img :src="communityImage" alt="" width="48" height="48" loading="lazy" v-pixel-reveal />
          </a>
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
            <h4><i class="fa-solid fa-volume-high" aria-hidden="true"></i> Voice <span class="section-count">{{ sortedChannels.length }}</span></h4>
            <div v-if="sortedChannels.length" class="channel-list">
              <a v-for="channel in sortedChannels" :key="channel.id" class="channel-pill" :href="'https://discord.com/channels/' + (guild?.id || '1435463197418192906') + '/' + channel.id" target="_blank" rel="noopener noreferrer">
                <i class="fa-solid fa-volume-high channel-voice-icon" aria-hidden="true"></i>{{ channel.name }}<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
              </a>
            </div>
            <p v-else class="guild-muted">{{ guildLoading ? 'Loading channels…' : 'No public channels available.' }}</p>
          </div>
          <div class="guild-members">
            <h4><i class="fa-solid fa-users" aria-hidden="true"></i> AROUND RIGHT NOW <span class="section-count">{{ activeMembers.length }}</span></h4>
            <div v-if="activeMembers.length" class="member-list">
              <a v-for="member in activeMembers" :key="member.id" class="guild-member" :class="{ 'member-is-link': member.id.length > 10 }" :href="member.id.length > 10 ? 'https://discord.com/users/' + member.id : undefined" :aria-label="member.id.length > 10 ? 'Open Discord profile for ' + member.username : undefined" :target="member.id.length > 10 ? '_blank' : undefined" :rel="member.id.length > 10 ? 'noopener noreferrer' : undefined">
                <span class="member-avatar-wrap">
                  <img v-if="member.avatar_url" :src="member.avatar_url" alt="" width="32" height="32" loading="lazy" v-pixel-reveal />
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
    </article>
  </section>
</template>

<style scoped>
.my-activity {
  --discord-bg: #1e1f22;
  --discord-panel: #232428;
  --discord-card: #2b2d31;
  --discord-card-hover: #303238;
  --discord-border: #3f4147;
  --discord-border-strong: #41434a;
  --discord-text: #f2f3f5;
  --discord-text-soft: #dbdee1;
  --discord-muted: #949ba4;
  --discord-label: #b5bac1;
  --discord-blue: #5865f2;
  --discord-blue-dark: #4752c4;
  --discord-blue-hover: #8490ff;
  --discord-link: #00a8fc;
  --discord-bubble-border: #1a1b1e;
  --discord-white: #ffffff;
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin: 1.9rem 0 2.5rem;
  padding: .75rem;
  transform: none;
  overflow: visible;
  border: 1px solid var(--discord-border);
  border-radius: 1rem;
  background: var(--discord-bg);
  color: var(--discord-text-soft);
  box-shadow: 0 14px 38px rgba(0,0,0,.11);
}
:global(html:not(.dark)) .my-activity {
  --discord-bg: #f3f4f7;
  --discord-panel: #ffffff;
  --discord-card: #e8eaf0;
  --discord-card-hover: #dfe3eb;
  --discord-border: #d2d6df;
  --discord-border-strong: #b9bfcc;
  --discord-text: #23252b;
  --discord-text-soft: #414550;
  --discord-muted: #697180;
  --discord-label: #596170;
  --discord-blue: #5865f2;
  --discord-blue-dark: #4752c4;
  --discord-blue-hover: #4752c4;
  --discord-link: #006fc4;
  --discord-bubble-border: #d2d6df;
  --discord-white: #ffffff;
  color-scheme: light;
  box-shadow: 0 16px 42px rgba(38,50,75,.09);
}
.my-activity :deep(i) { line-height: 1; }
.activity-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .85rem; }
.heading-copy { min-width: 0; }
.heading-kicker { display: flex; align-items: center; gap: .45rem; margin-bottom: .25rem; color: var(--discord-muted); font-size: .61rem; font-weight: 800; letter-spacing: .13em; }
.heading-kicker i { color: var(--discord-blue-hover); }
.activity-heading h2 { margin: 0 !important; padding: 0 !important; border: 0 !important; color: var(--discord-text); font-size: clamp(1.35rem, 3vw, 1.75rem); font-weight: 800; letter-spacing: -.05em; line-height: 1.15; }
.activity-actions { display: inline-flex; align-items: center; gap: .4rem; flex: 0 0 auto; }
.join-server { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 39px; padding: .56rem .75rem; border: 1px solid var(--discord-blue-dark); border-radius: .58rem; background: var(--discord-blue); color: #fff !important; font-size: .77rem; font-weight: 750; text-decoration: none !important; transition: transform 200ms ease, box-shadow 230ms ease, background-color 200ms ease; }
.join-server:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(88,101,242,.24); background: var(--discord-blue-dark); }
.action-arrow { transition: transform 200ms ease; }
.join-server:hover .action-arrow { transform: translate(2px,-2px); }
.copy-server { display: grid; place-items: center; width: 39px; height: 39px; flex: 0 0 39px; padding: 0; border: 1px solid var(--discord-border); border-radius: .58rem; background: var(--discord-card); color: var(--discord-text-soft); cursor: pointer; transition: all 180ms ease; }
.copy-server:hover { transform: translateY(-1px); border-color: var(--discord-blue); background: var(--discord-card-hover); }
.copy-server.is-copied { border-color: #23a55a; color: #23a55a; }
.copy-server.is-error { border-color: #f23f43; color: #f23f43; }
.activity-api-error { display: flex; align-items: center; gap: .8rem; min-width: 0; padding: 1rem; border: 1px solid var(--discord-border); border-radius: .8rem; background: var(--discord-panel); }
.activity-api-error-icon { display: grid; place-items: center; flex: 0 0 38px; width: 38px; height: 38px; border-radius: .65rem; background: var(--discord-card); color: var(--discord-muted); }
.activity-api-error strong { color: var(--discord-text); font-size: .8rem; }
.activity-api-error p { margin: .25rem 0 0; color: var(--discord-muted); font-size: .7rem; line-height: 1.45; }
.activity-retry-button { display: inline-flex; align-items: center; gap: .4rem; flex: 0 0 auto; margin-left: auto; padding: .48rem .65rem; border: 1px solid var(--discord-border); border-radius: .55rem; background: var(--discord-card); color: var(--discord-text); font: inherit; font-size: .68rem; cursor: pointer; }
.activity-retry-button:hover { border-color: var(--discord-blue); }
.activity-meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: .35rem; }
.activity-platform-pill { display: inline-flex; align-items: center; gap: .28rem; padding: .2rem .4rem; border: 1px solid var(--discord-border); border-radius: .38rem; color: var(--discord-muted); font-size: .6rem; text-transform: capitalize; }
.activity-platform-pill i { font-size: .62rem; }
.rich-action-button.is-api-label { cursor: pointer; }
.activity-layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 286px), 1fr)); align-items: start; gap: .75rem; min-width: 0; }
.reveal-card { min-width: 0; overflow: visible; border: 1px solid var(--discord-border); border-radius: .9rem; background: var(--discord-panel); animation: card-enter 540ms cubic-bezier(.16,1,.3,1) both; }
.profile-card { display: flex; flex-direction: column; overflow: hidden; }
.activity-pane { overflow: visible; }
.profile-banner { position: relative; min-height: 132px; overflow: hidden; background: #e8f8ff; }
.profile-banner::after { position: absolute; right: 1.3rem; top: 1.1rem; width: 84px; height: 84px; border: 1px solid rgba(64,156,201,.12); border-radius: 50%; background: rgba(255,255,255,.12); content: ""; }
.profile-content { display: flex; flex: 1; flex-direction: column; min-width: 0; padding: 0 1rem .95rem; }
.profile-avatar-line { position: relative; display: flex; align-items: flex-end; gap: .7rem; min-width: 0; margin-top: -68px; }
.avatar-wrap { position: relative; z-index: 1; display: block; flex: 0 0 112px; width: 112px; height: 112px; padding: 4px; border: 6px solid var(--discord-panel); border-radius: 50%; background: var(--discord-panel); color: inherit; text-decoration: none; box-shadow: 0 0 0 1px rgba(255,255,255,.05); }
.avatar { display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.presence-orb { position: absolute; right: 3px; bottom: 5px; width: 24px; height: 24px; border: 4px solid var(--discord-panel); border-radius: 50%; background: #80848e; }
.presence-orb[data-status="online"] { background: #23a55a; }
.presence-orb[data-status="idle"] { background: #f0b232; }
.presence-orb[data-status="dnd"] { background: #f23f43; }
.profile-custom-status { position: relative; display: flex; align-items: center; gap: .36rem; max-width: calc(100% - 102px); min-width: 0; margin-bottom: .9rem; padding: .5rem .58rem; border: 1px solid var(--discord-bubble-border); border-radius: 999px; background: var(--discord-card); color: var(--discord-text); font-size: .7rem; box-shadow: 0 4px 13px rgba(0,0,0,.08); animation: bubble-appear 650ms cubic-bezier(.16,1,.3,1) both; }
.profile-custom-status > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-emoji { flex: 0 0 auto; font-size: 1rem; }
.status-emoji-image { display: block; flex: 0 0 1rem; width: 1rem; height: 1rem; object-fit: contain; }
.profile-main { display: flex; flex-direction: column; gap: 1rem; padding: .65rem .1rem 0; }
.profile-name-block { min-width: 0; }
.identity-name-line { display: flex; align-items: center; gap: .42rem; min-width: 0; }
.identity-name-line h3 { margin: 0; overflow-wrap: anywhere; color: var(--discord-text); font-size: clamp(1.45rem, 2.6vw, 1.85rem); font-weight: 800; letter-spacing: -.045em; line-height: 1.18; }
.identity-verified { color: var(--discord-blue); font-size: 1.05rem; filter: drop-shadow(0 1px 2px rgba(88,101,242,.22)); }
.identity-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; margin: .45rem 0 0; color: var(--discord-text-soft); font-size: .83rem; }
.meta-dot { color: var(--discord-muted); }
.guild-tag { display: inline-flex; align-items: center; gap: .34rem; padding: .27rem .43rem; border: 1px solid var(--discord-border); border-radius: .45rem; background: var(--discord-card); color: var(--discord-text-soft); font-size: .68rem; font-weight: 750; }
.tag-mark { color: #58c6ff; }
.guild-tag-chevron { font-size: .6rem; }
.profile-activity-icons { display: flex; align-items: center; flex-wrap: wrap; gap: .24rem; }
.mini-activity-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: .43rem; background: var(--discord-card); color: #58c6ff; font-size: .94rem; text-decoration: none !important; transition: transform 220ms ease, background-color 220ms ease; }
.mini-activity-icon:hover { transform: translateY(-2px); background: var(--discord-card-hover); }
.mini-activity-icon.is-active { color: var(--discord-text); background: var(--discord-border-strong); }
.mini-activity-count { display: grid; place-items: center; height: 28px; padding: 0 .45rem; border-radius: .43rem; background: var(--discord-card); color: var(--discord-text-soft); font-size: .72rem; font-weight: 750; }
.profile-actions { display: flex; align-items: center; gap: .5rem; }
.message-button { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; min-height: 39px; padding: .6rem .8rem; border: 1px solid var(--discord-blue-dark); border-radius: .55rem; background: var(--discord-blue); color: #fff !important; font-size: .78rem; font-weight: 750; text-decoration: none !important; transition: transform 200ms ease, background-color 200ms ease; }
.message-button:hover { transform: translateY(-1px); background: var(--discord-blue-dark); }
.profile-icon-button { display: grid; place-items: center; width: 39px; height: 39px; padding: 0; border: 1px solid var(--discord-border); border-radius: .55rem; background: var(--discord-card); color: var(--discord-text-soft); cursor: pointer; text-decoration: none !important; transition: transform 200ms ease, border-color 200ms ease, background-color 200ms ease; }
.profile-icon-button:hover { transform: translateY(-1px); border-color: var(--discord-blue); background: var(--discord-card-hover); }
.profile-bio { padding-top: .2rem; }
.profile-section-label { display: block; margin-bottom: .38rem; color: var(--discord-label); font-size: .72rem; font-weight: 550; }
.profile-bio p { margin: .2rem 0; color: var(--discord-text-soft); font-size: .83rem; line-height: 1.5; overflow-wrap: anywhere; }
.profile-bio a { color: var(--discord-link) !important; text-decoration: none !important; }
.profile-bio a:hover { text-decoration: underline !important; }
.profile-detail-block { padding-top: .25rem; }
.profile-detail-block > p { margin: .45rem 0 0; color: var(--discord-text-soft); font-size: .82rem; }
.connections { padding-top: .05rem; }
.connection-item { display: flex; align-items: center; gap: .55rem; max-width: 100%; margin-top: .45rem; padding: .45rem .5rem; border: 1px solid var(--discord-border); border-radius: .6rem; color: var(--discord-text-soft) !important; text-decoration: none !important; transition: background-color 200ms ease, border-color 200ms ease; }
.connection-item:hover { border-color: var(--discord-blue); background: var(--discord-card); }
.connection-icon { display: grid; place-items: center; width: 29px; height: 29px; border-radius: .48rem; background: var(--discord-text); color: var(--discord-panel); }
.github-connection { background: #111214; color: white; }
.connection-out { margin-left: auto; color: var(--discord-muted); font-size: .75rem; }
.profile-presence-footer { display: flex; align-items: center; flex-wrap: wrap; gap: .4rem; margin-top: auto; padding-top: 1.15rem; color: var(--discord-muted); font-size: .66rem; }
.presence-footer-dot { width: .45rem; height: .45rem; border-radius: 50%; background: #80848e; }
.presence-footer-dot[data-status="online"] { background: #23a55a; }
.presence-footer-dot[data-status="idle"] { background: #f0b232; }
.presence-footer-dot[data-status="dnd"] { background: #f23f43; }
.footer-sync { display: inline-flex; align-items: center; gap: .3rem; margin-left: auto; }

.activity-pane { display: flex; flex-direction: column; min-height: 0; padding: clamp(1rem, 1.6vw, 1.4rem); }
.activity-pane-heading { display: flex; align-items: center; justify-content: space-between; gap: .8rem; margin: .05rem 0 .7rem; }
.connections-social-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .38rem; margin-top: .5rem; }
.connection-social-link { display: flex; align-items: center; gap: .42rem; min-width: 0; min-height: 37px; padding: .38rem .45rem; border: 1px solid var(--discord-border); border-radius: .55rem; background: var(--discord-card); color: var(--discord-text-soft); font-size: .67rem; text-decoration: none !important; transition: transform 180ms ease, color 180ms ease, border-color 180ms ease, background-color 180ms ease; }
.connection-social-link > i:first-child { display: grid; place-items: center; flex: 0 0 22px; width: 22px; color: var(--discord-text); font-size: .96rem; }
.connection-social-link > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.connection-social-link .connection-out { margin-left: auto; flex: 0 0 auto; font-size: .58rem; }
.connection-social-link[data-network="discord"] > i:first-child { color: #5865f2; }
.connection-social-link[data-network="telegram"] > i:first-child { color: #58a9ff; }
.connection-social-link[data-network="instagram"] > i:first-child { color: #e66a95; }
.connection-social-link[data-network="youtube"] > i:first-child { color: #ff4d5b; }
.connection-social-link:hover { transform: translateY(-1px); border-color: var(--discord-blue); background: var(--discord-card-hover); color: var(--discord-text); }
.connection-social-link:hover > i:first-child { color: var(--discord-blue-hover); }
.connection-social-link:focus-visible { outline: 2px solid var(--discord-blue); outline-offset: 2px; }
.profile-quick-menu { width: min(256px, calc(100vw - 48px)); }
.profile-quick-menu-heading { display: flex; align-items: center; gap: .6rem; margin: 0 0 .15rem; padding: .55rem .6rem .7rem; border-bottom: 1px solid var(--discord-border); }
.profile-quick-menu-icon { display: grid; place-items: center; flex: 0 0 32px; width: 32px; height: 32px; border-radius: .6rem; background: var(--discord-card); color: var(--discord-blue-hover); }
.profile-quick-menu-heading > span:last-child { display: grid; gap: .18rem; min-width: 0; }
.profile-quick-menu-heading strong { color: var(--discord-text); font-size: .75rem; }
.profile-quick-menu-heading small { color: var(--discord-muted); font-size: .61rem; }
.profile-menu-wrap { z-index: 15; margin-left: 0; }
.profile-menu-trigger[aria-expanded="true"] { border-color: var(--discord-blue); background: var(--discord-card-hover); color: var(--discord-text); }
.profile-card:has(.profile-quick-menu) { position: relative; z-index: 12; overflow: visible; }
.profile-card:has(.profile-quick-menu) .profile-banner { border-radius: calc(.9rem - 1px) calc(.9rem - 1px) 0 0; }
.activity-pane-heading h3 { margin: 0; color: var(--discord-label); font-size: .79rem; font-weight: 550; }
.activity-refresh { display: inline-flex; align-items: center; gap: .35rem; color: #23a55a; font-size: .6rem; font-weight: 750; text-transform: uppercase; letter-spacing: .08em; }
.activity-refresh > i { font-size: .4rem; animation: status-pulse 1.8s ease-out infinite; }
.activity-refresh.is-stale { color: var(--discord-muted); }
.activity-card { position: relative; z-index: 0; overflow: visible; margin-top: .65rem; padding: .85rem .9rem .8rem; border: 1px solid transparent; border-radius: .8rem; background: var(--discord-card); transition: border-color 230ms ease, transform 250ms ease, background-color 230ms ease; }
.activity-card:has(.activity-menu) { z-index: 5; }
.activity-menu-wrap { position: relative; flex: 0 0 auto; margin-left: auto; }
.activity-more-button { display: grid; place-items: center; width: 30px; height: 28px; padding: 0; border: 1px solid transparent; border-radius: .48rem; background: transparent; color: var(--discord-muted); cursor: pointer; transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease; }
.activity-more-button:hover, .activity-more-button[aria-expanded="true"] { border-color: var(--discord-border); background: var(--discord-card-hover); color: var(--discord-text); }
.activity-more-button i { font-size: .95rem; }
.activity-menu { position: absolute; z-index: 30; top: calc(100% + .3rem); right: 0; display: grid; width: min(230px, calc(100vw - 80px)); gap: .18rem; padding: .38rem; border: 1px solid var(--discord-border); border-radius: .72rem; background: var(--discord-panel); box-shadow: 0 12px 32px rgba(0,0,0,.26); animation: menu-pop .16s cubic-bezier(.2,.8,.2,1) both; }
.activity-menu-item { display: flex; align-items: center; gap: .6rem; width: 100%; min-height: 36px; padding: .5rem .6rem; border: 0; border-radius: .45rem; background: transparent; color: var(--discord-text-soft) !important; font: inherit; font-size: .72rem; text-align: left; text-decoration: none !important; cursor: pointer; }
.activity-menu-item > i:first-child { width: 16px; color: var(--discord-muted); text-align: center; }
.activity-menu-item > span { flex: 1; }
.activity-menu-item .menu-external { margin-left: auto; font-size: .64rem; }
.activity-menu-item:hover { background: var(--discord-card-hover); color: var(--discord-text) !important; }
.activity-menu-item:hover > i:first-child { color: var(--discord-blue); }
.activity-menu-notice { display: flex; align-items: center; gap: .4rem; margin: .65rem 0 0; color: var(--discord-muted); font-size: .7rem; animation: card-enter 180ms ease both; }
.activity-menu-notice .fa-circle-check { color: #23a55a; }


.nes-pixel-overlay { position: absolute; z-index: 3; display: block; max-width: none; pointer-events: none; object-fit: fill; image-rendering: pixelated; opacity: 1; transform: none; }
.activity-card:hover { transform: translateY(-1px); border-color: var(--discord-border-strong); background: var(--discord-card-hover); }
.activity-card-heading { display: flex; align-items: center; gap: .45rem; min-width: 0; margin-bottom: .65rem; color: var(--discord-text); font-size: .73rem; font-weight: 600; }
.activity-heading-brand { color: var(--discord-text-soft); font-size: .95rem; }
.spotify-tiny-mark { color: #1db954; font-size: .78rem; }
.activity-more { margin-left: auto; color: var(--discord-label); font-size: .9rem; }
.activity-card-content { display: flex; align-items: center; gap: .8rem; min-width: 0; color: inherit; text-decoration: none !important; }
.activity-track-info { overflow-wrap: anywhere; }
.rich-presence-content { align-items: flex-start; }
.rich-presence-info { padding-top: .12rem; }
.rich-app-label { display: block; margin-bottom: .16rem; color: var(--discord-muted); font-size: .62rem; font-weight: 700; letter-spacing: .025em; }
.rich-artwork-wrap { position: relative; flex: 0 0 auto; width: clamp(74px, 8vw, 120px); height: clamp(74px, 8vw, 120px); }
.rich-artwork-fallback { position: absolute; inset: 0; display: grid; place-items: center; border-radius: .55rem; background: var(--discord-border); color: var(--discord-muted); font-size: 1.55rem; }
.rich-artwork.activity-artwork { position: relative; display: block; width: 100%; height: 100%; flex: initial; object-fit: cover; }
.rich-artwork-badge { position: absolute; right: -.2rem; bottom: -.2rem; width: 28px; height: 28px; border: 3px solid var(--discord-card); border-radius: .48rem; object-fit: cover; background: var(--discord-panel); }
.rich-activity-actions { display: flex; align-items: center; flex-wrap: wrap; gap: .45rem; margin-top: .75rem; padding-top: .65rem; border-top: 1px solid var(--discord-border); }
.rich-action-button { display: inline-flex; align-items: center; gap: .4rem; min-height: 30px; padding: .42rem .58rem; border: 1px solid var(--discord-border); border-radius: .48rem; background: var(--discord-panel); color: var(--discord-text-soft) !important; font-size: .66rem; font-weight: 650; text-decoration: none !important; transition: border-color 180ms ease, background-color 180ms ease, color 180ms ease; }
.rich-action-button:hover { border-color: var(--discord-blue); background: var(--discord-card-hover); color: var(--discord-text) !important; }
.rich-action-button > i { font-size: .68rem; }
.rich-action-button.is-unavailable { opacity: .52; cursor: not-allowed; }
.activity-card-content > .activity-track-info { flex: 1 1 auto; }
.activity-artwork { flex-shrink: 0; }
.activity-artwork { display: block; width: clamp(80px, 8.2vw, 126px); height: clamp(80px, 8.2vw, 126px); flex: 0 0 clamp(80px, 8.2vw, 126px); overflow: hidden; border-radius: .55rem; object-fit: cover; background: var(--discord-bg); }
.spotify-artwork, .watching-artwork { transition: transform 400ms cubic-bezier(.16,1,.3,1); }
.activity-card:hover .spotify-artwork, .watching-activity:hover .watching-artwork { transform: scale(1.025); }
.artwork-fallback { display: grid; place-items: center; color: #1db954; font-size: 2rem; }
.activity-track-info { flex: 1; min-width: 0; }
.profile-kv-list { display: grid; gap: .42rem; margin: 0; }
.profile-kv-item { display: flex; align-items: flex-start; gap: .6rem; min-width: 0; font-size: .74rem; line-height: 1.4; }
.profile-kv-item dt { flex: 0 0 34%; color: var(--discord-muted); font-weight: 650; overflow-wrap: anywhere; }
.profile-kv-item dd { min-width: 0; margin: 0; color: var(--discord-text-soft); overflow-wrap: anywhere; }
.profile-kv-item a { color: var(--discord-link) !important; text-decoration: none !important; }
.profile-kv-item a:hover { text-decoration: underline !important; }
.activity-track-info h4 { margin: 0 0 .22rem; color: var(--discord-text); font-size: .86rem; font-weight: 750; letter-spacing: -.015em; line-height: 1.35; overflow-wrap: anywhere; }
.activity-track-info p { margin: 0; color: var(--discord-text-soft); font-size: .75rem; line-height: 1.4; overflow-wrap: anywhere; }
.activity-progress-line { display: flex; align-items: center; gap: .5rem; margin-top: .55rem; color: var(--discord-text-soft); font-size: .68rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.activity-progress { height: 3px; flex: 1; min-width: 20px; overflow: hidden; border-radius: 99px; background: var(--discord-border-strong); }
.activity-progress i { display: block; height: 100%; border-radius: inherit; background: var(--discord-text); transition: width 800ms linear; }
.activity-card-open { align-self: flex-start; color: var(--discord-muted); font-size: .72rem; }
.activity-card-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: .5rem; margin-top: .7rem; padding-top: .55rem; border-top: 1px solid rgba(255,255,255,.035); }
.text-action { display: inline-flex; align-items: center; gap: .35rem; padding: .25rem 0; border: 0; background: transparent; color: var(--discord-label); font: inherit; font-size: .67rem; cursor: pointer; text-decoration: none !important; transition: color 180ms ease; }
.text-action:hover { color: var(--discord-text); }
.activity-empty { display: flex; align-items: center; gap: .7rem; padding: .6rem 0 .1rem; }
.activity-empty-icon { display: grid; place-items: center; width: 45px; height: 45px; border-radius: .6rem; background: var(--discord-bg); color: #1db954; font-size: 1.3rem; }
.activity-empty strong { color: var(--discord-text); font-size: .78rem; }
.activity-empty p { margin: .2rem 0 0; color: var(--discord-label); font-size: .7rem; }
.watching-image-link { flex: 0 0 auto; }
.watching-link { display: inline-flex; align-items: center; gap: .3rem; margin-top: .35rem; color: var(--discord-link) !important; font-size: .66rem; text-decoration: none !important; }
.watching-link:hover { text-decoration: underline !important; }
.activity-duration { display: flex; align-items: center; gap: .35rem; margin-top: .35rem; color: #23a55a; font-size: .7rem; font-variant-numeric: tabular-nums; }
.activity-duration i { font-size: .65rem; }
.activity-footnote { display: flex; align-items: flex-start; gap: .4rem; margin: .8rem .1rem 0; color: var(--discord-muted); font-size: .68rem; line-height: 1.45; }

.guild-card { width: 100%; min-width: 0; margin-top: 1rem; padding: 0 0 .05rem; transition: border-color 260ms ease, box-shadow 320ms ease, transform 320ms cubic-bezier(.16,1,.3,1); }
.guild-card:hover { border-color: var(--discord-border-strong); box-shadow: 0 10px 26px rgba(0,0,0,.12); transform: translateY(-1px); }
.guild-topline { display: flex; align-items: center; gap: .8rem; min-width: 0; padding: .95rem 1.05rem 0; }
.guild-brand-mark { display: grid; place-items: center; flex: 0 0 48px; width: 48px; height: 48px; overflow: hidden; border: 1px solid var(--discord-border); border-radius: .8rem; background: var(--discord-card); text-decoration: none; }
.guild-brand-mark img { display: block; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
.guild-heading-copy { min-width: 0; flex: 1; }
.detail-label { display: block; color: var(--discord-muted); font-size: .59rem; font-weight: 850; letter-spacing: .13em; }
.guild-heading-copy h3 { margin: .15rem 0 .22rem; color: var(--discord-text); font-size: 1rem; font-weight: 800; letter-spacing: -.03em; line-height: 1.35; }
.guild-heading-copy p { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem; margin: 0; color: var(--discord-label); font-size: .7rem; }
.guild-heading-copy p strong { color: var(--discord-text); font-weight: 800; }
.guild-heading-divider { color: var(--discord-muted); }
.guild-online-dot { width: .43rem; height: .43rem; border-radius: 50%; background: #23a55a; box-shadow: 0 0 0 3px rgba(35,165,90,.1); }
.guild-join-link { display: inline-flex; align-items: center; gap: .4rem; flex: 0 0 auto; padding: .5rem .68rem; border: 1px solid var(--discord-border); border-radius: .55rem; color: var(--discord-text) !important; font-size: .7rem; font-weight: 750; text-decoration: none !important; transition: border-color 200ms ease, background-color 200ms ease, transform 200ms ease; }
.guild-join-link:hover { transform: translateY(-1px); border-color: var(--discord-blue); background: var(--discord-card); }
.guild-divider { height: 1px; margin: .9rem 1.05rem; background: var(--discord-border); }
.guild-columns { display: grid; grid-template-columns: minmax(155px, .72fr) minmax(0, 1.28fr); gap: 1.25rem; padding: 0 1.05rem; }
.guild-channels h4, .guild-members h4 { display: flex; align-items: center; gap: .42rem; margin: 0 0 .65rem; color: var(--discord-muted); font-size: .6rem; font-weight: 850; letter-spacing: .11em; }
.section-count { display: inline-grid; place-items: center; min-width: 1.15rem; height: 1.15rem; padding-inline: .2rem; border-radius: .36rem; background: var(--discord-card); color: var(--discord-text-soft); font-size: .6rem; letter-spacing: 0; }
.channel-list { display: flex; flex-wrap: wrap; gap: .4rem; }
.channel-pill { display: inline-flex; align-items: center; gap: .36rem; padding: .43rem .55rem; border: 1px solid var(--discord-border); border-radius: .55rem; background: var(--discord-card); color: var(--discord-text-soft); font-size: .72rem; text-decoration: none !important; transition: border-color 200ms ease, transform 200ms ease; }
.channel-pill:hover { transform: translateY(-1px); border-color: var(--discord-blue); }
.channel-voice-icon { color: var(--discord-muted); font-size: .78rem; }
.channel-pill .fa-chevron-right { color: var(--discord-muted); font-size: .62rem; }
.member-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem .85rem; }
.guild-member { display: flex; align-items: center; gap: .5rem; min-width: 0; color: inherit; text-decoration: none !important; }
.guild-member.member-is-link { cursor: pointer; }
.guild-member.member-is-link:hover .member-name { color: var(--discord-text); text-decoration: underline; }
.member-avatar-wrap { position: relative; display: block; flex: 0 0 32px; width: 32px; height: 32px; }
.member-avatar-wrap img, .member-avatar-fallback { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.member-avatar-fallback { background: var(--discord-card); color: var(--discord-text-soft); font-size: .72rem; font-weight: 800; }
.member-status-dot { position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px; border: 2px solid var(--discord-panel); border-radius: 50%; background: #23a55a; }
.member-status-dot[data-status="idle"] { background: #f0b232; }
.member-status-dot[data-status="dnd"] { background: #f23f43; }
.member-name { min-width: 0; overflow: hidden; color: var(--discord-text-soft); font-size: .75rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.member-game { flex: 0 0 auto; max-width: 34%; overflow: hidden; color: var(--discord-muted); font-size: .64rem; text-overflow: ellipsis; white-space: nowrap; }
.guild-muted { margin: .3rem 0 0; color: var(--discord-muted); font-size: .7rem; }
.guild-bottomline { display: flex; align-items: center; justify-content: space-between; gap: .7rem; margin: .95rem 1.05rem 0; padding: .75rem 0 .85rem; border-top: 1px solid var(--discord-border); }
.guild-bottomline p { display: flex; align-items: center; gap: .4rem; margin: 0; color: var(--discord-muted); font-size: .65rem; }
.guild-bottomline p i { color: #23a55a; }
.copy-inline-action { margin-left: auto; }

@keyframes card-enter { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
@keyframes menu-pop { from { opacity: 0; transform: translateY(-4px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes bubble-appear { from { opacity: 0; transform: translateX(-6px) scale(.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes status-pulse { 0% { opacity: .65; transform: scale(.75); } 100% { opacity: 0; transform: scale(1.8); } }

@media (max-width: 1040px) {
  .profile-content { padding-inline: 1rem; }
  .activity-pane { width: 100%; }
  .activity-artwork { width: 96px; height: 96px; flex-basis: 96px; }
}
@media (max-width: 560px) {
  .my-activity { width: 100%; max-width: 100%; margin: 1.65rem 0 2rem; padding: .6rem; border-radius: .95rem; }
  .activity-heading { align-items: flex-start; flex-direction: column; gap: .8rem; }
  .activity-actions { width: 100%; }
  .join-server { min-height: 39px; flex: 1; padding: .55rem .7rem; font-size: .76rem; }
  .copy-server { width: 39px; height: 39px; }
  .profile-banner { min-height: 118px; }
  .profile-content { padding: 0 .85rem .9rem; }
  .profile-avatar-line { align-items: flex-end; gap: .5rem; margin-top: -60px; }
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
  .activity-pane { padding: .85rem; }
  .connections-social-grid { gap: .3rem; }
  .connection-social-link { min-height: 35px; padding: .35rem .38rem; font-size: .61rem; }
  .connection-social-link > i:first-child { flex-basis: 19px; width: 19px; font-size: .87rem; }
  .activity-card { padding: .7rem; }
  .activity-card-content { gap: .55rem; }
  .activity-artwork { width: 100%; height: 100%; flex-basis: auto; border-radius: .5rem; }
  .rich-artwork-wrap { width: clamp(68px, 23vw, 88px); height: clamp(68px, 23vw, 88px); }
  .rich-action-button { font-size: .62rem; }
  .activity-track-info h4 { font-size: .77rem; }
  .activity-track-info p { font-size: .68rem; }
  .activity-progress-line { gap: .3rem; font-size: .59rem; }
  .activity-progress { min-width: 22px; }
  .activity-card-actions { justify-content: flex-start; }
  .guild-topline { align-items: flex-start; gap: .6rem; padding-inline: .8rem; }
  .guild-heading-copy h3 { font-size: .87rem; }
  .guild-heading-copy p { font-size: .63rem; }
  .guild-join-link { padding: .45rem; font-size: 0; }
  .guild-divider { margin-inline: .8rem; }
  .guild-columns { grid-template-columns: minmax(0,1fr); gap: .95rem; padding-inline: .8rem; }
  .member-list { grid-template-columns: minmax(0,1fr); }
  .guild-bottomline { align-items: flex-start; flex-wrap: wrap; margin-inline: .8rem; }
}
@media (prefers-reduced-motion: reduce) {
  .my-activity *, .my-activity *::before, .my-activity *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
</style>
