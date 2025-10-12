"use client"

import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

interface RefreshButtonProps {
  scope?: 'all' | 'wagers' | 'current'
  wagerAddress?: string
  className?: string
}

export function RefreshButton({ scope = 'current', wagerAddress, className }: RefreshButtonProps) {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      switch (scope) {
        case 'all':
          await queryClient.invalidateQueries()
          break
        case 'wagers':
          await queryClient.invalidateQueries({ 
            queryKey: ['readContract'] 
          })
          break
        case 'current':
          if (wagerAddress) {
            await queryClient.invalidateQueries({ 
              queryKey: ['readContract', { 
                address: wagerAddress,
                functionName: 'getWagerData' 
              }] 
            })
          } else {
            await queryClient.invalidateQueries({ 
              queryKey: ['readContract'] 
            })
          }
          break
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={className}
    >
      <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </Button>
  )
}