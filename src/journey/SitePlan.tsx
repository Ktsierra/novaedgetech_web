/**
 * Isometric site plan in the spirit of an "innerspace" view. Entirely fictional layout (no client data):
 * an L-shaped office with extruded walls, furniture, per-room access points over a signal heatmap,
 * cameras on entrances/corridors, readers on real doors and sensors where they'd actually go.
 */

type P = [number, number];

// plan units -> screen (viewBox 200 x 124): x' = S(x - y) + EX, y' = S/2 (x + y) + EY
const S = 0.8, EX = 81.6, EY = 14, WALL_H = 8;
const iso = ([x, y]: P): P => [S * (x - y) + EX, S * 0.5 * (x + y) + EY];
const pts = (ps: P[]) => ps.map(p => iso(p).map(n => n.toFixed(1)).join(',')).join(' ');

// building outline (L-shape)
const OUTLINE: P[] = [[0, 0], [130, 0], [130, 56], [92, 56], [92, 84], [0, 84]];

// wall segments [from, to]; gaps are doorways
const WALLS: [P, P][] = [
  // exterior (entrance gap on the lobby's south wall)
  [[0, 0], [130, 0]], [[130, 0], [130, 56]], [[130, 56], [92, 56]], [[92, 56], [92, 84]],
  [[92, 84], [22, 84]], [[12, 84], [0, 84]], [[0, 84], [0, 0]],
  // conference room
  [[70, 0], [70, 10]], [[70, 18], [70, 28]], [[70, 28], [108, 28]],
  // IT closet + kitchen
  [[108, 0], [108, 18]], [[108, 18], [114, 18]], [[121, 18], [130, 18]], [[108, 28], [108, 56]],
  // lobby / private offices row
  [[0, 60], [20, 60]], [[28, 60], [44, 60]], [[52, 60], [72, 60]], [[80, 60], [92, 60]],
  [[34, 60], [34, 84]], [[62, 60], [62, 84]],
];

const DESKS: P[] = [[10, 10], [22, 10], [10, 22], [22, 22], [40, 10], [52, 10], [40, 22], [52, 22], [10, 40], [22, 40], [40, 40], [52, 40]];
const APS: P[] = [[18, 18], [48, 34], [90, 13], [120, 40], [16, 72], [76, 72], [119, 8]];
const CAMS: [P, number][] = [[[4, 80], -60], [[66, 56], 200], [[126, 52], 225], [[2, 2], 45]];
const DOORS: P[] = [[17, 84], [117, 18], [70, 14], [24, 60], [48, 60], [76, 60]];
const SENSORS: P[] = [[124, 6], [126, 30], [96, 24], [44, 76]];
const RACK: P = [114, 8];

/** a wall drawn as an extruded slab: side face + lighter top edge */
const Wall = ({ a, b }: { a: P; b: P }) => {
  const [ax, ay] = iso(a), [bx, by] = iso(b);
  const face = `${ax.toFixed(1)},${ay.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)} ${bx.toFixed(1)},${(by - WALL_H).toFixed(1)} ${ax.toFixed(1)},${(ay - WALL_H).toFixed(1)}`;
  return (
    <g>
      <polygon points={face} className="j-plan-wallface" />
      <line x1={ax} y1={ay - WALL_H} x2={bx} y2={by - WALL_H} className="j-plan-walltop" />
    </g>
  );
};

const cone = ([x, y]: P, deg: number, r = 20, spread = 0.45): P[] => {
  const a = deg * Math.PI / 180;
  return [[x, y], [x + r * Math.cos(a - spread), y + r * Math.sin(a - spread)], [x + r * Math.cos(a + spread), y + r * Math.sin(a + spread)]];
};

