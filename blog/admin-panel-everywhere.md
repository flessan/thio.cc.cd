---
title: "Admin Panel Everywhere: from endpoints to a workspace"
author:
  name: M. Thio Saputra
date: "2026-10-18"
description: Designing a self-hostable admin workspace for APIs, CRUD operations, OpenAPI, and structured data.
image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&h=840&q=85"
---

<BlogCover src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&h=840&q=85" alt="Analytics charts and dashboards on computer screens" credit="Image via Unsplash" license-url="https://unsplash.com/license" />

# Admin Panel Everywhere: from endpoints to a workspace

<PostMeta date="2026-10-18"></PostMeta>

An API is useful when an application can consume it. But while building or maintaining a service, developers also need a place to inspect records, test requests, understand schemas, and make small changes without writing a temporary tool for every task.

**[Admin Panel Everywhere](https://github.com/flessan/admin-panel-everywhere)** is a self-hostable workspace built around that idea.

## A control room, not another dashboard screenshot

The project brings API exploration and data management into one interface. The intended workflow includes importing an OpenAPI description, browsing endpoints, performing CRUD operations, and editing JSON data in a spreadsheet-like view.

The experience should feel like a practical developer tool: navigation that stays understandable, forms with clear labels, visible loading and error states, and controls that don't vanish before someone has finished using them. Good UX here means fewer mysteries between an API response and the data a person is trying to change.

## Connect it to a real backend

The project is designed to work with **[Telegraph Cloud](https://github.com/flessan/Telegraph-Cloud)**, so that an admin UI and its storage/API layer can be developed together. The goal is a simple connection flow: configure the service, provide the API details, and let the workspace discover what it can do.

API descriptions can also fail for reasons outside the editor itself, such as CORS policies or inaccessible schema URLs. Those are part of the integration experience, not merely a problem to hide behind a generic error message. A useful tool should explain the failure and offer a next step.

## Keep the scope honest

Admin Panel Everywhere is still being refined. The goal is not to replace every full-featured API platform; it is to provide a lightweight, self-hostable control surface that can travel with small projects.

Follow the ongoing work in the [repository](https://github.com/flessan/admin-panel-everywhere).

<PostNav></PostNav>
