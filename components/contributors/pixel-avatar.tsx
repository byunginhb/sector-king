/**
 * 캐릭터 아바타 — 이미지 파일 없이 인라인 SVG(플랫 벡터)로 렌더.
 *
 * gender 로 헤어 기본형(남/여) 구분, variant 로 프리셋 선택.
 * 각 프리셋 = 색상 + 머리스타일 + 액세서리(없음/안경/캡/비니) 조합이라
 * 색만 다른 게 아니라 서로 다른 얼굴이 된다. 눈·코·입 포함(지라 프로필 수준).
 *
 * 머리스타일(HairStyle)은 성별별로 다르게 해석:
 *   여성: plain=긴 생머리 / wavy=웨이브 / side=사이드 / bun=올림머리(번) / ponytail=포니테일
 *   남성: plain=단정 / wavy=스파이크 / side=사이드파트 / bun·ponytail=단정(폴백)
 *
 * props(gender/variant/size/className) 하위호환. DB 는 avatar_variant(정수)만 저장 —
 * 색·머리·액세서리는 전부 여기 AVATAR_PRESETS 에서 파생(SoT). 프리셋 개수 = 선택지 수.
 */

type HairStyle = 'plain' | 'wavy' | 'side' | 'bun' | 'ponytail'
type Accessory = 'none' | 'glasses' | 'cap' | 'beanie'

interface AvatarPreset {
  hair: string
  bg: string
  hairStyle: HairStyle
  accessory: Accessory
}

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  { hair: '#2563eb', bg: '#dbeafe', hairStyle: 'plain', accessory: 'none' },
  { hair: '#db2777', bg: '#fce7f3', hairStyle: 'wavy', accessory: 'glasses' },
  { hair: '#059669', bg: '#d1fae5', hairStyle: 'ponytail', accessory: 'cap' },
  { hair: '#d97706', bg: '#fef3c7', hairStyle: 'side', accessory: 'none' },
  { hair: '#7c3aed', bg: '#ede9fe', hairStyle: 'bun', accessory: 'glasses' },
  { hair: '#dc2626', bg: '#fee2e2', hairStyle: 'wavy', accessory: 'beanie' },
  { hair: '#0d9488', bg: '#ccfbf1', hairStyle: 'side', accessory: 'none' },
  { hair: '#475569', bg: '#e2e8f0', hairStyle: 'plain', accessory: 'cap' },
  { hair: '#c026d3', bg: '#fae8ff', hairStyle: 'bun', accessory: 'glasses' },
  { hair: '#ca8a04', bg: '#fef9c3', hairStyle: 'ponytail', accessory: 'none' },
] as const

/** @deprecated 이름 하위호환 — 프리셋 배열과 동일 참조 */
export const AVATAR_COLORS = AVATAR_PRESETS

const SKIN = '#f4c9a3'
const SKIN_SHADE = '#e8b088'
const INK = '#3d2f26'

export interface PixelAvatarProps {
  gender: 'male' | 'female'
  variant: number
  size?: number
  className?: string
}

/** 여성 뒷머리(얼굴보다 먼저 렌더 — 옆·뒤로 흐르는 부분). */
function femaleBack(style: HairStyle, hair: string) {
  switch (style) {
    case 'wavy':
      return (
        <path
          d="M22 50 Q16 66 23 74 Q28 80 22 87 Q30 89 34 84 L34 50 Z
             M78 50 Q84 66 77 74 Q72 80 78 87 Q70 89 66 84 L66 50 Z"
          fill={hair}
        />
      )
    case 'side':
      return (
        <path
          d="M24 50 Q22 62 31 67 L34 62 L34 50 Z
             M78 50 Q83 86 60 89 L66 50 Z"
          fill={hair}
        />
      )
    case 'bun':
      return (
        <>
          {/* 짧은 옆머리(턱선) */}
          <path
            d="M25 50 Q24 62 32 66 L34 62 L34 50 Z
               M75 50 Q76 62 68 66 L66 62 L66 50 Z"
            fill={hair}
          />
          {/* 올림머리(번) */}
          <circle cx={50} cy={19} r={8} fill={hair} />
          <rect x={44} y={24} width={12} height={6} rx={3} fill={hair} />
        </>
      )
    case 'ponytail':
      return (
        <>
          {/* 짧은 옆머리 */}
          <path
            d="M25 50 Q24 62 32 66 L34 62 L34 50 Z
               M75 50 Q76 62 68 66 L66 62 L66 50 Z"
            fill={hair}
          />
          {/* 오른쪽으로 묶은 꼬리 */}
          <path
            d="M67 40 Q90 50 83 78 Q80 91 71 86 Q79 66 63 50 Z"
            fill={hair}
          />
        </>
      )
    case 'plain':
    default:
      return (
        <path
          d="M22 50 Q20 84 34 87 L34 50 Z
             M78 50 Q80 84 66 87 L66 50 Z"
          fill={hair}
        />
      )
  }
}

