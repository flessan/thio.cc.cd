// Shared data for the Flessan site — facts sourced from public profiles:
// github.com/flessan, thio.qzz.io, gdpshub.com, gdips.pages.dev

export interface Project {
  name: string
  desc: string
  tags: string[]
  repo?: string
  home?: string
  featured?: boolean
}

export const projects: Record<string, Project[]> = {
  featured: [
    {
      name: 'GDIPS',
      desc: 'Open-source, community-driven Geometry Dash Indonesia Private Server. "Not the biggest. Not the fanciest. But built with heart."',
      tags: ['Open source', 'Community', 'Geometry Dash'],
      repo: 'https://github.com/flessan/GDIPS',
      home: 'https://gdips.pages.dev',
      featured: true
    },
    {
      name: 'slate-de',
      desc: 'A CLI-based, pane-oriented Wayland desktop environment written in Rust. "The command line is no longer an application; it is your d3sktop."',
      tags: ['Rust', 'Wayland', 'Desktop'],
      repo: 'https://github.com/flessan/slate-de',
      featured: true
    },
    {
      name: 'resontune',
      desc: 'Community-driven music, without the paywall. A streaming platform built for listeners, not subscriptions.',
      tags: ['TypeScript', 'Music', 'MIT'],
      repo: 'https://github.com/flessan/resontune',
      home: 'https://tune.thio.cc.cd',
      featured: true
    }
  ],
  gd: [
    {
      name: 'GDIPS',
      desc: 'Geometry Dash Indonesia Private Server — open-source and community-driven, rebuilt as "GDIPS Reborn".',
      tags: ['GPL-3.0', 'Community'],
      repo: 'https://github.com/flessan/GDIPS',
      home: 'https://gdips.pages.dev'
    },
    {
      name: 'Freedom-List',
      desc: '"Pomni Pomni Pomni" — a list of free Geometry Dash servers. Where the GDPS adventure started.',
      tags: ['JavaScript'],
      repo: 'https://github.com/flessan/Freedom-List'
    },
    {
      name: 'gmd2txt',
      desc: 'Remux GDShare files into .txt Fresh Files — a local tool that speeds up level production.',
      tags: ['HTML', 'Tooling'],
      repo: 'https://github.com/flessan/gmd2txt'
    },
    {
      name: 'NovaUi-Web-Downloads',
      desc: 'Download page for Nova UI — a Geode-based Geometry Dash texture pack that re-skins the game menus.',
      tags: ['JavaScript', 'Geode'],
      repo: 'https://github.com/flessan/NovaUi-Web-Downloads'
    },
    {
      name: 'freedomdotgamerdotgd',
      desc: 'Fork of the web version of Geometry Dash ripped from geometrydash.com, tweaked to run more levels.',
      tags: ['HTML', 'Fork'],
      repo: 'https://github.com/flessan/freedomdotgamerdotgd'
    },
    {
      name: 'Classic-Mobile-Website',
      desc: 'Fork of the official Classic 7 website used on classic7.lol — with plans to make it responsive.',
      tags: ['HTML', 'Fork'],
      repo: 'https://github.com/flessan/Classic-Mobile-Website'
    }
  ],
  tools: [
    {
      name: 'AdbPureFlow',
      desc: 'Lightweight Go utility that automates the Android APK lifecycle: ADB setup, install, package-ID auto-detect, clean uninstalls.',
      tags: ['Go', 'ADB', 'GPL-3.0'],
      repo: 'https://github.com/flessan/AdbPureFlow',
      home: 'https://adbpure.pages.dev'
    },
    {
      name: 'RemoraSFTP',
      desc: 'Explore and edit your SFTP/FTPs files inside your browser.',
      tags: ['Go', 'MIT'],
      repo: 'https://github.com/flessan/RemoraSFTP'
    },
    {
      name: 'RECQR',
      desc: 'Realtime QR scanner — an open QR platform: live scanning (jsQR), generation, history, favorites, and safety checks.',
      tags: ['TypeScript', 'MIT'],
      repo: 'https://github.com/flessan/RECQR',
      home: 'https://flessan.github.io/RECQR/'
    },
    {
      name: 'teksreceh',
      desc: 'The most absurd text generator in Indonesia — a museum of +62 netizen typing: Alay, UwU, Rimsvek, Binary.',
      tags: ['TypeScript', 'Fun'],
      repo: 'https://github.com/flessan/teksreceh',
      home: 'https://text.thio.qzz.io'
    },
    {
      name: 'TMY',
      desc: 'Transcript Mode for YouTube — transcripts styled like Spotify lyrics.',
      tags: ['JavaScript'],
      repo: 'https://github.com/flessan/TMY',
      home: 'https://tmy.pages.dev'
    },
    {
      name: 'Tyibon',
      desc: 'Online twibbon maker — fast, private, lightweight, no watermark. Not a social network.',
      tags: ['TypeScript', 'Next.js'],
      repo: 'https://github.com/flessan/Tyibon',
      home: 'https://tyibon.pages.dev'
    },
    {
      name: 'cekram',
      desc: 'Universal RAM monitor + auto-purge. Multi-language (ID/EN), cross-platform, with a CI pipeline.',
      tags: ['Python', 'MIT'],
      repo: 'https://github.com/flessan/cekram'
    },
    {
      name: 'nurlaily',
      desc: 'Journal daily from the terminal — automatic timestamps, mood tracker, tags — then publish it as a static site.',
      tags: ['HTML', 'CLI'],
      repo: 'https://github.com/flessan/nurlaily'
    },
    {
      name: 'GitAPITaker',
      desc: 'Turn Git-Hub-Lab-Tea (and more) URLs into API responses.',
      tags: ['GPL-3.0'],
      repo: 'https://github.com/flessan/GitAPITaker'
    },
    {
      name: 'telegram_to_api',
      desc: '"Yea, I hate WhatsApp." A lightweight Cloudflare-native bridge that turns Telegram channel posts into a self-hosted JSON API.',
      tags: ['JavaScript', 'Cloudflare'],
      repo: 'https://github.com/flessan/telegram_to_api'
    },
    {
      name: 'this-shit-is-fake',
      desc: 'Check emails, services, or any form of fraud — impersonation, scams, and deceptive activities.',
      tags: ['HTML', 'MIT'],
      repo: 'https://github.com/flessan/this-shit-is-fake'
    },
    {
      name: 'IndoScript',
      desc: 'JavaScript with Indonesian syntax.',
      tags: ['JavaScript', 'MIT'],
      repo: 'https://github.com/flessan/IndoScript'
    }
  ],
  web: [
    {
      name: 'Anonimbuz',
      desc: 'A text-first, privacy-focused anonymous social platform — built from scratch: UI design, frontend, backend auth & moderation.',
      tags: ['Full-stack', 'Privacy'],
      home: 'https://anon.thio.qzz.io'
    },
    {
      name: 'Dotfiles Library',
      desc: 'Linux rice configurations organized into a web platform, so they are easy to browse and share. TypeScript + Cloudflare Workers.',
      tags: ['TypeScript', 'Cloudflare'],
      home: 'https://dotfiles.qzz.io'
    },
    {
      name: 'resontune',
      desc: 'Community-driven music, without the paywall.',
      tags: ['TypeScript', 'MIT'],
      repo: 'https://github.com/flessan/resontune',
      home: 'https://tune.thio.cc.cd'
    },
    {
      name: 'kotacet',
      desc: '"Chat secara Real-Time! Gratis!" — the idea is real; the code is still a twinkle in the repo.',
      tags: ['GPL-3.0', 'Idea'],
      repo: 'https://github.com/flessan/kotacet'
    },
    {
      name: 'Rakyat',
      desc: '"We\'re Fed Up" — a collection of factual information affected by diversion. A documentation experiment.',
      tags: ['HTML', 'Experiment'],
      repo: 'https://github.com/flessan/Rakyat'
    },
    {
      name: 'grenefy-ui',
      desc: 'React + Tailwind component library with a neo-brutalism approach: thick, high-contrast, vibrant.',
      tags: ['TypeScript', 'React'],
      repo: 'https://github.com/flessan/grenefy-ui'
    },
    {
      name: 'Games',
      desc: 'All the browser games — including lintasindo, a traffic-simulation visual novel.',
      tags: ['HTML', 'MIT'],
      repo: 'https://github.com/flessan/Games',
      home: 'https://games.thio.qzz.io'
    },
    {
      name: 'Rubik',
      desc: 'A Rubik\'s Cube site: timer, 3×3 tutorial, algorithm pages — and a secret 3D solver at /secret/3x3.',
      tags: ['HTML', 'MIT'],
      repo: 'https://github.com/flessan/Rubik'
    }
  ],
  linux: [
    {
      name: 'slate-de',
      desc: 'A CLI-based, pane-oriented Wayland desktop environment in Rust. v0.1.0-alpha.',
      tags: ['Rust', 'Wayland'],
      repo: 'https://github.com/flessan/slate-de'
    },
    {
      name: 'walru',
      desc: 'Terminal-based wallpaper changer for Hyprpaper, written in Rust.',
      tags: ['Rust', 'GPL-3.0'],
      repo: 'https://github.com/flessan/walru'
    },
    {
      name: 'MyCom',
      desc: 'MyComLutr — a modern, productive .bashrc setup for Linux developers (Arch-first): Starship prompt, ble.sh, and friends.',
      tags: ['Shell', 'Config'],
      repo: 'https://github.com/flessan/MyCom'
    },
    {
      name: 'HTMLWallarper',
      desc: 'Static HTML live wallpapers for KDE Plasma: nightycloud, nightycloudv2, underwotar.',
      tags: ['Nunjucks', 'KDE'],
      repo: 'https://github.com/flessan/HTMLWallarper'
    },
    {
      name: 'memreduct-linux',
      desc: 'Fork of henrypp/memreduct — lightweight real-time memory management to monitor and clean system memory.',
      tags: ['C', 'Fork'],
      repo: 'https://github.com/flessan/memreduct-linux'
    }
  ],
  school: [
    {
      name: 'Skenpat',
      desc: 'A digital services portal for SMKN 4 Banjarmasin students — class schedules, extracurriculars, and school news in one platform.',
      tags: ['School', 'Portal'],
      repo: 'https://github.com/skenpat/skenpat'
    },
    {
      name: 'Website PMR SMKN 4',
      desc: 'The official website of the school\'s Palang Merah Remaja (Red Cross Youth) — activity info and documents. PHP + MySQL, still running.',
      tags: ['PHP', 'MySQL'],
      repo: 'https://github.com/flessan/smk4-projects'
    },
    {
      name: 'green',
      desc: 'The eighth project by Thio Saputra, class X SMKN 4 Banjarmasin — a website for the environmental org (Green Gen).',
      tags: ['HTML', 'School'],
      repo: 'https://github.com/flessan/green'
    },
    {
      name: 'arduino-uno',
      desc: 'Arduino UNO sketches for class XI RPL 1 — first sketch: cleaning EEPROM.',
      tags: ['C++', 'Arduino'],
      repo: 'https://github.com/flessan/arduino-uno'
    }
  ],
  translations: [
    {
      name: 'muffon (ID)',
      desc: 'Indonesian translation of muffon — an advanced multi-source music streaming + discovery desktop client. Free, clean, no login, no ads.',
      tags: ['Vue', 'i18n'],
      repo: 'https://github.com/flessan/muffon'
    },
    {
      name: 'Open-Motion-Reimagined',
      desc: 'Fork of Hada45/Open-Motion — a free and open-source web-based motion graphics and video editor.',
      tags: ['HTML', 'Fork'],
      repo: 'https://github.com/flessan/Open-Motion-Reimagined'
    },
    {
      name: 'yt-transcript-distiller-id',
      desc: 'Fork of michaelruck/yt-transcript-distiller — a Firefox add-on that fetches YouTube transcripts and summarizes them with Gemini AI.',
      tags: ['JavaScript', 'Fork'],
      repo: 'https://github.com/flessan/yt-transcript-distiller-id'
    },
    {
      name: 'is-a.dev register',
      desc: 'Fork of the is-a.dev register — grab a sweet-looking .is-a.dev subdomain. (In use: fles.is-a.dev.)',
      tags: ['JavaScript', 'Fork'],
      repo: 'https://github.com/flessan/register'
    }
  ]
}

