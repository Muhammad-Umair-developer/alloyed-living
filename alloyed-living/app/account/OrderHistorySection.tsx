const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

// Placeholder only — order history is the next piece of this feature, not
// built here. No data fetching, no props.
export default function OrderHistorySection() {
  return (
    <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm p-10 md:p-14 text-center">
      <p style={EDITORIAL} className="text-[1.7rem] font-light text-stone-800 mb-2">
        Order History
      </p>
      <p className="text-[10px] tracking-[0.3em] uppercase text-stone-600">Coming soon</p>
    </div>
  )
}
