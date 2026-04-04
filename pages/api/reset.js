import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { combo_stats, gold_amount, total_rounds = 0 } = req.body

  await supabase.from('game_state').upsert({
    id: 1,
    total_chips: [0,0,0,0,0,0],
    today_chips: [0,0,0,0,0,0],
    today_games: 0, today_pw: 0, today_ew: 0,
    pirates_w: 0, pirates_l: 0,
    explore_w: 0, explore_l: 0,
    personal: Array(6).fill({pw:0,pl:0,ew:0,el:0}),
    combo_stats,
    total_rounds,
    today_in: 0, today_out: 0,
    fine_paid: [false,false,false,false,false,false],
    gold_amount,
    updated_at: new Date().toISOString()
  })

  res.status(200).json({ ok: true })
}
