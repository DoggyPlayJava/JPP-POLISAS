import React, { memo } from 'react';
import {
  Landmark,
  HeartHandshake,
  Lightbulb,
  GraduationCap,
  CalendarDays,
  LayoutDashboard,
  LayoutGrid,
  Trophy,
  Store,
  Flag,
  Shield,
  Crown,
  Bike,
  Map,
  Search,
  Building2,
  Users,
  Award,
  CircleDot,
  Dumbbell,
  Flame,
  Activity,
  Medal,
  Swords,
  Target,
  Zap,
  Footprints,
  Sparkles,
  HelpCircle,
  Clock,
  Compass,
  Layers,
  FileText
} from 'lucide-react';

/**
 * Static icon map for known Portal, Exco, and SUPSAS icons.
 * Eliminates dynamic `import('lucide-react')` which forced the browser to
 * parse 2MB of JS (1,500+ Lucide icons) during initial portal load.
 */
const KNOWN_ICONS: Record<string, React.ComponentType<any>> = {
  Landmark,
  HeartHandshake,
  Lightbulb,
  GraduationCap,
  CalendarDays,
  LayoutDashboard,
  LayoutGrid,
  Trophy,
  Store,
  Flag,
  Shield,
  Crown,
  Bike,
  Map,
  Search,
  Building2,
  Users,
  Award,
  CircleDot,
  Dumbbell,
  Flame,
  Activity,
  Medal,
  Swords,
  Target,
  Zap,
  Footprints,
  Sparkles,
  HelpCircle,
  Clock,
  Compass,
  Layers,
  FileText
};

interface DynamicIconProps extends React.SVGAttributes<SVGSVGElement> {
  /** The PascalCase name of the Lucide icon, e.g. "Trophy", "HeartHandshake" */
  name: string;
  /** Fallback icon name if the requested icon is not found */
  fallback?: string;
  /** Icon size */
  size?: number | string;
}

function DynamicIconInner({ name, fallback = 'LayoutDashboard', size, className, ...props }: DynamicIconProps) {
  const Icon = KNOWN_ICONS[name] || KNOWN_ICONS[fallback] || LayoutDashboard;
  return <Icon className={className} size={size} {...props} />;
}

export const DynamicIcon = memo(DynamicIconInner);
