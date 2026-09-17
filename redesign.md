# UI Design System Redesign

A comprehensive overhaul of the SchoolSuite SMS design language, targeting a **premium, glassmorphic, dark-first** aesthetic with vibrant violet-indigo accent palette, micro-animations, and modern typography (Inter). Every shared component in `packages/ui` plus portal-specific navigations are redesigned.

## Design Language Direction

| Token | Value |
|---|---|
| Primary accent | Violet-indigo gradient `hsl(263 85% 60%)` → `hsl(245 85% 55%)` |
| Background (dark) | Deep slate `hsl(240 15% 5%)` |
| Surface raised | `hsl(240 12% 9%)` |
| Border | `hsl(240 10% 18%)` with glow on focus |
| Radius | `0.75rem` (cards), `0.625rem` (inputs), `0.5rem` (buttons) |
| Typography | Google Fonts: **Inter** 400-700 (UI) |
| Motion | `150ms ease-out` micro-transitions; `220ms spring` for overlays |

---

## Open Questions

> [!IMPORTANT]
> **Dark mode only or light + dark?** The current system ships both. The redesign targets **dark-first** with high contrast light mode kept functional. Confirm if you want pure dark-only.

> [!NOTE]
> This is a **purely visual** change — zero API surface, routing, or data-model changes. Build should remain green throughout.

---

## Proposed Changes

### Design Token Foundation

#### [MODIFY] [globals.css](file:///d:/sms/packages/ui/src/globals.css)
- Rich dark-first CSS variable palette (deep navy/slate base)
- Add `--gradient-primary` (violet→indigo), ambient mesh background vars
- Add `--glow-accent` box-shadow for focus halos
- Import Google Inter font
- New keyframes: `shimmer`, `pulse-glow`, `slide-up`, `float`

#### [MODIFY] [tailwind.config.ts](file:///d:/sms/packages/ui/tailwind.config.ts)
- Add extended keyframes/animations for shimmer + float
- Add `fontFamily` for Inter

---

### Shared UI Components

#### [MODIFY] [button.tsx](file:///d:/sms/packages/ui/src/button.tsx)
- `default` → gradient fill (violet→indigo) + glow on hover
- `outline` → glassmorphic border, subtle fill, shimmer hover
- `ghost` → transparent + hover glow halo
- `destructive` → rich crimson gradient
- Add `loading` prop with inline spinner
- Add `xs` size variant

#### [MODIFY] [input.tsx](file:///d:/sms/packages/ui/src/input.tsx)
- Dark surface background, glowing focus ring (accent halo)
- Smooth 150ms border-color + shadow transition

#### [MODIFY] [select.tsx](file:///d:/sms/packages/ui/src/select.tsx)
- Match dark input style
- SelectContent: frosted glass panel with `backdrop-blur`
- SelectItem: accent glow on hover

#### [MODIFY] [badge.tsx](file:///d:/sms/packages/ui/src/badge.tsx)
- All variants: glass surface + colored left-border or ring
- Animated pulse dot for `success`/`warning`
- Larger pill padding, Inter medium weight

#### [MODIFY] [toast.tsx](file:///d:/sms/packages/ui/src/toast.tsx)
- Full glassmorphic toasts: `backdrop-blur`, dark semi-transparent bg
- Colored 4px left border per variant
- Slide-in from bottom-right with spring easing
- Auto-dismiss progress bar

#### [MODIFY] [dialog.tsx](file:///d:/sms/packages/ui/src/dialog.tsx)
- Overlay: `bg-black/75 backdrop-blur-sm`
- Content: glass panel with border glow, gradient header separator
- Smooth `scale(0.95)→scale(1)` + `fade-in` open animation

#### [MODIFY] [confirm-dialog.tsx](file:///d:/sms/packages/ui/src/confirm-dialog.tsx)
- Icon circle: gradient bg; destructive gets crimson badge header

#### [MODIFY] [table.tsx](file:///d:/sms/packages/ui/src/table.tsx)
- Dark header surface, uppercase letter-spaced column labels
- Hover row with left accent stripe

#### [MODIFY] [data-table.tsx](file:///d:/sms/packages/ui/src/data-table.tsx)
- Glass card container with border glow
- Sticky header with `backdrop-blur`
- Shimmer skeleton animation
- Pill-style pagination buttons

#### [MODIFY] [dropdown-menu.tsx](file:///d:/sms/packages/ui/src/dropdown-menu.tsx)
- Frosted glass content panel
- Violet tint hover on items

---

### Auth Shell & Login Form

#### [MODIFY] [auth-shell.tsx](file:///d:/sms/packages/ui/src/auth-shell.tsx)
- Brand panel: gradient mesh bg (violet→indigo→slate) + animated floating orbs
- Feature bullet icons: gradient chips with glow
- Form card: glass panel with `backdrop-blur-2xl`, soft border glow

#### [MODIFY] [login-form.tsx](file:///d:/sms/packages/ui/src/login-form.tsx)
- `InlineField` uses new dark Input design
- Step indicator dots for multi-step tenant→credentials→MFA flow
- MFA: OTP-style 6-cell grid input
- Trust note: glass chip with shield icon

---

### Portal Navigations

#### [MODIFY] [school-portal/sidebar.tsx](file:///d:/sms/apps/school-portal/src/components/sidebar.tsx)
- Dark glass sidebar with `backdrop-blur`
- Gradient active indicator left bar + accent row glow
- Sub-nav: animated chevron expand/collapse
- Bottom: user avatar card (initials ring, name, role)

#### [MODIFY] [school-portal/topbar.tsx](file:///d:/sms/apps/school-portal/src/components/topbar.tsx)
- Glass topbar, gradient avatar ring, glass dropdown panel

#### [MODIFY] [platform-admin/sidebar.tsx](file:///d:/sms/apps/platform-admin/src/components/sidebar.tsx)
- Same dark glass treatment

#### [MODIFY] [platform-admin/topbar.tsx](file:///d:/sms/apps/platform-admin/src/components/topbar.tsx)
- Super Admin role badge in user dropdown

#### [MODIFY] [guardian-portal/sidebar.tsx](file:///d:/sms/apps/guardian-portal/src/components/sidebar.tsx)
- Replace hardcoded `bg-white`/`text-gray-*` with design tokens
- Glass student card chip

---

## Verification Plan

### Build
```
pnpm turbo run build
```
Expected: 10/10 tasks passing (no new TS errors).

### Contract Audit
```
pnpm run audit:contract
```
Expected: 0 changes (purely visual redesign).

### Visual
- `pnpm --filter school-portal dev` → verify `/login`, `/dashboard`, data table, toast, modal.
