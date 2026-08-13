/** Código QR decorativo (patrón determinista) para la sección de descarga. */
const CELLS = 21;

function bit(x: number, y: number) {
  // Patrón pseudoaleatorio estable (sin depender de librerías)
  const v = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233) * 43758.5453;
  return v - Math.floor(v) > 0.5;
}

function isFinder(x: number, y: number) {
  const inBox = (cx: number, cy: number) =>
    x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
  return inBox(0, 0) || inBox(CELLS - 7, 0) || inBox(0, CELLS - 7);
}

function finderOn(x: number, y: number) {
  const local = (cx: number, cy: number) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
    return r === 3 || r === 1 || r === 0;
  };
  if (x < 7 && y < 7) return local(0, 0);
  if (x >= CELLS - 7 && y < 7) return local(CELLS - 7, 0);
  if (x < 7 && y >= CELLS - 7) return local(0, CELLS - 7);
  return false;
}

export function QrBadge({ className = "" }: { className?: string }) {
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < CELLS; y++) {
    for (let x = 0; x < CELLS; x++) {
      const on = isFinder(x, y) ? finderOn(x, y) : bit(x, y);
      if (!on) continue;
      cells.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          rx={0.22}
          fill={x > 6 && x < 14 && y > 6 && y < 14 ? "currentColor" : "#0b1220"}
        />,
      );
    }
  }
  return (
    <div
      className={`grid place-items-center rounded-2xl bg-white p-3 text-primary shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)] ${className}`}
    >
      <svg
        viewBox={`0 0 ${CELLS} ${CELLS}`}
        className="size-24"
        aria-label="Código QR para descargar la app de KotaMed"
        role="img"
      >
        {cells}
      </svg>
    </div>
  );
}
