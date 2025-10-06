import { redirect } from 'next/navigation'
import { buildRoleQuery, SearchParams } from '@/lib/utils/role-query'

export default function StudentResetPasswordRedirect({
  searchParams = {},
}: {
  searchParams?: SearchParams
}) {
  const query = buildRoleQuery(searchParams, 'aluno')
  redirect(`/redefinir-senha${query}`)
}
