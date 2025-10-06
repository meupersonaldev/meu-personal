export type SearchParams = Record<string, string | string[] | undefined>

export function buildRoleQuery(searchParams: SearchParams, role: string) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
    } else {
      params.set(key, value)
    }
  }

  params.set('role', role)

  const query = params.toString()
  return query ? `?${query}` : ''
}
