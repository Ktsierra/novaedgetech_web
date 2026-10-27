/**
 * NovaEdge compact reversed lockup (Brand Guidelines v1.0, "2a" hex N): cyan hexagon with the N knocked out
 * in Edge Night, wordmark NOVA in white + EDGE in Edge Cyan, Sora ExtraBold. Geometry copied from the
 * guidelines' artwork; don't restyle it (no outlines, shadows or recolouring).
 */
const BRAND = { night: '#0E1621', cyan: '#00E5FF' };

export const HexMark = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M30 2 L54.2 16 V44 L30 58 L5.8 44 V16 Z" fill={BRAND.cyan} />
    <path d="M18 42 V18 L24 18 L36 33.5 V18 H42 V42 L36 42 L24 26.5 V42 Z" fill={BRAND.night} />
  </svg>
);

const BrandLogo = ({ size = 32 }: { size?: number }) => (
  <span className="j-brand" style={{ gap: Math.round(size * 0.27) }}>
    <HexMark size={size} />
    {/* wordmark at 0.48 × mark height, per the lockup proportions */}
    <span className="j-brand-word" style={{ fontSize: Math.round(size * 0.48) }}>NOVA<span className="j-brand-edge">EDGE</span></span>
  </span>
);

export default BrandLogo;
