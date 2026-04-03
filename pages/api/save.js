import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { state, gameLog, goldLog } = req.body

  await supabase.from('game_state').upsert({ id: 1, ...state, updated_at: new Date().toISOString() })

  if (gameLog) await supabase.from('game_log').insert({ data: gameLog })
  if (goldLog) await supabase.from('gold_log').insert({ data: goldLog })

  res.status(200).json({ ok: true })
}
