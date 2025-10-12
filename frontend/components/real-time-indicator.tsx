"use client"

import { useIsFetching } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

export function RealTimeIndicator() {
  const isFetching = useIsFetching()
  
  if (!isFetching) return null
  
  return (
    <Badge variant="outline" className="fixed top-20 right-4 z-50 bg-background/80 backdrop-blur-sm">
      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      Updating...
    </Badge>
  )
}