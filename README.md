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

## Credits
Earth and moon imagery: NASA. AWS Architecture Icons (CC BY-ND 2.0). Microsoft Entra icon © Microsoft.

## License
Apache License 2.0
