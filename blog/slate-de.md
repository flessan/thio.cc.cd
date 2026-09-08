---
title: the command line is your d3sktop
author:
  name: M. Thio Saputra
date: "2026-09-04"
description: Building slate-de — a CLI-based, pane-oriented Wayland desktop environment in Rust
image: /images/covers/slate-de.png
---

<BlogCover src="/images/covers/slate-de.png" />

# the command line is your d3sktop

<PostMeta date="2026-09-04"></PostMeta>

> "The command line is no longer an application; it is your d3sktop."

That's the one-line pitch of [slate-de](https://github.com/flessan/slate-de), my desktop environment experiment — written in **Rust**, on **Wayland**.

## The idea

Most desktop environments treat the terminal as one app among many. slate-de flips that: the terminal *is* the environment. It is CLI-based and pane-oriented, built for power users who already live in their keyboard — a desktop where panes, not windows, are the unit of work.

It is very much an early experiment. But the direction is set, and it is the most ambitious thing I've started.

## Why build a desktop environment?

Because the best way to understand a system is to build one. Working on slate-de forced me deep into the Wayland protocol — compositors, surfaces, seats, the whole ecosystem — and deep into Rust: ownership, traits, async. Those are the two things on my [learning list](../now.md) right now, and slate-de is where they meet.

It also fits a theme in my work: taking the terminal seriously as a place to live. [walru](https://github.com/flessan/walru) changes Hyprpaper wallpapers from the terminal. [MyCom](https://github.com/flessan/MyCom) is a modern `.bashrc` setup for Linux developers. [nurlaily](https://github.com/flessan/nurlaily) turns a terminal into a daily journal. slate-de is the logical endpoint: the terminal as the desktop itself.

## Where it stands

- Pane-based layout, CLI-first interaction
- Wayland compositor work in progress
- Topics on the repo: `cli`, `desktop-environment`, `wayland`, `wayland-compositor`

If you're poking at Wayland or Rust and want to compare notes, the repo is public and my [Telegram](https://t.me/flethio) is open. And if terminals aren't your thing — don't worry, the [campfire](./gdips-reborn.md) is elsewhere.

<PostNav></PostNav>
