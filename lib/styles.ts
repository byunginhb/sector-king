// Rank styles - Readability focused design
export const RANK_STYLES = {
  1: {
    badge:
      'bg-orange-50 text-orange-700 border-orange-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50',
    hover:
      'hover:bg-orange-100 hover:border-orange-400 dark:hover:bg-amber-900/30 dark:hover:border-amber-700',
    label: '1위',
    icon: 'text-amber-500 dark:text-amber-500',
  },
  2: {
    badge:
      'bg-gray-100 text-gray-800 border-gray-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
    hover:
      'hover:bg-gray-200 hover:border-gray-300 dark:hover:bg-slate-700/50 dark:hover:border-slate-600',
    label: '2위',
    icon: 'text-gray-500 dark:text-slate-400',
  },
  3: {
    badge:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-stone-800/30 dark:text-stone-300 dark:border-stone-700',
    hover:
      'hover:bg-gray-200 hover:border-gray-300 dark:hover:bg-stone-700/30 dark:hover:border-stone-600',
    label: '3위',
    icon: 'text-gray-400 dark:text-stone-400',
  },
} as const

// Category styles - Readability focused
const baseCard = 'bg-white border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-slate-900/40 dark:border-slate-700/50 dark:shadow-none'
const baseHeader = 'text-slate-900 dark:text-slate-200'

export const CATEGORY_STYLES = {
  computing: {
    card: baseCard,
    header: `bg-slate-100/60 ${baseHeader} dark:bg-slate-800/40`,
    accent: 'bg-slate-400 dark:bg-slate-500',
  },
  internet: {
    card: baseCard,
    header: `bg-stone-100/60 ${baseHeader} dark:bg-stone-800/40`,
    accent: 'bg-stone-400 dark:bg-stone-500',
  },
  mobile: {
    card: baseCard,
    header: `bg-zinc-100/60 ${baseHeader} dark:bg-zinc-800/40`,
    accent: 'bg-zinc-400 dark:bg-zinc-500',
  },
  media: {
    card: baseCard,
    header: `bg-neutral-100/60 ${baseHeader} dark:bg-neutral-800/40`,
    accent: 'bg-neutral-400 dark:bg-neutral-500',
  },
  ai: {
    card: baseCard,
    header: `bg-slate-100/70 ${baseHeader} dark:bg-slate-800/50`,
    accent: 'bg-slate-500 dark:bg-slate-400',
  },
  future_tech: {
    card: baseCard,
    header: `bg-stone-100/70 ${baseHeader} dark:bg-stone-800/50`,
    accent: 'bg-stone-500 dark:bg-stone-400',
  },
  fintech: {
    card: baseCard,
    header: `bg-zinc-100/70 ${baseHeader} dark:bg-zinc-800/50`,
    accent: 'bg-zinc-500 dark:bg-zinc-400',
  },
  healthcare: {
    card: baseCard,
    header: `bg-neutral-100/70 ${baseHeader} dark:bg-neutral-800/50`,
    accent: 'bg-neutral-500 dark:bg-neutral-400',
  },
  entertainment: {
    card: baseCard,
    header: `bg-slate-100/60 ${baseHeader} dark:bg-slate-800/40`,
    accent: 'bg-slate-400 dark:bg-slate-500',
  },
  semiconductor: {
    card: baseCard,
    header: `bg-blue-100/60 ${baseHeader} dark:bg-blue-900/40`,
    accent: 'bg-blue-500 dark:bg-blue-400',
  },
  cloud: {
    card: baseCard,
    header: `bg-sky-100/60 ${baseHeader} dark:bg-sky-900/40`,
    accent: 'bg-sky-500 dark:bg-sky-400',
  },
  cybersecurity: {
    card: baseCard,
    header: `bg-red-100/60 ${baseHeader} dark:bg-red-900/40`,
    accent: 'bg-red-500 dark:bg-red-400',
  },
  ev_energy: {
    card: baseCard,
    header: `bg-green-100/60 ${baseHeader} dark:bg-green-900/40`,
    accent: 'bg-green-500 dark:bg-green-400',
  },
} as const

export const PRICE_CHANGE_STYLES = {
  positive: 'text-emerald-700 dark:text-emerald-400 font-medium',
  negative: 'text-rose-700 dark:text-rose-400 font-medium',
  neutral: 'text-slate-600 dark:text-slate-400',
} as const

export function getPriceChangeStyle(value: number | null): string {
  if (value === null) return PRICE_CHANGE_STYLES.neutral
  if (value > 0) return PRICE_CHANGE_STYLES.positive
  if (value < 0) return PRICE_CHANGE_STYLES.negative
  return PRICE_CHANGE_STYLES.neutral
}

export function getRankStyle(rank: number) {
  return RANK_STYLES[rank as keyof typeof RANK_STYLES] || RANK_STYLES[3]
}

export function getCategoryStyle(categoryId: string) {
  return (
    CATEGORY_STYLES[categoryId as keyof typeof CATEGORY_STYLES] || {
      card: baseCard,
      header: `bg-slate-100/60 ${baseHeader} dark:bg-slate-800/40`,
      accent: 'bg-slate-400 dark:bg-slate-500',
    }
  )
}
