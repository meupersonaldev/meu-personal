'use client'

import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { FranqueadoraPackageManager } from '@/components/franqueadora/package-manager'

export default function FranqueadoraProfessorPackagesPage() {
  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-3 sm:p-4 lg:p-8 space-y-6">
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Pacotes</p>
            <h1 className="text-2xl font-bold text-gray-900">Pacotes para professores</h1>
          </div>
          <p className="text-sm text-gray-600">
            Configure pacotes de horas disponíveis para que os professores comprem e utilizem em qualquer unidade da rede.
          </p>
        </div>
        <FranqueadoraPackageManager variant="hour" />
      </div>
    </FranqueadoraGuard>
  )
}
