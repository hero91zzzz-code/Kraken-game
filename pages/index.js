import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

const NAMES = ['재홍', '지수', '우혁', '정민', '진현', '송이']
const BG = ['#dbeafe','#fce7f3','#dcfce7','#fee2e2','#fae8ff','#fef9c3']
const FG = ['#1d4ed8','#be185d','#15803d','#b91c1c','#7e22ce','#854d0e']
const CHIP_VAL = 1000

function pill(i, n) {
  return <span key={i} style={{display:'inline-block',padding:'5px 12px',borderRadius:20,fontSize:13,fontWeight:500,background:BG[i],color:FG[i]}}>{n}</span>
}
function won(n) { return Math.round(n).toLocaleString() + '원' }
function pct(w, l) { const t = w + l; return t ? Math.round(w / t * 100) : null }
const initPersonal = () => Array(6).fill(null).map(() => ({pw:0,pl:0,ew:0,el:0}))

export default function Home() {
  const [tab, setTab] = useState('record')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showCumResetModal, setShowCumResetModal] = useState(false)
  const [rankType, setRankType] = useState(null) // null | 'total' | 'pirate' | 'explore'
  const [comboSelected, setComboSelected] = useState([])
  const [exploreExpanded, setExploreExpanded] = useState(false)
  const [pirateExpanded, setPirateExpanded] = useState(false)

  // 저장 중 여부 — 중복 방지 핵심
  const isSaving = useRef(false)
  const lastSaveTime = useRef(0)
  const selectedPiratesRef = useRef([])

  // 해적 선택은 별도 state — fetch가 절대 못 건드리게
  const [selectedPirates, setSelectedPirates] = useState([])

  const [G, setG] = useState({
    totalChips: [0,0,0,0,0,0], todayChips: [0,0,0,0,0,0],
    todayGames: 0, todayPW: 0, todayEW: 0,
    pirates: {w:0,l:0}, explore: {w:0,l:0},
    personal: initPersonal(),
    // 누적 — 초기화에 영향받지 않음
    cumPirates: {w:0,l:0}, cumExplore: {w:0,l:0},
    cumPersonal: initPersonal(),
    cumGames: 0,
    comboStats: {}, totalRounds: 0,
    goldAmount: 0, todayIn: 0, todayOut: 0,
    finePaid: [false,false,false,false,false,false],
  })
  const [gameLogs, setGameLogs] = useState([])
  const [goldLogs, setGoldLogs] = useState([])
  const [manualVals, setManualVals] = useState([0,0,0,0,0,0])
  const [spendLabel, setSpendLabel] = useState('')
  const [spendAmt, setSpendAmt] = useState('')
  const [spendName, setSpendName] = useState(null)
  const [depositLabel, setDepositLabel] = useState('')
  const [depositAmt, setDepositAmt] = useState('')

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }, [])

  const parseState = useCallback((s) => ({
    totalChips: s.total_chips || [0,0,0,0,0,0],
    todayChips: s.today_chips || [0,0,0,0,0,0],
    todayGames: s.today_games || 0,
    todayPW: s.today_pw || 0,
    todayEW: s.today_ew || 0,
    pirates: {w: s.pirates_w||0, l: s.pirates_l||0},
    explore: {w: s.explore_w||0, l: s.explore_l||0},
    personal: s.personal || initPersonal(),
    cumPirates: {w: s.cum_pirates_w||0, l: s.cum_pirates_l||0},
    cumExplore: {w: s.cum_explore_w||0, l: s.cum_explore_l||0},
    cumPersonal: s.cum_personal || initPersonal(),
    cumGames: s.cum_games || 0,
    comboStats: s.combo_stats || {},
    totalRounds: s.total_rounds || 0,
    goldAmount: s.gold_amount || 0,
    todayIn: s.today_in || 0,
    todayOut: s.today_out || 0,
    finePaid: s.fine_paid || [false,false,false,false,false,false],
  }), [])

  const fetchState = useCallback(async () => {
    // 저장 중, 최근 10초 이내 저장, 해적 선택 중이면 fetch 스킵
    if (isSaving.current) return
    if (Date.now() - lastSaveTime.current < 10000) return
    if (selectedPiratesRef.current.length > 0) return

    try {
      const r = await fetch('/api/state')
      const d = await r.json()
      if (d.state && d.state.id) {
        // 저장 중이 아닐 때만 상태 업데이트
        if (!isSaving.current) {
          setG(parseState(d.state))
          setManualVals(d.state.today_chips || [0,0,0,0,0,0])
        }
        setGameLogs(d.gameLogs || [])
        setGoldLogs(d.goldLogs || [])
      }
      setLoading(false)
    } catch(e) {
      setLoading(false)
    }
  }, [parseState])

  useEffect(() => {
    fetchState()
    // 자동 새로고침 제거 — 탭 전환 시에만 fetch
  }, [])

  const saveState = useCallback(async (newG, gameLog = null, goldLog = null) => {
    if (isSaving.current) return // 중복 저장 방지
    isSaving.current = true
    lastSaveTime.current = Date.now()
    try {
      await fetch('/api/save', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          state: {
            total_chips: newG.totalChips,
            today_chips: newG.todayChips,
            today_games: newG.todayGames,
            today_pw: newG.todayPW,
            today_ew: newG.todayEW,
            pirates_w: newG.pirates.w, pirates_l: newG.pirates.l,
            explore_w: newG.explore.w, explore_l: newG.explore.l,
            personal: newG.personal,
            cum_pirates_w: newG.cumPirates.w, cum_pirates_l: newG.cumPirates.l,
            cum_explore_w: newG.cumExplore.w, cum_explore_l: newG.cumExplore.l,
            cum_personal: newG.cumPersonal,
            cum_games: newG.cumGames,
            combo_stats: newG.comboStats,
            total_rounds: newG.totalRounds,
            gold_amount: newG.goldAmount,
            today_in: newG.todayIn,
            today_out: newG.todayOut,
            fine_paid: newG.finePaid,
          },
          gameLog, goldLog
        })
      })
    } finally {
      isSaving.current = false
      lastSaveTime.current = Date.now()
    }
  }, [])

  function recordCombo(comboStats, idxArr, team, didWin) {
    const key = idxArr.slice().sort((a,b)=>a-b).join('-') + ':' + team
    const existing = comboStats[key] || {w:0, l:0, team, idxArr: idxArr.slice().sort((a,b)=>a-b)}
    return {...comboStats, [key]: {...existing, w: existing.w + (didWin?1:0), l: existing.l + (didWin?0:1)}}
  }

  function recordExplorePairs(comboStats, exploreIdx, didWin) {
    let cs = {...comboStats}
    for (let a = 0; a < exploreIdx.length; a++)
      for (let b = a+1; b < exploreIdx.length; b++)
        cs = recordCombo(cs, [exploreIdx[a], exploreIdx[b]], 'explore', didWin)
    return cs
  }

  async function togglePirate(i) {
    const sel = selectedPirates
    const idx = sel.indexOf(i)
    if (idx >= 0) {
      const next = sel.filter(x=>x!==i)
      selectedPiratesRef.current = next
      setSelectedPirates(next)
    } else {
      if (sel.length >= 2) { showToast('해적은 2명만 선택 가능해요'); return }
      const next = [...sel, i]
      selectedPiratesRef.current = next
      setSelectedPirates(next)
    }
  }

  async function submitResult(winner) {
    if (isSaving.current) { showToast('잠깐, 저장 중이에요...'); return }
    const pirates = [...selectedPirates]
    const explore = [0,1,2,3,4,5].filter(i => !pirates.includes(i))
    const chipReceivers = winner === 'pirates' ? explore : pirates
    const chipLosers = winner === 'pirates' ? pirates : explore

    const newG = {...G}
    newG.totalRounds++; newG.todayGames++; newG.cumGames = (G.cumGames||0)+1
    if (winner === 'pirates') {
      newG.pirates = {w:G.pirates.w+1,l:G.pirates.l}
      newG.explore = {w:G.explore.w,l:G.explore.l+1}
      newG.cumPirates = {w:(G.cumPirates?.w||0)+1, l:(G.cumPirates?.l||0)}
      newG.cumExplore = {w:(G.cumExplore?.w||0), l:(G.cumExplore?.l||0)+1}
      newG.todayPW++
    } else {
      newG.explore = {w:G.explore.w+1,l:G.explore.l}
      newG.pirates = {w:G.pirates.w,l:G.pirates.l+1}
      newG.cumExplore = {w:(G.cumExplore?.w||0)+1, l:(G.cumExplore?.l||0)}
      newG.cumPirates = {w:(G.cumPirates?.w||0), l:(G.cumPirates?.l||0)+1}
      newG.todayEW++
    }

    const tc = [...G.totalChips], dc = [...G.todayChips]
    const pers = G.personal.map(p => ({...p}))
    const cumPers = (G.cumPersonal || initPersonal()).map(p => ({...p}))
    chipReceivers.forEach(i => {
      tc[i]+=3; dc[i]+=3
      if(pirates.includes(i)) { pers[i].pl++; cumPers[i].pl++ }
      else { pers[i].el++; cumPers[i].el++ }
    })
    chipLosers.forEach(i => {
      if(pirates.includes(i)) { pers[i].pw++; cumPers[i].pw++ }
      else { pers[i].ew++; cumPers[i].ew++ }
    })

    let cs = recordCombo({...G.comboStats}, pirates, 'pirate', winner==='pirates')
    cs = recordExplorePairs(cs, explore, winner==='explore')

    newG.totalChips = tc; newG.todayChips = dc; newG.personal = pers; newG.cumPersonal = cumPers; newG.comboStats = cs

    const ts = new Date().toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
    const log = {type:'game', round:newG.totalRounds, winner, time:ts, pirateIdx:pirates, exploreIdx:explore}

    setG(newG)
    setManualVals(dc)
    setSelectedPirates([])
    selectedPiratesRef.current = []
    showToast((winner==='pirates'?'🏴‍☠️ 해적 승리':'🧭 탐험대 승리') + ' — 진 팀 +3칩')
    await saveState(newG, log)
    lastSaveTime.current = Date.now()
    const r = await fetch('/api/state')
    const d = await r.json()
    setGameLogs(d.gameLogs || [])
    setGoldLogs(d.goldLogs || [])
  }

  async function doReset() {
    if (isSaving.current) return
    setShowResetModal(false)
    const newG = {
      ...G,
      totalChips:[0,0,0,0,0,0], todayChips:[0,0,0,0,0,0],
      todayGames:0, todayPW:0, todayEW:0,
      pirates:{w:0,l:0}, explore:{w:0,l:0},
      personal:initPersonal(),
      todayIn:0, todayOut:0,
      finePaid:[false,false,false,false,false,false],
    }
    setG(newG)
    setSelectedPirates([])
    selectedPiratesRef.current = []
    setManualVals([0,0,0,0,0,0])
    showToast('초기화 완료! (조합·금고 잔액 유지)')
    await fetch('/api/reset', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        combo_stats: G.comboStats,
        gold_amount: G.goldAmount,
        cum_pirates_w: G.cumPirates?.w||0,
        cum_pirates_l: G.cumPirates?.l||0,
        cum_explore_w: G.cumExplore?.w||0,
        cum_explore_l: G.cumExplore?.l||0,
        cum_personal: G.cumPersonal||initPersonal(),
        cum_games: G.cumGames||0,
      })
    })
  }

  async function doCumReset() {
    if (isSaving.current) return
    setShowCumResetModal(false)
    const newG = {
      ...G,
      cumPirates: {w:0,l:0},
      cumExplore: {w:0,l:0},
      cumPersonal: initPersonal(),
      cumGames: 0,
    }
    setG(newG)
    showToast('누적 초기화 완료!')
    await saveState(newG)
  }

  async function applyManual() {
    if (isSaving.current) { showToast('잠깐, 저장 중이에요...'); return }
    const newFP = [...G.finePaid]
    let changed = false
    manualVals.forEach((v,i) => { if(v !== G.todayChips[i]) { newFP[i]=false; changed=true } })
    if (!changed) { showToast('변경사항 없음'); return }
    const newG = {...G, todayChips:[...manualVals], totalChips:[...manualVals], finePaid:newFP}
    setG(newG)
    showToast('수동 조정 완료!')
    await saveState(newG)
  }

  async function payOneFine(i) {
    if (isSaving.current) { showToast('잠깐, 저장 중이에요...'); return }
    const fine = Math.max(0, G.todayChips[i]) * CHIP_VAL
    if (!fine || G.finePaid[i]) return
    const newFP = [...G.finePaid]; newFP[i] = true
    const ts = new Date().toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
    const log = {type:'add', label:NAMES[i]+' 벌금 납부', amount:fine, ts}
    const newG = {...G, finePaid:newFP, goldAmount:G.goldAmount+fine, todayIn:G.todayIn+fine}
    setG(newG)
    showToast(NAMES[i]+' '+won(fine)+' 납부!')
    await saveState(newG, null, log)
    lastSaveTime.current = Date.now()
    const r = await fetch('/api/state')
    const d = await r.json()
    setGoldLogs(d.goldLogs || [])
  }

  async function payAllFine() {
    if (isSaving.current) { showToast('잠깐, 저장 중이에요...'); return }
    let total = 0, count = 0
    const newFP = [...G.finePaid]
    G.todayChips.forEach((c,i) => { const fine=Math.max(0,c)*CHIP_VAL; if(fine>0&&!G.finePaid[i]){newFP[i]=true;total+=fine;count++} })
    if (!total) { showToast('납부할 벌금이 없어요'); return }
    const ts = new Date().toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
    const log = {type:'add', label:'전액 납부 ('+count+'명)', amount:total, ts}
    const newG = {...G, finePaid:newFP, goldAmount:G.goldAmount+total, todayIn:G.todayIn+total}
    setG(newG)
    showToast('💰 '+won(total)+' 전액 납부!')
    await saveState(newG, null, log)
    lastSaveTime.current = Date.now()
    const r = await fetch('/api/state')
    const d = await r.json()
    setGoldLogs(d.goldLogs || [])
  }

  async function manualDeposit() {
    if (isSaving.current) { showToast('잠깐, 저장 중이에요...'); return }
    const amt = parseInt(depositAmt||0)
    if (amt <= 0) { showToast('금액을 입력해주세요'); return }
    const label = depositLabel.trim() || '입금'
    const ts = new Date().toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
    const log = {type:'add', label, amount:amt, ts}
    const newG = {...G, goldAmount:G.goldAmount+amt, todayIn:G.todayIn+amt}
    setG(newG)
    setDepositLabel(''); setDepositAmt('')
    showToast(label+' '+won(amt)+' 입금!')
    await saveState(newG, null, log)
    lastSaveTime.current = Date.now()
    const r = await fetch('/api/state')
    const d = await r.json()
    setGoldLogs(d.goldLogs || [])
  }

  async function spendFromGold() {
    if (isSaving.current) { showToast('잠깐, 저장 중이에요...'); return }
    const amt = parseInt(spendAmt||0)
    if (!spendName) { showToast('이름을 선택해주세요'); return }
    if (!spendLabel.trim()) { showToast('항목을 입력해주세요'); return }
    if (amt <= 0) { showToast('금액을 입력해주세요'); return }
    if (G.goldAmount < amt) { showToast('금고 잔액이 부족해요'); return }
    const ts = new Date().toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
    const log = {type:'spend', label:spendName+' — '+spendLabel.trim(), amount:amt, ts}
    const newG = {...G, goldAmount:G.goldAmount-amt, todayOut:G.todayOut+amt}
    setG(newG)
    setSpendLabel(''); setSpendAmt(''); setSpendName(null)
    showToast(spendName+' '+spendLabel+' '+won(amt)+' 차감')
    await saveState(newG, null, log)
    lastSaveTime.current = Date.now()
    const r = await fetch('/api/state')
    const d = await r.json()
    setGoldLogs(d.goldLogs || [])
  }

  function renderComboRanking(entries, color, expanded, team) {
    if (!entries.length) return <div style={{textAlign:'center',padding:'16px 0',fontSize:13,color:'#9ca3af'}}>데이터 없음</div>
    const sorted = [...entries].sort((a,b)=>{
      const ra = pct(a.w,a.l) ?? -1
      const rb = pct(b.w,b.l) ?? -1
      if (rb !== ra) return rb - ra  // 승률 높은 순
      return b.w - a.w  // 승률 동일 시 승수 많은 순
    })
    const visible = expanded ? sorted : sorted.slice(0,5)
    return <>
      {visible.map((c,r) => {
        const rate = pct(c.w,c.l)
        return <div key={r} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:'0.5px solid #f5f5f5'}}>
          <div style={{width:20,fontSize:12,textAlign:'center',color:'#9ca3af',flexShrink:0}}>{r+1}</div>
          <div style={{display:'flex',gap:4,flex:1}}>{c.idxArr.map(i=>pill(i,NAMES[i]))}</div>
          <div style={{textAlign:'right',minWidth:68}}>
            <div style={{fontSize:15,fontWeight:500,color}}>{rate!==null?rate+'%':'—'}</div>
            <div style={{fontSize:10,color:'#9ca3af'}}>{c.w}승 {c.l}패</div>
          </div>
        </div>
      })}
      {sorted.length>5 && <button onClick={()=>team==='explore'?setExploreExpanded(!expanded):setPirateExpanded(!expanded)} style={{width:'100%',padding:8,border:'none',background:'none',color:'#9ca3af',fontSize:12,cursor:'pointer',fontFamily:'inherit',marginTop:4,borderTop:'0.5px solid #f5f5f5'}}>
        {expanded?'▲ 접기':'▼ 더보기 ('+(sorted.length-5)+'개)'}
      </button>}
    </>
  }

  function ComboResult() {
    if (comboSelected.length !== 2) return <div style={{textAlign:'center',padding:'16px 0',fontSize:13,color:'#9ca3af'}}>두 명을 선택해주세요</div>
    const [a,b] = comboSelected.slice().sort((x,y)=>x-y)
    const ps = G.comboStats[a+'-'+b+':pirate']||{w:0,l:0}
    const es = G.comboStats[a+'-'+b+':explore']||{w:0,l:0}
    const pr=pct(ps.w,ps.l), er=pct(es.w,es.l)
    const totalW=ps.w+es.w, totalL=ps.l+es.l, tr=pct(totalW,totalL)
    return <>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {pill(a,NAMES[a])}<span style={{fontSize:13,color:'#9ca3af'}}>+</span>{pill(b,NAMES[b])}
        <span style={{marginLeft:'auto',fontSize:14,fontWeight:500}}>전체 {tr!==null?tr+'%':'—'}</span>
        <span style={{fontSize:11,color:'#9ca3af'}}>{totalW}승 {totalL}패</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div style={{background:'#e1f5ee',borderRadius:10,padding:14,textAlign:'center'}}>
          <div style={{fontSize:11,color:'#085041',fontWeight:500,marginBottom:8}}>🧭 탐험대일 때</div>
          <div style={{fontSize:32,fontWeight:500,color:'#085041'}}>{er!==null?er+'%':'—'}</div>
          <div style={{fontSize:11,color:'#085041',marginTop:6}}>{es.w+es.l>0?es.w+'승 '+es.l+'패':'데이터 없음'}</div>
        </div>
        <div style={{background:'#fef2f2',borderRadius:10,padding:14,textAlign:'center'}}>
          <div style={{fontSize:11,color:'#a32d2d',fontWeight:500,marginBottom:8}}>🏴‍☠️ 해적일 때</div>
          <div style={{fontSize:32,fontWeight:500,color:'#a32d2d'}}>{pr!==null?pr+'%':'—'}</div>
          <div style={{fontSize:11,color:'#a32d2d',marginTop:6}}>{ps.w+ps.l>0?ps.w+'승 '+ps.l+'패':'데이터 없음'}</div>
        </div>
      </div>
    </>
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',color:'#6b7280'}}>불러오는 중...</div>

  const todaySorted = [...NAMES.map((n,i)=>({n,i,c:G.todayChips[i]}))].sort((a,b)=>b.c-a.c)
  const fineSorted = [...NAMES.map((n,i)=>({n,i,c:G.todayChips[i]}))].sort((a,b)=>b.c-a.c)
  const pirateEntries = Object.values(G.comboStats).filter(c=>c.team==='pirate')
  const exploreEntries = Object.values(G.comboStats).filter(c=>c.team==='explore')

  return <>
    <Head>
      <title>🦑 크라켄</title>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
    </Head>
    <div style={{maxWidth:480,margin:'0 auto',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif',background:'#f9fafb',minHeight:'100vh',position:'relative'}}>

      <div style={{background:'#fff',padding:'16px 16px 0',borderBottom:'1px solid #f0f0f0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:17,fontWeight:500}}>🦑 크라켄</span>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>setShowResetModal(true)} style={{padding:'7px 12px',borderRadius:8,border:'0.5px solid #fca5a5',background:'none',color:'#a32d2d',fontSize:12,fontWeight:500,cursor:'pointer'}}>칩 초기화</button>
            <span style={{background:'#f3f4f6',borderRadius:20,padding:'3px 10px',fontSize:12,color:'#6b7280',fontWeight:500}}>{G.totalRounds}판</span>
          </div>
        </div>
        <div style={{display:'flex'}}>
          {[['record','기록'],['today','오늘'],['stats','통계'],['combo','조합'],['manual','수동'],['gold','금고']].map(([id,label])=>(
            <button key={id} onClick={()=>{ setTab(id); if(selectedPiratesRef.current.length===0) fetchState() }} style={{flex:1,padding:'10px 0',fontSize:11,textAlign:'center',border:'none',background:'none',cursor:'pointer',color:tab===id?'#111':'#9ca3af',borderBottom:tab===id?'2px solid #111':'2px solid transparent',fontWeight:tab===id?500:400,fontFamily:'inherit'}}>{label}</button>
          ))}
        </div>
      </div>

      {toast && <div style={{background:'#111',color:'#fff',padding:'10px 20px',borderRadius:100,fontSize:13,fontWeight:500,textAlign:'center',margin:'10px 16px'}}>{toast}</div>}

      <div style={{padding:14,paddingBottom:40}}>

        {tab==='record' && <>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>① 이번 판 해적 2명 선택</div>
            <div style={{fontSize:12,color:'#6b7280',marginBottom:12,padding:'8px 10px',background:'#f9fafb',borderRadius:8}}>해적 2명 탭 → 나머지 4명 자동으로 탐험대</div>
            {NAMES.map((n,i)=>{
              const isPirate=selectedPirates.includes(i)
              const isExplore=selectedPirates.length===2&&!isPirate
              return <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:24,padding:'10px 0',borderBottom:i<5?'0.5px solid #f5f5f5':'none'}}>
                {pill(i,n)}
                {isPirate?<button onClick={()=>togglePirate(i)} style={{padding:'8px 18px',borderRadius:8,border:'none',background:'#fef2f2',color:'#a32d2d',fontSize:13,fontWeight:500,cursor:'pointer'}}>🏴‍☠️ 해적</button>
                :isExplore?<span style={{padding:'8px 18px',borderRadius:8,background:'#e1f5ee',color:'#085041',fontSize:13,fontWeight:500}}>🧭 탐험대</span>
                :<button onClick={()=>togglePirate(i)} style={{padding:'8px 18px',borderRadius:8,border:'0.5px solid #e5e7eb',background:'none',color:'#9ca3af',fontSize:13,fontWeight:500,cursor:'pointer'}}>해적</button>}
              </div>
            })}
          </div>
          {selectedPirates.length===2 && <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>팀 구성 확인</div>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <div style={{flex:1,background:'#fef2f2',borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:11,fontWeight:500,color:'#a32d2d',marginBottom:6}}>🏴‍☠️ 해적 (2명)</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{selectedPirates.map(i=>pill(i,NAMES[i]))}</div>
              </div>
              <div style={{flex:1,background:'#e1f5ee',borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:11,fontWeight:500,color:'#085041',marginBottom:6}}>🧭 탐험대 (4명)</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{[0,1,2,3,4,5].filter(i=>!selectedPirates.includes(i)).map(i=>pill(i,NAMES[i]))}</div>
              </div>
            </div>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>② 결과 입력</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button onClick={()=>submitResult('pirates')} style={{padding:'16px 10px',borderRadius:10,border:'none',cursor:'pointer',background:'#fef2f2',color:'#a32d2d',fontSize:14,fontWeight:500,lineHeight:1.4}}>🏴‍☠️ 해적<br/>승리</button>
              <button onClick={()=>submitResult('explore')} style={{padding:'16px 10px',borderRadius:10,border:'none',cursor:'pointer',background:'#e1f5ee',color:'#085041',fontSize:14,fontWeight:500,lineHeight:1.4}}>🧭 탐험대<br/>승리</button>
            </div>
          </div>}
          {selectedPirates.length===0&&<div style={{textAlign:'center',padding:'12px 0',fontSize:13,color:'#9ca3af'}}>해적 2명을 선택해주세요</div>}
          {selectedPirates.length===1&&<div style={{textAlign:'center',padding:'12px 0',fontSize:13,color:'#9ca3af'}}>{NAMES[selectedPirates[0]]} 선택됨 — 1명 더 선택하세요</div>}
        </>}

        {tab==='today' && <div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #f0f0f0'}}>
          <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>오늘 현황</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
            {[['총 게임',G.todayGames,null],['🏴‍☠️ 해적 승',G.todayPW,'#a32d2d'],['🧭 탐험대 승',G.todayEW,'#085041']].map(([l,v,c])=>(
              <div key={l} style={{background:'#f9fafb',borderRadius:8,padding:'10px 8px',textAlign:'center'}}>
                <div style={{fontSize:11,color:'#9ca3af',marginBottom:2}}>{l}</div>
                <div style={{fontSize:20,fontWeight:500,color:c||'#111'}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>오늘 칩 (많을수록 벌금)</div>
          {todaySorted.map(p=>(
            <div key={p.i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'0.5px solid #f5f5f5'}}>
              {pill(p.i,p.n)}
              <span style={{fontSize:14,fontWeight:500,color:p.c>0?'#a32d2d':'#9ca3af',minWidth:40,textAlign:'right'}}>{p.c}</span>
              {p.c>0&&<span style={{fontSize:10,background:'#fcebeb',color:'#a32d2d',borderRadius:5,padding:'2px 6px',fontWeight:500}}>벌금</span>}
            </div>
          ))}
          <div style={{marginTop:10,padding:'10px 12px',background:'#fcebeb',borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,fontWeight:500,color:'#a32d2d'}}>오늘 총 벌금</span>
            <span style={{fontSize:16,fontWeight:500,color:'#a32d2d'}}>{G.todayChips.reduce((s,c)=>s+Math.max(0,c),0)} 칩</span>
          </div>
        </div>}

        {tab==='stats' && <>
          {/* 오늘 섹션 */}
          <div style={{fontSize:13,fontWeight:500,color:'#111',marginBottom:8,paddingLeft:2}}>📅 오늘</div>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>팀 승률</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[['🏴‍☠️ 해적',G.pirates,'#a32d2d','#e24b4a'],['🧭 탐험대',G.explore,'#085041','#1d9e75']].map(([label,data,color,bar])=>{
                const rate=pct(data.w,data.l)||0
                return <div key={label}>
                  <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:26,fontWeight:500,color}}>{rate}%</div>
                  <div style={{height:5,borderRadius:3,background:'#f3f4f6',overflow:'hidden',margin:'4px 0'}}><div style={{height:'100%',borderRadius:3,background:bar,width:rate+'%'}}/></div>
                  <div style={{fontSize:11,color:'#9ca3af'}}>{data.w}승 {data.l}패</div>
                </div>
              })}
            </div>
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:20,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>오늘 개인별 승률</div>
            {NAMES.map((n,i)=>{
              const p=G.personal[i],tw=p.pw+p.ew,tl=p.pl+p.el
              const tr=pct(tw,tl),pr2=pct(p.pw,p.pl),er2=pct(p.ew,p.el)
              return <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 0',borderBottom:i<5?'0.5px solid #f5f5f5':'none'}}>
                <div style={{flexShrink:0,paddingTop:2}}>{pill(i,n)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,marginBottom:6}}>전체 {tr!==null?tr+'%':'—'} <span style={{fontSize:11,color:'#9ca3af',fontWeight:400}}>{tw}승 {tl}패</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:2}}><span style={{color:'#a32d2d',fontWeight:500}}>🏴‍☠️ 해적 {pr2!==null?pr2+'%':'—'}</span><span style={{color:'#9ca3af'}}>{p.pw}승 {p.pl}패</span></div>
                  <div style={{height:4,borderRadius:2,background:'#f3f4f6',overflow:'hidden',marginBottom:5}}><div style={{height:'100%',borderRadius:2,background:'#e24b4a',width:(pr2||0)+'%'}}/></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:2}}><span style={{color:'#085041',fontWeight:500}}>🧭 탐험대 {er2!==null?er2+'%':'—'}</span><span style={{color:'#9ca3af'}}>{p.ew}승 {p.el}패</span></div>
                  <div style={{height:4,borderRadius:2,background:'#f3f4f6',overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:'#1d9e75',width:(er2||0)+'%'}}/></div>
                </div>
              </div>
            })}
          </div>

          {/* 누적 섹션 */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,paddingLeft:2}}>
            <div style={{fontSize:13,fontWeight:500,color:'#111'}}>📊 누적 (전체 기간)</div>
            <button onClick={()=>setShowCumResetModal(true)} style={{padding:'5px 10px',borderRadius:6,border:'0.5px solid #fca5a5',background:'none',color:'#a32d2d',fontSize:11,fontWeight:500,cursor:'pointer'}}>누적 초기화</button>
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>누적 팀 승률 ({G.cumGames||0}판)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[['🏴‍☠️ 해적',G.cumPirates||{w:0,l:0},'#a32d2d','#e24b4a'],['🧭 탐험대',G.cumExplore||{w:0,l:0},'#085041','#1d9e75']].map(([label,data,color,bar])=>{
                const rate=pct(data.w,data.l)||0
                return <div key={label}>
                  <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:26,fontWeight:500,color}}>{rate}%</div>
                  <div style={{height:5,borderRadius:3,background:'#f3f4f6',overflow:'hidden',margin:'4px 0'}}><div style={{height:'100%',borderRadius:3,background:bar,width:rate+'%'}}/></div>
                  <div style={{fontSize:11,color:'#9ca3af'}}>{data.w}승 {data.l}패</div>
                </div>
              })}
            </div>
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>승률 순위 보기</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[['total','전체','#111','#f3f4f6'],['pirate','🏴‍☠️ 해적','#a32d2d','#fef2f2'],['explore','🧭 탐험대','#085041','#e1f5ee']].map(([type,label,fg,bg])=>(
                <button key={type} onClick={()=>setRankType(rankType===type?null:type)} style={{padding:'9px 0',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer',border:rankType===type?`2px solid ${fg}`:'0.5px solid #e5e7eb',background:rankType===type?bg:'#fff',color:fg}}>{label}</button>
              ))}
            </div>
            {rankType && <div style={{marginTop:12}}>
              {(()=>{
                const cumP = G.cumPersonal||initPersonal()
                const entries = NAMES.map((n,i)=>{
                  const p = cumP[i]
                  let w, l
                  if (rankType==='total') { w = p.pw+p.ew; l = p.pl+p.el }
                  else if (rankType==='pirate') { w = p.pw; l = p.pl }
                  else { w = p.ew; l = p.el }
                  return {n, i, w, l, rate: pct(w,l)}
                }).sort((a,b)=>{
                  const ra = a.rate ?? -1, rb = b.rate ?? -1
                  if (rb !== ra) return rb - ra
                  return b.w - a.w
                })
                const color = rankType==='total'?'#111':rankType==='pirate'?'#a32d2d':'#085041'
                return entries.map((e,r)=>(
                  <div key={e.i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:r<5?'0.5px solid #f5f5f5':'none'}}>
                    <div style={{width:22,fontSize:13,fontWeight:500,textAlign:'center',color:r===0?'#d97706':r===1?'#9ca3af':r===2?'#a16207':'#9ca3af'}}>{r+1}</div>
                    {pill(e.i,e.n)}
                    <div style={{flex:1,textAlign:'right'}}>
                      <span style={{fontSize:15,fontWeight:500,color}}>{e.rate!==null?e.rate+'%':'—'}</span>
                      <span style={{fontSize:11,color:'#9ca3af',marginLeft:8}}>{e.w}승 {e.l}패</span>
                    </div>
                  </div>
                ))
              })()}
            </div>}
          </div>

          <div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>누적 개인별 승률</div>
            {NAMES.map((n,i)=>{
              const p=(G.cumPersonal||initPersonal())[i],tw=p.pw+p.ew,tl=p.pl+p.el
              const tr=pct(tw,tl),pr2=pct(p.pw,p.pl),er2=pct(p.ew,p.el)
              return <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 0',borderBottom:i<5?'0.5px solid #f5f5f5':'none'}}>
                <div style={{flexShrink:0,paddingTop:2}}>{pill(i,n)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,marginBottom:6}}>전체 {tr!==null?tr+'%':'—'} <span style={{fontSize:11,color:'#9ca3af',fontWeight:400}}>{tw}승 {tl}패</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:2}}><span style={{color:'#a32d2d',fontWeight:500}}>🏴‍☠️ 해적 {pr2!==null?pr2+'%':'—'}</span><span style={{color:'#9ca3af'}}>{p.pw}승 {p.pl}패</span></div>
                  <div style={{height:4,borderRadius:2,background:'#f3f4f6',overflow:'hidden',marginBottom:5}}><div style={{height:'100%',borderRadius:2,background:'#e24b4a',width:(pr2||0)+'%'}}/></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:2}}><span style={{color:'#085041',fontWeight:500}}>🧭 탐험대 {er2!==null?er2+'%':'—'}</span><span style={{color:'#9ca3af'}}>{p.ew}승 {p.el}패</span></div>
                  <div style={{height:4,borderRadius:2,background:'#f3f4f6',overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:'#1d9e75',width:(er2||0)+'%'}}/></div>
                </div>
              </div>
            })}
          </div>
        </>}

        {tab==='combo' && <>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>2명 선택 → 조합 승률</div>
            <div style={{fontSize:12,color:'#6b7280',marginBottom:12,padding:'8px 10px',background:'#f9fafb',borderRadius:8}}>두 명을 탭하면 전체/탐험대/해적 승률이 나와요</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
              {NAMES.map((n,i)=>{
                const sel=comboSelected.includes(i)
                return <button key={i} onClick={()=>{
                  const idx=comboSelected.indexOf(i)
                  if(idx>=0) setComboSelected(comboSelected.filter(x=>x!==i))
                  else setComboSelected(prev=>prev.length>=2?[prev[1],i]:[...prev,i])
                }} style={{padding:'9px 0',borderRadius:20,fontSize:13,fontWeight:500,cursor:'pointer',border:sel?`3px solid ${FG[i]}`:'2px solid transparent',background:BG[i],color:FG[i],textAlign:'center'}}>{n}</button>
              })}
            </div>
            <ComboResult/>
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>🧭 탐험대 2인 조합 순위</div>
            {renderComboRanking(exploreEntries,'#1d9e75',exploreExpanded,'explore')}
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>🏴‍☠️ 해적 2인 조합 순위</div>
            {renderComboRanking(pirateEntries,'#e24b4a',pirateExpanded,'pirate')}
          </div>
        </>}

        {tab==='manual' && <>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>칩 수동 조정</div>
            <div style={{fontSize:12,color:'#6b7280',marginBottom:14,padding:'8px 10px',background:'#f9fafb',borderRadius:8}}>저장하면 오늘 벌금 납부도 자동으로 반영돼요</div>
            {NAMES.map((n,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<5?'0.5px solid #f5f5f5':'none'}}>
                {pill(i,n)}
                <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:'auto'}}>
                  <button onClick={()=>setManualVals(v=>{const a=[...v];a[i]--;return a})} style={{width:28,height:28,borderRadius:6,border:'0.5px solid #e5e7eb',background:'none',fontSize:16,cursor:'pointer',color:'#111'}}>−</button>
                  <input type="number" value={manualVals[i]} onChange={e=>setManualVals(v=>{const a=[...v];a[i]=parseInt(e.target.value||0);return a})} style={{width:60,border:'0.5px solid #e5e7eb',borderRadius:8,padding:'7px 8px',fontSize:14,textAlign:'center',background:'#fff',color:'#111'}}/>
                  <button onClick={()=>setManualVals(v=>{const a=[...v];a[i]++;return a})} style={{width:28,height:28,borderRadius:6,border:'0.5px solid #e5e7eb',background:'none',fontSize:16,cursor:'pointer',color:'#111'}}>+</button>
                </div>
              </div>
            ))}
            <button onClick={applyManual} style={{width:'100%',marginTop:12,padding:13,borderRadius:10,border:'none',background:'#111',color:'#fff',fontSize:14,fontWeight:500,cursor:'pointer'}}>저장 적용</button>
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>현재 칩</div>
            {NAMES.map((n,i)=>{
              const c=G.todayChips[i]
              return <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<5?'0.5px solid #f5f5f5':'none'}}>
                {pill(i,n)}<span style={{fontSize:14,fontWeight:500,color:c>0?'#a32d2d':'#9ca3af',marginLeft:'auto'}}>{c} 칩</span>
              </div>
            })}
          </div>
        </>}

        {tab==='gold' && <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
            {[['💰 총 잔액',G.goldAmount,'#92400e','#fffbeb','#fcd34d'],['📥 오늘 입금',G.todayIn,'#085041','#e1f5ee','#6ee7b7'],['📤 오늘 출금',G.todayOut,'#a32d2d','#fef2f2','#fca5a5']].map(([l,v,c,bg,bc])=>(
              <div key={l} style={{background:bg,border:`0.5px solid ${bc}`,borderRadius:10,padding:'12px 8px',textAlign:'center'}}>
                <div style={{fontSize:10,color:c,marginBottom:4,fontWeight:500}}>{l}</div>
                <div style={{fontSize:15,fontWeight:500,color:c}}>{won(v)}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>📥 입금</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <input value={depositLabel} onChange={e=>setDepositLabel(e.target.value)} style={{border:'0.5px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,background:'#fff',color:'#111'}} placeholder="메모 (예: 초기 벌금)"/>
              <input type="number" value={depositAmt} onChange={e=>setDepositAmt(e.target.value)} style={{border:'0.5px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,background:'#fff',color:'#111',textAlign:'right'}} placeholder="금액"/>
            </div>
            <button onClick={manualDeposit} style={{width:'100%',padding:12,borderRadius:8,border:'none',background:'#e1f5ee',color:'#085041',fontSize:13,fontWeight:500,cursor:'pointer'}}>입금 추가</button>
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>💸 오늘 벌금 납부</div>
            {fineSorted.map(p=>{
              const fine=Math.max(0,p.c)*CHIP_VAL,paid=G.finePaid[p.i]
              return <div key={p.i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'0.5px solid #f5f5f5'}}>
                {pill(p.i,p.n)}
                <span style={{flex:1,fontSize:13,fontWeight:500,color:fine>0?(paid?'#9ca3af':'#a32d2d'):'#9ca3af'}}>{fine>0?won(fine):'벌금 없음'}</span>
                {fine>0&&<button onClick={()=>payOneFine(p.i)} disabled={paid} style={{padding:'6px 12px',borderRadius:7,border:'none',background:paid?'#f3f4f6':'#e1f5ee',color:paid?'#9ca3af':'#085041',fontSize:12,fontWeight:500,cursor:paid?'default':'pointer'}}>{paid?'납부완료':'납부확인'}</button>}
              </div>
            })}
            <div style={{marginTop:10,padding:'10px 12px',background:'#fffbeb',borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:500,color:'#92400e'}}>오늘 총 벌금</span>
              <span style={{fontSize:16,fontWeight:500,color:'#92400e'}}>{won(G.todayChips.reduce((s,c)=>s+Math.max(0,c)*CHIP_VAL,0))}</span>
            </div>
            <button onClick={payAllFine} style={{width:'100%',padding:12,borderRadius:8,border:'none',background:'#e1f5ee',color:'#085041',fontSize:13,fontWeight:500,cursor:'pointer'}}>전액 납부 확인</button>
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #f0f0f0'}}>
            <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase',marginBottom:10}}>🛒 지출 입력</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
              {NAMES.map((n,i)=>(
                <button key={i} onClick={()=>setSpendName(spendName===n?null:n)} style={{padding:'9px 0',borderRadius:20,fontSize:13,fontWeight:500,cursor:'pointer',border:spendName===n?`3px solid ${FG[i]}`:'2px solid transparent',background:BG[i],color:FG[i],textAlign:'center'}}>{n}</button>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <input value={spendLabel} onChange={e=>setSpendLabel(e.target.value)} style={{border:'0.5px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,background:'#fff',color:'#111'}} placeholder="항목 (예: 떡볶이)"/>
              <input type="number" value={spendAmt} onChange={e=>setSpendAmt(e.target.value)} style={{border:'0.5px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontSize:14,background:'#fff',color:'#111',textAlign:'right'}} placeholder="금액 (원)"/>
            </div>
            <button onClick={spendFromGold} style={{width:'100%',padding:12,borderRadius:8,border:'none',background:'#fef2f2',color:'#a32d2d',fontSize:13,fontWeight:500,cursor:'pointer'}}>차감 확인</button>
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #f0f0f0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontSize:11,color:'#9ca3af',fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase'}}>내역</div>
              <button onClick={()=>setGoldLogs([])} style={{fontSize:11,color:'#9ca3af',background:'none',border:'none',cursor:'pointer'}}>전체삭제</button>
            </div>
            {goldLogs.length===0?<div style={{textAlign:'center',padding:'20px 0',fontSize:13,color:'#9ca3af'}}>내역 없음</div>:goldLogs.map((g,idx)=>(
              <div key={idx} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 0',borderBottom:idx<goldLogs.length-1?'0.5px solid #f5f5f5':'none'}}>
                <div style={{fontSize:18}}>{g.type==='add'?'💰':'🛒'}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{g.label}</div><div style={{fontSize:11,color:'#9ca3af'}}>{g.ts}</div></div>
                <div style={{fontSize:14,fontWeight:500,color:g.type==='add'?'#0f6e56':'#a32d2d'}}>{g.type==='add'?'+':'−'}{won(g.amount)}</div>
              </div>
            ))}
          </div>
        </>}

      </div>

      {showResetModal && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,zIndex:999}}>
        <div style={{background:'#fff',borderRadius:12,padding:20,width:'100%',maxWidth:340}}>
          <div style={{fontSize:15,fontWeight:500,marginBottom:8}}>칩 초기화</div>
          <div style={{fontSize:13,color:'#6b7280',marginBottom:20,lineHeight:1.5}}>칩, 오늘 현황, 통계, 벌금 납부 내역이 초기화됩니다.<br/>조합 데이터와 금고 잔액은 유지됩니다.</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <button onClick={()=>setShowResetModal(false)} style={{padding:11,borderRadius:8,border:'0.5px solid #e5e7eb',background:'none',fontSize:13,cursor:'pointer'}}>취소</button>
            <button onClick={doReset} style={{padding:11,borderRadius:8,border:'none',background:'#fef2f2',color:'#a32d2d',fontSize:13,fontWeight:500,cursor:'pointer'}}>초기화</button>
          </div>
        </div>
      </div>}

      {showCumResetModal && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,zIndex:999}}>
        <div style={{background:'#fff',borderRadius:12,padding:20,width:'100%',maxWidth:340}}>
          <div style={{fontSize:15,fontWeight:500,marginBottom:8,color:'#a32d2d'}}>⚠️ 누적 초기화</div>
          <div style={{fontSize:13,color:'#6b7280',marginBottom:20,lineHeight:1.5}}>지금까지의 <b>모든 누적 승률</b>이 0으로 초기화돼요.<br/>(오늘 데이터, 조합, 금고 잔액은 유지)<br/><br/>정말 진행하시겠어요?</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <button onClick={()=>setShowCumResetModal(false)} style={{padding:11,borderRadius:8,border:'0.5px solid #e5e7eb',background:'none',fontSize:13,cursor:'pointer'}}>취소</button>
            <button onClick={doCumReset} style={{padding:11,borderRadius:8,border:'none',background:'#fef2f2',color:'#a32d2d',fontSize:13,fontWeight:500,cursor:'pointer'}}>누적 초기화</button>
          </div>
        </div>
      </div>}

    </div>
  </>
}
