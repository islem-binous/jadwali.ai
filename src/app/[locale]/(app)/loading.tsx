export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-bg-surface" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-card" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-bg-card" />
    </div>
  )
}