const SitePlan = () => {
  // paint walls back to front so nearer slabs overlap farther ones
  const walls = [...WALLS].sort((w1, w2) => (w1[0][0] + w1[0][1] + w1[1][0] + w1[1][1]) - (w2[0][0] + w2[0][1] + w2[1][0] + w2[1][1]));
  return (
    <svg className="j-mock-svg" viewBox="0 0 200 124" aria-hidden="true">
      <defs>
        <radialGradient id="j-heat">
          <stop offset="0" stopColor="#3dff9a" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#b8f25c" stopOpacity="0.28" />
          <stop offset="0.8" stopColor="#ffd25c" stopOpacity="0.1" />
          <stop offset="1" stopColor="#ffd25c" stopOpacity="0" />
        </radialGradient>
        <clipPath id="j-plan-clip"><polygon points={pts(OUTLINE)} /></clipPath>
      </defs>
      {/* floor + signal heatmap (clipped to the building) */}
      <polygon points={pts(OUTLINE)} className="j-plan-floor" />
      <g clipPath="url(#j-plan-clip)">
        <g transform={`matrix(${String(S)},${String(S / 2)},${String(-S)},${String(S / 2)},${String(EX)},${String(EY)})`}>
          {APS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 1 ? 30 : 22} fill="url(#j-heat)" className="j-plan-heat" style={{ animationDelay: `${String(-i * 0.9)}s` }} />)}
          {DESKS.map(([x, y], i) => <rect key={i} x={x - 4} y={y - 2.5} width="8" height="5" rx="0.6" className="j-plan-desk" />)}
          <rect x="80" y="8" width="18" height="10" rx="4" className="j-plan-desk" />
          <rect x="112" y="24" width="14" height="5" className="j-plan-desk" />
          {CAMS.map(([p, d], i) => <polygon key={i} points={cone(p, d).map(q => q.join(',')).join(' ')} className="j-plan-cone" />)}
        </g>
      </g>
      {walls.map(([a, b], i) => <Wall key={i} a={a} b={b} />)}
      {/* backhaul from the rack to each AP, then devices on top */}
      {APS.map((p, i) => {
        const [x1, y1] = iso(RACK), [x2, y2] = iso(p);
        return <line key={'f' + String(i)} x1={x1} y1={y1 - 2} x2={x2} y2={y2 - 2} className="j-flow j-flow--faint" style={{ animationDelay: `${String(-i * 0.3)}s` }} />;
      })}
      {(() => { const [x, y] = iso(RACK); return <rect x={x - 2.5} y={y - 7} width="5" height="7" className="j-node j-node--hub" />; })()}
      {APS.map((p, i) => { const [x, y] = iso(p); return <circle key={'a' + String(i)} cx={x} cy={y - 2} r="1.7" className="j-plan-ap" />; })}
      {CAMS.map(([p], i) => { const [x, y] = iso(p); return <circle key={'k' + String(i)} cx={x} cy={y - 3} r="1.4" className="j-plan-cam" />; })}
      {DOORS.map((p, i) => { const [x, y] = iso(p); return <rect key={'d' + String(i)} x={x - 1.3} y={y - 4} width="2.6" height="2.6" className="j-plan-door" />; })}
      {SENSORS.map((p, i) => { const [x, y] = iso(p); return <circle key={'s' + String(i)} cx={x} cy={y - 1} r="1.1" className="j-plan-sensor" />; })}
      <g className="j-plan-legend">
        <circle cx="16" cy="117" r="2" className="j-plan-ap" /><text x="21" y="119">AP</text>
        <circle cx="42" cy="117" r="2" className="j-plan-cam" /><text x="47" y="119">CAMERA</text>
        <rect x="80" y="115" width="4" height="4" className="j-plan-door" /><text x="87" y="119">ACCESS</text>
        <circle cx="120" cy="117" r="2" className="j-plan-sensor" /><text x="125" y="119">SENSOR</text>
        <rect x="156" y="115" width="4" height="4" className="j-node j-node--hub" /><text x="163" y="119">RACK</text>
      </g>
    </svg>
  );
};

export default SitePlan;