export interface SocialLink {
  name: string
  handle: string
  url: string
  note?: string
}

export const socials: SocialLink[] = [
  { name: 'GitHub', handle: '@flessan', url: 'https://github.com/flessan', note: '47 public repos & counting' },
  { name: 'Instagram', handle: '@flethio', url: 'https://www.instagram.com/flethio' },
  { name: 'Threads', handle: '@flethio', url: 'https://www.threads.com/flethio' },
  { name: 'YouTube', handle: '@flethio', url: 'https://youtube.com/@flethio' },
  { name: 'TikTok', handle: '@thio2009_', url: 'https://tiktok.com/@thio2009_' },
  { name: 'Telegram', handle: '@flethio', url: 'https://t.me/flethio', note: 'Direct messages' },
  { name: 'WhatsApp Channel', handle: 'Flessan', url: 'https://whatsapp.com/channel/0029VbAoWYi7T8bQVepYkn1a', note: 'Quick updates & thoughts' },
  { name: 'Discord', handle: 'GDIPS Community', url: 'https://discord.gg/6HEyQBcM6E', note: 'Share levels, report bugs, hang out' },
  { name: 'LinkedIn', handle: '/in/flessan', url: 'https://www.linkedin.com/in/flessan' },
  { name: 'Wikipedia', handle: 'Pengguna:Flessan', url: 'https://id.wikipedia.org/wiki/Pengguna:Flessan', note: 'Editing & preserving knowledge' },
  { name: 'Blog', handle: 'fless.hashnode.dev', url: 'https://fless.hashnode.dev', note: 'Longer write-ups' },
  { name: 'Email', handle: 'tio@cc.cc', url: 'mailto:tio@cc.cc', note: 'The fastest way to reach me' }
]

