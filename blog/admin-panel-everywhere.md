---
title: "Admin Panel Everywhere: API workspace and JSON editor"
author:
  name: M. Thio Saputra
date: "2026-10-18"
description: Admin Panel Everywhere is a self-hostable API workspace for OpenAPI import, CRUD operations, and editing structured JSON data.
image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&h=840&q=85"
imageAlt: "Data visualizations displayed on a computer monitor"
inLanguage: "en"
keywords:
  - "Admin Panel Everywhere"
  - "OpenAPI tools"
  - "API management"
  - "CRUD interface"
  - "JSON editor"
---

<BlogCover src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&h=840&q=85" alt="Analytics charts and dashboards on computer screens" credit="Image via Unsplash" license-url="https://unsplash.com/license" />

# Admin Panel Everywhere: from endpoints to a workspace

<PostMeta date="2026-10-18"></PostMeta>
<PostTools></PostTools>

## APIs need a place to be explored

An API can be perfectly usable from code and still be a pain to inspect while you're building it. Sometimes I need to check a response, edit a record, verify a schema, or test an endpoint, and writing a temporary script for every little task doesn't scale particularly well.

**[Admin Panel Everywhere](https://github.com/flessan/admin-panel-everywhere)** is my attempt to bring those jobs into one self-hostable workspace. The point isn't another dashboard full of charts. It's a practical place to connect to a service and work with the data behind it.

## The workflow I'm aiming for

The project brings together API exploration, OpenAPI import, CRUD operations, and a spreadsheet-like editor for structured JSON. Instead of hopping between a schema file, a request tool, and a separate data editor, the idea is to move through those tasks in one interface.

That only feels useful if the UX is clear. Connection settings should explain what they expect. Loading and empty states should tell the user what's happening. Destructive changes need to be explicit. When something fails, an actionable error is more valuable than a vague red message that effectively says “good luck”.

## Integration is where the rough edges show

Admin Panel Everywhere is designed to work alongside **[Telegraph Cloud](https://github.com/flessan/Telegraph-Cloud)**, but the API workstation also needs to make sense when connecting to other services and schemas.

OpenAPI imports can fail because a URL isn't reachable from the browser or the server doesn't permit cross-origin requests. Those cases are not always bugs in the editor itself, but they still affect the user's workflow. I want the tool to make the source of the problem understandable and suggest a next step, such as checking the schema URL, hosting the document somewhere reachable, or handling CORS on the API side.

That's a design requirement, not a claim that every edge case is already solved.

## Keeping the scope realistic

The project is still being refined. I'm not trying to replace every full-featured API platform; I'd rather make a smaller workspace that is easy to self-host and useful alongside the projects I already maintain.

The more complicated features will only be worth adding if they help people understand their APIs and data with less friction. A clean CRUD table is nice, but a clear connection model, safe editing flow, and error explanation matter just as much.

Follow the source and implementation notes in the [Admin Panel Everywhere repository](https://github.com/flessan/admin-panel-everywhere).

<PostNav></PostNav>
