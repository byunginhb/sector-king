import { describe, it, expect } from 'vitest'
import {
  Banknote,
  Beaker,
  Briefcase,
  Building2,
  Car,
  Code2,
  FlaskConical,
  Fuel,
  Landmark,
  ShieldCheck,
  Shirt,
  Stethoscope,
  Tractor,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { getCompanyIndustryIcon } from '@/lib/company-industry-icons'

/**
 * 규칙은 **위에서부터 첫 일치**라, 순서가 어긋나면 조용히 엉뚱한 아이콘이 나간다
 * (틀린 아이콘은 없는 아이콘보다 나쁘다). 실제로 걸리는 함정만 고정한다.
 */
describe('getCompanyIndustryIcon — 순서 함정', () => {
  const cases: Array<[string, LucideIcon]> = [
    // 'Truck' 이 들어있지만 자동차 판매업이다 — `auto` 가 `trucking` 보다 위여야 한다.
    ['Auto & Truck Dealerships', Car],
    // 'Distribution' 이 들어있지만 창고업이 아니라 의약품 유통이다.
    ['Medical Distribution', Stethoscope],
    // 'Construction'·'Machinery' 를 다 포함한다 — 농기계가 먼저다.
    ['Farm & Heavy Construction Machinery', Tractor],
    // 'Retail' 이 들어있지만 의류다.
    ['Apparel Retail', Shirt],
    // 'Conglomerates' 를 포함하지만 금융이다.
    ['Financial Conglomerates', Banknote],
    // 'Specialty' 가 겹치는 3계열이 서로 다른 아이콘으로 갈린다.
    ['Specialty Chemicals', Beaker],
    ['Specialty Industrial Machinery', Wrench],
    ['Specialty Business Services', Briefcase],
    ['Drug Manufacturers - Specialty & Generic', FlaskConical],
  ]

  it.each(cases)('%s 매핑', (industry, expected) => {
    expect(getCompanyIndustryIcon(industry)).toBe(expected)
  })
})

describe('getCompanyIndustryIcon — 계열 접두어가 하위 분류를 통째로 덮는다', () => {
  // 정확 일치 표였다면 아직 DB 에 없는 하위 분류에서 아이콘이 사라진다.
  const families: Array<[string[], LucideIcon]> = [
    [['Oil & Gas E&P', 'Oil & Gas Midstream', 'Oil & Gas Equipment & Services'], Fuel],
    [['Banks - Diversified', 'Banks - Regional'], Landmark],
    [['Utilities - Regulated Electric', 'Utilities - Renewable'], Zap],
    [['Software - Application', 'Software - Infrastructure'], Code2],
    [['Insurance - Life', 'Insurance Brokers'], ShieldCheck],
    [['REIT - Industrial', 'REIT - Residential'], Building2],
  ]

  it.each(families)('%s 계열', (industries, expected) => {
    for (const industry of industries) {
      expect(getCompanyIndustryIcon(industry)).toBe(expected)
    }
  })
})

describe('getCompanyIndustryIcon — 없으면 생략한다', () => {
  it('빈 값은 null (폴백 아이콘을 만들지 않는다)', () => {
    expect(getCompanyIndustryIcon(null)).toBeNull()
    expect(getCompanyIndustryIcon(undefined)).toBeNull()
    expect(getCompanyIndustryIcon('')).toBeNull()
  })

  it('모르는 업종은 null — 전 종목이 같은 아이콘이 되는 것을 막는다', () => {
    expect(getCompanyIndustryIcon('Completely Unknown Industry')).toBeNull()
  })
})

/**
 * 수락 기준: "업종 아이콘이 실제로 업종을 구분한다(전 종목 동일 아이콘 아님)".
 * DB 에 실제로 들어있는 업종 목록 101종(2026-08-17, 602종목 백필 후 실측)으로 고정한다.
 */
const LIVE_INDUSTRIES = [
  'Advertising Agencies',
  'Aerospace & Defense',
  'Agricultural Inputs',
  'Airlines',
  'Apparel Manufacturing',
  'Apparel Retail',
  'Asset Management',
  'Auto & Truck Dealerships',
  'Auto Manufacturers',
  'Auto Parts',
  'Banks - Diversified',
  'Banks - Regional',
  'Beverages - Brewers',
  'Beverages - Non-Alcoholic',
  'Biotechnology',
  'Building Products & Equipment',
  'Capital Markets',
  'Chemicals',
  'Communication Equipment',
  'Computer Hardware',
  'Confectioners',
  'Conglomerates',
  'Consumer Electronics',
  'Copper',
  'Credit Services',
  'Department Stores',
  'Diagnostics & Research',
  'Discount Stores',
  'Drug Manufacturers - General',
  'Drug Manufacturers - Specialty & Generic',
  'Electrical Equipment & Parts',
  'Electronic Components',
  'Electronic Gaming & Multimedia',
  'Engineering & Construction',
  'Entertainment',
  'Farm & Heavy Construction Machinery',
  'Financial Data & Stock Exchanges',
  'Footwear & Accessories',
  'Furnishings, Fixtures & Appliances',
  'Gold',
  'Grocery Stores',
  'Health Information Services',
  'Healthcare Plans',
  'Home Improvement Retail',
  'Household & Personal Products',
  'Industrial Distribution',
  'Information Technology Services',
  'Insurance - Diversified',
  'Insurance - Life',
  'Insurance - Property & Casualty',
  'Insurance - Reinsurance',
  'Insurance Brokers',
  'Integrated Freight & Logistics',
  'Internet Content & Information',
  'Internet Retail',
  'Lodging',
  'Luxury Goods',
  'Marine Shipping',
  'Medical Care Facilities',
  'Medical Devices',
  'Medical Distribution',
  'Medical Instruments & Supplies',
  'Oil & Gas E&P',
  'Oil & Gas Equipment & Services',
  'Oil & Gas Integrated',
  'Oil & Gas Midstream',
  'Oil & Gas Refining & Marketing',
  'Other Industrial Metals & Mining',
  'Packaged Foods',
  'REIT - Healthcare Facilities',
  'REIT - Industrial',
  'REIT - Office',
  'REIT - Residential',
  'REIT - Retail',
  'REIT - Specialty',
  'Railroads',
  'Rental & Leasing Services',
  'Residential Construction',
  'Resorts & Casinos',
  'Restaurants',
  'Scientific & Technical Instruments',
  'Semiconductor Equipment & Materials',
  'Semiconductors',
  'Software - Application',
  'Software - Infrastructure',
  'Solar',
  'Specialty Business Services',
  'Specialty Chemicals',
  'Specialty Industrial Machinery',
  'Specialty Retail',
  'Steel',
  'Telecom Services',
  'Tobacco',
  'Travel Services',
  'Trucking',
  'Utilities - Diversified',
  'Utilities - Independent Power Producers',
  'Utilities - Regulated Electric',
  'Utilities - Regulated Gas',
  'Utilities - Renewable',
  'Waste Management',
]

describe('getCompanyIndustryIcon — 실제 DB 업종 커버리지', () => {
  it('매핑되지 않는 업종이 없다', () => {
    const unmapped = LIVE_INDUSTRIES.filter((i) => !getCompanyIndustryIcon(i))
    expect(unmapped).toEqual([])
  })

  it('아이콘이 업종을 실제로 구분한다 (한 아이콘에 쏠리지 않음)', () => {
    const icons = LIVE_INDUSTRIES.map((i) => getCompanyIndustryIcon(i)?.displayName)
    const distinct = new Set(icons)
    // 계열별로 묶이므로 1:1 은 아니지만, 40종 이상으로 갈려야 구분이 된다.
    expect(distinct.size).toBeGreaterThanOrEqual(40)
    // 가장 흔한 아이콘조차 전체의 1/6 을 넘지 않는다.
    const maxShare = Math.max(
      ...[...distinct].map((d) => icons.filter((i) => i === d).length)
    )
    expect(maxShare).toBeLessThanOrEqual(LIVE_INDUSTRIES.length / 6)
  })
})
