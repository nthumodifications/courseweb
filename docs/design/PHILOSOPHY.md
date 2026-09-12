# NTHUMods Design Philosophy

> This document decides arguments. If a screen disagrees with it, the screen is wrong.

## What NTHUMods is

NTHUMods is **the campus, answered**.

It is not a portal, not a dashboard, not a social product, not a brochure. It is the
utility a NTHU student opens for eight seconds while walking between buildings, one
thumb, in Traditional Chinese, on a 390px screen, to find out _what is next and where_.

Everything else — course search, grades, venues, food, the map — is the same act:
a question a student has, answered with the least ceremony possible.

The product is made by students, for students, and it should feel like it: honest,
fast, unglamorous, and quietly warm. Not corporate. Not cute. Not a toy.

**The UI should scream: someone who actually walks this campus built this for you.**

## The five principles

Every rule in `LANGUAGE.md` descends from one of these. Cite the number in review.

### 1. 答案先行 — Answer First

The top of a screen is for the answer, not the furniture. Titles, filters, tabs,
banners and promos come after the thing the student came for.

- A student must see real content within the first screen-height, always.
- Page chrome costs one line. Never two, never a hero.
- If a screen cannot state the one question it answers, it should not exist.

### 2. 一次就好 — Say It Once

The same fact never appears twice on a screen. The same empty state never repeats.

- Five days with no class is **one** row, not five identical celebrations.
- If the sidebar already says "沒有即將到來的行程", the content column does not.
- One sponsor placement per screen. One call to action per region.

Repetition is not emphasis. It is noise that makes the product feel unfinished.

### 3. 同一塊布 — One Cloth

The whole app is cut from one piece of fabric. No page invents its own layout.

- One page shell. One page header. One card. One empty state. One loading state.
- A page is a composition of shared parts, never a bespoke canvas.
- If a page needs something new, it goes into the system first, then the page.

Consistency is not a constraint on creativity here — it is the product's credibility.
A student who sees five different page styles concludes five different people built
it and nobody is in charge.

### 4. 紫色是動詞 — Purple Is a Verb

NTHU purple means _you are here_ or _you can act_. It is never decoration.

- Primary marks: active navigation, the primary action, focus, the now-marker, selection.
- Everything else is ink on paper: `foreground` and `muted-foreground`.
- Color that is not purple must carry data meaning — a course's colour, a bus line,
  a status. Never a mood.

An interface where everything is coloured tells the student nothing about what matters.

### 5. 安靜的手藝 — Quiet Craft

Personality lives in words and in 150 milliseconds of motion, not in decoration.

- Copy may be warm ("放假吧~"). Chrome may not be loud.
- Emoji belong to content, never to headings, buttons, or section titles.
- Motion confirms an action; it never performs.
- Density is a feature: this is a tool students use standing up. Small text, tight
  rhythm, no wasted vertical space, no empty right half of the screen.

## What this rules out, permanently

- Marketing pages that look like a different product than the app.
- Pastel stat tiles, brand-coloured buttons, gradient heroes, decorative illustration.
- Bare spinners and "載入中…" text where the shape of the answer is already known.
- English-only screens in a Chinese-first product.
- A screen whose right 60% is empty on desktop.
- Any new colour, radius, shadow, or type size that is not in `LANGUAGE.md`.

## On customisation

The settings page offers fifteen themes, seven fonts, five radii, five backgrounds
and a density scale. That is not an identity — it is an admission that we never
chose one. Customisation stays, but it is **a layer over one opinion, not a
substitute for having one**: every preset must flow through the same tokens, the
default must be unmistakably NTHUMods, and no component may ever hardcode a colour
that a theme cannot reach.
