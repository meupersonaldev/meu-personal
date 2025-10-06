import { redirect } from 'next/navigation'
import { buildRoleQuery, SearchParams } from '@/lib/utils/role-query'

export default function ProfessorResetPasswordRedirect({
  searchParams = {},
}: {
  searchParams?: SearchParams
}) {
  const query = buildRoleQuery(searchParams, 'professor')
  redirect(`/redefinir-senha${query}`)
}
