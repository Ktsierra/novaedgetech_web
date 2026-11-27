# NovaEdge Tech website

A scroll-driven journey from the galaxy to your desk: through the solar system to a real-time Earth (lit by the actual sun and moon for the visitor's location), down to a cyan neon city whose sky follows the visitor's local time, and into a window that becomes the contact form. Live at [novaedgetechnology.com](https://novaedgetechnology.com).

## Stack
- React + TypeScript + Vite
- three.js (sun, Earth, city), loaded lazily and warmed up behind the loader
- Vercel functions: `api/contact.js` (Resend email) and `api/geo.js` (IP geolocation from Vercel headers)

## Scripts
- `npm run dev`: local dev server
- `npm run build`: tests, typecheck, then production build
- `npm run lint`

Contact email needs `RESEND_API_KEY` (set in Vercel, Production).

Contact form spam protection:
- Always on: a hidden trap field (a submission that fills it in is dropped) and a rule that a message must be more than a number.
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) is on when the deployment has both `VITE_TURNSTILE_SITE_KEY` (the widget's public site key, built into the page) and `TURNSTILE_SECRET_KEY` (its secret, read by `api/contact.js`). With either one missing the check is skipped, so the form keeps working. Set both in Vercel (Production), then redeploy: the site key is read at build time.
- The widget's hostnames in Cloudflare must include the domains the site is served from. For local runs Cloudflare publishes test keys that always pass (site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`).

## Credits
Earth and moon imagery: NASA. AWS Architecture Icons (CC BY-ND 2.0). Microsoft Entra icon © Microsoft.

## License
Apache License 2.0
