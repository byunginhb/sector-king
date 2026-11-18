import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadResultCard, resultCardText } from '@/lib/weekly-match/result-card'
import type { WeeklyMatchResultCard } from '@/lib/weekly-match/types'
const card:WeeklyMatchResultCard={roundId:'round-a',title:'은행 대 조선',baseDate:'2026-11-13',endDate:'2026-11-20',sideName:'은행',outcome:'hit',leftName:'은행',rightName:'조선',leftReturn:1.2,rightReturn:-0.2,version:2,settledAt:'2026-11-20T09:00:00Z'}
afterEach(()=>vi.restoreAllMocks())
describe('본인 확정 결과 카드',()=>{
 it('includes dates, selection, current correction and both returns without claiming actual investment performance',()=>{
  const text=resultCardText(card);expect(text).toContain('2026-11-13 ~ 2026-11-20');expect(text).toContain('결과 버전 2');expect(text).toContain('적중');expect(text).toContain('+1.200000%');expect(text).not.toContain('user_id');expect(text).toContain('배당 미포함')
 })
 it('does not invent returns for void',()=>{const text=resultCardText({...card,outcome:'void',leftReturn:null,rightReturn:null});expect(text).toContain('무효');expect(text).toContain('미확정');expect(text).not.toContain('0.000000%')})
 it('rejects canvas failures instead of reporting successful export',async()=>{vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);await expect(downloadResultCard(card)).rejects.toThrow('이미지')})
})
