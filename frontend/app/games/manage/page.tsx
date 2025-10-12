import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ManageGamesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold text-balance">Manage games</h1>
          <p className="text-sm text-muted-foreground">
            Submit proof URLs or mark results. These actions are stubbed for now.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Chess.com game URL</label>
            <Input placeholder="https://www.chess.com/game/live/..." />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Reclaim proof URL (optional)</label>
            <Input placeholder="https://reclaimprotocol.org/proofs/..." />
          </div>
          <div className="flex gap-2">
            <Button>Validate and attach</Button>
            <Button variant="secondary">Mark as completed</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
