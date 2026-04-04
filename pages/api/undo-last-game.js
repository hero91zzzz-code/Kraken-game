import { supabase } from '../../lib/supabase'

function decCombo(comboStats, idxArr, team, didWin) {
  const key = idxArr.slice().sort((a,b)=>a-b).join('-') + ':' + team
  const existing = comboStats[key]
  if (!existing) return comboStats

  const next = {
    ...existing,
    w: Math.max(0, (existing.w || 0) - (didWin ? 1 : 0)),
    l: Math.max(0, (existing.l || 0) - (didWin ? 0 : 1)),
  }

  const cs = { ...comboStats }
  if ((next.w || 0) === 0 && (next.l || 0) === 0) delete cs[key]
  else cs[key] = next
  return cs
}

function decExplorePairs(comboStats, exploreIdx, didWin) {
  let cs = { ...comboStats }
  for (let a = 0; a < exploreIdx.length; a++) {
    for (let b = a + 1; b < exploreIdx.length; b++) {
      cs = decCombo(cs, [exploreIdx[a], exploreIdx[b]], 'explore', didWin)
    }
  }
  return cs
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { data: lastRow, error: lastErr } = await supabase
    .from('game_log')
    .select('id,data')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastErr) return res.status(500).json({ ok: false, error: '최근 게임 기록을 불러오지 못했어요.' })
  if (!lastRow?.data) return res.status(400).json({ ok: false, error: '되돌릴 게임 기록이 없어요.' })

  const { data: state, error: stateErr } = await supabase
    .from('game_state')
    .select('*')
    .eq('id', 1)
    .single()

  if (stateErr || !state) return res.status(500).json({ ok: false, error: '현재 상태를 불러오지 못했어요.' })

  const log = lastRow.data
  const pirates = Array.isArray(log.pirateIdx) ? log.pirateIdx : []
  const explore = Array.isArray(log.exploreIdx) ? log.exploreIdx : []
  const winner = log.winner

  const totalChips = Array.isArray(state.total_chips) ? [...state.total_chips] : [0,0,0,0,0,0]
  const todayChips = Array.isArray(state.today_chips) ? [...state.today_chips] : [0,0,0,0,0,0]
  const personal = Array.isArray(state.personal) ? state.personal.map(p => ({ ...p })) : Array(6).fill(null).map(() => ({pw:0,pl:0,ew:0,el:0}))

  const chipReceivers = winner === 'pirates' ? explore : pirates
  const chipLosers = winner === 'pirates' ? pirates : explore

  chipReceivers.forEach(i => {
    totalChips[i] = (totalChips[i] || 0) - 3
    todayChips[i] = (todayChips[i] || 0) - 3
    if (pirates.includes(i)) personal[i].pl = Math.max(0, (personal[i].pl || 0) - 1)
    else personal[i].el = Math.max(0, (personal[i].el || 0) - 1)
  })

  chipLosers.forEach(i => {
    if (pirates.includes(i)) personal[i].pw = Math.max(0, (personal[i].pw || 0) - 1)
    else personal[i].ew = Math.max(0, (personal[i].ew || 0) - 1)
  })

  let comboStats = { ...(state.combo_stats || {}) }
  comboStats = decCombo(comboStats, pirates, 'pirate', winner === 'pirates')
  comboStats = decExplorePairs(comboStats, explore, winner === 'explore')

  const nextState = {
    ...state,
    total_chips: totalChips,
    today_chips: todayChips,
    today_games: Math.max(0, (state.today_games || 0) - 1),
    today_pw: Math.max(0, (state.today_pw || 0) - (winner === 'pirates' ? 1 : 0)),
    today_ew: Math.max(0, (state.today_ew || 0) - (winner === 'explore' ? 1 : 0)),
    pirates_w: Math.max(0, (state.pirates_w || 0) - (winner === 'pirates' ? 1 : 0)),
    pirates_l: Math.max(0, (state.pirates_l || 0) - (winner === 'explore' ? 1 : 0)),
    explore_w: Math.max(0, (state.explore_w || 0) - (winner === 'explore' ? 1 : 0)),
    explore_l: Math.max(0, (state.explore_l || 0) - (winner === 'pirates' ? 1 : 0)),
    personal,
    combo_stats: comboStats,
    total_rounds: Math.max(0, (state.total_rounds || 0) - 1),
    updated_at: new Date().toISOString(),
  }

  const { error: saveErr } = await supabase.from('game_state').upsert(nextState)
  if (saveErr) return res.status(500).json({ ok: false, error: '되돌린 상태를 저장하지 못했어요.' })

  const { error: deleteErr } = await supabase.from('game_log').delete().eq('id', lastRow.id)
  if (deleteErr) return res.status(500).json({ ok: false, error: '최근 게임 기록 삭제에 실패했어요.' })

  const { data: gameLogs } = await supabase.from('game_log').select('*').order('created_at', { ascending: false }).limit(50)

  return res.status(200).json({
    ok: true,
    state: nextState,
    restoredPirates: pirates,
    gameLogs: (gameLogs || []).map(r => r.data),
  })
}
