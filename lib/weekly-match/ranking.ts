import { z } from 'zod'

export const publicProfileSchema = z.object({
  nickname: z.string().trim().min(2).max(16).regex(/^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ _-]+$/),
  isPublic: z.boolean(),
}).strict()
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
export const leaderboardSchema = z.object({
  season: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  total: count,
  entries: z.array(z.object({ rank: count.min(1), nickname: z.string().min(2).max(16), points: count, wins: count, losses: count, validEntries: count.min(1) }).strict()).max(50),
}).strict()
