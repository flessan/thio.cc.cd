---
title: "Porting GoAMPP to Linux without leaving Windows behind"
author:
  name: M. Thio Saputra
date: "2026-11-03"
description: "A practical reflection on cross-platform desktop development: preserving the existing Windows build while giving the Linux version its own sensible behavior and packaging."
image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&h=840&q=85"
imageAlt: "A close-up of a circuit board and electronic components"
inLanguage: "en"
keywords:
  - "GoAMPP"
  - "Linux application"
  - "cross-platform development"
  - "desktop software"
  - "release packaging"
---

<BlogCover src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&h=840&q=85" alt="A close-up of a circuit board and electronic components" credit="Image via Unsplash" license-url="https://unsplash.com/license" />

# Porting GoAMPP to Linux without leaving Windows behind

<PostMeta date="2026-11-03"></PostMeta>
<PostTools></PostTools>

Adding Linux support to an existing desktop project sounds like a platform checklist: compile it, package it, and call it done. In practice, the interesting work begins after the first successful build.

With **[GoAMPP](https://github.com/flessan/goampp-linux)**, the requirement I keep coming back to is simple: give Linux users a proper experience without damaging the Windows 10 and 11 build that already exists.

## The operating system is part of the product

Different platforms bring different expectations. File paths, permissions, executable locations, package formats, window behavior, and default conventions can all change how a user experiences the same feature.

A path that looks tidy on one operating system may be confusing on another. A button that fits in a Windows-sized window may disappear when the application is resized. A workflow that assumes one directory layout can become frustrating when users organize their files differently.

Those details are not edge cases when they affect the main screen. They are part of the platform port.

## Keep the shared behavior, adapt the edges

I want the project to share as much core behavior as practical, while keeping platform-specific decisions explicit. That avoids two bad outcomes: duplicating the entire application just to support another operating system, or pretending that every operating system behaves identically.

The UI deserves the same care. Familiar spacing, clear labels, readable status, and controls that stay inside the window matter more than simply making the screen resemble another platform. Visual consistency should make the application easier to understand, not hide platform differences.

## Packaging is part of the user experience

A build is not very useful if users cannot install or update it comfortably. Linux distribution also means thinking about the formats people expect, where configuration and application data belong, and how release artifacts are presented.

I prefer separate, clearly named assets over a confusing archive nested inside another archive. A release page should tell users which file is intended for their system instead of making them reverse-engineer the build pipeline.

## Protect the existing platform

The most important regression test for a port is not only “does Linux launch?” It is also “did the old Windows workflow stay intact?”

That is why I treat the Windows build as a constraint, not something to revisit after Linux is finished. Shared changes should be checked against both environments, and platform-specific code should remain as narrow as possible.

GoAMPP is a reminder that cross-platform support is a promise to users on more than one system. The goal is not to make every platform identical; it is to make each one feel deliberately supported.

Development notes and source code are available in the [GoAMPP Linux repository](https://github.com/flessan/goampp-linux).

<PostNav></PostNav>
