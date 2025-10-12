import { mockWagers } from "@/lib/mock"
import { WagerCard } from "@/components/wager-card"

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-balance">Your wagers</h1>
        <p className="text-sm text-muted-foreground mt-1">Track open, active, and settled wagers.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {mockWagers.map((w) => (
          <WagerCard key={w.id} wager={w} />
        ))}
      </div>
    </div>
  )
}
