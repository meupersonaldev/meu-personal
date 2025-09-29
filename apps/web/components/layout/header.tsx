'use client'

import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import { useAuthStore } from '@/lib/stores/auth-store'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
}

export default function Header({ className }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuthStore()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserDisplayRole = (role: string) => {
    switch (role) {
      case 'STUDENT': return 'Aluno'
      case 'TEACHER': return 'Professor'
      case 'ADMIN': return 'Admin'
      default: return 'Usuário'
    }
  }

  return (
    <header className={cn(
      "bg-meu-primary text-white sticky top-0 z-40 border-b border-meu-primary-dark",
      className
    )}>
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <Logo size="md" variant="default" showText={false} />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                {/* User Info */}
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-meu-accent text-meu-primary text-sm font-semibold">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-white/70">{user?.role ? getUserDisplayRole(user.role) : ''}</p>
                  </div>
                </div>

                {/* Credits for students */}
                {user?.role === 'STUDENT' && (
                  <Badge variant="secondary" className="bg-meu-primary-dark text-meu-accent border-0">
                    {user.credits} créditos
                  </Badge>
                )}

                {/* Logout Button */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={logout}
                  className="bg-red-500 text-white border-red-600 hover:bg-red-600 hover:border-red-700 transition-all duration-200 font-semibold shadow-md"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/seja-franqueado" className="text-white hover:text-meu-accent transition-colors text-sm font-medium">
                  Seja Franqueado
                </Link>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-meu-primary-dark hover:text-white">
                    Entrar
                  </Button>
                </Link>
                <Link href="/cadastro">
                  <Button size="sm" className="bg-meu-accent text-meu-primary hover:bg-meu-accent/90">
                    Cadastrar
                  </Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu - simplified for now */}
          <div className="md:hidden">
            {isAuthenticated && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-meu-accent text-meu-primary text-sm font-semibold">
                  {user?.name ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
