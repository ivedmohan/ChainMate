"use client"

import { NotificationProvider, TransactionPopupProvider } from "@blockscout/app-sdk"

export function BlockscoutProvider({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <TransactionPopupProvider>
        {children}
      </TransactionPopupProvider>
    </NotificationProvider>
  )
}