export interface EcosystemRoom {
  title: string
  desc: string
  url: string
  tag: string
}

export const ecosystem: EcosystemRoom[] = [
  {
    title: 'thio.qzz.io',
    desc: 'The main house — biography, portfolio, writing, and doors to every other room.',
    url: 'https://thio.qzz.io',
    tag: 'Home'
  },
  {
    title: 'projects.thio.qzz.io',
    desc: 'The project rack — all 44 project objects, searchable and categorized.',
    url: 'https://projects.thio.qzz.io',
    tag: 'Projects'
  },
  {
    title: 'lab.thio.qzz.io',
    desc: 'Experiments — canvas sketches, visual systems, and live wallpapers.',
    url: 'https://lab.thio.qzz.io',
    tag: 'Lab'
  },
  {
    title: 'games.thio.qzz.io',
    desc: 'Playable work — browser games, guarded by TAKO the octopus.',
    url: 'https://games.thio.qzz.io',
    tag: 'Games'
  },
  {
    title: 'music.thio.qzz.io',
    desc: 'Listening and making — real sources, a browser instrument, no invented tracks.',
    url: 'https://music.thio.qzz.io',
    tag: 'Music'
  },
  {
    title: 'tools.thio.qzz.io',
    desc: 'Small browser utilities that keep your input local.',
    url: 'https://tools.thio.qzz.io',
    tag: 'Tools'
  },
  {
    title: 'archive.thio.qzz.io',
    desc: 'Old work is part of the work — screenshots, assignments, abandoned interfaces, kept visible.',
    url: 'https://archive.thio.qzz.io',
    tag: 'Archive'
  },
  {
    title: 'text.thio.qzz.io',
    desc: 'teksreceh — the most absurd text generator in Indonesia.',
    url: 'https://text.thio.qzz.io',
    tag: 'Experiment'
  },
  {
    title: 'anon.thio.qzz.io',
    desc: 'Anonimbuz — text-first anonymous social platform with a privacy focus.',
    url: 'https://anon.thio.qzz.io',
    tag: 'Web app'
  },
  {
    title: 'dotfiles.qzz.io',
    desc: 'The Dotfiles Library — Linux rice as a browsable web platform.',
    url: 'https://dotfiles.qzz.io',
    tag: 'Linux'
  },
  {
    title: 'tune.thio.cc.cd',
    desc: 'resontune — community-driven music, without the paywall.',
    url: 'https://tune.thio.cc.cd',
    tag: 'Music app'
  },
  {
    title: 'gdips.pages.dev',
    desc: 'GDIPS — the Geometry Dash Indonesia Private Server campfire.',
    url: 'https://gdips.pages.dev',
    tag: 'Community'
  },
  {
    title: 'flessan.github.io',
    desc: '"index of /" — a Material Design project index fed live from the GitHub API.',
    url: 'https://flessan.github.io',
    tag: 'Index'
  },
  {
    title: 'flessan.pages.dev',
    desc: 'The first little site — programs, photos, and projects. Where the ecosystem began.',
    url: 'https://flessan.pages.dev',
    tag: 'Archive'
  },
  {
    title: 'fless.hashnode.dev',
    desc: 'Longer writing — tools, learnings, and build notes.',
    url: 'https://fless.hashnode.dev',
    tag: 'Writing'
  }
]
