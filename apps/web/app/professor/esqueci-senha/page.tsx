import { redirect } from 'next/navigation'
import { buildRoleQuery, SearchParams } from '@/lib/utils/role-query'

export default function ProfessorForgotPasswordRedirect({
  searchParams = {},
}: {
  searchParams?: SearchParams
}) {
  const query = buildRoleQuery(searchParams, 'professor')
  redirect(`/esqueci-senha${query}`)
}
