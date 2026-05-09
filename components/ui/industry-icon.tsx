import {
  Cpu,
  Stethoscope,
  Zap,
  ShoppingCart,
  Landmark,
  Shield,
  Building2,
  Car,
  Factory,
  Layers,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const INDUSTRY_ICON_MAP: Record<string, LucideIcon> = {
  tech: Cpu,
  healthcare: Stethoscope,
  healthcare_industry: Stethoscope,
  energy: Zap,
  consumer: ShoppingCart,
  finance: Landmark,
  defense_aero: Shield,
  defense_aerospace: Shield,
  real_estate: Building2,
  realestate: Building2,
  mobility: Car,
  mobility_transport: Car,
  industrials: Factory,
  infrastructure: Factory,
}

export function resolveIndustryIcon(iconKey: string | null | undefined): LucideIcon {
  if (!iconKey) return Layers
  return INDUSTRY_ICON_MAP[iconKey] ?? Layers
}

interface IndustryIconProps {
  /** industries.id 또는 알려진 iconKey */
  iconKey: string | null | undefined
  className?: string
  'aria-label'?: string
}

export function IndustryIcon({ iconKey, className, ...rest }: IndustryIconProps) {
  const Icon = resolveIndustryIcon(iconKey)
  return <Icon className={cn('h-5 w-5', className)} aria-hidden {...rest} />
}
