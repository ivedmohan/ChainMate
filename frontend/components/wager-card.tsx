import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Wager } from "@/lib/types"
import { Button } from "@/components/ui/button"

export function WagerCard({ wager }: { wager: Wager }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Wager #{wager.id}</h3>
          <Badge variant="secondary">{wager.status}</Badge>
        </div>
        <Badge>{wager.timeControl}</Badge>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Opponent</p>
            <p className="font-medium">{wager.opponentHandle}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Stake</p>
            <p className="font-medium">
              {wager.amount} {wager.tokenSymbol}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Expires</p>
            <p className="font-medium">{new Date(wager.expiry).toLocaleString()}</p>
          </div>
          <div className="flex items-end justify-end">
            <Button asChild size="sm">
              <Link href={`/wagers/${wager.id}`}>View</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
