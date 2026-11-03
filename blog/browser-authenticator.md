---
title: "Could an authenticator live in the browser?"
author:
  name: M. Thio Saputra
date: "2026-11-03"
description: "A small design exploration into browser-based OTP apps, extension portability, secret storage, and the difference between a working code generator and a trustworthy authenticator."
image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&h=840&q=85"
imageAlt: "A person using a mobile device while working at a desk"
inLanguage: "en"
keywords:
  - "browser authenticator"
  - "OTP"
  - "TOTP"
  - "browser extension"
  - "cross-platform apps"
---

<BlogCover src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&h=840&q=85" alt="A person using a mobile device while working at a desk" credit="Image via Unsplash" license-url="https://unsplash.com/license" />

# Could an authenticator live in the browser?

<PostMeta date="2026-11-03"></PostMeta>
<PostTools></PostTools>

I have been thinking about a familiar little tool: an authenticator that generates six-digit one-time passwords. The usual answer is to install a phone app, but seeing projects such as [Authenticator Extension](https://github.com/Authenticator-Extension/Authenticator) made me curious about a different direction.

What would it take to make that experience browser-based and useful across platforms?

## The interface is the easy part

A first version sounds small: add an account, give it a label, show the current code, and make copying it effortless. A browser extension could keep the authenticator close to the websites where the code is needed. A standalone web app could offer a similar interface without living inside one browser.

But the interface is not the product. The important part is the secret used to generate each code, how it is stored, and what happens when someone changes devices or loses their browser profile.

## Cross-platform is more than sharing components

A shared web interface can reduce duplicated UI work, but browser extensions and installed web apps do not have identical capabilities. Their storage APIs, permission models, installation flows, and available platform integrations differ.

That means the design should start with a clear boundary: which parts are portable application logic, and which parts belong to a specific browser or operating system? Keeping the code generator independent from the UI would make that boundary easier to test.

## Security has to shape the first version

The most sensitive information is not the six-digit code on screen. It is the underlying account secret. A useful design would need to consider at least:

- How secrets are imported, including scanning or entering setup information.
- How they are stored locally and what can access them.
- Whether backup and device migration exist, and how exported data is protected.
- What the user sees when storage is unavailable, corrupted, or deleted.

Browser storage should not be treated as a magic security vault. A compromised browser profile or an unsafe export can put the account secrets at risk. Convenient synchronization is not worth silently copying secrets somewhere they should not be.

## Start small, but be honest about the limits

For an experiment, I would begin with one supported OTP flow, local storage, clear labels, a visible refresh countdown, and a careful import/export story. Then I would test the same core logic through a browser extension and a standalone interface before promising broad platform support.

I have not turned this idea into a finished authenticator. For now, it is a design question worth exploring: the browser can be a genuinely useful cross-platform surface, but security decisions need to come before the feature checklist.

<PostNav></PostNav>
