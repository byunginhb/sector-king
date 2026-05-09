import {
  MemoryStick,
  Brain,
  Cloud,
  Smartphone,
  CarFront,
  Rocket,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Gamepad2,
  MonitorPlay,
  BatteryCharging,
  Zap,
  Building2,
  CreditCard,
  Landmark,
  LineChart,
  Shirt,
  Gem,
  UtensilsCrossed,
  Store,
  Stethoscope,
  Pill,
  Microscope,
  HeartPulse,
  Factory,
  Truck,
  Plane,
  Ship,
  Fuel,
  Sun,
  Pickaxe,
  Tv,
  Music,
  Newspaper,
  Globe,
  Bot,
  Cpu,
  Server,
  Database,
  Code2,
  Layers,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 카테고리 ID(또는 known iconKey) → lucide 아이콘 매핑
 *
 * 신규 카테고리 추가 시 이 표에 항목을 추가하세요.
 * - key: DB의 categories.id (또는 slug)
 * - value: lucide-react 컴포넌트
 *
 * 누락 시 default(`Layers`) + 콘솔 경고로 표시됩니다.
 */
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // ── Tech ─────────────────────────────────────────────
  semiconductor: MemoryStick,
  semiconductors: MemoryStick,
  chip: MemoryStick,
  ai: Brain,
  ai_ml: Brain,
  machine_learning: Brain,
  cloud: Cloud,
  cloud_computing: Cloud,
  saas: Cloud,
  software: Code2,
  internet: Globe,
  mobile: Smartphone,
  smartphone: Smartphone,
  cyber_security: ShieldCheck,
  cybersecurity: ShieldCheck,
  security: ShieldCheck,
  gaming: Gamepad2,
  game: Gamepad2,
  media: MonitorPlay,
  media_streaming: MonitorPlay,
  streaming: Tv,
  music: Music,
  news: Newspaper,
  hardware: Cpu,
  server: Server,
  database: Database,
  robotics: Bot,

  // ── Mobility / Transport ─────────────────────────────
  autonomous: CarFront,
  autonomous_driving: CarFront,
  ev: BatteryCharging,
  electric_vehicle: BatteryCharging,
  battery: BatteryCharging,
  aerospace: Rocket,
  space: Rocket,
  aviation: Plane,
  shipping: Ship,
  logistics: Truck,
  trucking: Truck,

  // ── Finance ──────────────────────────────────────────
  fintech: Wallet,
  payment: CreditCard,
  payments: CreditCard,
  banking: Landmark,
  bank: Landmark,
  insurance: ShieldAlert,
  asset_management: LineChart,
  capital_markets: LineChart,
  brokerage: LineChart,
  real_estate: Building2,

  // ── Consumer ─────────────────────────────────────────
  apparel: Shirt,
  fashion: Shirt,
  luxury: Gem,
  food_beverage: UtensilsCrossed,
  food: UtensilsCrossed,
  beverage: UtensilsCrossed,
  retail: Store,
  consumer_staples: Store,

  // ── Healthcare ───────────────────────────────────────
  pharma: Pill,
  pharmaceutical: Pill,
  pharma_global: Pill,
  diagnostics: Microscope,
  healthcare_services: HeartPulse,
  korea_bio: Microscope,
  biotech: Microscope,

  // ── Energy / Resources ───────────────────────────────
  energy: Zap,
  traditional_energy: Fuel,
  oil_gas: Fuel,
  clean_energy: Sun,
  renewable: Sun,
  solar: Sun,
  mining: Pickaxe,
  mining_resources: Pickaxe,
  utilities: Zap,

  // ── Industrials ──────────────────────────────────────
  industrials: Factory,
  manufacturing: Factory,
}

export function resolveCategoryIcon(iconKey: string | null | undefined): LucideIcon {
  if (!iconKey) return Layers
  const found = CATEGORY_ICON_MAP[iconKey]
  if (!found) {
    if (typeof window !== 'undefined') {
      console.warn(`[CategoryIcon] 매핑 누락: "${iconKey}" → default(Layers) 사용`)
    }
    return Layers
  }
  return found
}

interface CategoryIconProps {
  /** categories.id 또는 알려진 iconKey */
  iconKey: string | null | undefined
  className?: string
  'aria-label'?: string
}

export function CategoryIcon({ iconKey, className, ...rest }: CategoryIconProps) {
  const Icon = resolveCategoryIcon(iconKey)
  return <Icon className={cn('h-5 w-5', className)} aria-hidden {...rest} />
}
