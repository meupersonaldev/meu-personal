'use client'

import React, { useState } from 'react'
import { 
  Bell, 
  Search, 
  Menu, 
  User, 
  Settings, 
  LogOut,
  ChevronDown,
  Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Logo } from '@/components/ui/logo'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

interface NavigationItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: NavigationItem[]
}

interface BreadcrumbItem {
  title: string
  href?: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
  navigation: NavigationItem[]
  user: {
    name: string
    email: string
    avatar?: string
    role?: string
  }
  breadcrumbs?: BreadcrumbItem[]
  title?: string
  onLogout?: () => void
  logoHref?: string
  brandName?: string
}

export default function DashboardLayout({
  children,
  navigation,
  user,
  breadcrumbs = [],
  title,
  onLogout,
  logoHref = '/'
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 shrink-0 items-center justify-center border-b px-4 bg-gradient-to-r from-meu-primary to-meu-accent-cyan">
            <Logo 
              size="sm" 
              variant="white" 
              showText={false}
              href={logoHref}
              className="scale-75"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-6">
            {navigation.map((item, index) => (
              <NavigationItem key={index} item={item} />
            ))}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <div className="h-full w-full bg-gradient-to-br from-meu-primary to-meu-accent-cyan flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role || user.email}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Breadcrumbs */}
              {breadcrumbs.length > 0 && (
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2 text-sm">
                    <li>
                      <a href={logoHref} className="text-gray-400 hover:text-gray-600">
                        <Home className="h-4 w-4" />
                      </a>
                    </li>
                    {breadcrumbs.map((item, index) => (
                      <li key={index} className="flex items-center">
                        <span className="mx-2 text-gray-300">/</span>
                        {item.href ? (
                          <a href={item.href} className="text-gray-400 hover:text-gray-600">
                            {item.title}
                          </a>
                        ) : (
                          <span className="text-gray-900 font-medium">{item.title}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-10 w-64 bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative hover:bg-meu-accent-yellow/10">
                <Bell className="h-5 w-5 text-gray-600 hover:text-meu-primary" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-meu-accent-yellow rounded-full border-2 border-white shadow-sm"></span>
              </Button>

              {/* User menu mobile */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Avatar className="h-6 w-6">
                        <div className="h-full w-full bg-gradient-to-br from-meu-primary to-meu-accent-cyan flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Page title */}
          {title && (
            <div className="border-t bg-gray-50 px-4 py-3 sm:px-6 lg:px-8">
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            </div>
          )}
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

// Navigation item component
function NavigationItem({ item }: { item: NavigationItem }) {
  const [isOpen, setIsOpen] = useState(false)
  const IconComponent = item.icon

  if (item.children && item.children.length > 0) {
    return (
      <div>
        <Button
          variant="ghost"
          className="w-full justify-start text-left font-normal text-gray-700 hover:text-meu-primary hover:bg-meu-accent-yellow/10 transition-all duration-200"
          onClick={() => setIsOpen(!isOpen)}
        >
          <IconComponent className="mr-3 h-4 w-4" />
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <span className="ml-2 rounded-full bg-meu-accent-yellow px-2 py-0.5 text-xs font-medium text-meu-primary">
              {item.badge}
            </span>
          )}
          <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
        {isOpen && (
          <div className="ml-6 mt-1 space-y-1">
            {item.children.map((child, index) => (
              <NavigationItem key={index} item={child} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <a href={item.href}>
      <Button
        variant="ghost"
        className="w-full justify-start text-left font-normal text-gray-700 hover:text-meu-primary hover:bg-meu-accent-yellow/10 transition-all duration-200 active:bg-gradient-to-r active:from-meu-primary active:to-meu-accent-cyan active:text-white"
      >
        <IconComponent className="mr-3 h-4 w-4" />
        <span className="flex-1">{item.title}</span>
        {item.badge && (
          <span className="ml-2 rounded-full bg-meu-accent-yellow px-2 py-0.5 text-xs font-medium text-meu-primary">
            {item.badge}
          </span>
        )}
      </Button>
    </a>
  )
}

export type { NavigationItem, BreadcrumbItem, DashboardLayoutProps }