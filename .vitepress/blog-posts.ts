export type BlogPost = {
  slug: string
  title: string
  date: string
  description: string
  category: string
  image: string
  topics: string[]
}

// One catalogue drives the blog directory, RSS feed, and article navigation.
// Keep factual publishing metadata here aligned with each post's frontmatter.
export const blogPosts: BlogPost[] = [
  {
    slug: 'kontekstual-language',
    title: 'Kontekstual: code in the language we speak',
    date: '2026-10-18',
    description: 'A programming-language experiment born from a school lesson, with a long-term goal of making programming concepts more approachable in Indonesian.',
    category: 'Programming & education',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&h=630&q=85',
    topics: ['programming', 'language design', 'education', 'Indonesian', 'learning']
  },
  {
    slug: 'telegraph-cloud',
    title: 'Telegraph Cloud: files, APIs, and a Telegram-backed backend',
    date: '2026-10-18',
    description: 'A reusable storage layer for small projects, with clear boundaries between file storage, APIs, and document data.',
    category: 'Backend & APIs',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&h=630&q=85',
    topics: ['storage', 'APIs', 'Cloudflare', 'developer tools']
  },
  {
    slug: 'admin-panel-everywhere',
    title: 'Admin Panel Everywhere: from endpoints to a workspace',
    date: '2026-10-18',
    description: 'Building a self-hostable workspace for exploring APIs, editing structured data, and understanding integration errors.',
    category: 'Developer tools',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&h=630&q=85',
    topics: ['APIs', 'developer tools', 'Telegraph Cloud', 'OpenAPI']
  },
  {
    slug: 'anto-ltg-toolkit',
    title: 'ANTO-LTG: a toolkit for the Windows repair bench',
    date: '2026-10-18',
    description: 'A Windows maintenance toolkit idea built around trustworthy downloads, compatibility notes, and repeatable workflows.',
    category: 'Windows & repair',
    image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&h=630&q=85',
    topics: ['Windows', 'drivers', 'maintenance', 'developer tools']
  },
  {
    slug: 'hello-internet',
    title: 'hello, internet',
    date: '2026-09-08',
    description: 'A personal introduction to Thio, the little corners of the web I build, and what this site is for.',
    category: 'Personal notes',
    image: '/images/covers/hello-internet.webp',
    topics: ['personal', 'web', 'learning', 'story']
  },
  {
    slug: 'slate-de',
    title: 'the command line is your d3sktop',
    date: '2026-09-04',
    description: 'An early Rust and Wayland experiment exploring what a terminal-first, pane-oriented desktop could become.',
    category: 'Linux & systems',
    image: '/images/covers/slate-de.webp',
    topics: ['Linux', 'Rust', 'Wayland', 'desktop', 'learning']
  },
  {
    slug: 'teksreceh',
    title: 'teksreceh: a museum of +62 typing',
    date: '2026-09-01',
    description: 'A playful archive of Indonesian internet typing styles, from alay and UwU to reversed text and binary.',
    category: 'Internet culture',
    image: '/images/covers/teksreceh.webp',
    topics: ['Indonesian internet', 'text tools', 'web toy', 'React', 'web']
  },
  {
    slug: 'gdips-reborn',
    title: 'GDIPS: a digital campfire',
    date: '2026-08-28',
    description: 'The story of a Geometry Dash server project growing from a directory into a community effort.',
    category: 'Community & games',
    image: '/images/covers/gdips-campfire.webp',
    topics: ['Geometry Dash', 'community', 'open source', 'story']
  },
  {
    slug: 'internet-of-thio',
    title: 'Many small sites',
    date: '2026-08-24',
    description: 'Why I keep separate small websites for different ideas, and how building them has become a way to learn.',
    category: 'Personal notes',
    image: '/images/covers/internet-of-thio.webp',
    topics: ['personal', 'web', 'learning', 'story']
  }
]
