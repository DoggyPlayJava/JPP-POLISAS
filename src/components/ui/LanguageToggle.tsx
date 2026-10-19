import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLanguage, SupportedLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation('nav');
  const currentLang = (i18n.language?.startsWith('ms') ? 'ms' : 'en') as SupportedLanguage;

  const handleSelect = (lang: SupportedLanguage) => {
    changeLanguage(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-xl h-9 px-2.5 bg-muted/40 hover:bg-muted text-muted-foreground transition-colors flex items-center gap-1.5 font-bold text-xs shadow-xs",
            className
          )}
          aria-label={t('switch_language')}
        >
          <Languages className="w-4 h-4 text-primary" />
          <span className="uppercase tracking-wider text-[11px] font-black">
            {currentLang === 'ms' ? 'BM' : 'EN'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl p-1.5 border border-border/40 shadow-2xl glass min-w-[150px]">
        <DropdownMenuItem
          onClick={() => handleSelect('en')}
          className="rounded-xl flex items-center justify-between px-3 py-2 text-xs font-bold cursor-pointer focus:bg-primary/10"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">🇬🇧</span>
            <span>English</span>
          </div>
          {currentLang === 'en' && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleSelect('ms')}
          className="rounded-xl flex items-center justify-between px-3 py-2 text-xs font-bold cursor-pointer focus:bg-primary/10"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">🇲🇾</span>
            <span>Bahasa Melayu</span>
          </div>
          {currentLang === 'ms' && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
