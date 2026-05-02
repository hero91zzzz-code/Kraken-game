import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  // Vercel Cron이 호출하는 엔드포인트 — Supabase를 깨워서 pause 방지
  try {
    await supabase.from('game_state').select('id').eq('id', 1).single()
    console.log('Supabase ping 성공:', new Date().toISOString())
    res.status(200).json({ ok: true, time: new Date().toISOString() })
  } catch (e) {
    console.error('Supabase ping 실패:', e.message)
    res.status(500).json({ ok: false, error: e.message })
  }
}
