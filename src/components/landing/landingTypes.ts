import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface CampusStats {
  clubsCount: number;
  activitiesCount: number;
  studentsCount: number;
  productsCount: number;
  ordersCount: number;
}

export type DeviceFrameType = 'laptop' | 'phone' | 'dual';

export interface DayPhase {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  image: string;
  imageAlt: string;
  deviceType: DeviceFrameType;
  highlights: string[];
  tagColor: string;
  secondaryImage?: string;
  secondaryLabel?: string;
  metric?: {
    value: string;
    label: string;
  };
}

export interface BentoStatItem {
  value: string;
  label: string;
}

export interface BentoModule {
  id: string;
  title: string;
  subtitle: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  accentColor: string;
  path: string;
  stats: Array<string | BentoStatItem>;
  colSpan?: string;
  preview: React.ReactNode;
}

export interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  spotlightColor?: string;
}
