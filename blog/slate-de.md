---
title: the command line is your d3sktop
author:
  name: M. Thio Saputra
date: 2026-09-04
head:
  - - meta
    - property: og:type
      content: website
  - - meta
    - property: og:title
      content: the command line is your d3sktop
  - - meta
    - property: og:image
      content: https://thio.cc.cd/images/covers/slate-de.png
  - - meta
    - property: og:url
      content: https://thio.cc.cd/blog/slate-de
  - - meta
    - property: og:description
      content: Building slate-de — a CLI-based, pane-oriented Wayland desktop environment in Rust
  - - meta
    - name: twitter:card
      content: summary_large_image
---

<BlogCover src="/images/covers/slate-de.png" />

# the command line is your d3sktop

<p class="post-meta mono">by M. Thio Saputra · 2026-09-04 · Banjarmasin, WITA</p>

> "The command line is no longer an application; it is your d3sktop."

That's the one-line pitch of
[slate-de](https://github.com/flessan/slate-de), my desktop environment
experiment — currently at **v0.1.0-alpha**, written in **Rust**, on
**Wayland**.

## The idea

Most desktop environments treat the terminal as one app among many. slate-de
flips that: the terminal *is* the environment. It is CLI-based and
pane-oriented, built for power users who already live in their keyboard — a
desktop where panes, not windows, are the unit of work.

It is very much an alpha. But the direction is set, and it is the most
ambitious thing on my [drawing board](https://projects.thio.qzz.io).

## Why build a desktop environment?

Because the best way to understand a system is to build one. Working on
slate-de forced me deep into the Wayland protocol — compositors, surfaces,
seats, the whole ecosystem — and deep into Rust: ownership, traits, async.
Those are the two things on my [learning list](/now) right now, and slate-de
is where they meet.

It also fits a theme in my work: taking the terminal seriously as a place to
live. [walru](https://github.com/flessan/walru) changes Hyprpaper wallpapers
from the terminal. [MyCom](https://github.com/flessan/MyCom) is a modern
`.bashrc` setup for Linux developers. [nurlaily](https://github.com/flessan/nurlaily)
turns a terminal into a daily journal. slate-de is the logical endpoint: the
terminal as the desktop itself.

## Where it stands

- **v0.1.0-alpha** — early, honest, and in the open
- Pane-based layout, CLI-first interaction
- Wayland compositor work in progress
- Topics on the repo: `cli`, `desktop-environment`, `wayland`, `wayland-compositor`

If you're poking at Wayland or Rust and want to compare notes, the repo is
public and my [Telegram](https://t.me/flethio) is open. And if terminals
aren't your thing — don't worry, the [campfire](./gdips-reborn.md) is
elsewhere.

<style scoped>
.post-meta {
  margin: -1.2rem 0 2.4rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}
</style>
