'use client'

import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { FranqueadoraPackageManager } from '@/components/franqueadora/package-manager'

export default function FranqueadoraStudentPackagesPage() {
  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* O cabeçalho agora é gerenciado internamente pelo componente FranqueadoraPackageManager para consistência */}
        <FranqueadoraPackageManager variant="student" />
      </div>
    </FranqueadoraGuard>
  )
}
