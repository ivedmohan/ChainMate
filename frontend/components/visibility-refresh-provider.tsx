"use client"

import { useVisibilityRefresh } from "@/hooks/use-visibility-refresh"

export function VisibilityRefreshProvider({ children }: { children: React.ReactNode }) {
  useVisibilityRefresh()
  return <>{children}</>
}