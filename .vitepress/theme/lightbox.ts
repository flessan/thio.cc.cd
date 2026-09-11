// Global image lightbox - click any content image to view it full-size.
// Zero dependencies; styles are injected from here so the theme's
// style.css stays untouched (the site keeps its original look - the
// lightbox only appears after a click).
//
// - click an image in the docs area -> dimmed overlay with the full image
// - close with Esc, click outside the image, or the ✕ button
// - cursor hint (zoom-in) on hoverable images
// - skips tiny icons (< 128px) and images already at full size

const CSS = `
.lb-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.82);
  cursor: zoom-out;
  animation: lb-fade 0.18s ease-out;
}
@keyframes lb-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.lb-overlay img {
  max-width: min(100%, 1400px);
  max-height: calc(100vh - 48px);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.4);
  cursor: zoom-out;
}
.lb-close {
  position: fixed;
  top: 16px;
  right: 20px;
  border: none;
  background: rgb(255 255 255 / 0.12);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
}
.lb-close:hover {
  background: rgb(255 255 255 / 0.24);
}
.lb-zoomable {
  cursor: zoom-in;
}
`

let installed = false

export function installLightbox(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)

  let overlay: HTMLDivElement | null = null

  function close() {
    overlay?.remove()
    overlay = null
    document.removeEventListener('keydown', onKey)
    document.body.style.overflow = ''
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close()
  }

  function open(src: string, alt: string) {
    overlay = document.createElement('div')
    overlay.className = 'lb-overlay'
    overlay.addEventListener('click', close)

    const img = document.createElement('img')
    img.src = src
    img.alt = alt
    img.decoding = 'async'
    overlay.appendChild(img)

    const btn = document.createElement('button')
    btn.className = 'lb-close'
    btn.type = 'button'
    btn.setAttribute('aria-label', 'Close image')
    btn.textContent = '✕'
    btn.addEventListener('click', close)
    overlay.appendChild(btn)

    document.body.appendChild(overlay)
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
  }

  // delegate: works for images rendered later (live feeds, previews, SPA nav)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (target.tagName !== 'IMG') return
    const img = target as HTMLImageElement

    const doc = img.closest('.vp-doc, .VPHero, .container')
    if (!doc) return

    // skip tiny icons/avatars and the navbar
    if (img.closest('.VPNavBar, .VPFooter')) return
    if ((img.naturalWidth || img.width) < 128 && (img.naturalHeight || img.height) < 128) return

    e.preventDefault()
    open(img.currentSrc || img.src, img.alt || '')
  })

  // hover cursor hint (also for images added later)
  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement
    if (target.tagName !== 'IMG') return
    const img = target as HTMLImageElement
    if (img.closest('.vp-doc') && !img.closest('.VPNavBar, .VPFooter')) {
      img.classList.add('lb-zoomable')
    }
  })
}
