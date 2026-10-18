---
title: "Kontekstual: code in the language we speak"
author:
  name: M. Thio Saputra
date: "2026-10-18"description: Designing Kontekstual, a beginner-friendly programming language that reads naturally in Indonesian.
image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&h=840&q=85"
---

<BlogCover src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&h=840&q=85" alt="Source code displayed on a computer screen" credit="Image via Unsplash" license-url="https://unsplash.com/license" />

# Kontekstual: code in the language we speak

<PostMeta date="2026-10-18"></PostMeta>

Most programming languages begin with English keywords, braces, semicolons, and a wall of punctuation. That is completely reasonable for experienced developers, but it can feel like an extra language to learn before a beginner can even express an idea.

**[Kontekstual](https://github.com/flessan/kontekstual)** starts from a different question: what if a programming language could read more like Indonesian?

## Start with a sentence

The current syntax direction favors short, structured Indonesian phrases instead of translating every symbol literally.

```text
Tetapkan umur bernilai 20.
Tetapkan nama bernilai "Thio".
Tetapkan aktif bernilai benar.
```

Those three lines express a number, text, and a boolean value. The chosen file extension is `.konteks`.

The goal isn't to make code behave like unrestricted natural language. A compiler still needs predictable grammar. Kontekstual aims for a middle ground: familiar words, consistent structure, and rules that a computer can parse without guessing what the writer intended.

## Friendly syntax still needs firm rules

A language for beginners should be welcoming, not mysterious. Punctuation, comments, values, naming, and error messages all need a consistent place in the grammar. That's why the specification matters just as much as the syntax examples.

The project is being shaped around a native compiler and executable output, but the grammar and language specification need to become stable before that goal can be delivered reliably. The current work is about making the foundation coherent rather than claiming a finished compiler too early.

## Built to learn in public

Kontekstual is also a way to study how programming languages fit together: lexical rules, parsing, type values, diagnostics, and eventually code generation. Every design decision has to answer two questions: is it easy for a beginner to read, and is it unambiguous for a compiler?

Follow the design and implementation in the [Kontekstual repository](https://github.com/flessan/kontekstual). The language is still evolving, and feedback on its grammar is especially useful at this stage.

<PostNav></PostNav>
