import { useMassing, useProject } from "@/store/project";

const ROOM_FILL: Record<string, string> = {
  living: "#e2d2b4",
  kitchen: "#d3c09a",
  bed: "#c5d0c0",
  bath: "#c5ccd4",
  shop: "#8d8678",
};

export function SitePlan() {
  const inputs = useProject((s) => s.inputs);
  const selectedFloor = useProject((s) => s.selectedFloor);
  const selectedUnitId = useProject((s) => s.selectedUnitId);
  const setSelectedUnitId = useProject((s) => s.setSelectedUnitId);
  const setSelectedFloor = useProject((s) => s.setSelectedFloor);
  const m = useMassing();
  const pad = 8;
  const w = 168;
  const h = 210;
  const sx = (w - pad * 2) / inputs.plotWidth;
  const sy = (h - pad * 2) / inputs.plotDepth;
  const s = Math.min(sx, sy);
  const pw = inputs.plotWidth * s;
  const pd = inputs.plotDepth * s;
  const ox = (w - pw) / 2;
  const oy = (h - pd) / 2;
  const plotLeft = -inputs.plotWidth / 2;
  const plotFront = -inputs.plotDepth / 2;
  const bx = ox + (m.buildingX - m.footprintWidth / 2 - plotLeft) * s;
  const bz = oy + (m.buildingZ - m.footprintDepth / 2 - plotFront) * s;
  const bw = m.footprintWidth * s;
  const bd = m.footprintDepth * s;
  const floor =
    (selectedFloor !== null ? m.floors.find((f) => f.index === selectedFloor) : null) ??
    m.floors.find((f) => f.units.length > 0);
  const showRooms = selectedFloor !== null && (floor?.units.length ?? 0) > 0;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-36 overflow-visible text-foreground" aria-hidden>
      <rect x={ox} y={oy} width={pw} height={pd} fill="rgb(79 94 61 / 0.28)" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />
      <rect x={bx} y={bz} width={bw} height={bd} fill="rgb(232 220 200 / 0.28)" stroke="rgb(232 220 200)" strokeWidth={1} />
      {floor?.units.map((u) => {
        const ux = ox + (u.x - u.width / 2 - plotLeft) * s;
        const uz = oy + (u.z - u.depth / 2 - plotFront) * s;
        const active = selectedUnitId === u.id;
        return (
          <g key={u.id} onClick={() => { setSelectedFloor(u.floorIndex); setSelectedUnitId(u.id); }} style={{ cursor: "pointer" }}>
            <rect x={ux} y={uz} width={u.width * s} height={u.depth * s} fill={showRooms ? "none" : u.color} fillOpacity={active ? 0.95 : 0.55} stroke={active ? "#f0ebe3" : "rgb(20 19 17 / 0.4)"} strokeWidth={active ? 1.5 : 0.7} />
            {showRooms
              ? u.rooms.map((r, i) => {
                  const rx = ux + (r.x - r.width / 2 + u.width / 2) * s;
                  const rz = uz + (r.z - r.depth / 2 + u.depth / 2) * s;
                  const rw = Math.max(1, r.width * s);
                  const rh = Math.max(1, r.depth * s);
                  return (
                    <rect key={i} x={Math.max(ux + 1, rx)} y={Math.max(uz + 1, rz)} width={Math.min(rw, ux + u.width * s - Math.max(ux + 1, rx) - 1)} height={Math.min(rh, uz + u.depth * s - Math.max(uz + 1, rz) - 1)} fill={ROOM_FILL[r.kind] ?? u.color} fillOpacity={0.95} stroke="rgb(20 19 17 / 0.22)" strokeWidth={0.4} />
                  );
                })
              : null}
            <text x={ux + (u.width * s) / 2} y={uz + (u.depth * s) / 2 + 3} textAnchor="middle" fill="#141311" fontSize={8}>{u.label}</text>
          </g>
        );
      })}
      <text x={w / 2} y={oy - 3} textAnchor="middle" fill="currentColor" opacity={0.55} fontSize={8}>{floor ? floor.name : "οδός"}</text>
    </svg>
  );
}
