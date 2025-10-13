import { Hero } from "@/components/hero"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <section className="container mx-auto px-4 py-12 grid gap-6 md:grid-cols-3">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <h3 className="text-lg font-semibold text-balance">PLAY</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Challenge opponents on Chess.com with real stakes. Choose your time control and wager amount.
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <h3 className="text-lg font-semibold text-balance">PROOF</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Reclaim Protocol generates zero-knowledge proofs of your Chess.com game results automatically.
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <h3 className="text-lg font-semibold text-balance">WIN</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Smart contracts settle automatically. Winners get the full pot minus a small platform fee.
            </p>
          </CardContent>
        </Card>
      </section>
      <section className="container mx-auto px-4 pb-16">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Ready to prove your chess skills?</h2>
            <p className="text-muted-foreground">
              Join the future of competitive chess with trustless wagering
            </p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Button asChild size="lg" className="px-8">
              <Link href="/wagers/new">🎯 Create Your First Wager</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">📊 View Active Wagers</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
