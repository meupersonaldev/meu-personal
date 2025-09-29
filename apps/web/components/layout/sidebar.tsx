import Link from 'next/link';
import Image from 'next/image';
import { Home, Calendar, Book, User, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Sidebar() {
  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center font-semibold">
            <Image 
              src="/images/logo.png" 
              alt="Meu Personal" 
              width={32} 
              height={32}
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <Link
              href="/professor/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/professor/agenda"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Calendar className="h-4 w-4" />
              Agenda
            </Link>
            <Link
              href="/professor/aulas"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Book className="h-4 w-4" />
              Aulas
            </Link>
            <Link
              href="/professor/perfil"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <User className="h-4 w-4" />
              Perfil
            </Link>
            <Link
              href="/professor/carteira"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <CreditCard className="h-4 w-4" />
              Carteira
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}