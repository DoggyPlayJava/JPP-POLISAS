import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl w-10 h-10 bg-muted/40 hover:bg-muted transition-colors relative overflow-hidden group"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={theme}
              initial={{ y: 20, opacity: 0, rotate: -90 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -20, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {theme === 'light' && <Sun className="h-5 w-5 text-amber-500" />}
              {theme === 'dark' && <Moon className="h-5 w-5 text-blue-400" />}
            </motion.div>
          </AnimatePresence>
          <span className="sr-only">Tukar Tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl p-2 border-none shadow-2xl glass min-w-[140px]">
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className="rounded-xl gap-3 font-black text-[10px] uppercase tracking-widest cursor-pointer focus:bg-primary/5"
        >
          <Sun size={14} className="text-amber-500" /> Siang
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className="rounded-xl gap-3 font-black text-[10px] uppercase tracking-widest cursor-pointer focus:bg-primary/5"
        >
          <Moon size={14} className="text-blue-500" /> Malam
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
