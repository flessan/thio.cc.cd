export type BlogPost = {
  slug: string
  title: string
  date: string
  description: string
  category: string
  image: string
  imageAlt: string
  language: 'en' | 'id'
  topics: string[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'browser-authenticator',
    title: 'Could an authenticator live in the browser?',
    date: '2026-11-03',
    description: 'A small design exploration into browser-based OTP apps, extension portability, secret storage, and the difference between a working code generator and a trustworthy authenticator.',
    category: 'Web security & tooling',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&h=840&q=85',
    imageAlt: 'A person using a mobile device while working at a desk',
    language: 'en',
    topics: ['authenticator', 'OTP', 'browser extension', 'cross-platform', 'security']
  },
  {
    slug: '8css-shipping-a-fork',
    title: 'Making an old desktop style reusable on the web',
    date: '2026-11-03',
    description: 'What building and publishing 8.css has taught me about visual details, maintaining a fork, documentation, package names, and the unglamorous work of shipping.',
    category: 'Frontend & packaging',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&h=840&q=85',
    imageAlt: 'A laptop displaying a code editor on a desk',
    language: 'en',
    topics: ['CSS', '8.css', 'npm', 'packaging', 'open source']
  },
  {
    slug: 'goampp-linux-cross-platform',
    title: 'Porting GoAMPP to Linux without leaving Windows behind',
    date: '2026-11-03',
    description: 'A practical reflection on cross-platform desktop development: preserving the existing Windows build while giving the Linux version its own sensible behavior and packaging.',
    category: 'Linux & desktop software',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&h=840&q=85',
    imageAlt: 'A close-up of a circuit board and electronic components',
    language: 'en',
    topics: ['Linux', 'GoAMPP', 'cross-platform', 'desktop', 'release engineering']
  },
  {
    slug: 'compact-mode-is-not-the-layout',
    title: 'Compact mode is not the whole interface',
    date: '2026-11-03',
    description: 'A desktop UI lesson from AdbPureFlow: a layout that looks good in a compact window still needs to work at normal sizes, when resized, and when content grows.',
    category: 'UI & desktop UX',
    image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1600&h=840&q=85',
    imageAlt: 'A collection of interface layouts and design elements on a screen',
    language: 'en',
    topics: ['AdbPureFlow', 'Fyne', 'desktop UI', 'responsive layout', 'UX']
  },
  {
    slug: 'erd-without-database',
    title: 'ERD tetap berguna meski aplikasinya tanpa database',
    date: '2026-11-03',
    description: 'Catatan singkat dari tugas kejuruan: mengapa rancangan ERD tetap masuk akal ketika aplikasi Android memakai data konstan dan tidak menyimpan data ke database.',
    category: 'Programming & education',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&h=840&q=85',
    imageAlt: 'Catatan dan dokumen perencanaan di atas meja kerja',
    language: 'id',
    topics: ['ERD', 'Android Studio', 'education', 'data modeling', 'Indonesian']
  },
  {
    slug: 'kontekstual-language',
    title: 'Kontekstual: Indonesian programming language experiment',
    date: '2026-10-18',
    description: 'The story behind Kontekstual, an Indonesian-syntax programming language experiment inspired by a school programming lesson and a goal of exploring classroom use.',
    category: 'Programming & education',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&h=840&q=85',
    imageAlt: 'Computer screen showing source code in a development environment',
    language: 'en',
    topics: ['programming', 'language design', 'education', 'Indonesian', 'learning']
  },
  {
    slug: 'telegraph-cloud',
    title: 'Telegraph Cloud: Telegram-backed storage and APIs',
    date: '2026-10-18',
    description: 'Telegraph Cloud is a Cloudflare-native storage project with Telegram-backed files, documented APIs, and a JSON document API for small web projects.',
    category: 'Backend & APIs',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&h=840&q=85',
    imageAlt: 'Server racks representing the infrastructure behind a cloud service',
    language: 'en',
    topics: ['storage', 'APIs', 'Cloudflare', 'developer tools']
  },
  {
    slug: 'admin-panel-everywhere',
    title: 'Admin Panel Everywhere: API workspace and JSON editor',
    date: '2026-10-18',
    description: 'Admin Panel Everywhere is a self-hostable API workspace for OpenAPI import, CRUD operations, and editing structured JSON data.',
    category: 'Developer tools',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&h=840&q=85',
    imageAlt: 'Data visualizations displayed on a computer monitor',
    language: 'en',
    topics: ['APIs', 'developer tools', 'Telegraph Cloud', 'OpenAPI']
  },
  {
    slug: 'anto-ltg-toolkit',
    title: 'ANTO-LTG: Windows repair toolkit for drivers and software',
    date: '2026-10-18',
    description: 'ANTO-LTG is a Windows maintenance toolkit in development, focused on drivers, trusted installers, compatibility notes, and repair workflows.',
    category: 'Windows & repair',
    image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1600&h=840&q=85',
    imageAlt: 'Computer components arranged on a repair workbench',
    language: 'en',
    topics: ['Windows', 'drivers', 'maintenance', 'developer tools']
  },
  {
    slug: 'hello-internet',
    title: 'hello, internet: meet Flessan, developer and student',
    date: '2026-09-08',
    description: 'Meet Thio Saputra, known as Flessan: a student developer in Banjarmasin building web apps, community tools, Linux experiments, and personal websites.',
    category: 'Personal notes',
    image: '/images/covers/hello-internet.webp',
    imageAlt: 'Cover artwork for the hello internet introduction',
    language: 'en',
    topics: ['personal', 'web', 'learning', 'story']
  },
  {
    slug: 'slate-de',
    title: 'slate-de: Rust and Wayland desktop environment experiment',
    date: '2026-09-04',
    description: 'slate-de is an early Rust and Wayland desktop environment experiment that explores terminal-first, keyboard-driven workspaces built around panes.',
    category: 'Linux & systems',
    image: '/images/covers/slate-de.webp',
    imageAlt: 'Cover artwork for the slate-de terminal-focused desktop experiment',
    language: 'en',
    topics: ['Linux', 'Rust', 'Wayland', 'desktop', 'learning']
  },
  {
    slug: 'teksreceh',
    title: 'teksreceh: Indonesian internet text generator',
    date: '2026-09-01',
    description: 'teksreceh is an Indonesian internet text generator for alay, UwU, Rimsvek, binary text, and other playful ways of typing online.',
    category: 'Internet culture',
    image: '/images/covers/teksreceh.webp',
    imageAlt: 'Cover artwork for teksreceh, a collection of Indonesian internet text styles',
    language: 'id',
    topics: ['Indonesian internet', 'text tools', 'web toy', 'React', 'web']
  },
  {
    slug: 'gdips-reborn',
    title: 'GDIPS: Geometry Dash Indonesia Private Server',
    date: '2026-08-28',
    description: 'The story of GDIPS, the Geometry Dash Indonesia Private Server, from a free-server directory to an open-source community project.',
    category: 'Community & games',
    image: '/images/covers/gdips-campfire.webp',
    imageAlt: 'Cover artwork for the GDIPS Geometry Dash community project',
    language: 'en',
    topics: ['Geometry Dash', 'community', 'open source', 'story']
  },
  {
    slug: 'internet-of-thio',
    title: 'Many small sites: a personal web development ecosystem',
    date: '2026-08-24',
    description: 'Why Flessan keeps multiple small websites for different projects, how each site serves a purpose, and what building them teaches along the way.',
    category: 'Personal notes',
    image: '/images/covers/internet-of-thio.webp',
    imageAlt: 'Cover artwork representing the collection of small websites in the Flessan ecosystem',
    language: 'id',
    topics: ['personal', 'web', 'learning', 'story']
  }
]
