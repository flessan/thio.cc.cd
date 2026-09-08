<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface CmdLine {
  cmd: string
  out: string[]
}

const script: CmdLine[] = [
  { cmd: 'whoami', out: ['muhammad-thio-saputra — aka "Flessan"'] },
  {
    cmd: 'cat ./identity.txt',
    out: [
      'developer · student · musician · editor',
      'maker of small things that become larger systems'
    ]
  },
  {
    cmd: 'ls ~/projects',
    out: ['gdips/  slate-de/  resontune/  teksreceh/  walru/  … 44 in total']
  },
  { cmd: 'echo $MOTTO', out: ['"I learn by making things real."'] }
]

const prompt = 'flessan@thio:~$'
const typed = ref<CmdLine[]>([])
const current = ref('')
const output = ref<string[]>([])
const done = ref(false)

let state: 'typing' | 'output' | 'pause' | 'restart' = 'typing'
let lineIndex = 0
let charIndex = 0
let timer: ReturnType<typeof setTimeout> | undefined

function finish() {
  typed.value = script.slice(0, -1)
  current.value = script[script.length - 1].cmd
  output.value = script[script.length - 1].out
  lineIndex = script.length
  done.value = true
}

// Render the complete terminal during SSR so the content exists without JS
if (typeof window === 'undefined') {
  finish()
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function step() {
  if (lineIndex >= script.length) {
    state = 'restart'
    timer = setTimeout(() => {
      typed.value = []
      current.value = ''
      output.value = []
      lineIndex = 0
      charIndex = 0
      done.value = false
      state = 'typing'
      step()
    }, 5200)
    return
  }

  const line = script[lineIndex]

  if (state === 'typing') {
    charIndex++
    current.value = line.cmd.slice(0, charIndex)
    if (charIndex >= line.cmd.length) {
      state = 'output'
      timer = setTimeout(step, 260)
      return
    }
    timer = setTimeout(step, 34 + Math.random() * 46)
    return
  }

  if (state === 'output') {
    typed.value = script.slice(0, lineIndex)
    output.value = line.out
    lineIndex++
    charIndex = 0
    current.value = ''
    state = 'typing'
    timer = setTimeout(step, 420)
    return
  }
}

onMounted(() => {
  if (prefersReducedMotion) {
    finish()
    return
  }
  // restart the typing animation from scratch on the client
  typed.value = []
  current.value = ''
  output.value = []
  lineIndex = 0
  charIndex = 0
  done.value = false
  state = 'typing'
  step()
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="term">
    <div class="term-bar">
      <span class="term-dot term-dot-red"></span>
      <span class="term-dot term-dot-yellow"></span>
      <span class="term-dot term-dot-green"></span>
      <span class="term-title mono">flessan@thio: ~</span>
    </div>
    <div class="term-body mono">
      <template v-for="(line, i) in typed" :key="'t' + i">
        <p class="term-line">
          <span class="term-prompt">{{ prompt }}</span>
          <span class="term-cmd">{{ line.cmd }}</span>
        </p>
        <p v-for="(o, j) in line.out" :key="'o' + i + '-' + j" class="term-out">{{ o }}</p>
      </template>

      <p v-if="!done" class="term-line">
        <span class="term-prompt">{{ prompt }}</span>
        <span class="term-cmd">{{ current }}</span><span class="term-cursor" aria-hidden="true"></span>
      </p>
      <template v-else>
        <p v-for="(o, j) in output" :key="'fo' + j" class="term-out">{{ o }}</p>
        <p class="term-line">
          <span class="term-prompt">{{ prompt }}</span>
          <span class="term-cursor" aria-hidden="true"></span>
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.term {
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.9rem;
  overflow: hidden;
  background: #131016;
  box-shadow: 0 24px 60px -34px rgba(0, 0, 0, 0.7);
}

.term-bar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 0.9rem;
  background: #1c1720;
  border-bottom: 1px solid #2b2230;
}

.term-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}

.term-dot-red {
  background: #ff5f57;
}

.term-dot-yellow {
  background: #febc2e;
}

.term-dot-green {
  background: #28c840;
}

.term-title {
  margin-left: 0.6rem;
  font-size: 0.72rem;
  color: #8d7f8f;
  letter-spacing: 0.04em;
}

.term-body {
  padding: 1.1rem 1.25rem 1.3rem;
  font-size: 0.84rem;
  line-height: 1.75;
  min-height: 13.5rem;
}

.term-line {
  margin: 0;
  color: #e8ded2;
  white-space: pre-wrap;
  word-break: break-word;
}

.term-prompt {
  color: #6ec48a;
  margin-right: 0.6rem;
}

.term-cmd {
  color: #f3e9da;
  font-weight: 500;
}

.term-out {
  margin: 0 0 0 0.2rem;
  color: #b9a7ae;
  white-space: pre-wrap;
  word-break: break-word;
}

.term-cursor {
  display: inline-block;
  width: 0.55em;
  height: 1.05em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--flessan-red, #c8102e);
  animation: term-blink 1.05s step-end infinite;
}

@keyframes term-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .term-cursor {
    animation: none;
  }
}
</style>
