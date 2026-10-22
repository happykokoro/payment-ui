# UI provenance

Source inspection used Kokoro Pay GitLab main `8e1d517ca6b0b8b33c6d32c08f5ca5c865ca5f0f`.

- [Legacy dashboard](https://gitlab.com/kokoro-tech/platform/kokoro-pay/-/tree/8e1d517ca6b0b8b33c6d32c08f5ca5c865ca5f0f/dashboard): compact orders, codes, merchants, plans and webhook screens backed by mock data.
- [V2 dashboard](https://gitlab.com/kokoro-tech/platform/kokoro-pay/-/tree/8e1d517ca6b0b8b33c6d32c08f5ca5c865ca5f0f/v2/dashboard): real API client code but coupled to original organizations, subscriptions, JWTs, plans and commercial bill invoices.
- [Kokoro Account frontend](https://gitlab.com/kokoro-tech/platform/kokoro-account/-/tree/main/packages/template/frontend): generic SaaS users/subscriptions administration, not selected for the payment UI.

The initial standalone dashboard used new components with a green theme. The owner requested the actual Kokoro Pay UI instead, so its v2 presentation source is now ported directly:

| Standalone location | Original v2 source | Adaptation |
| --- | --- | --- |
| `shared/ui/{card,table,button,input,label}.tsx` | `components/ui/` matching filenames | Original components retained; a provenance comment added |
| `shared/lib/utils.ts` | `lib/utils.ts` | Original `cn` helper retained |
| `shared/theme.css` | `app/globals.css` | Original light/dark color tokens; local Geist fonts replace Next font loading; unused shadcn CLI CSS import removed |
| `dashboard/src/layout/` | `components/layout/{sidebar,header}.tsx`, dashboard layout | Original desktop geometry and indigo navigation; core's three supported pages, operator session and native mobile navigation dialog |
| `dashboard/src/Login.tsx` | `app/(auth)/login/page.tsx` | Original card/form structure; standalone password authentication |
| Dashboard pages | Orders, detail and metric-card layouts | Core invoice/evidence DTOs; original shared cards, buttons and tables |

Both dashboard and checkout use the original dark theme by default. Payment UI keeps a neutral name/monogram for standalone distribution. Only presentation code is ported; payment verification, backend integration and authentication remain the standalone implementations. No Next.js runtime or original organization/subscription model is required. The source repository is unchanged. The owner authorized standalone publication under MIT on 2026-10-23. Upstream shadcn/ui MIT and Geist font notices are preserved in THIRD_PARTY_NOTICES.md and public/fonts/.

The customer's wallet/submission hooks are preserved. Its presentation now uses the ported Card and Button components and shared theme. Checkout and dashboard communicate with the core only through HTTP. Their host uses [Vite multiple-page builds](https://vite.dev/guide/build.html#multi-page-app), [Tailwind's Vite plugin](https://tailwindcss.com/docs/installation/using-vite) and [Fastify secure sessions](https://github.com/fastify/fastify-secure-session). Geist font license files are distributed under `public/fonts/` alongside the bundled font assets.
