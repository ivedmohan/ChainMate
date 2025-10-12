import { Hero } from "@/components/hero"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <section className="container mx-auto px-4 py-12 grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-balance">Provable outcomes</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Reclaim Protocol proofs and Chess.com game validation prevent disputes.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-balance">Non-custodial escrow</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Funds are locked in smart contracts until a verifiable result is posted.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-balance">Play your way</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Blitz, rapid, or classical—configure time controls and stake size.
            </p>
          </CardContent>
        </Card>
      </section>
      <section className="container mx-auto px-4 pb-16">
        <div className="flex items-center justify-center">
          <Button asChild className="px-6">
            <Link href="/wagers/new">Create a wager</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
