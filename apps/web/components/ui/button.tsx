import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-yellow-300 text-blue-900 hover:opacity-90',
        secondary: 'bg-transparent border-2 border-yellow-300 text-yellow-300 hover:bg-yellow-300 hover:text-blue-900',
        destructive: 'bg-red-600 text-white hover:opacity-90',
        outline: 'border border-gray-300 bg-white hover:bg-gray-100',
        ghost: 'hover:bg-gray-100 hover:text-gray-900',
        link: 'text-blue-900 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-6 py-3',
        sm: 'h-8 px-4 text-xs',
        lg: 'h-12 px-8',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }