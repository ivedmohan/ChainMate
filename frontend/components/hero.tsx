import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-20">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-lg md:text-xl font-bold text-primary tracking-wider">
              PLAY • PROOF • WIN
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold text-balance">
              Chess wagering with zero-knowledge proofs
            </h1>
          </div>
          <p className="text-muted-foreground text-pretty">
            Challenge opponents, lock stakes in smart contracts, and settle automatically with verifiable
            proof from Chess.com via Reclaim Protocol. Trustless. Transparent. Unstoppable.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/wagers/new">Create a wager</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">View dashboard</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden border bg-card">
          {/* Decorative illustrative placeholder */}
          <img
            src="/chess-board-with-crypto-escrow-visual.jpg"
            alt="Illustration of a chess board with an escrowed stake"
            className="w-full h-auto"
          />
        </div>
      </div>
    </section>
  )
}
