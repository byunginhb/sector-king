import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import postgres from 'postgres'

const connection = process.env.WEEKLY_MATCH_TEST_DATABASE_URL
assert(connection, 'Set WEEKLY_MATCH_TEST_DATABASE_URL for the isolated test database')
const target = new URL(connection)
assert(['127.0.0.1', 'localhost'].includes(target.hostname) && target.pathname === '/weekly_test', 'Only a localhost weekly_test database is allowed')
const sql = postgres(connection, { max: 12, onnotice: () => {} })
const first = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'
const migration = await readFile(new URL('../supabase/migrations/0018_weekly_match.sql', import.meta.url), 'utf8')
let checks = 0
const denied = async (work, pattern = /permission denied/) => {
  await assert.rejects(work, pattern)
  checks++
}
const asRole = (role, uid, work) => sql.begin(async (transaction) => {
  await transaction.unsafe('set local role ' + role)
  await transaction`select set_config('request.jwt.claim.sub', ${uid ?? ''}, true)`
  return work(transaction)
})

try {
  await sql.unsafe(`
    do $$ begin
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
    end $$;
    create schema if not exists auth;
    create table if not exists auth.users(id uuid primary key);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `)
  await sql.unsafe(migration)
  await sql.unsafe(migration)
  checks++
  await sql`truncate public.weekly_match_entries, public.weekly_match_settlements, public.weekly_match_rounds`
  await sql`insert into auth.users(id) values(${first}), (${second}) on conflict do nothing`
  const now = Date.now()
  const nextKstDay = new Date(now + 9 * 3600_000 + 86400_000).toISOString().slice(0, 10)
  const endKstDay = new Date(now + 9 * 3600_000 + 3 * 86400_000).toISOString().slice(0, 10)
  const baseKstDay = new Date(now + 9 * 3600_000 - 86400_000).toISOString().slice(0, 10)
  const publishInput = {
    id: 'published', title: 'original', baseDate: baseKstDay, endDate: endKstDay,
    opensAt: new Date(now - 3600_000).toISOString(), closesAt: nextKstDay + 'T09:00:00+09:00', endsAt: endKstDay + 'T18:00:00+09:00',
    calendarVerifiedAt: new Date(now - 3600_000).toISOString(), calendarSource: 'https://global.krx.co.kr/',
    left: { id: 'left', name: 'left', tickers: [{ ticker: '000001.KS', name: 'one', close: 100, volume: 100, priceDate: baseKstDay, source: 'https://query1.finance.yahoo.com/', retrievedAt: new Date(now - 7200_000).toISOString() }] },
    right: { id: 'right', name: 'right', tickers: [{ ticker: '000002.KS', name: 'two', close: 200, volume: 100, priceDate: baseKstDay, source: 'https://query1.finance.yahoo.com/', retrievedAt: new Date(now - 7200_000).toISOString() }] },
  }
  const publish = (input) => asRole('service_role', null, (tx) => tx`select public.publish_weekly_match(${sql.json(input)})`)
  await publish(publishInput)
  await publish(publishInput)
  await denied(publish({ ...publishInput, title: 'changed' }), /ROUND_IMMUTABLE/)
  const publicSector = (await sql`select left_sector from public.weekly_match_rounds where id='published'`)[0].left_sector
  assert.deepEqual(Object.keys(publicSector.tickers[0]).sort(), ['name', 'ticker'])
  checks++
  const fixture = async (id, closesAt, endsAt) => {
    await sql`insert into public.weekly_match_rounds(id,title,base_date,end_date,opens_at,closes_at,ends_at,left_sector,right_sector,audit)
      values(${id}, 'test', current_date - 1, current_date + 1, ${new Date(Math.min(now - 86400_000, closesAt.getTime() - 86400_000))}, ${closesAt}, ${endsAt}, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)`
  }
  await fixture('open', new Date(now + 3600_000), new Date(now + 86400_000))
  await fixture('ended', new Date(now - 120000), new Date(now - 60000))
  const selectEntry = async (uid) => asRole('authenticated', uid, (tx) => tx`select * from public.weekly_match_entries`)
  await asRole('authenticated', first, (tx) => tx`select public.submit_weekly_match_pick('open','left')`)
  await asRole('authenticated', second, (tx) => tx`select public.submit_weekly_match_pick('open','right')`)
  assert.equal((await selectEntry(first)).length, 1)
  assert.equal((await selectEntry(first))[0].user_id, first)
  checks++
  for (const role of ['anon', 'authenticated']) {
    await denied(asRole(role, first, (tx) => tx`select * from public.weekly_match_rounds`))
    await denied(asRole(role, first, (tx) => tx`select * from public.weekly_match_settlements`))
    await denied(asRole(role, first, (tx) => tx`insert into public.weekly_match_rounds(id) values('forged')`))
    await denied(asRole(role, first, (tx) => tx`insert into public.weekly_match_entries values('open', ${first}, 'right', now())`))
    await denied(asRole(role, first, (tx) => tx`update public.weekly_match_entries set user_id=${second} where user_id=${first}`))
    await denied(asRole(role, first, (tx) => tx`select public.publish_weekly_match('{}'::jsonb)`))
    await denied(asRole(role, first, (tx) => tx`select public.record_weekly_match_settlement('ended', ${'a'.repeat(64)}, 'left', 1, 0, null, '{}', null)`))
  }
  await denied(asRole('anon', null, (tx) => tx`select public.submit_weekly_match_pick('open','left')`))
  await denied(asRole('authenticated', null, (tx) => tx`select public.submit_weekly_match_pick('open','left')`), /AUTH_REQUIRED/)
  await denied(asRole('authenticated', first, (tx) => tx`select public.submit_weekly_match_pick('open','other')`), /INVALID_SIDE/)
  await denied(asRole('authenticated', first, (tx) => tx`select public.submit_weekly_match_pick('ended','left')`), /ROUND_CLOSED/)
  await Promise.all(Array.from({ length: 8 }, (_, index) => asRole('authenticated', first, (tx) => tx`select public.submit_weekly_match_pick('open', ${index % 2 ? 'left' : 'right'})`)))
  assert.equal((await selectEntry(first)).length, 1)
  checks++

  // A transaction waiting across the cutoff must use the clock after its lock wait.
  await fixture('deadline', new Date(Date.now() + 500), new Date(now + 86400_000))
  let locked
  const acquired = new Promise((resolve) => { locked = resolve })
  const blocker = sql.begin(async (tx) => {
    await tx`select id from public.weekly_match_rounds where id='deadline' for update`
    locked()
    await tx`select pg_sleep(0.8)`
  })
  await acquired
  await denied(asRole('authenticated', first, (tx) => tx`select public.submit_weekly_match_pick('deadline','left')`), /ROUND_CLOSED/)
  await blocker

  const settle = (hash, reason = null) => asRole('service_role', null, (tx) => tx`select (public.record_weekly_match_settlement('ended', ${hash.repeat(64)}, 'left', 1, 0, null, '{}', ${reason})).*`)
  assert.equal((await settle('a'))[0].version, 1)
  assert.equal((await settle('a'))[0].version, 1)
  await denied(settle('b'), /CORRECTION_REASON_REQUIRED/)
  const correction = await Promise.all([settle('b', '원천 가격 정정 검증'), settle('b', '원천 가격 정정 검증')])
  assert.equal(correction[0][0].version, 2)
  assert.equal(correction[1][0].version, 2)
  assert.equal((await settle('a'))[0].version, 1)
  assert.equal((await sql`select * from public.weekly_match_settlements where round_id='ended'`).length, 2)
  checks++
  await denied(asRole('service_role', null, (tx) => tx`update public.weekly_match_rounds set title='altered' where id='ended'`))
  await denied(asRole('service_role', null, (tx) => tx`delete from public.weekly_match_settlements where round_id='ended'`))
  await denied(asRole('service_role', null, (tx) => tx`select public.record_weekly_match_settlement('open', ${'c'.repeat(64)}, 'left', 1, 0, null, '{}', null)`), /ROUND_NOT_ENDED/)
  for (const [id, outcome] of [['old-winner', 'left'], ['old-pending', 'pending']]) {
    await fixture(id, new Date(now - 9 * 86400_000), new Date(now - 8 * 86400_000))
    await asRole('service_role', null, (tx) => tx`select public.record_weekly_match_settlement(${id}, ${'a'.repeat(64)}, ${outcome}, ${outcome === 'left' ? 1 : null}, ${outcome === 'left' ? 0 : null}, null, '{}', null)`)
  }
  await denied(asRole('service_role', null, (tx) => tx`select public.record_weekly_match_settlement('old-winner', ${'b'.repeat(64)}, 'void', null, null, 'missing', '{"prices":[]}', null)`), /CORRECTION_REASON_REQUIRED/)
  assert.equal((await sql`select count(*) from public.weekly_match_settlements where round_id='old-winner'`)[0].count, '1')
  const expiry = await asRole('service_role', null, (tx) => tx`select (public.record_weekly_match_settlement('old-pending', ${'b'.repeat(64)}, 'void', null, null, 'missing', '{"prices":[]}', null)).*`)
  assert.equal(expiry[0].version, 2)
  assert.match(expiry[0].reason, /7일/)
  checks++
  console.log('PASS ' + checks + ' isolated database checks: migration, RLS, grants, own pick, cutoff lock, concurrent upsert, append-only/idempotent correction')
} finally {
  await sql.end()
}
