import { mockWagers } from "@/lib/mock"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function WagerDetailPage({ params }: { params: { id: string } }) {
  // Guard: if Next.js matches 'new' to [id], redirect to the static page
  if (params.id === "new") {
    redirect("/wagers/new")
  }

  const wager = mockWagers.find((w) => w.id === params.id)
  if (!wager) return notFound()

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold text-balance">Wager #{wager.id}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{wager.status}</Badge>
            <Badge>{wager.timeControl}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Creator</p>
              <p className="font-medium">{wager.creator}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Opponent (Chess.com)</p>
              <p className="font-medium">{wager.opponentHandle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stake</p>
              <p className="font-medium">
                {wager.amount} {wager.tokenSymbol}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expires</p>
              <p className="font-medium">{new Date(wager.expiry).toLocaleString()}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="text-sm">
              Result proof, escrow state, and Chess.com verification are placeholders in this build.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
