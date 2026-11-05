<script setup lang="ts">
/**
 * Manual GitHub sync panel.
 *
 * The only write action is "Sync to Cloud", and it always reads the cloud file
 * first. A changed cloud file is never overwritten silently: the panel explains
 * the conflict and asks which copy to keep.
 */
import { computed, onMounted, ref } from 'vue'
import WorkspaceIcon from './WorkspaceIcon.vue'
import BaseDialog from './BaseDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { workspace } from '../../kerja/state'
import {
  checkCloud,
  cloud,
  cloudBusy,
  connectGitHub,
  disconnectGitHub,
  downloadLocalBackup,
  loadSession,
  pendingUpload,
  resolveConflict,
  restoreFromCloud,
  syncToCloud
} from '../../kerja/cloud-client'
import { diffSummary, syncStatusLabel } from '../../kerja/cloud'
import { reveal, successPulse } from '../../kerja/animations'
import { pushToast } from '../../kerja/toasts'

const confirmRestore = ref(false)
const confirmDisconnect = ref(false)
const confirmKeepLocal = ref(false)
const diffOpen = ref(false)
const syncButton = ref<HTMLButtonElement | null>(null)
const restoring = ref(false)

const session = computed(() => cloud.session)
const user = computed(() => session.value?.user)
const repo = computed(() => session.value?.repo)
const isConnected = computed(() => cloud.connected && Boolean(user.value))
const lastSync = computed(() => syncStatusLabel(workspace.meta, new Date()))
const cloudSha = computed(() => workspace.meta.lastSha)
const conflict = computed(() => cloud.conflict)
const remoteLine = computed(() => {
  if (!cloud.remote) return 'Not checked yet'
  if (!cloud.remote.checkedAt) return 'Not checked yet'
  if (!cloud.remote.exists) return 'No cloud file yet'
  return `File present · ${cloud.remote.sha?.slice(0, 7)}`
})

async function doSync() {
  const ok = await syncToCloud()
  if (ok && syncButton.value) successPulse(syncButton.value)
}

async function doRestore() {
  restoring.value = true
  await restoreFromCloud()
  restoring.value = false
  confirmRestore.value = false
}

async function doDisconnect() {
  await disconnectGitHub()
  confirmDisconnect.value = false
}

async function keepLocal() {
  await resolveConflict('keep-local')
  confirmKeepLocal.value = false
}

async function useCloud() {
  const ok = await restoreFromCloud()
  if (ok) diffOpen.value = false
}

function copySha() {
  if (!cloudSha.value) return
  navigator.clipboard
    ?.writeText(cloudSha.value)
    .then(() => pushToast({ tone: 'success', title: 'SHA copied', duration: 2200 }))
    .catch(() => undefined)
}

onMounted(async () => {
  if (!cloud.session && !cloud.sessionLoading) await loadSession()
  reveal(document.querySelectorAll('.kw-main .kw-reveal'), 45)
})
</script>