/** 앞머리/정수리(얼굴 위에 렌더). 성별별로 다른 헤어라인. */
function frontHair(gender: 'male' | 'female', style: HairStyle, hair: string) {
  if (gender === 'female') {
    switch (style) {
      case 'wavy':
        return (
          <path
            d="M27 48 Q26 22 50 21 Q74 22 73 48 Q70 41 64 43 Q60 34 54 41 Q50 33 46 41 Q40 34 36 43 Q30 41 27 48 Z"
            fill={hair}
          />
        )
      case 'side':
        return (
          <path
            d="M28 48 Q25 22 50 22 Q77 23 72 46 Q60 33 43 41 Q40 29 33 35 Q29 40 28 48 Z"
            fill={hair}
          />
        )
      case 'bun':
        return (
          <path
            d="M30 45 Q31 26 50 25 Q69 26 70 45 Q65 37 50 37 Q35 37 30 45 Z"
            fill={hair}
          />
        )
      case 'ponytail':
        return (
          <path
            d="M28 47 Q28 23 50 22 Q72 23 72 47 Q66 36 50 38 Q34 36 28 47 Z"
            fill={hair}
          />
        )
      case 'plain':
      default:
        return (
          <path
            d="M28 48 Q26 24 50 22 Q74 24 72 48 Q72 40 62 37 Q56 46 44 42 Q36 40 34 40 Q30 42 28 48 Z"
            fill={hair}
          />
        )
    }
  }
  // male
  if (style === 'wavy') {
    return (
      <path
        d="M30 46 L32 30 L39 39 L45 29 L50 38 L55 29 L61 39 L68 30 L70 46 Q64 37 50 37 Q36 37 30 46 Z"
        fill={hair}
      />
    )
  }
  if (style === 'side') {
    return (
      <path
        d="M30 46 Q29 27 50 26 Q71 27 70 46 Q67 36 46 37 Q42 31 39 34 Q33 38 30 46 Z"
        fill={hair}
      />
    )
  }
  // plain / bun / ponytail → 단정한 짧은 머리
  return (
    <path
      d="M30 46 Q28 26 50 25 Q72 26 70 46 Q66 37 50 37 Q34 37 30 46 Z"
      fill={hair}
    />
  )
}

function Glasses() {
  return (
    <g stroke={INK} strokeWidth={1.8} fill="none">
      <circle cx={42.5} cy={54} r={6} fill="#fff" fillOpacity={0.35} />
      <circle cx={57.5} cy={54} r={6} fill="#fff" fillOpacity={0.35} />
      <path d="M48.5 53 Q50 51.5 51.5 53" />
      <path d="M36.5 53 L31 51" />
      <path d="M63.5 53 L69 51" />
    </g>
  )
}

function Cap(hair: string) {
  return (
    <g>
      <path d="M26 40 Q42 44 50 44 L50 37 Q34 36 26 40 Z" fill={INK} opacity={0.85} />
      <path d="M30 40 Q30 20 50 20 Q70 20 70 40 Q60 34 50 34 Q40 34 30 40 Z" fill={hair} />
      <circle cx={50} cy={22} r={2} fill={INK} opacity={0.4} />
    </g>
  )
}

function Beanie(hair: string) {
  return (
    <g>
      <path d="M29 42 Q29 21 50 21 Q71 21 71 42 Q60 36 50 36 Q40 36 29 42 Z" fill={hair} />
      <rect x={28} y={40} width={44} height={6} rx={3} fill={hair} />
      <rect x={28} y={40} width={44} height={6} rx={3} fill={INK} opacity={0.18} />
    </g>
  )
}

export function PixelAvatar({
  gender,
  variant,
  size = 64,
  className,
}: PixelAvatarProps) {
  const preset = AVATAR_PRESETS[variant] ?? AVATAR_PRESETS[0]
  const { hair, bg, hairStyle, accessory } = preset
  const hatCovers = accessory === 'cap' || accessory === 'beanie'

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden
      className={className}
    >
      {/* 배경 */}
      <rect x={0} y={0} width={100} height={100} rx={22} fill={bg} />

      {/* 목 */}
      <rect x={43} y={68} width={14} height={14} rx={5} fill={SKIN_SHADE} />

      {/* 여성 뒷머리(스타일별) */}
      {gender === 'female' && femaleBack(hairStyle, hair)}

      {/* 귀 */}
      <circle cx={28} cy={52} r={6} fill={SKIN} />
      <circle cx={72} cy={52} r={6} fill={SKIN} />

      {/* 얼굴 */}
      <rect x={30} y={30} width={40} height={44} rx={18} fill={SKIN} />

      {/* 앞머리 (모자로 가려지지 않을 때만) */}
      {!hatCovers && frontHair(gender, hairStyle, hair)}

      {/* 눈썹 */}
      <rect x={38} y={48} width={9} height={2.4} rx={1.2} fill={INK} opacity={0.55} />
      <rect x={53} y={48} width={9} height={2.4} rx={1.2} fill={INK} opacity={0.55} />

      {/* 눈 */}
      <circle cx={42.5} cy={54} r={2.8} fill={INK} />
      <circle cx={57.5} cy={54} r={2.8} fill={INK} />
      <circle cx={43.4} cy={53.1} r={0.9} fill="#fff" />
      <circle cx={58.4} cy={53.1} r={0.9} fill="#fff" />

      {/* 안경 */}
      {accessory === 'glasses' && <Glasses />}

      {/* 볼 홍조 */}
      <circle cx={37} cy={61} r={3.4} fill={hair} opacity={0.16} />
      <circle cx={63} cy={61} r={3.4} fill={hair} opacity={0.16} />

      {/* 코 */}
      <path d="M50 56 L52 62 Q50 63.5 48 62 Z" fill={SKIN_SHADE} />

      {/* 입(미소) */}
      <path
        d="M44 65 Q50 70 56 65"
        fill="none"
        stroke={INK}
        strokeWidth={2.2}
        strokeLinecap="round"
      />

      {/* 모자 (맨 위) */}
      {accessory === 'cap' && Cap(hair)}
      {accessory === 'beanie' && Beanie(hair)}
    </svg>
  )
}
