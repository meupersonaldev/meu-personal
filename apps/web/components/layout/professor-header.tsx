'use client'

import type { ProfessorNotification } from '@/lib/hooks/useProfessorHeaderData'
import { ProfessorHeaderActions } from './professor-header-actions'

interface ProfessorHeaderProps {
  availableHours: number
  notifications: ProfessorNotification[]
  onMarkNotificationAsRead: (notificationId: string) => Promise<void>
}

export default function ProfessorHeader({
  availableHours,
  notifications,
  onMarkNotificationAsRead
}: ProfessorHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white py-4 px-6 shadow-sm">
      <div className="flex items-center justify-end">
        <ProfessorHeaderActions
          availableHours={availableHours}
          notifications={notifications}
          onMarkNotificationAsRead={onMarkNotificationAsRead}
          variant="desktop"
        />
      </div>
    </div>
  )
}