<template>
  <div class="cloud-tab">
    <header class="kw-section-head kw-reveal" style="margin-bottom: 0.8rem">
      <div>
        <span class="kw-eyebrow">Private GitHub storage</span>
        <h1 style="margin: 0.1rem 0 0; font-size: clamp(1.4rem, 3vw, 1.8rem); letter-spacing: -0.02em">
          Cloud
        </h1>
      </div>
      <span class="kw-chip kw-chip--static">
        <span class="kw-dot" :class="isConnected ? (pendingUpload ? 'kw-dot--pending' : 'kw-dot--ok') : 'kw-dot--idle'" />
        {{ isConnected ? (pendingUpload ? 'Local changes waiting' : 'Connected') : 'Local only' }}
      </span>
    </header>

    <div v-if="cloud.sessionLoading" class="kw-card kw-reveal">
      <p class="kw-hint" style="margin: 0">Checking the GitHub connection…</p>
    </div>

    <!-- Not connected -->
    <template v-else-if="!isConnected">
      <section class="kw-card kw-reveal">
        <div class="kw-account">
          <span class="kw-avatar" style="display: grid; place-items: center; color: var(--md-on-surface-variant)">
            <WorkspaceIcon name="github" :size="24" />
          </span>
          <div>
            <strong>Keep a copy in your own private repository</strong>
            <span class="kw-hint">
              Optional. The workspace is fully usable offline without connecting anything.
            </span>
          </div>
        </div>

        <p class="kw-hint kw-mt-md">
          GitHub acts as personal cloud storage. Kerja stores one versioned JSON
          file in your private repository, so you can move the workspace between
          devices. There is no autosync, no background upload, and no third-party
          database.
        </p>

        <div class="kw-inline kw-mt-md">
          <button type="button" class="kw-btn kw-btn--filled" @click="connectGitHub">
            <WorkspaceIcon name="github" :size="17" />
            Connect GitHub
          </button>
          <button type="button" class="kw-btn kw-btn--outlined" @click="downloadLocalBackup">
            <WorkspaceIcon name="download" :size="17" />
            Download a local backup
          </button>
        </div>

        <div class="kw-notice kw-mt-md">
          <WorkspaceIcon name="lock" :size="18" />
          <span>
            Authentication uses your GitHub App. The access token is kept in an
            encrypted, HttpOnly server session; it is never written to
            localStorage or exposed to page JavaScript.
          </span>
        </div>
        <div v-if="cloud.sessionError" class="kw-notice kw-notice--error kw-mt-sm">
          <WorkspaceIcon name="warning" :size="18" />
          <span>{{ cloud.sessionError }}</span>
        </div>
      </section>

      <section class="kw-card kw-mt-md kw-reveal">
        <header class="kw-card-head">
          <h2>How manual sync works</h2>
        </header>
        <ol class="kw-hint" style="margin: 0; padding-left: 1.1rem; line-height: 1.8">
          <li>Press <strong>Sync to Cloud</strong> when you want to upload this device's workspace.</li>
          <li>On another device, connect GitHub and press <strong>Restore from Cloud</strong>.</li>
          <li>If both devices changed, Kerja stops and asks which copy to keep.</li>
          <li>Nothing is uploaded while you work, and disconnecting keeps local data.</li>
        </ol>
        <p class="kw-hint kw-mt-sm" style="margin-bottom: 0">
          Self-hosting this site? The required Cloudflare Pages variables and the
          GitHub App callback URL are documented in <code>docs/KERJA.md</code>.
        </p>
      </section>
    </template>

    <!-- Connected -->
    <template v-else>
      <section class="kw-card kw-reveal">
        <div class="kw-account">
          <img v-if="user?.avatarUrl" class="kw-avatar" :src="user.avatarUrl" :alt="`${user.login}'s avatar`" />
          <div class="kw-grow">
            <strong>{{ user?.name || user?.login }}</strong>
            <a :href="user?.profileUrl" target="_blank" rel="noopener">@{{ user?.login }} on GitHub</a>
          </div>
          <span class="kw-chip kw-chip--static">
            <span class="kw-dot" :class="pendingUpload ? 'kw-dot--pending' : 'kw-dot--ok'" />
            {{ pendingUpload ? 'Unsynced changes' : 'Up to date' }}
          </span>
        </div>

        <dl class="kw-status-list kw-mt-md">
          <div class="kw-status-row">
            <dt>Repository</dt>
            <dd>
              <a v-if="repo" :href="repo.url" target="_blank" rel="noopener">
                {{ repo.owner }}/{{ repo.name }}
              </a>
              <span v-else>—</span>
            </dd>
          </div>
          <div class="kw-status-row">
            <dt>File</dt>
            <dd><code>{{ repo?.path ?? 'workspace/kerja-workspace.json' }}</code></dd>
          </div>
          <div class="kw-status-row">
            <dt>Branch</dt>
            <dd><code>{{ repo?.branch ?? 'main' }}</code></dd>
          </div>
          <div class="kw-status-row">
            <dt>Last successful sync</dt>
            <dd>{{ lastSync }}</dd>
          </div>
          <div class="kw-status-row">
            <dt>Cloud file</dt>
            <dd>
              <button
                v-if="cloudSha"
                type="button"
                class="kw-btn kw-btn--small"
                style="min-height: 24px; padding: 0 0.4rem; font-family: var(--vp-font-family-mono); font-size: 0.68rem"
                title="Copy the SHA of the file at the last sync"
                @click="copySha"
              >
                {{ cloudSha.slice(0, 7) }}
              </button>
              <span v-else>Not fetched yet</span>
              <span class="kw-hint" style="display: block">{{ remoteLine }}</span>
            </dd>
          </div>
          <div class="kw-status-row">
            <dt>Local changes</dt>
            <dd :style="{ color: pendingUpload ? 'var(--md-primary)' : 'inherit' }">
              {{ pendingUpload ? 'Waiting to be synced' : 'Nothing waiting' }}
            </dd>
          </div>
          <div class="kw-status-row">
            <dt>Storage</dt>
            <dd>{{ workspace.storage === 'indexeddb' ? 'IndexedDB on this device' : workspace.storage === 'localstorage' ? 'localStorage fallback' : 'Session only' }}</dd>
          </div>
        </dl>

        <div v-if="cloud.error" class="kw-notice kw-notice--error kw-mt-sm">
          <WorkspaceIcon name="warning" :size="18" />
          <span>{{ cloud.error }}</span>
        </div>

        <div class="kw-inline kw-mt-md">
          <button
            ref="syncButton"
            type="button"
            class="kw-btn kw-btn--filled"
            :disabled="cloudBusy"
            @click="doSync"
          >
            <WorkspaceIcon name="sync" :size="17" />
            {{ cloud.syncing ? 'Syncing…' : 'Sync to Cloud' }}
          </button>
          <button type="button" class="kw-btn kw-btn--outlined" :disabled="cloudBusy" @click="confirmRestore = true">
            <WorkspaceIcon name="download" :size="17" />
            Restore from Cloud
          </button>
          <button type="button" class="kw-btn" :disabled="cloudBusy" @click="checkCloud()">
            <WorkspaceIcon name="refresh" :size="17" />
            Check cloud
          </button>
        </div>

        <p v-if="workspace.meta.lastResult === 'restored'" class="kw-hint kw-mt-sm" style="margin-bottom: 0">
          This device was last populated from the cloud. Local edits since then are
          waiting until you press Sync.
        </p>
      </section>

      <!-- Conflict -->
      <section v-if="conflict" class="kw-card kw-mt-md kw-reveal" style="border-color: var(--md-error)">
        <header class="kw-card-head">
          <div>
            <span class="kw-eyebrow" style="color: var(--md-error)">Sync paused</span>
            <h2>Both this device and the cloud changed</h2>
          </div>
          <span class="kw-chip kw-chip--static">{{ conflict.summary }}</span>
        </header>
        <p class="kw-hint" style="margin-top: 0">{{ conflict.decision.message }}</p>
        <p class="kw-hint">
          Nothing has been uploaded. Choose deliberately:
          <strong>keep this device</strong> overwrites the cloud copy,
          <strong>use cloud</strong> replaces local tasks, and
          <strong>review</strong> shows exactly what differs.
        </p>
        <div class="kw-inline">
          <button type="button" class="kw-btn kw-btn--filled" :disabled="cloudBusy" @click="confirmKeepLocal = true">
            Keep this device
          </button>
          <button type="button" class="kw-btn kw-btn--outlined" :disabled="cloudBusy" @click="useCloud">
            Use cloud version
          </button>
          <button type="button" class="kw-btn" @click="diffOpen = true">Review differences</button>
        </div>
      </section>

      <section class="kw-card kw-mt-md kw-reveal">
        <header class="kw-card-head">
          <h2>Connection</h2>
        </header>
        <div class="kw-inline">
          <button type="button" class="kw-btn kw-btn--outlined" @click="confirmDisconnect = true">
            <WorkspaceIcon name="lock" :size="16" />
            Disconnect GitHub
          </button>
          <button type="button" class="kw-btn" @click="downloadLocalBackup">
            <WorkspaceIcon name="download" :size="16" />
            Download local backup
          </button>
        </div>
        <p class="kw-hint kw-mt-sm" style="margin-bottom: 0">
          Disconnecting clears the session cookie and revokes the token. Local
          tasks, reminders and settings stay on this device.
        </p>
      </section>

      <section class="kw-card kw-mt-md kw-reveal">
        <header class="kw-card-head">
          <h2>What is stored where</h2>
        </header>
        <dl class="kw-status-list">
          <div class="kw-status-row">
            <dt>This browser</dt>
            <dd>Tasks, subtasks, reminders, settings, weather location (IndexedDB)</dd>
          </div>
          <div class="kw-status-row">
            <dt>Private GitHub repository</dt>
            <dd>One versioned JSON workspace, only after you press Sync</dd>
          </div>
          <div class="kw-status-row">
            <dt>Server</dt>
            <dd>Encrypted HttpOnly session cookie; tokens never reach page scripts</dd>
          </div>
          <div class="kw-status-row">
            <dt>Never uploaded</dt>
            <dd>Browser notification permission, pinned shortcuts, search history</dd>
          </div>
        </dl>
      </section>
    </template>

    <ConfirmDialog
      :open="confirmRestore"
      title="Replace this device with the cloud copy?"
      message="All tasks and settings on this device will be replaced by the workspace stored in GitHub. Download a local backup first if you are unsure."
      confirm-label="Restore from cloud"
      :busy="restoring"
      @cancel="confirmRestore = false"
      @confirm="doRestore"
    />

    <ConfirmDialog
      :open="confirmKeepLocal"
      title="Upload this device and overwrite the cloud?"
      :message="`The cloud workspace will be replaced by this device's copy (${workspace.tasks.length} tasks). The other device's cloud changes will be lost from the file, though they remain in its local workspace.`"
      confirm-label="Keep this device"
      danger
      :busy="cloud.syncing"
      @cancel="confirmKeepLocal = false"
      @confirm="keepLocal"
    />

    <ConfirmDialog
      :open="confirmDisconnect"
      title="Disconnect GitHub?"
      message="This removes the GitHub session from this browser. Your local workspace stays, and nothing is deleted from the repository."
      confirm-label="Disconnect"
      danger
      @cancel="confirmDisconnect = false"
      @confirm="doDisconnect"
    />

    <BaseDialog
      :open="diffOpen && Boolean(conflict)"
      title="Review the difference"
      :description="conflict ? `${diffSummary(conflict.diff)} · local ${conflict.diff.counts.localTotal} tasks, cloud ${conflict.diff.counts.cloudTotal} tasks` : ''"
      wide
      @close="diffOpen = false"
    >
      <template v-if="conflict">
        <p class="kw-hint" style="margin-top: 0">
          Left is this device, right is the cloud copy. Nothing changes until you
          choose an action.
        </p>
        <div v-if="conflict.diff.settings.length" class="kw-diff-item">
          <header>
            <strong>Settings</strong>
            <span class="kw-diff-kind">settings</span>
          </header>
          <div v-for="change in conflict.diff.settings" :key="change.field" class="kw-diff-field">
            <strong>{{ change.label }}</strong>
            <div>
              <span>{{ change.local }}</span>
              <em>{{ change.cloud }}</em>
            </div>
          </div>
        </div>
        <div class="kw-diff">
          <div v-for="item in conflict.diff.tasks" :key="item.id" class="kw-diff-item">
            <header>
              <strong>{{ item.title }}</strong>
              <span class="kw-diff-kind">
                {{ item.kind === 'local-only' ? 'only here' : item.kind === 'cloud-only' ? 'only in cloud' : 'changed' }}
              </span>
            </header>
            <div v-for="change in item.changes" :key="change.field" class="kw-diff-field">
              <strong>{{ change.label }}</strong>
              <div>
                <span>{{ change.local }}</span>
                <em>{{ change.cloud }}</em>
              </div>
            </div>
          </div>
        </div>
        <p v-if="!conflict.diff.tasks.length && !conflict.diff.settings.length" class="kw-hint">
          The visible content matches; only file bookkeeping differs. Sync again to refresh the baseline.
        </p>
      </template>
      <template #footer>
        <button type="button" class="kw-btn kw-btn--outlined" :disabled="cloudBusy" @click="useCloud">
          Use cloud version
        </button>
        <button type="button" class="kw-btn kw-btn--filled" :disabled="cloudBusy" @click="diffOpen = false; confirmKeepLocal = true">
          Keep this device
        </button>
      </template>
    </BaseDialog>
  </div>
</template>
