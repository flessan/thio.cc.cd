---
title: "Telegraph Cloud: files, APIs, and a Telegram-backed backend"
author:
  name: M. Thio Saputra
date: "2026-10-18"
description: Building a Cloudflare-native storage service that turns Telegram-backed files into a practical API for other projects.
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&h=840&q=85"
---

<BlogCover src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&h=840&q=85" alt="Rows of servers representing cloud infrastructure" credit="Image via Unsplash" license-url="https://unsplash.com/license" />

# Telegraph Cloud: files, APIs, and a Telegram-backed backend

<PostMeta date="2026-10-18"></PostMeta>

Small projects often reach the same awkward point: the front end is ready, but every new service needs somewhere to store uploads, manage files, and expose data through an API. Running a separate database and object-storage stack for every experiment is a lot of infrastructure to maintain.

**[Telegraph Cloud](https://github.com/flessan/Telegraph-Cloud)** is my attempt to make that backend reusable across the sites and tools I build.

## One backend for several kinds of work

The project combines Cloudflare's edge platform with Telegram-backed file storage. The goal is to make uploads and stored objects usable through stable URLs and documented API routes, while keeping the backend lightweight enough for small projects.

The broader service includes a Drive-like console, project-based storage, S3-compatible access, API keys, and a document API. Those interfaces are meant to help different projects share one storage layer rather than each inventing their own.

## “Database” doesn't mean PostgreSQL

One detail worth making explicit: Telegraph Database is a JSON/document API, not a PostgreSQL-compatible server. It doesn't expose SQL, the PostgreSQL wire protocol, or pretend to be a drop-in Postgres replacement. The point is to offer a simple way for an application to read and write structured data using the project's API.

Being specific about that boundary makes the product easier to integrate. A clear API contract is more useful than a familiar label that promises the wrong thing.

## Make migration boring

The service also has to coexist with existing projects. Legacy upload routes and behavior can't just disappear because a new console looks better. That means compatibility, predictable object URLs, and documentation matter just as much as the storage implementation.

The long-term idea is simple: a project such as **Admin Panel Everywhere** or another small web app should be able to connect to a backend without rebuilding file storage from scratch.

Telegraph Cloud is under active development. Explore the implementation and current docs in the [GitHub repository](https://github.com/flessan/Telegraph-Cloud).

<PostNav></PostNav>
