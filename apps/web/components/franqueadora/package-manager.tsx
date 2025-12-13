'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFranqueadoraStore, CreateStudentPackageInput, CreateHourPackageInput } from '@/lib/stores/franqueadora-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Edit, Trash2, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

interface StudentFormState {
  title: string
  classesQty: string
  price: string
  description: string
}

interface HourFormState {
  title: string
  hoursQty: string
  price: string
  description: string
}

const initialStudentForm: StudentFormState = {
  title: '',
  classesQty: '',
  price: '',
  description: ''
}

const initialHourForm: HourFormState = {
  title: '',
  hoursQty: '',
  price: '',
  description: ''
}

function parsePriceToCents(input: string): number | null {
  if (!input) return null
  const normalized = input.replace(/\./g, '').replace(',', '.').trim()
  const value = Number(normalized)
  if (Number.isNaN(value) || value < 0) {
    return null
  }
  return Math.round(value * 100)
}

type PackageManagerVariant = 'all' | 'student' | 'hour'

interface FranqueadoraPackageManagerProps {
  variant?: PackageManagerVariant
}

const DEFAULT_VARIANT: PackageManagerVariant = 'all'

export function FranqueadoraPackageManager({ variant = DEFAULT_VARIANT }: FranqueadoraPackageManagerProps) {
  const {
    studentPackages,
    hourPackages,
    isPackagesLoading,
    fetchStudentPackages,
    fetchHourPackages,
    createStudentPackage,
    createHourPackage,
    updateStudentPackage,
    deleteStudentPackage,
    updateHourPackage,
    deleteHourPackage
  } = useFranqueadoraStore((state) => ({
    studentPackages: state.studentPackages,
    hourPackages: state.hourPackages,
    isPackagesLoading: state.isPackagesLoading,
    fetchStudentPackages: state.fetchStudentPackages,
    fetchHourPackages: state.fetchHourPackages,
    createStudentPackage: state.createStudentPackage,
    createHourPackage: state.createHourPackage,
    updateStudentPackage: state.updateStudentPackage,
    deleteStudentPackage: state.deleteStudentPackage,
    updateHourPackage: state.updateHourPackage,
    deleteHourPackage: state.deleteHourPackage
  }))

  const showStudent = variant !== 'hour'
  const showHour = variant !== 'student'
  const showStudentStatus = variant !== 'student'

  const [studentForm, setStudentForm] = useState<StudentFormState>(initialStudentForm)
  const [hourForm, setHourForm] = useState<HourFormState>(initialHourForm)
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false)
  const [isSubmittingHour, setIsSubmittingHour] = useState(false)

  // Edit states
  const [editingStudentPackage, setEditingStudentPackage] = useState<typeof studentPackages[0] | null>(null)
  const [editingHourPackage, setEditingHourPackage] = useState<typeof hourPackages[0] | null>(null)
  const [isEditingStudent, setIsEditingStudent] = useState(false)
  const [isEditingHour, setIsEditingHour] = useState(false)

  // Delete states
  const [deletingStudentPackage, setDeletingStudentPackage] = useState<typeof studentPackages[0] | null>(null)
  const [deletingHourPackage, setDeletingHourPackage] = useState<typeof hourPackages[0] | null>(null)
  const [isDeletingStudent, setIsDeletingStudent] = useState(false)
  const [isDeletingHour, setIsDeletingHour] = useState(false)

  // Modals de criação/edição
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [hourModalOpen, setHourModalOpen] = useState(false)

  useEffect(() => {
    if (showStudent) {
      fetchStudentPackages()
    }
    if (showHour) {
      fetchHourPackages()
    }
  }, [showStudent, showHour, fetchStudentPackages, fetchHourPackages])

  const displayedStudentPackages = useMemo(() => studentPackages, [studentPackages])
  const displayedHourPackages = useMemo(() => hourPackages, [hourPackages])
  const hasStudentPackages = displayedStudentPackages.length > 0
  const hasHourPackages = displayedHourPackages.length > 0

  const handleCreateStudentPackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmittingStudent) return

    const priceCents = parsePriceToCents(studentForm.price)
    const qty = Number(studentForm.classesQty)

    if (!priceCents && priceCents !== 0) {
      const { toast } = await import('sonner')
      toast.error('Informe um valor de pacote valido.')
      return
    }

    // Validar: deve ser 0 (grátis) ou >= R$ 5,00 (regra do Asaas)
    if (priceCents > 0 && priceCents < 500) {
      const { toast } = await import('sonner')
      toast.error('O valor do pacote deve ser R$ 0,00 (grátis) ou no mínimo R$ 5,00. Esta é uma regra do Asaas para processamento de pagamentos.')
      return
    }

    if (!qty || qty <= 0) {
      const { toast } = await import('sonner')
      toast.error('Informe a quantidade de treinos.')
      return
    }

    const payload: CreateStudentPackageInput = {
      title: studentForm.title.trim(),
      classesQty: qty,
      priceCents,
      description: studentForm.description.trim() || undefined
    }

    setIsSubmittingStudent(true)
    const created = await createStudentPackage(payload)
    setIsSubmittingStudent(false)

    if (created) {
      setStudentForm(initialStudentForm)
      setStudentModalOpen(false)
    }
  }

  const handleCreateHourPackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmittingHour) return

    const priceCents = parsePriceToCents(hourForm.price)
    const qty = Number(hourForm.hoursQty)

    if (!priceCents && priceCents !== 0) {
      const { toast } = await import('sonner')
      toast.error('Informe um valor de pacote valido.')
      return
    }

    // Validar: deve ser 0 (grátis) ou >= R$ 5,00 (regra do Asaas)
    if (priceCents > 0 && priceCents < 500) {
      const { toast } = await import('sonner')
      toast.error('O valor do pacote deve ser R$ 0,00 (grátis) ou no mínimo R$ 5,00. Esta é uma regra do Asaas para processamento de pagamentos.')
      return
    }

    if (!qty || qty <= 0) {
      const { toast } = await import('sonner')
      toast.error('Informe a quantidade de horas.')
      return
    }

    const payload: CreateHourPackageInput = {
      title: hourForm.title.trim(),
      hoursQty: qty,
      priceCents,
      description: hourForm.description.trim() || undefined
    }

    setIsSubmittingHour(true)
    const created = await createHourPackage(payload)
    setIsSubmittingHour(false)

    if (created) {
      setHourForm(initialHourForm)
      setHourModalOpen(false)
      setEditingHourPackage(null)
    }
  }

  // Edit handlers
  const handleEditStudentPackage = (pkg: typeof studentPackages[0]) => {
    setEditingStudentPackage(pkg)
    setStudentForm({
      title: pkg.title,
      classesQty: pkg.classes_qty.toString(),
      price: (pkg.price_cents / 100).toFixed(2).replace('.', ','),
      description: pkg.metadata_json?.description || ''
    })
  }

  const handleEditHourPackage = (pkg: typeof hourPackages[0]) => {
    setEditingHourPackage(pkg)
    setHourForm({
      title: pkg.title,
      hoursQty: pkg.hours_qty.toString(),
      price: (pkg.price_cents / 100).toFixed(2).replace('.', ','),
      description: pkg.metadata_json?.description || ''
    })
  }

  const handleUpdateStudentPackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingStudentPackage || isEditingStudent) return

    const priceCents = parsePriceToCents(studentForm.price)
    const qty = Number(studentForm.classesQty)

    if (!priceCents && priceCents !== 0) {
      const { toast } = await import('sonner')
      toast.error('Informe um valor de pacote valido.')
      return
    }

    // Validar: deve ser 0 (grátis) ou >= R$ 5,00 (regra do Asaas)
    if (priceCents > 0 && priceCents < 500) {
      const { toast } = await import('sonner')
      toast.error('O valor do pacote deve ser R$ 0,00 (grátis) ou no mínimo R$ 5,00. Esta é uma regra do Asaas para processamento de pagamentos.')
      return
    }

    if (!qty || qty <= 0) {
      const { toast } = await import('sonner')
      toast.error('Informe a quantidade de treinos.')
      return
    }

    const payload: CreateStudentPackageInput = {
      title: studentForm.title.trim(),
      classesQty: qty,
      priceCents,
      description: studentForm.description.trim() || undefined,
      status: (editingStudentPackage?.status === 'active' || editingStudentPackage?.status === 'inactive')
        ? editingStudentPackage.status
        : 'active'
    }

    setIsEditingStudent(true)
    const updated = await updateStudentPackage(editingStudentPackage.id, payload)
    setIsEditingStudent(false)

    if (updated) {
      setEditingStudentPackage(null)
      setStudentForm(initialStudentForm)
      setStudentModalOpen(false)
    }
  }

  const handleUpdateHourPackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingHourPackage || isEditingHour) return

    const priceCents = parsePriceToCents(hourForm.price)
    const qty = Number(hourForm.hoursQty)

    if (!priceCents && priceCents !== 0) {
      const { toast } = await import('sonner')
      toast.error('Informe um valor de pacote valido.')
      return
    }

    // Validar: deve ser 0 (grátis) ou >= R$ 5,00 (regra do Asaas)
    if (priceCents > 0 && priceCents < 500) {
      const { toast } = await import('sonner')
      toast.error('O valor do pacote deve ser R$ 0,00 (grátis) ou no mínimo R$ 5,00. Esta é uma regra do Asaas para processamento de pagamentos.')
      return
    }

    if (!qty || qty <= 0) {
      const { toast } = await import('sonner')
      toast.error('Informe a quantidade de horas.')
      return
    }

    const payload = {
      title: hourForm.title.trim(),
      hoursQty: qty,
      priceCents,
      description: hourForm.description.trim() || undefined
    }

    setIsEditingHour(true)
    const updated = await updateHourPackage(editingHourPackage.id, payload)
    setIsEditingHour(false)

    if (updated) {
      setEditingHourPackage(null)
      setHourForm(initialHourForm)
      setHourModalOpen(false)
    }
  }

  // Delete handlers
  const handleDeleteStudentPackage = async () => {
    if (!deletingStudentPackage || isDeletingStudent) return

    setIsDeletingStudent(true)
    const deleted = await deleteStudentPackage(deletingStudentPackage.id)
    setIsDeletingStudent(false)

    if (deleted) {
      setDeletingStudentPackage(null)
    }
  }

  const handleDeleteHourPackage = async () => {
    if (!deletingHourPackage || isDeletingHour) return

    setIsDeletingHour(true)
    const deleted = await deleteHourPackage(deletingHourPackage.id)
    setIsDeletingHour(false)

    if (deleted) {
      setDeletingHourPackage(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 ${variant === 'all' ? 'lg:grid-cols-2 gap-6' : 'gap-6'}`}>
        {showStudent && (
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pacotes para alunos</h2>
                <p className="text-sm text-gray-600">
                  Crie pacotes de treinos que os alunos podem adquirir via checkout Asaas.
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingStudentPackage(null)
                  setStudentForm(initialStudentForm)
                  setStudentModalOpen(true)
                }}
              >
                Novo pacote
              </Button>
            </div>
            {false && (
              <form className="space-y-4" onSubmit={editingStudentPackage ? handleUpdateStudentPackage : handleCreateStudentPackage}>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="student-title">Nome do pacote</label>
                  <Input
                    id="student-title"
                    placeholder="Ex: Pacote Premium - 20 treinos"
                    value={studentForm.title}
                    onChange={(event) => setStudentForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700" htmlFor="student-qty">Qtd. de treinos</label>
                    <Input
                      id="student-qty"
                      type="number"
                      min={1}
                      placeholder="Ex: 10"
                      value={studentForm.classesQty}
                      onChange={(event) => setStudentForm((prev) => ({ ...prev, classesQty: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700" htmlFor="student-price">Valor (R$)</label>
                    <Input
                      id="student-price"
                      inputMode="decimal"
                      placeholder="Ex: 349,90"
                      value={studentForm.price}
                      onChange={(event) => setStudentForm((prev) => ({ ...prev, price: event.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="student-description">Descrição (opcional)</label>
                  <Textarea
                    id="student-description"
                    rows={3}
                    placeholder="Informações adicionais do pacote"
                    value={studentForm.description}
                    onChange={(event) => setStudentForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingStudent || isEditingStudent}>
                    {(isSubmittingStudent || isEditingStudent) ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingStudentPackage ? 'Atualizar pacote' : 'Criar pacote')}
                  </Button>
                  {editingStudentPackage && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingStudentPackage(null)
                        setStudentForm(initialStudentForm)
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            )}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Pacotes cadastrados</h3>
              {isPackagesLoading && !hasStudentPackages ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-500">
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-meu-primary" />
                  Carregando pacotes...
                </div>
              ) : !hasStudentPackages ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-500">Nenhum pacote cadastrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedStudentPackages.map((pkg) => (
                    <Card key={pkg.id} className="group relative overflow-hidden border-gray-100 hover:shadow-lg transition-all duration-300">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${pkg.status === 'active' ? 'bg-meu-primary' : 'bg-gray-300'}`} />
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="bg-blue-50 text-meu-primary p-2 rounded-lg">
                            <Edit className="h-5 w-5" />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { handleEditStudentPackage(pkg); setStudentModalOpen(true) }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingStudentPackage(pkg)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h4 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1" title={pkg.title}>{pkg.title}</h4>

                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-2xl font-bold text-meu-primary">
                            {currencyFormatter.format(pkg.price_cents / 100)}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Qtd:</span> {pkg.classes_qty} treinos
                          </div>
                          {pkg.metadata_json?.description && (
                            <div className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">
                              {pkg.metadata_json.description}
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${pkg.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                            }`}>
                            {pkg.status === 'active' ? 'ATIVO' : 'INATIVO'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
        {showHour && (
          <Card className="p-6 space-y-6 border-none shadow-none bg-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-meu-primary">Pacotes para Professores</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Gerencie os pacotes de horas disponíveis para compra pelos professores.
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingHourPackage(null)
                  setHourForm(initialHourForm)
                  setHourModalOpen(true)
                }}
                className="bg-meu-primary hover:bg-meu-primary-dark text-white shadow-lg shadow-blue-900/10"
              >
                Novo Pacote
              </Button>
            </div>

            <div>
              {isPackagesLoading && !hasHourPackages ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-500">
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-meu-primary" />
                  Carregando pacotes...
                </div>
              ) : !hasHourPackages ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-500">Nenhum pacote cadastrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedHourPackages.map((pkg) => (
                    <Card key={pkg.id} className="group relative overflow-hidden border-gray-100 hover:shadow-lg transition-all duration-300">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${pkg.status === 'active' ? 'bg-meu-primary' : 'bg-gray-300'}`} />
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="bg-blue-50 text-meu-primary p-2 rounded-lg">
                            <Edit className="h-5 w-5" />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { handleEditHourPackage(pkg); setHourModalOpen(true) }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingHourPackage(pkg)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h4 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1" title={pkg.title}>{pkg.title}</h4>

                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-2xl font-bold text-meu-primary">
                            {currencyFormatter.format(pkg.price_cents / 100)}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Qtd:</span> {pkg.hours_qty} horas
                          </div>
                          {pkg.metadata_json?.description && (
                            <div className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">
                              {pkg.metadata_json.description}
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${pkg.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                            }`}>
                            {pkg.status === 'active' ? 'ATIVO' : 'INATIVO'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Modal: Criar/Editar Pacote de Aluno */}
      {showStudent && (
        <Dialog open={studentModalOpen} onOpenChange={setStudentModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader className="border-b border-gray-100 pb-4 mb-4">
              <DialogTitle className="text-xl font-bold text-meu-primary">{editingStudentPackage ? 'Editar Pacote de Aluno' : 'Novo Pacote de Aluno'}</DialogTitle>
              <DialogDescription className="text-gray-500">
                {editingStudentPackage ? 'Atualize as informações do pacote abaixo.' : 'Preencha os dados para criar um novo pacote de treinos.'}
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={editingStudentPackage ? handleUpdateStudentPackage : handleCreateStudentPackage}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700" htmlFor="student-title-modal">Nome do pacote</label>
                <Input
                  id="student-title-modal"
                  placeholder="Ex: Pacote Premium - 20 treinos"
                  value={studentForm.title}
                  onChange={(event) => setStudentForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="student-qty-modal">Qtd. de treinos</label>
                  <Input
                    id="student-qty-modal"
                    type="number"
                    min={1}
                    placeholder="Ex: 10"
                    value={studentForm.classesQty}
                    onChange={(event) => setStudentForm((prev) => ({ ...prev, classesQty: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="student-price-modal">Valor (R$)</label>
                  <Input
                    id="student-price-modal"
                    inputMode="decimal"
                    placeholder="Ex: 0,00 (grátis) ou 5,00"
                    value={studentForm.price}
                    onChange={(event) => setStudentForm((prev) => ({ ...prev, price: event.target.value }))}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    O valor deve ser R$ 0,00 (grátis) ou no mínimo R$ 5,00. Esta é uma regra do Asaas para processamento de pagamentos.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700" htmlFor="student-description-modal">Descrição (opcional)</label>
                <Textarea
                  id="student-description-modal"
                  rows={3}
                  placeholder="Informações adicionais do pacote"
                  value={studentForm.description}
                  onChange={(event) => setStudentForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <DialogFooter className="border-t border-gray-100 pt-4 mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" onClick={() => setStudentModalOpen(false)} className="text-gray-500 hover:text-gray-700 hover:bg-gray-50">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmittingStudent || isEditingStudent} className="bg-meu-primary hover:bg-meu-primary-dark text-white px-6">
                  {(isSubmittingStudent || isEditingStudent) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Pacote'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Criar/Editar Pacote de Professor */}
      {showHour && (
        <Dialog open={hourModalOpen} onOpenChange={setHourModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader className="border-b border-gray-100 pb-4 mb-4">
              <DialogTitle className="text-xl font-bold text-meu-primary">{editingHourPackage ? 'Editar Pacote de Horas' : 'Novo Pacote de Horas'}</DialogTitle>
              <DialogDescription className="text-gray-500">
                {editingHourPackage ? 'Atualize as informações do pacote abaixo.' : 'Preencha os dados para criar um novo pacote de horas.'}
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={editingHourPackage ? handleUpdateHourPackage : handleCreateHourPackage}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700" htmlFor="hour-title-modal">Nome do pacote</label>
                <Input
                  id="hour-title-modal"
                  placeholder="Ex: Pacote Professor - 25 horas"
                  value={hourForm.title}
                  onChange={(event) => setHourForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="hour-qty-modal">Qtd. de horas</label>
                  <Input
                    id="hour-qty-modal"
                    type="number"
                    min={1}
                    placeholder="Ex: 25"
                    value={hourForm.hoursQty}
                    onChange={(event) => setHourForm((prev) => ({ ...prev, hoursQty: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="hour-price-modal">Valor (R$)</label>
                  <Input
                    id="hour-price-modal"
                    inputMode="decimal"
                    placeholder="Ex: 0,00 (grátis) ou 5,00"
                    value={hourForm.price}
                    onChange={(event) => setHourForm((prev) => ({ ...prev, price: event.target.value }))}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    O valor deve ser R$ 0,00 (grátis) ou no mínimo R$ 5,00. Esta é uma regra do Asaas para processamento de pagamentos.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700" htmlFor="hour-description-modal">Descrição (opcional)</label>
                <Textarea
                  id="hour-description-modal"
                  rows={3}
                  placeholder="Diferenciais do pacote de horas"
                  value={hourForm.description}
                  onChange={(event) => setHourForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <DialogFooter className="border-t border-gray-100 pt-4 mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" onClick={() => setHourModalOpen(false)} className="text-gray-500 hover:text-gray-700 hover:bg-gray-50">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmittingHour || isEditingHour} className="bg-meu-primary hover:bg-meu-primary-dark text-white px-6">
                  {(isSubmittingHour || isEditingHour) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Pacote'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation dialogs */}
      {deletingStudentPackage && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setDeletingStudentPackage(null) }}>
          <DialogContent>
            <DialogHeader className="border-b border-gray-100 pb-4 mb-4">
              <DialogTitle className="text-xl font-bold text-red-600">Excluir Pacote de Aluno</DialogTitle>
              <DialogDescription className="text-gray-500">
                Tem certeza que deseja excluir o pacote <span className="font-semibold text-gray-900">{deletingStudentPackage.title}</span>?
                <br />Esta ação não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="bg-gray-50 -mx-6 -mb-6 p-4 border-t border-gray-100 mt-4 rounded-b-lg">
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setDeletingStudentPackage(null)} className="bg-white hover:bg-gray-50">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                onClick={handleDeleteStudentPackage}
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200"
                disabled={isDeletingStudent}
              >
                {isDeletingStudent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Excluir Permanentemente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deletingHourPackage && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setDeletingHourPackage(null) }}>
          <DialogContent>
            <DialogHeader className="border-b border-gray-100 pb-4 mb-4">
              <DialogTitle className="text-xl font-bold text-red-600">Excluir Pacote de Horas</DialogTitle>
              <DialogDescription className="text-gray-500">
                Tem certeza que deseja excluir o pacote <span className="font-semibold text-gray-900">{deletingHourPackage.title}</span>?
                <br />Esta ação não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="bg-gray-50 -mx-6 -mb-6 p-4 border-t border-gray-100 mt-4 rounded-b-lg">
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setDeletingHourPackage(null)} className="bg-white hover:bg-gray-50">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                onClick={handleDeleteHourPackage}
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200"
                disabled={isDeletingHour}
              >
                {isDeletingHour ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Excluir Permanentemente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deletingHourPackage && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setDeletingHourPackage(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir pacote de horas</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o pacote {deletingHourPackage.title}?
                Esta ação não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setDeletingHourPackage(null)}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                onClick={handleDeleteHourPackage}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeletingHour}
              >
                {isDeletingHour ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default FranqueadoraPackageManager
