---
title: "Making an old desktop style reusable on the web"
author:
  name: M. Thio Saputra
date: "2026-11-03"
description: "What building and publishing 8.css has taught me about visual details, maintaining a fork, documentation, package names, and the unglamorous work of shipping."
image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&h=840&q=85"
imageAlt: "A laptop displaying a code editor on a desk"
inLanguage: "en"
keywords:
  - "8.css"
  - "CSS library"
  - "Windows 8 UI"
  - "npm package"
  - "open source maintenance"
---

<BlogCover src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&h=840&q=85" alt="A laptop displaying a code editor on a desk" credit="Image via Unsplash" license-url="https://unsplash.com/license" />

# Making an old desktop style reusable on the web

<PostMeta date="2026-11-03"></PostMeta>
<PostTools></PostTools>

Some interface styles are memorable because of their details: the shape of a window, the weight of a title bar, the spacing around a button, or the way a focused control looks. I have always enjoyed those little desktop-era details, so I started working on **[8.css](https://github.com/flessan/8.css)**, a Windows 8-inspired CSS library.

The project continues an older, abandoned 8.css idea that took inspiration from the 7.css project. I wanted to keep the useful direction alive, give it a proper home, and make the fork's identity and documentation clear.

## Nostalgia is not a component system

It is easy to make a page look vaguely old-school with a border and a square button. Making a reusable library is harder. The details need to work together: typography, spacing, controls, window-like surfaces, focus states, disabled states, and the small variations that make an interface feel consistent.

The goal is not to recreate an entire operating system in a stylesheet. It is to give web projects a set of familiar building blocks without forcing every developer to draw the same controls from scratch.

That also means resisting shortcuts. If the example page looks convincing but the actual form controls feel unrelated, the library has not done its job.

## A fork should explain where it came from

Forking an idea is not a reason to hide its history. The repository should explain that it continues an abandoned project, credit the inspiration, and distinguish the work maintained here from the original. Clear attribution is part of making a project understandable to its next contributor.

The same applies to documentation. A small CSS library still needs installation instructions, examples, a clear package entry point, and notes about what is and is not included. Otherwise, users are left reading source files just to discover how to start.

## Publishing is a separate engineering task

Getting the CSS to work locally is only one part of shipping a package. Package identity, version numbers, registry behavior, release automation, and trusted publishing all introduce their own constraints.

The installable package is published under the scoped name **`@flessan/8.css`**. Keeping the package name consistent matters because a user should not need to guess which registry or repository contains the version they installed.

I also want the release workflow to be boring in the best possible way: one version, repeatable checks, and predictable release assets. Registry quirks are not especially exciting, but they are still part of maintaining software that other people can install.

## Small libraries deserve maintenance too

A CSS library can look finished in a screenshot and still be incomplete as a project. It needs examples that stay current, styles that behave predictably, and a release process that does not surprise users.

That is the part I want to keep improving in 8.css. The visual style is the fun reason to start; consistency, documentation, and distribution are what make it useful beyond my own experiments.

The code and current instructions live in the [8.css repository](https://github.com/flessan/8.css).

<PostNav></PostNav>
