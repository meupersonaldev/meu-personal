'use client'

import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import { FranqueadoraPackageManager } from '@/components/franqueadora/package-manager'

export default function FranqueadoraStudentPackagesPage() {
  return (
    <FranqueadoraGuard requiredPermission="canViewDashboard">
      <div className="p-3 sm:p-4 lg:p-8 space-y-6">
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Pacotes</p>
            <h1 className="text-2xl font-bold text-gray-900">Pacotes para alunos</h1>
          </div>
          <p className="text-sm text-gray-600">
            Cadastre e gerencie os pacotes de créditos que os alunos poderão adquirir via checkout da plataforma.
          </p>
        </div>
        <FranqueadoraPackageManager variant="student" />
      </div>
    </FranqueadoraGuard>
  )
}
