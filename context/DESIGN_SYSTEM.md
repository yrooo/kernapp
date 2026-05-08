# Kern Design System

This document outlines the core UI/UX guidelines and design tokens for the Kern platform, ensuring a consistent "Financial Terminal" aesthetic across the application. It is based on the initial `CTASection` and the `hero-dithering-card` implementation.

## 1. Core Identity
*   **Vibe:** Minimalist, High-Contrast, Financial Terminal, Trustworthy.
*   **Theme:** Dark-mode first (or highly contrasting light/dark modes) utilizing shadcn/ui defaults combined with bespoke shader backgrounds.

## 2. Typography
We mix a highly legible Sans-Serif for data and UI elements with an elegant Serif for large, impactful headlines to give a premium, institutional feel.

*   **Headings (Serif):** `font-serif`
    *   *Usage:* Large marketing headlines (`h1`, `h2`), campaign titles.
    *   *Classes:* `text-5xl md:text-7xl lg:text-8xl`, `font-medium`, `tracking-tight`, `leading-[1.05]`.
    *   *Example:* Cormorant Garamond or standard system serif.
*   **Body & UI (Sans-Serif):** Default Tailwind Sans (`font-sans`)
    *   *Usage:* Body copy, buttons, badges, data tables, navigation.
    *   *Classes (Body):* `text-muted-foreground text-lg md:text-xl leading-relaxed`.
    *   *Classes (UI Labels):* `text-sm font-medium`.

## 3. Color Palette
The platform uses the standard shadcn CSS variables approach, heavily leaning on deep contrasts with a vibrant, energetic primary accent color.

*   **Primary / Accent:** Vibrant Violet (`#6e0ffbff`)
    *   *Usage:* Main CTA buttons, Dithering Shader foreground, active states, glowing indicators.
    *   *Tailwind Classes:* `bg-primary`, `text-primary`, `border-primary/10`, `ring-primary/20`.
*   **Backgrounds:**
    *   *Card Background:* `bg-card` (Subtle elevation off the main background).
    *   *Shader Background:* Transparent (`#00000000`) layered over the card with mix-blend modes (`mix-blend-multiply dark:mix-blend-screen`).
*   **Text Colors:**
    *   *Primary Headline:* `text-foreground`.
    *   *Secondary Headline Text:* `text-foreground/80`.
    *   *Body/Description Text:* `text-muted-foreground`.
    *   *Button Text:* `text-primary-foreground`.

## 4. Shapes & Border Radii
*   **Containers/Cards:** Extra-large, friendly rounded corners to offset the strict financial vibe.
    *   *Class:* `rounded-[48px]` for main structural cards.
*   **Interactive Elements:** Pill-shaped for buttons and badges.
    *   *Class:* `rounded-full`.
*   **Borders:** 1px subtle borders to define edges without heavy shadows.
    *   *Class:* `border border-border`.

## 5. Animations & Effects
Interactions should feel fluid, responsive, and "alive" without being distracting.

*   **Micro-Interactions (Buttons):**
    *   Scale & Ring: `transition-all duration-300 hover:scale-105 active:scale-95 hover:ring-4 hover:ring-primary/20`.
    *   Icon Translation: `group-hover:translate-x-1` (e.g., arrow sliding right).
*   **Status Indicators:**
    *   Live pulsing dots for active statuses: `<span className="animate-ping bg-primary opacity-75">` paired with a static inner dot.
*   **The Dithering Shader:**
    *   Used inside structural cards to create a premium, dynamic background.
    *   *Opacity:* Kept subtle (`opacity-40 dark:opacity-30`).
    *   *Interactivity:* Speed increases on parent container hover (e.g., `0.2` idle -> `0.6` hovered).
*   **Glassmorphism:**
    *   Used sparingly for badges floating over shaders.
    *   *Class:* `bg-primary/5 backdrop-blur-sm`.

## 6. Layout & Spacing
*   **Padding/Margins:** Generous breathing room (`py-12`, `mb-12`).
*   **Max-Widths:** Constrain reading lines for readability (`max-w-2xl` for descriptions, `max-w-4xl` for central text alignment, `max-w-7xl` for overall sections).
*   **Alignment:** Center-aligned for landing pages/CTAs; left-aligned for data-heavy dashboard views.

---
**Implementation Note:** 
Because we are using `shadcn/ui`, the primary accent color (`#6e0ffbff`) should be defined in `app/globals.css` as the `--primary` HSL variable. For the shader specifically, we pass the exact hex `#6e0ffbff` to the `colorFront` prop.
