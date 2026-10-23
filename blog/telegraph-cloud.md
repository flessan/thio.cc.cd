---
title: "Telegraph Cloud: Telegram-backed storage and APIs"
author:
  name: M. Thio Saputra
date: "2026-10-18"
description: Telegraph Cloud is a Cloudflare-native storage project with Telegram-backed files, documented APIs, and a JSON document API for small web projects.
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&h=840&q=85"
imageAlt: "Server racks representing the infrastructure behind a cloud storage service"
inLanguage: "en"
keywords:
  - "Telegraph Cloud"
  - "Telegram-backed storage"
  - "Cloudflare storage"
  - "document API"
  - "S3-compatible storage"
---

<BlogCover src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&h=840&q=85" alt="Rows of servers representing cloud infrastructure" credit="Image via Unsplash" license-url="https://unsplash.com/license" />

# Telegraph Cloud: files, APIs, and a Telegram-backed backend

<PostMeta date="2026-10-18"></PostMeta>
<PostTools></PostTools>

## One less backend to reinvent

A lot of my projects need the same building blocks: somewhere to upload images, a stable URL to retrieve them, a place to store structured data, and an API that doesn't require every frontend to implement its own storage layer.

Maintaining a separate stack for every small experiment gets old quickly. So I started building **[Telegraph Cloud](https://github.com/flessan/Telegraph-Cloud)** as shared infrastructure for the websites and tools in my ecosystem.

The service is built around Cloudflare's platform and Telegram-backed file storage. The intent is to expose stored files and data through predictable routes, while keeping the integration straightforward enough for small projects.

## Files, projects, and APIs

The broader direction includes a console for managing objects, project-based storage, documented API routes, API keys, S3-compatible access, and a JSON/document API. These pieces solve different problems, but they're meant to fit together: configure a project, store its files or records, then use the documented interface from an application.

That integration matters more to me than adding features just to make the checklist look longer. If a URL changes unexpectedly, a legacy endpoint disappears, or the docs describe a different response than the API returns, the frontend pays for it.

## The word “database” needs a boundary

One distinction is important: **Telegraph Database is a JSON/document API, not PostgreSQL.** It doesn't provide SQL, the PostgreSQL wire protocol, or drop-in compatibility with a Postgres client. Calling something a database doesn't make those capabilities interchangeable.

The goal is narrower: let applications work with structured documents through this project's own API. Stating that boundary clearly is useful both for developers choosing a backend and for me while deciding what the service should support.

## Compatibility is part of the work

Telegraph Cloud grew out of existing storage behavior, so modernizing the console can't come at the cost of unexpectedly breaking older integrations. Routes such as uploads and file retrieval need to remain predictable while the internals evolve. Documentation, error messages, access rules, and migration paths are part of the product, not chores to postpone until after the UI looks finished.

The same principle applies to reliability claims. A feature being planned or present in the code is not the same as having every deployment path tested under real-world conditions. Telegraph Cloud is still under active development, and its docs and implementation should be checked together.

## What comes next

I want services such as **[Admin Panel Everywhere](https://github.com/flessan/admin-panel-everywhere)** to connect to a backend without each project rebuilding uploads, URLs, and data access from scratch. Getting there means keeping the API contract explicit and making its limits as visible as its capabilities.

The implementation and current project notes are in the [Telegraph Cloud repository](https://github.com/flessan/Telegraph-Cloud). If you're evaluating it for a project, use the repository's current documentation as the source of truth for what's supported today.

<PostNav></PostNav>
