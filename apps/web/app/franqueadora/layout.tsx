'use client'

import { usePathname } from 'next/navigation'
import FranqueadoraLayout from '@/components/layout/franqueadora-layout'

export default function FranqueadoraRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Se for a página de login, não usar o layout com sidebar
  if (pathname === '/franqueadora') {
    return <>{children}</>
  }
  
  return <FranqueadoraLayout>{children}</FranqueadoraLayout>
}
