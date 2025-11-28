import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'header'
  variant?: 'default' | 'white' | 'dark'
  showText?: boolean
  href?: string
  className?: string
}

const sizeClasses = {
  sm: 'h-24 w-24',
  md: 'h-40 w-40',
  lg: 'h-56 w-56',
  xl: 'h-72 w-72',
  header: 'h-24 w-48 lg:transform lg:scale-100 lg:origin-left relative lg:top-6'
}

const textSizeClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
  header: 'text-xl'
}

export function Logo({ 
  size = 'md', 
  variant = 'default',
  showText = true, 
  href = '/',
  className 
}: LogoProps) {
  // Escolher a logo baseada no variant/fundo
  const logoSrc = variant === 'white' || variant === 'dark' 
    ? '/images/logo-fundopreto.png'  // Para fundos brancos/claros
    : '/images/logo-fundobranco.png' // Para fundos escuros/coloridos

  const logoContent = (
    <div className={cn('flex items-center space-x-3', className)}>
      <div className={cn(
        'flex items-center justify-center',
        sizeClasses[size]
      )}>
        <Image
          src={logoSrc}
          alt="Meu Personal"
          width={size === 'header' ? 192 : size === 'xl' ? 288 : size === 'lg' ? 224 : size === 'md' ? 160 : 96}
          height={size === 'header' ? 192 : size === 'xl' ? 288 : size === 'lg' ? 224 : size === 'md' ? 160 : 96}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span className={cn(
          'font-bold',
          textSizeClasses[size],
          variant === 'white' ? 'text-white' : 
          variant === 'dark' ? 'text-gray-900' : 'text-meu-primary'
        )}>
          Meu Personal
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-80">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}
