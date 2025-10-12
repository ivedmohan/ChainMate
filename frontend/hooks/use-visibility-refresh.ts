"use client"

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Hook that refreshes queries when the user returns to the tab
 * This helps ensure data is fresh when users come back from other tabs
 */
export function useVisibilityRefresh() {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to the tab, refresh all queries
        queryClient.invalidateQueries({ 
          queryKey: ['readContract'],
          refetchType: 'active' // Only refetch active queries
        })
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [queryClient])
}