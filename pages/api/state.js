import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  const { data: state } = await supabase.from('game_state').select('*').eq('id', 1).single()
  const { data: gameLogs } = await supabase.from('game_log').select('*').order('created_at', { ascending: false }).limit(50)
  const { data: goldLogs } = await supabase.from('gold_log').select('*').order('created_at', { ascending: false }).limit(50)

  res.status(200).json({
    state: state || {},
    gameLogs: (gameLogs || []).map(r => r.data),
    goldLogs: (goldLogs || []).map(r => r.data),
  })
}
