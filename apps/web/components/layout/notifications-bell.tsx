"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { useNotificationsStore } from '@/lib/stores/notifications-store'
import { toast } from 'sonner'

export default function NotificationsBell() {
  const { franquiaUser } = useFranquiaStore()
  const router = useRouter()
  const { notifications, unreadCount, hydrate, markRead, markAllRead, loadMore, nextCursor, loading: storeLoading } = useNotificationsStore()
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false) // Local loading for mark all read

  // ... (useEffect remains same) ...

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      markRead(n.id)
    }
    if (n.link) {
      router.push(n.link)
      setShowPanel(false)
    }
  }

  return (
    // ... (button remains same) ...

    { showPanel && (
      <>
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
        <Card className="absolute right-0 top-14 w-[420px] max-h-[600px] flex flex-col z-50 shadow-2xl border-2 border-gray-100 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-meu-primary/5 to-meu-cyan/5 flex-shrink-0">
            {/* ... (header remains same) ... */}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Sem notificações recentes</div>
            ) : (
              <>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${n.read ? 'bg-white' : 'bg-blue-50 border-blue-100'}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-900">{n.title}</div>
                      <div className="text-xs text-gray-500">{formatDate(n.created_at)}</div>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">{n.message}</div>
                    {!n.read && !n.link && (
                      <div className="mt-2 flex justify-end">
                        <span className="text-xs text-meu-primary font-medium">Marcar como lida</span>
                      </div>
                    )}
                  </div>
                ))}

                {nextCursor && (
                  <div className="pt-2 pb-1 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => franquiaUser?.academyId && loadMore({ academyId: franquiaUser.academyId })}
                      disabled={storeLoading}
                      className="w-full text-gray-500"
                    >
                      {storeLoading ? 'Carregando...' : 'Carregar mais'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </>
    )}

    </div >
  )
}

