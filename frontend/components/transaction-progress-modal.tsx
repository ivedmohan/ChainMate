"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, Loader2, XCircle, ExternalLink } from "lucide-react"
import { useChainId } from "wagmi"

export interface TransactionStep {
  name: string
  status: 'pending' | 'active' | 'success' | 'error'
  txHash?: string
  message?: string
}

interface TransactionProgressModalProps {
  isOpen: boolean
  title: string
  steps: TransactionStep[]
  currentStep: number
  message?: string
  onClose?: () => void
  onRetry?: () => void
  canClose?: boolean
}

export function TransactionProgressModal({
  isOpen,
  title,
  steps,
  currentStep,
  message,
  onClose,
  onRetry,
  canClose = false
}: TransactionProgressModalProps) {
  const chainId = useChainId()
  
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0
  const hasError = steps.some(step => step.status === 'error')
  const allComplete = steps.every(step => step.status === 'success')

  const getBlockscoutUrl = (txHash: string) => {
    const baseUrls: Record<number, string> = {
      84532: 'https://base-sepolia.blockscout.com',
      421614: 'https://arbitrum-sepolia.blockscout.com',
    }
    const baseUrl = baseUrls[chainId] || baseUrls[84532]
    return `${baseUrl}/tx/${txHash}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => !canClose && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Step {Math.min(currentStep + 1, steps.length)} of {steps.length}
            </p>
          </div>

          {/* Steps List */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="mt-0.5">
                  {step.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {step.status === 'active' && (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  )}
                  {step.status === 'error' && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  {step.status === 'pending' && (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 space-y-1">
                  <p className={`text-sm font-medium ${
                    step.status === 'success' ? 'text-green-600 dark:text-green-400' :
                    step.status === 'active' ? 'text-blue-600 dark:text-blue-400' :
                    step.status === 'error' ? 'text-red-600 dark:text-red-400' :
                    'text-muted-foreground'
                  }`}>
                    {step.name}
                  </p>
                  
                  {step.message && (
                    <p className="text-xs text-muted-foreground">{step.message}</p>
                  )}
                  
                  {step.txHash && (
                    <a
                      href={getBlockscoutUrl(step.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                    >
                      View on Blockscout
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Current Message */}
          {message && !hasError && !allComplete && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {message}
              </p>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg space-y-3">
              <p className="text-sm text-red-900 dark:text-red-100">
                Transaction failed. You can retry from this step.
              </p>
              {onRetry && (
                <Button onClick={onRetry} variant="destructive" size="sm" className="w-full">
                  Retry Transaction
                </Button>
              )}
            </div>
          )}

          {/* Success State */}
          {allComplete && (
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
              <p className="text-sm text-green-900 dark:text-green-100 font-medium">
                ✓ All transactions completed successfully!
              </p>
            </div>
          )}

          {/* Close Button */}
          {(canClose || allComplete || hasError) && onClose && (
            <Button onClick={onClose} variant="outline" className="w-full">
              {allComplete ? 'Done' : 'Close'}
            </Button>
          )}

          {/* Info */}
          {!hasError && !allComplete && (
            <p className="text-xs text-center text-muted-foreground">
              Please confirm each transaction in your wallet
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
