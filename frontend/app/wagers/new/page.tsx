import { WagerForm } from "@/components/wager-form"

export default function NewWagerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-balance">Create a new wager</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set your stake, opponent, and time control. Proof steps are simulated for now.
        </p>
      </header>
      <WagerForm />
    </div>
  )
}
