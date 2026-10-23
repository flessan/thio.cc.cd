---
title: "slate-de: Rust and Wayland desktop environment experiment"
author:
  name: M. Thio Saputra
date: "2026-09-04"
description: "slate-de is an early Rust and Wayland desktop environment experiment that explores terminal-first, keyboard-driven workspaces built around panes."
image: /images/covers/slate-de.png
imageAlt: "Cover artwork for the slate-de terminal-focused desktop experiment"
inLanguage: "en"
keywords:
  - "slate-de"
  - "Wayland desktop environment"
  - "Rust desktop"
  - "terminal-first desktop"
  - "Linux development"
---

<BlogCover src="/images/covers/slate-de.png" alt="Cover for the slate-de desktop environment experiment" />

# the command line is your d3sktop

<PostMeta date="2026-09-04"></PostMeta>
<PostTools></PostTools>

> “The command line is no longer an application; it is your d3sktop.”

That's the idea behind **[slate-de](https://github.com/flessan/slate-de)**: a desktop-environment experiment written in **Rust** for **Wayland**, with a CLI-first and pane-oriented way of thinking about work.

## Panes, not a pile of windows

Most desktop environments treat the terminal as one app among many. slate-de explores flipping that relationship: the terminal is the environment, and panes, not traditional app windows, are the unit of work.

The concept is intentionally opinionated. Keyboard-focused workflows can be fast for people who already live in a terminal, but that doesn't automatically make them right for everyone. The interesting challenge is figuring out how much of a desktop can be expressed through panes and commands before the experience becomes harder instead of easier.

## Why take on a desktop environment?

Because reading protocol docs only gets you so far. Building slate-de has been a way to study the Wayland ecosystem, compositors, surfaces, seats, and how applications interact with the display, and to practice Rust concepts such as ownership, traits, and asynchronous work.

It also connects to other tools in my ecosystem. [walru](https://github.com/flessan/walru) works with wallpapers from the terminal, [MyCom](https://github.com/flessan/MyCom) is a shell configuration project, and [nurlaily](https://github.com/flessan/nurlaily) turns a terminal into a daily journal. slate-de is a much larger experiment in the same direction: what happens when the terminal stops being just one tool on the desktop?

## Where it stands

This is early-stage work, not a ready-to-recommend replacement for a daily desktop. The project is exploring pane-based interaction while compositor work on Wayland continues. The repository's current state is the best place to check what actually runs today.

The hardest part is not making the terminal look like a desktop. It's making the underlying systems cooperate reliably, then making the interaction understandable enough that the idea is more than a clever demo.

If you're exploring Rust, Wayland, or terminal-oriented interfaces, the [slate-de repository](https://github.com/flessan/slate-de) is public and open for discussion. And if terminals aren't your thing, that's fine too; the rest of the internet still has windows.

<PostNav></PostNav>
