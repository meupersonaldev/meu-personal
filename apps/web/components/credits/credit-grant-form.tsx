'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, User, Loader2, Gift, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// Types
interface UserSearchResult {
  user: {
    id: string
    email: string
    name: string
    role: string
  } | null
  studentBalance: {
    total_purchased: number
    total_consumed: number
    locked_qty: number
  } | null
  professorBalance: {
    total_hours: number
    available_hours: number
    locked_hours: number
  } | null
  franchises: Array<{ id: string; name: string }>
}

interface CreditGrantFormProps {
  token: string
  onSuccess?: () => void
}

// Schema de validação
const grantFormSchema = z.object({
  userEmail: z.string().email('Email inválido'),
  creditType: z.enum(['STUDENT_CLASS', 'PROFESSOR_HOUR'], {
    required_error: 'Selecione o tipo de crédito',
  }),
  quantity: z.coerce
    .number()
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero'),
  reason: z
    .string()
    .min(1, 'Motivo é obrigatório')
    .max(500, 'Motivo muito longo (máx. 500 caracteres)'),
})

type GrantFormValues = z.infer<typeof grantFormSchema>

export function CreditGrantForm({ token, onSuccess }: CreditGrantFormProps) {
  const [searchEmail, setSearchEmail] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState<GrantFormValues | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const form = useForm<GrantFormValues>({
    resolver: zodResolver(grantFormSchema),
    defaultValues: {
      userEmail: '',
      creditType: undefined,
      quantity: 1,
      reason: '',
    },
  })

  // Debounced search
  const searchUser = useCallback(
    async (email: string) => {
      if (!email || !email.includes('@')) {
        setSearchResult(null)
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(
          `${API_URL}/api/admin/credits/search-user?email=${encodeURIComponent(email)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Erro ao buscar usuário')
        }

        const data: UserSearchResult = await response.json()
        setSearchResult(data)

        // Auto-select credit type based on user role
        if (data.user) {
          const role = data.user.role?.toUpperCase()
          if (role === 'STUDENT' || role === 'ALUNO') {
            form.setValue('creditType', 'STUDENT_CLASS')
          } else if (role === 'TEACHER' || role === 'PROFESSOR') {
            form.setValue('creditType', 'PROFESSOR_HOUR')
          }
          form.setValue('userEmail', email)
        }
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
        setSearchResult(null)
      } finally {
        setIsSearching(false)
      }
    },
    [API_URL, token, form]
  )

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchEmail.length >= 3) {
        searchUser(searchEmail)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchEmail, searchUser])

  const handleSubmit = async (values: GrantFormValues) => {
    // Check if high quantity needs confirmation
    if (values.quantity > 100 && !pendingSubmit) {
      setPendingSubmit(values)
      setShowConfirmDialog(true)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/credits/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...values,
          confirmHighQuantity: values.quantity > 100,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao liberar créditos')
      }

      toast.success('Créditos liberados com sucesso!')
      
      // Reset form
      form.reset()
      setSearchEmail('')
      setSearchResult(null)
      setPendingSubmit(null)
      
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao liberar créditos')
    } finally {
      setIsSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  const handleConfirmHighQuantity = () => {
    if (pendingSubmit) {
      handleSubmit(pendingSubmit)
    }
  }

  const getUserRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      STUDENT: 'Aluno',
      ALUNO: 'Aluno',
      TEACHER: 'Professor',
      PROFESSOR: 'Professor',
    }
    return roleMap[role?.toUpperCase()] || role
  }

  const getCurrentBalance = () => {
    if (!searchResult?.user) return null

    const creditType = form.watch('creditType')
    const role = searchResult.user.role?.toUpperCase()

    if (creditType === 'STUDENT_CLASS' && (role === 'STUDENT' || role === 'ALUNO')) {
      if (searchResult.studentBalance) {
        const available =
          searchResult.studentBalance.total_purchased -
          searchResult.studentBalance.total_consumed -
          searchResult.studentBalance.locked_qty
        return { label: 'Aulas disponíveis', value: available }
      }
      return { label: 'Aulas disponíveis', value: 0 }
    }

    if (creditType === 'PROFESSOR_HOUR' && (role === 'TEACHER' || role === 'PROFESSOR')) {
      if (searchResult.professorBalance) {
        return {
          label: 'Horas disponíveis',
          value: searchResult.professorBalance.available_hours,
        }
      }
      return { label: 'Horas disponíveis', value: 0 }
    }

    return null
  }

  const balance = getCurrentBalance()

  return (
    <>
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-5 w-5 text-meu-primary" />
            <h3 className="text-lg font-semibold">Liberar Créditos</h3>
          </div>

          {/* Search Section */}
          <div className="space-y-2">
            <Label htmlFor="search-email">Buscar usuário por email</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search-email"
                type="email"
                placeholder="Digite o email do usuário..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
          </div>

          {/* User Info Card */}
          {searchResult && (
            <div className="rounded-lg border p-4 bg-gray-50">
              {searchResult.user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-meu-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-meu-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{searchResult.user.name}</p>
                      <p className="text-sm text-gray-500">{searchResult.user.email}</p>
                    </div>
                    <span className="ml-auto px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      {getUserRoleLabel(searchResult.user.role)}
                    </span>
                  </div>

                  {searchResult.franchises.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Franquias: </span>
                      {searchResult.franchises.map((f) => f.name).join(', ')}
                    </div>
                  )}

                  {balance && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">{balance.label}:</span>
                      <span className="font-semibold text-meu-primary">{balance.value}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  Nenhum usuário encontrado com este email
                </p>
              )}
            </div>
          )}

          {/* Grant Form */}
          {searchResult?.user && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="creditType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Crédito</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="STUDENT_CLASS">Aulas (Aluno)</SelectItem>
                          <SelectItem value="PROFESSOR_HOUR">Horas (Professor)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Digite a quantidade"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o motivo da liberação..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !searchResult?.user}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Liberando...
                    </>
                  ) : (
                    <>
                      <Gift className="mr-2 h-4 w-4" />
                      Liberar Créditos
                    </>
                  )}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </Card>

      {/* High Quantity Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirmar Liberação
            </DialogTitle>
            <DialogDescription>
              Você está prestes a liberar <strong>{pendingSubmit?.quantity}</strong> créditos.
              Esta é uma quantidade alta. Tem certeza que deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setPendingSubmit(null)
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmHighQuantity}
              disabled={isSubmitting}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar Liberação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CreditGrantForm
