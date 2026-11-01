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

export function installAnimeMotion() {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  void loadAnime().then((anime) => {
    if (!anime) return

    const run = () => {
      anime.animate('.VPNavBarMenuLink, .VPNavBarSearch, .VPSocialLink', {
        opacity: [0, 1],
        translateY: [-10, 0],
        delay: anime.stagger(55),
        duration: 650,
        ease: 'outExpo'
      })

      anime.animate('.vp-doc .motion-reveal:not(.is-visible)', {
        opacity: [0, 1],
        translateY: [18, 0],
        delay: anime.stagger(45),
        duration: 720,
        ease: 'out(4)'
      })
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true })
    } else {
      requestAnimationFrame(run)
    }
  })
}
