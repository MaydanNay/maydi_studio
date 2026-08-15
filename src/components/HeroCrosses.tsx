const COLS = 7
const ROWS = 6

export function HeroCrosses() {
  return (
    <div className="hero-cross-grid" aria-hidden>
      {Array.from({ length: COLS * ROWS }, (_, i) => (
        <div key={i} className="hero-cross" />
      ))}
    </div>
  )
}
