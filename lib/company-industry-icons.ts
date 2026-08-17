import {
  Banknote,
  Beaker,
  BedDouble,
  Boxes,
  Briefcase,
  Building2,
  Car,
  Cigarette,
  CircuitBoard,
  Code2,
  Cpu,
  CreditCard,
  CupSoda,
  Dices,
  Factory,
  FlaskConical,
  Fuel,
  Gamepad2,
  Globe,
  GraduationCap,
  HardHat,
  Home,
  Landmark,
  LineChart,
  Luggage,
  Megaphone,
  Microscope,
  Package,
  Pickaxe,
  Plane,
  PlugZap,
  RadioTower,
  Recycle,
  Rocket,
  Shield,
  ShieldCheck,
  Ship,
  Shirt,
  ShoppingCart,
  Sofa,
  SprayCan,
  Sprout,
  Stethoscope,
  Sun,
  Clapperboard,
  Tractor,
  TrainFront,
  TreePine,
  Truck,
  UtensilsCrossed,
  Warehouse,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/**
 * 업종 아이콘 — `company_profiles.industry` → lucide 아이콘 (issue#49).
 *
 * **`components/ui/industry-icon.tsx` 와 다른 것이다.** 그쪽은 우리 자체 분류인
 * *산업* 9개(`industries.id` — tech·healthcare·energy…)의 아이콘이고, 여기는
 * yfinance 가 주는 회사별 *업종* 문자열(약 145종)의 아이콘이다. 키 공간도
 * 폴백 정책도 다르다(그쪽은 `Layers` 로 폴백, 여기는 `null`).
 *
 * ────────────────────────────────────────────────────────────────────
 *  왜 정확 일치 표가 아니라 키워드 규칙인가
 * ────────────────────────────────────────────────────────────────────
 *
 * `industry` 는 Yahoo(Morningstar) 고정 분류의 영문 문자열이고, 그 분류는
 * 이름 자체가 계층적이다 — `Oil & Gas E&P` / `Oil & Gas Midstream` /
 * `Oil & Gas Refining & Marketing`, `Banks - Diversified` / `Banks - Regional`,
 * `Utilities - Regulated Electric` / `Utilities - Regulated Gas`, `Software - …`,
 * `Insurance - …`, `REIT - …`, `Drug Manufacturers - …`.
 *
 * 145개를 하나씩 적으면 우리 DB 에 아직 없는 분류(종목이 추가되면 언제든
 * 들어온다)는 전부 아이콘이 사라진다. 접두어 한 줄이 그 계열을 통째로 덮는다.
 *
 * ────────────────────────────────────────────────────────────────────
 *  규칙
 * ────────────────────────────────────────────────────────────────────
 *
 * - **위에서부터 첫 일치가 이긴다.** 그래서 구체적인 것을 위에 둔다:
 *   `Auto & Truck Dealerships` 는 `truck` 보다 `auto` 가 먼저 걸려야 하고,
 *   `Medical Distribution` 은 `distribution`(창고) 이 아니라 `medical` 이다.
 * - **매칭 안 되면 `null`.** 폴백 아이콘을 두면 전 종목이 같은 모양이 되어
 *   "업종을 구분한다"는 목적 자체가 사라진다(이슈 수락 기준).
 * - 이모지 금지(프로젝트 규칙) — lucide 아이콘만.
 */
const COMPANY_INDUSTRY_ICON_RULES: ReadonlyArray<readonly [string, LucideIcon]> = [
  // ── 테크 ──────────────────────────────────────────────────────────
  ['semiconductor', Cpu],
  ['software', Code2],
  ['information technology services', Code2],
  ['electronic gaming', Gamepad2],
  ['internet content', Globe],
  ['telecom', RadioTower],
  ['communication equipment', RadioTower],
  ['computer hardware', CircuitBoard],
  ['consumer electronics', CircuitBoard],
  ['electronic component', CircuitBoard],
  ['scientific & technical instruments', Microscope],

  // ── 헬스케어 ──────────────────────────────────────────────────────
  ['biotechnology', FlaskConical],
  ['drug manufacturers', FlaskConical],
  ['pharmaceutical', FlaskConical],
  ['medical', Stethoscope],
  ['diagnostics', Stethoscope],
  ['health', Stethoscope],

  // ── 금융 ──────────────────────────────────────────────────────────
  ['bank', Landmark],
  ['insurance', ShieldCheck],
  ['credit services', CreditCard],
  ['capital markets', LineChart],
  ['financial data', LineChart],
  ['asset management', LineChart],
  ['financial conglomerates', Banknote],
  ['mortgage', Banknote],

  // ── 에너지·소재 ───────────────────────────────────────────────────
  ['oil & gas', Fuel],
  ['coal', Fuel],
  ['uranium', Zap],
  // `utilities` 가 `renewable` 보다 위다 — `Utilities - Renewable` 은 태양광이
  // 아니라 전력회사다. 아래 두 줄은 독립 분류(`Solar`)만 잡는다.
  ['utilities', Zap],
  ['solar', Sun],
  ['renewable', Sun],
  ['electrical equipment', PlugZap],
  ['chemical', Beaker],
  ['steel', Factory],
  ['aluminum', Pickaxe],
  ['copper', Pickaxe],
  ['gold', Pickaxe],
  ['silver', Pickaxe],
  ['mining', Pickaxe],
  ['metals', Pickaxe],
  ['waste management', Recycle],

  // ── 운송·산업재 ───────────────────────────────────────────────────
  // Yahoo 의 `Aerospace & Defense` 에는 한국 조선사(HD현대중공업 등)도 들어간다.
  // 배에 로켓이 붙는 셈이지만 상류 분류가 그렇고, 한 종목 때문에 예외를 두지 않는다.
  ['aerospace', Rocket],
  ['airlines', Plane],
  ['airports', Plane],
  ['railroad', TrainFront],
  ['marine shipping', Ship],
  ['auto', Car],
  ['trucking', Truck],
  ['freight', Truck],
  ['logistics', Truck],
  ['farm & heavy construction machinery', Tractor],
  ['agricultural inputs', Sprout],
  ['farm products', Sprout],
  ['machinery', Wrench],
  ['tools & accessories', Wrench],
  ['engineering & construction', HardHat],
  ['building products', HardHat],
  ['residential construction', Home],
  ['industrial distribution', Warehouse],
  ['packaging & containers', Package],
  ['paper', TreePine],
  ['lumber', TreePine],
  ['security & protection', Shield],
  ['staffing', Briefcase],
  ['consulting', Briefcase],
  ['business services', Briefcase],
  ['rental & leasing', Briefcase],
  ['conglomerates', Boxes],

  // ── 소비재 ────────────────────────────────────────────────────────
  ['reit', Building2],
  ['real estate', Building2],
  ['restaurants', UtensilsCrossed],
  ['beverages', CupSoda],
  ['confectioners', Wheat],
  ['packaged foods', Wheat],
  ['tobacco', Cigarette],
  ['apparel', Shirt],
  ['footwear', Shirt],
  ['textile', Shirt],
  ['luxury goods', Shirt],
  ['household & personal products', SprayCan],
  ['furnishings', Sofa],
  ['lodging', BedDouble],
  ['resorts & casinos', Dices],
  ['gambling', Dices],
  ['travel services', Luggage],
  ['education', GraduationCap],
  ['advertising', Megaphone],
  ['publishing', Megaphone],
  ['broadcasting', Clapperboard],
  ['entertainment', Clapperboard],
  ['retail', ShoppingCart],
  ['stores', ShoppingCart],
  ['grocery', ShoppingCart],
] as const

/**
 * 업종 문자열에 맞는 아이콘. 매칭이 없으면 `null` — 호출부는 아이콘을 생략한다.
 */
export function getCompanyIndustryIcon(industry: string | null | undefined): LucideIcon | null {
  if (!industry) return null
  const needle = industry.toLowerCase()
  for (const [pattern, icon] of COMPANY_INDUSTRY_ICON_RULES) {
    if (needle.includes(pattern)) return icon
  }
  return null
}

/** 테스트용 — 규칙 수·중복 점검에 쓴다. */
export const COMPANY_INDUSTRY_ICON_RULE_COUNT = COMPANY_INDUSTRY_ICON_RULES.length
