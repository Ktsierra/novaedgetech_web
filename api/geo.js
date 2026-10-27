// Approximate visitor location from Vercel's IP geolocation headers (no third-party lookup, nothing stored).
export default function handler(req, res) {
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const lat = num(req.headers["x-vercel-ip-latitude"]);
  const lon = num(req.headers["x-vercel-ip-longitude"]);
  res.setHeader("Cache-Control", "private, no-store");
  if (lat === null || lon === null) {
    return res.status(204).end();
  }
  let city = null;
  try {
    city = req.headers["x-vercel-ip-city"] ? decodeURIComponent(req.headers["x-vercel-ip-city"]) : null;
  } catch {
    city = null;
  }
  return res.status(200).json({ lat, lon, city, country: req.headers["x-vercel-ip-country"] ?? null });
}
