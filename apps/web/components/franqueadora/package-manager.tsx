'use client'

import { useEffect, useState } from 'react'
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

  // Remover useMemo desnecessário - usar diretamente do store para garantir reatividade
  const hasStudentPackages = studentPackages.length > 0
  const hasHourPackages = hourPackages.length > 0

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

    // Validação: valor mínimo de R$ 5,00 (regra do Asaas)
    const MIN_PRICE_CENTS = 500 // R$ 5,00
    if (priceCents < MIN_PRICE_CENTS) {
      const { toast } = await import('sonner')
      toast.error(`O valor mínimo do pacote é R$ 5,00 (regra do Asaas).`)
      return
    }

    if (!qty || qty <= 0) {
      const { toast } = await import('sonner')
      toast.error('Informe a quantidade de treinos.')
      return
    }

    const payload = {
      title: studentForm.title.trim(),
      classesQty: qty,
      priceCents,
      description: studentForm.description.trim() || undefined,
      status: editingStudentPackage?.status || 'active'
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

    // Validação: valor mínimo de R$ 5,00 (regra do Asaas)
    const MIN_PRICE_CENTS = 500 // R$ 5,00
    if (priceCents < MIN_PRICE_CENTS) {
      const { toast } = await import('sonner')
      toast.error(`O valor mínimo do pacote é R$ 5,00 (regra do Asaas).`)
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

    const packageId = deletingStudentPackage.id
    setIsDeletingStudent(true)
    
    try {
      const deleted = await deleteStudentPackage(packageId)
      
      if (deleted) {
        setDeletingStudentPackage(null)
        // Forçar recarregamento dos pacotes para garantir que a UI seja atualizada
        await fetchStudentPackages()
        
        // Verificar se o pacote foi realmente removido
        const currentPackages = useFranqueadoraStore.getState().studentPackages
        if (currentPackages.some(pkg => pkg.id === packageId)) {
          console.warn('Pacote ainda presente após exclusão, forçando atualização...')
          // Forçar nova atualização
          await fetchStudentPackages()
        }
      }
    } finally {
      setIsDeletingStudent(false)
    }
  }

  const handleDeleteHourPackage = async () => {
    if (!deletingHourPackage || isDeletingHour) return

    setIsDeletingHour(true)
    const deleted = await deleteHourPackage(deletingHourPackage.id)
    setIsDeletingHour(false)

    if (deleted) {
      setDeletingHourPackage(null)
      // Forçar recarregamento dos pacotes para garantir que a UI seja atualizada
      await fetchHourPackages()
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
              <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando pacotes...
              </div>
            ) : !hasStudentPackages ? (
              <p className="text-sm text-gray-500">Nenhum pacote cadastrado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {studentPackages.map((pkg) => (
                  <Card key={pkg.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">{pkg.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {pkg.classes_qty} treino(s) · {currencyFormatter.format(pkg.price_cents / 100)}
                        </p>
                        {pkg.metadata_json?.description && (
                          <p className="text-xs text-gray-600 mt-2">{pkg.metadata_json.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {showStudentStatus && (
                          <span className={`text-xs font-medium ${pkg.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                            {pkg.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
        )}
        {showHour && (
        <Card className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pacotes para professores</h2>
              <p className="text-sm text-gray-600">
                Defina pacotes de horas para que professores habilitados possam comprar via Asaas.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingHourPackage(null)
                setHourForm(initialHourForm)
                setHourModalOpen(true)
              }}
            >
              Novo pacote
            </Button>
          </div>
          {false && (
          <form className="space-y-4" onSubmit={editingHourPackage ? handleUpdateHourPackage : handleCreateHourPackage}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="hour-title">Nome do pacote</label>
              <Input
                id="hour-title"
                placeholder="Ex: Pacote Professor - 25 horas"
                value={hourForm.title}
                onChange={(event) => setHourForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700" htmlFor="hour-qty">Qtd. de horas</label>
                <Input
                  id="hour-qty"
                  type="number"
                  min={1}
                  placeholder="Ex: 25"
                  value={hourForm.hoursQty}
                  onChange={(event) => setHourForm((prev) => ({ ...prev, hoursQty: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700" htmlFor="hour-price">Valor (R$)</label>
                <Input
                  id="hour-price"
                  inputMode="decimal"
                  placeholder="Ex: 325,00"
                  value={hourForm.price}
                  onChange={(event) => setHourForm((prev) => ({ ...prev, price: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="hour-description">Descrição (opcional)</label>
              <Textarea
                id="hour-description"
                rows={3}
                placeholder="Diferenciais do pacote de horas"
                value={hourForm.description}
                onChange={(event) => setHourForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingHour || isEditingHour}>
                {(isSubmittingHour || isEditingHour) ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingHourPackage ? 'Atualizar pacote' : 'Criar pacote')}
              </Button>
              {editingHourPackage && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingHourPackage(null)
                    setHourForm(initialHourForm)
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
            {isPackagesLoading && !hasHourPackages ? (
              <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando pacotes...
              </div>
            ) : !hasHourPackages ? (
              <p className="text-sm text-gray-500">Nenhum pacote cadastrado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {hourPackages.map((pkg) => (
                  <Card key={pkg.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">{pkg.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {pkg.hours_qty} hora(s) · {currencyFormatter.format(pkg.price_cents / 100)}
                        </p>
                        {pkg.metadata_json?.description && (
                          <p className="text-xs text-gray-600 mt-2">{pkg.metadata_json.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${pkg.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                          {pkg.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStudentPackage ? 'Editar pacote de aluno' : 'Novo pacote de aluno'}</DialogTitle>
              <DialogDescription>
                {editingStudentPackage ? 'Atualize as informações do pacote.' : 'Preencha os dados do novo pacote.'}
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
                    placeholder="Ex: 349,90"
                    min="5.00"
                    step="0.01"
                    value={studentForm.price}
                    onChange={(event) => setStudentForm((prev) => ({ ...prev, price: event.target.value }))}
                    required
                  />
                  <p className="text-xs text-gray-500">Valor mínimo: R$ 5,00 (regra do Asaas)</p>
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
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => setStudentModalOpen(false)}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmittingStudent || isEditingStudent}>
                  {(isSubmittingStudent || isEditingStudent) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Criar/Editar Pacote de Professor */}
      {showHour && (
        <Dialog open={hourModalOpen} onOpenChange={setHourModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHourPackage ? 'Editar pacote de horas' : 'Novo pacote de horas'}</DialogTitle>
              <DialogDescription>
                {editingHourPackage ? 'Atualize as informações do pacote.' : 'Preencha os dados do novo pacote.'}
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
                    placeholder="Ex: 325,00"
                    min="5.00"
                    step="0.01"
                    value={hourForm.price}
                    onChange={(event) => setHourForm((prev) => ({ ...prev, price: event.target.value }))}
                    required
                  />
                  <p className="text-xs text-gray-500">Valor mínimo: R$ 5,00 (regra do Asaas)</p>
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
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => setHourModalOpen(false)}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmittingHour || isEditingHour}>
                  {(isSubmittingHour || isEditingHour) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
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
            <DialogHeader>
              <DialogTitle>Excluir pacote de aluno</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o pacote {deletingStudentPackage.title}?
                Esta ação não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setDeletingStudentPackage(null)}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                onClick={handleDeleteStudentPackage}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeletingStudent}
              >
                {isDeletingStudent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Excluir
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
