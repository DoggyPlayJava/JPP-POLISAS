import React from 'react';
import {
  Landmark,
  Lightbulb,
  HeartHandshake,
  Trophy,
  GraduationCap,
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Sparkles,
  ShieldCheck,
  PlusCircle,
  QrCode,
  Gavel,
  FileCheck,
  Users,
  FileText,
  Settings,
  Settings2,
  ClipboardCheck,
  LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Landmark,
  Lightbulb,
  HeartHandshake,
  Trophy,
  GraduationCap,
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Sparkles,
  ShieldCheck,
  PlusCircle,
  QrCode,
  Gavel,
  FileCheck,
  Users,
  FileText,
  Settings,
  Settings2,
  ClipboardCheck,
};

interface ExcoIconProps {

  iconName: string;
  className?: string;
  fallback?: LucideIcon;
}

export function ExcoIcon({ iconName, className, fallback = LayoutDashboard }: ExcoIconProps) {
  const IconComp = ICONS[iconName];

  if (IconComp) {
    return <IconComp className={className} />;
  }

  // If not a Lucide icon name, it might be an emoji
  return <span className={className}>{iconName}</span>;
}
