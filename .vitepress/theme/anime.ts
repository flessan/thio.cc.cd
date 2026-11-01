type AnimeModule = {
  animate: (targets: string | Element | NodeListOf<Element>, params: Record<string, unknown>) => unknown
  stagger: (value: number, options?: Record<string, unknown>) => unknown
}

const animeUrl = 'https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm'
let animePromise: Promise<AnimeModule | null> | undefined

function loadAnime(): Promise<AnimeModule | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (animePromise) return animePromise
  animePromise = import(/* @vite-ignore */ animeUrl)
    .then((module) => (module.default || module) as AnimeModule)
    .catch(() => null)
  return animePromise
}

function isReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function animateWorkspace(anime: AnimeModule) {
  if (isReducedMotion()) return
  const root = document.querySelector<HTMLElement>('.kerja-page, .kerja-workspace')
  if (!root) return

  anime.animate(root.querySelectorAll('.workspace-title, .shortcuts-title'), {
    opacity: [0, 1], translateY: [22, 0], rotateX: [-12, 0], delay: anime.stagger(90), duration: 850, ease: 'out(4)'
  })

  const cards = root.querySelectorAll<HTMLElement>("[class*='shortcut'], [class*='card']")
  anime.animate(cards, {
    opacity: [0, 1], translateY: [26, 0], scale: [.94, 1], delay: anime.stagger(38, { from: 'center' }), duration: 720, ease: 'out(4)'
  })

  anime.animate(root.querySelectorAll<HTMLElement>("[class*='category'], .kerja-theme-panel"), {
    opacity: [0, 1], translateX: [-18, 0], delay: anime.stagger(70), duration: 650, ease: 'out(3)'
  })
}

function installWorkspaceHover(anime: AnimeModule) {
  document.addEventListener('pointerover', (event) => {
    if (isReducedMotion()) return
    const target = event.target
    if (!(target instanceof Element)) return
    const card = target.closest<HTMLElement>(".kerja-page [class*='shortcut'], .kerja-page [class*='card'], .kerja-workspace [class*='shortcut'], .kerja-workspace [class*='card']")
    if (!card || card.dataset.animeBound === 'true') return
    card.dataset.animeBound = 'true'
    card.addEventListener('pointermove', (move) => {
      const rect = card.getBoundingClientRect()
      const x = ((move.clientX - rect.left) / rect.width - .5) * 3
      const y = ((move.clientY - rect.top) / rect.height - .5) * -3
      anime.animate(card, { rotateX: y, rotateY: x, duration: 260, ease: 'out(3)' })
    })
    card.addEventListener('pointerleave', () => {
      anime.animate(card, { rotateX: 0, rotateY: 0, duration: 520, ease: 'out(4)' })
    })
  }, true)
}

export function installAnimeMotion() {
  if (typeof window === 'undefined') return
  void loadAnime().then((anime) => {
    if (!anime) return
    const run = () => {
      anime.animate('.VPNavBarMenuLink, .VPNavBarSearch, .VPSocialLink', {
        opacity: [0, 1], translateY: [-10, 0], delay: anime.stagger(55), duration: 650, ease: 'outExpo'
      })
      animateWorkspace(anime)
      installWorkspaceHover(anime)
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true })
    else requestAnimationFrame(run)
  })
}
