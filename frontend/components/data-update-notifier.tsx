"use client"

import { useEffect, useRef } from 'react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/use-toast'

export function DataUpdateNotifier() {
  const isFetching = useIsFetching()
  const queryClient = useQueryClient()
  const wasRefetchingRef = useRef(false)
  
  useEffect(() => {
    // If we were fetching and now we're not, data was updated
    if (wasRefetchingRef.current && !isFetching) {
      // Only show toast for user-initiated refreshes, not automatic ones
      const hasUserInitiatedQueries = queryClient.getQueryCache().getAll().some(query => 
        query.state.fetchStatus === 'idle' && 
        query.state.dataUpdatedAt > Date.now() - 2000 // Updated in last 2 seconds
      )
      
      if (hasUserInitiatedQueries) {
        toast({
          title: "✅ Data updated",
          description: "Your wager information has been refreshed",
          duration: 2000,
        })
      }
    }
    
    wasRefetchingRef.current = isFetching > 0
  }, [isFetching, queryClient])
  
  return null
}