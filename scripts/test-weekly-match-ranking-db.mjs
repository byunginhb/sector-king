import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import postgres from 'postgres'

const connection = process.env.WEEKLY_MATCH_TEST_DATABASE_URL
assert(connection, 'Set WEEKLY_MATCH_TEST_DATABASE_URL for the isolated test database')
const target = new URL(connection)
assert(['127.0.0.1', 'localhost'].includes(target.hostname) && target.pathname === '/weekly_test', 'Only a localhost weekly_test database is allowed')
const sql = postgres(connection, { max: 4, onnotice: () => {} })
let checks = 0
const check = async (name, work) => { await work(); checks++; console.log('PASS ' + name) }
const denied = (work, pattern = /permission denied|row-level security/) => assert.rejects(work, pattern)
const uid = (number) => '00000000-0000-4000-8000-' + String(number).padStart(12, '0')
const asRole = (role, user, work) => sql.begin(async (tx) => {
  assert(['anon', 'authenticated', 'service_role'].includes(role))
  await tx.unsafe('set local role ' + role)
  await tx`select set_config('request.jwt.claim.sub', ${user ?? ''}, true)`
  return work(tx)
})
const leaderboard = () => asRole('service_role', null, async (tx) => (await tx`select public.weekly_match_leaderboard() as result`)[0].result)
const counts = (ids) => asRole('service_role', null, async (tx) => [...await tx`select * from public.weekly_match_participant_counts(${ids}::text[])`])

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
  for (const filename of ['0018_weekly_match.sql', '20261109014835_weekly_match_automatic_guard.sql', '20261119042546_weekly_match_public_ranking.sql']) {
    const migration = await readFile(new URL('../supabase/migrations/' + filename, import.meta.url), 'utf8')
    await sql.unsafe(migration)
    await sql.unsafe(migration)
  }
  await check('migration creates the isolated profile table idempotently', async () => {
    assert.equal((await sql`select to_regclass('public.weekly_match_public_profiles') as name`)[0].name, 'weekly_match_public_profiles')
  })
  await sql`truncate public.weekly_match_public_profiles, public.weekly_match_entries, public.weekly_match_settlements, public.weekly_match_rounds`
  await sql`insert into auth.users(id) select ('00000000-0000-4000-8000-' || lpad(number::text,12,'0'))::uuid from generate_series(1,170) as number on conflict do nothing`
  const dates = (await sql`select to_char(now() at time zone 'Asia/Seoul','YYYY-MM') as season,
    to_char(date_trunc('month',now() at time zone 'Asia/Seoul'),'YYYY-MM-DD') as current_month,
    to_char(date_trunc('month',now() at time zone 'Asia/Seoul') - interval '1 day','YYYY-MM-DD') as previous_month,
    to_char(date_trunc('month',now() at time zone 'Asia/Seoul') + interval '1 month','YYYY-MM-DD') as next_month`)[0]
  const fixture = async (id, endDate = dates.current_month) => sql`insert into public.weekly_match_rounds(id,title,base_date,end_date,opens_at,closes_at,ends_at,left_sector,right_sector,audit)
    values(${id},'isolated fixture',${endDate}::date - 7,${endDate}::date,${endDate}::date - interval '6 days',${endDate}::date - interval '5 days',${endDate}::date + interval '9 hours','{}','{}','{}')`
  const pick = async (roundId, user, side = 'left') => sql`insert into public.weekly_match_entries(round_id,user_id,side) values(${roundId},${uid(user)},${side})`
  const settle = async (roundId, version, outcome) => sql`insert into public.weekly_match_settlements(round_id,version,outcome,left_return,right_return,input_hash,audit)
    values(${roundId},${version},${outcome},${['pending','void'].includes(outcome) ? null : 2},${['pending','void'].includes(outcome) ? null : 1},${String(version).padStart(64,'0')},'{}')`
  const profile = async (user, nickname, isPublic) => asRole('authenticated', uid(user), (tx) => isPublic === undefined
    ? tx`insert into public.weekly_match_public_profiles(user_id,nickname) values(${uid(user)},${nickname}) returning *`
    : tx`insert into public.weekly_match_public_profiles(user_id,nickname,is_public) values(${uid(user)},${nickname},${isPublic}) returning *`)

  await check('empty real data has no synthetic participants or rankings', async () => {
    assert.deepEqual(await leaderboard(), { season: dates.season, total: 0, entries: [] })
    assert.equal(dates.season, new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7))
    assert.deepEqual(await counts([]), [])
  })
  for (const role of ['anon','authenticated']) {
    await check(role + ' cannot execute privileged aggregates', async () => {
      await denied(asRole(role, uid(1), (tx) => tx`select public.weekly_match_leaderboard()`))
      await denied(asRole(role, uid(1), (tx) => tx`select * from public.weekly_match_participant_counts('{}')`))
    })
  }
  await check('raw private tables remain inaccessible without own-user RLS', async () => {
    for (const table of ['weekly_match_entries','weekly_match_rounds','weekly_match_settlements','weekly_match_public_profiles']) {
      await denied(asRole('anon', null, (tx) => tx.unsafe('select * from public.' + table)))
    }
    await denied(asRole('service_role', null, (tx) => tx`select * from public.weekly_match_entries`))
    await denied(asRole('service_role', null, (tx) => tx`select * from public.weekly_match_public_profiles`))
    await denied(asRole('authenticated', uid(1), (tx) => tx`select * from public.weekly_match_rounds`))
    await denied(asRole('authenticated', uid(1), (tx) => tx`select * from public.weekly_match_settlements`))
  })
  await check('aggregate security definitions use an empty search path', async () => {
    const functions = await sql`select proname,prosecdef,proconfig from pg_proc where oid in ('public.weekly_match_leaderboard()'::regprocedure,'public.weekly_match_participant_counts(text[])'::regprocedure)`
    assert.equal(functions.length, 2)
    for (const fn of functions) {
      assert.equal(fn.prosecdef, true)
      assert(fn.proconfig.includes('search_path=""'))
    }
    assert.equal((await sql`select relrowsecurity from pg_class where oid='public.weekly_match_public_profiles'::regclass`)[0].relrowsecurity, true)
  })
  await check('public consent defaults false and own read succeeds', async () => {
    assert.equal((await profile(4,'Hidden'))[0].is_public, false)
    const own = await asRole('authenticated', uid(4), (tx) => tx`select nickname,is_public from public.weekly_match_public_profiles`)
    assert.deepEqual([...own], [{ nickname: 'Hidden', is_public: false }])
  })
  await check('RLS blocks cross-owner reads, inserts, updates and deletes', async () => {
    assert.equal((await asRole('authenticated', uid(1), (tx) => tx`select * from public.weekly_match_public_profiles`)).length, 0)
    await denied(asRole('authenticated', uid(1), (tx) => tx`insert into public.weekly_match_public_profiles(user_id,nickname) values(${uid(2)},'stolen')`))
    assert.equal((await asRole('authenticated', uid(1), (tx) => tx`update public.weekly_match_public_profiles set is_public=true where user_id=${uid(4)} returning *`)).length, 0)
    assert.equal((await asRole('authenticated', uid(1), (tx) => tx`delete from public.weekly_match_public_profiles where user_id=${uid(4)} returning *`)).length, 0)
    await denied(asRole('authenticated', null, (tx) => tx`insert into public.weekly_match_public_profiles(user_id,nickname) values(${uid(1)},'no auth')`))
  })
  await profile(1,'Alpha',true)
  await profile(2,'Beta',true)
  await profile(3,'Gamma',true)
  await check('nickname uniqueness ignores case and database validates direct writes', async () => {
    await assert.rejects(profile(12,'aLpHa',true), /duplicate key/)
    for (const invalid of ['A','a'.repeat(17),'  ',' Alpha','Alpha ','bad\nname','bad@name','가상😺']) {
      await assert.rejects(profile(12,invalid,true), /check constraint/)
    }
    await profile(12,'한글_별명-12',false)
    await asRole('authenticated', uid(12), (tx) => tx`delete from public.weekly_match_public_profiles where user_id=${uid(12)}`)
    await denied(asRole('authenticated', uid(1), (tx) => tx`update public.weekly_match_public_profiles set user_id=${uid(12)} where user_id=${uid(1)}`))
  })
  await check('profile own update and delete are allowed', async () => {
    await profile(12,'Own12',false)
    const updated = await asRole('authenticated', uid(12), (tx) => tx`update public.weekly_match_public_profiles set nickname='Own-renamed',is_public=true where user_id=${uid(12)} returning nickname,is_public`)
    assert.deepEqual([...updated], [{ nickname: 'Own-renamed', is_public: true }])
    assert.equal((await asRole('authenticated', uid(12), (tx) => tx`delete from public.weekly_match_public_profiles where user_id=${uid(12)} returning *`)).length, 1)
  })
  for (const id of ['win-one','win-two','tied','pending','voided','corrected','zero']) await fixture(id)
  await fixture('previous', dates.previous_month)
  await fixture('next', dates.next_month)
  await settle('win-one',1,'left'); await settle('win-two',1,'right'); await settle('tied',1,'tie')
  await settle('pending',1,'left'); await settle('pending',2,'pending')
  await settle('voided',1,'left'); await settle('voided',2,'void')
  await settle('corrected',1,'left'); await settle('corrected',2,'right')
  await settle('previous',1,'left'); await settle('next',1,'left')
  for (const user of [1,2,3,4]) await pick('win-one',user,user === 3 ? 'right' : 'left')
  for (const user of [1,2,3,4]) await pick('win-two',user,user === 2 ? 'left' : 'right')
  for (const [user,nickname,roundId] of [[5,'OnlyTie','tied'],[6,'Pending','pending'],[7,'Voided','voided'],[8,'Previous','previous'],[10,'Next','next'],[11,'Corrected','corrected']]) {
    await profile(user,nickname,true); await pick(roundId,user)
  }
  await profile(9,'NoPick',true)
  await check('counts actual distinct participants including private profiles without synthetic users', async () => {
    assert.deepEqual(await counts(['win-one','zero','unknown','win-one']), [{ round_id: 'win-one', participant_count: '4' }, { round_id: 'zero', participant_count: '0' }])
    await sql`update public.weekly_match_entries set side='right' where round_id='win-one' and user_id=${uid(4)}`
    assert.equal((await counts(['win-one']))[0].participant_count, '4')
    assert.equal((await asRole('authenticated', uid(1), (tx) => tx`select * from public.weekly_match_entries`)).length, 2)
  })
  await check('count RPC validates bounded round IDs and supports at most12 existing IDs', async () => {
    await assert.rejects(counts(Array.from({ length:13 },() => 'win-one')), /INVALID_ROUND_IDS/)
    await assert.rejects(counts(null), /INVALID_ROUND_IDS/)
    await assert.rejects(counts([null]), /INVALID_ROUND_IDS/)
    await assert.rejects(counts(['BAD ID']), /INVALID_ROUND_IDS/)
    await assert.rejects(asRole('service_role',null,(tx) => tx`select * from public.weekly_match_participant_counts(ARRAY[['win-one'],['zero']]::text[])`), /INVALID_ROUND_IDS/)
    assert.equal((await counts(Array.from({length:12},() => 'win-one'))).length, 1)
  })
  await check('current-month latest results create shared ranks and exclude pending,tie,void,private and unpicked users', async () => {
    assert.deepEqual(await leaderboard(), {
      season: dates.season, total:4, entries:[
        {rank:1,nickname:'Alpha',points:2,wins:2,losses:0,validEntries:2},
        {rank:2,nickname:'Beta',points:1,wins:1,losses:1,validEntries:2},
        {rank:2,nickname:'Gamma',points:1,wins:1,losses:1,validEntries:2},
        {rank:4,nickname:'Corrected',points:0,wins:0,losses:1,validEntries:1},
      ],
    })
  })
  await check('latest pending and void corrections remove prior valid results instead of falling back', async () => {
    await settle('corrected',3,'pending')
    assert.equal((await leaderboard()).total,3)
    await settle('corrected',4,'void')
    assert.equal((await leaderboard()).total,3)
    await settle('corrected',5,'left')
    assert.deepEqual((await leaderboard()).entries.find((row) => row.nickname === 'Corrected'), {rank:2,nickname:'Corrected',points:1,wins:1,losses:0,validEntries:1})
  })
  await check('withdrawing public consent removes only that profile immediately', async () => {
    await asRole('authenticated', uid(1), (tx) => tx`update public.weekly_match_public_profiles set is_public=false where user_id=${uid(1)}`)
    const result = await leaderboard()
    assert.equal(result.total,3)
    assert(!result.entries.some((row) => row.nickname === 'Alpha'))
    assert(result.entries.every((row) => row.rank === 1))
    assert.equal((await counts(['win-one']))[0].participant_count,'4')
    await asRole('authenticated', uid(1), (tx) => tx`update public.weekly_match_public_profiles set is_public=true where user_id=${uid(1)}`)
  })
  await check('top50 is bounded while total reports all actual qualified opt-ins', async () => {
    await sql`insert into public.weekly_match_public_profiles(user_id,nickname,is_public)
      select ('00000000-0000-4000-8000-' || lpad(number::text,12,'0'))::uuid,'Load' || number,true from generate_series(100,159) as number`
    await sql`insert into public.weekly_match_entries(round_id,user_id,side)
      select 'win-one',('00000000-0000-4000-8000-' || lpad(number::text,12,'0'))::uuid,'left' from generate_series(100,159) as number`
    const result = await leaderboard()
    assert.equal(result.total,64)
    assert.equal(result.entries.length,50)
    assert.equal(result.entries[0].nickname,'Alpha')
    assert(result.entries.slice(1).every((row) => row.rank === 2))
    assert.equal((await counts(['win-one']))[0].participant_count,'64')
    for (const row of result.entries) assert.deepEqual(Object.keys(row).sort(),['rank','nickname','points','wins','losses','validEntries'].sort())
    assert(!JSON.stringify(result).includes('00000000-0000-4000-8000'))
    assert(!JSON.stringify(result).match(/user_id|email|side|round_id/))
  })
  await check('reapplying the new migration preserves existing ledgers, profiles and aggregates', async () => {
    const snapshot = async () => (await sql`select jsonb_build_object(
      'rounds',(select jsonb_agg(to_jsonb(r) order by r.id) from public.weekly_match_rounds as r),
      'entries',(select jsonb_agg(to_jsonb(e) order by e.round_id,e.user_id) from public.weekly_match_entries as e),
      'settlements',(select jsonb_agg(to_jsonb(s) order by s.round_id,s.version) from public.weekly_match_settlements as s),
      'profiles',(select jsonb_agg(to_jsonb(p) order by p.user_id) from public.weekly_match_public_profiles as p)
    ) as value`)[0].value
    const before = await snapshot()
    const rankingsBefore = await leaderboard()
    const countsBefore = await counts(['win-one','zero'])
    await sql.unsafe(await readFile(new URL('../supabase/migrations/20261119042546_weekly_match_public_ranking.sql', import.meta.url),'utf8'))
    assert.deepEqual(await snapshot(),before)
    assert.deepEqual(await leaderboard(),rankingsBefore)
    assert.deepEqual(await counts(['win-one','zero']),countsBefore)
  })
  console.log('PASS ' + checks + ' isolated ranking database checks')
} finally {
  await sql.end()
}
