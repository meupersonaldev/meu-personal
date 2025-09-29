'use client'

import { usePathname } from 'next/navigation'
import FranquiaLayout from '@/components/layout/franquia-layout'

export default function FranquiaRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Se for a página de login, não usar o layout com sidebar
  if (pathname === '/franquia') {
    return <>{children}</>
  }
  
  return <FranquiaLayout>{children}</FranquiaLayout>
}