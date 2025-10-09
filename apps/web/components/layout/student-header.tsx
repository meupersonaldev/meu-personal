'use client'

import { StudentHeaderActions } from './student-header-actions'

export default function StudentHeader() {
  return (
    <div className="border-b border-gray-200 bg-white py-4 px-6 shadow-sm">
      <div className="flex items-center justify-end">
        <StudentHeaderActions />
      </div>
    </div>
  )
}
