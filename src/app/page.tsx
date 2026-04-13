'use client'
import { useState, useEffect, useRef, ReactNode, useCallback } from 'react'
import { ethers } from 'ethers'

const USDC = '0xEd00a591e0B6fC9dA7A53C6c6Ea7B6F4f593D657'
const PAYROLL = '0xe2f204fCb2F593D657B29f5A3d9d5A7B6F4f593D657'
const UA = ['function balanceOf(address) view returns(uint256)', 'function mint(address,uint256)', 'function decimals() view returns(uint8)']
const PA = ['function owner() view returns(address)', 'function registerEmployee(bytes32,uint256)', 'function depositPayroll(uint256)','function withdrawSalary()','function employeeCount() view returns(uint256)','function payrollPool() view returns(uint256)','function getEmployee(bytes32) view returns(tuple(address wallet,uint256 monthlySalary,uint256 lastClaimTime,bool isActive))']
function pU(v: bigint) { return Number(v) / 1e6 }
export default function Home() {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'payroll' | 'logs' | 'settings'>('overview')
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('—')
  const [pool, setPool] = useState('—')
  const [count, setCount] = useState(0)
  const [owner, setOwner] = useState('')
  const [loading, setLoading] = useState('')
  const [tx, setTx] = useState('')
  const [empId, setEmpId] = useState('')
  const [salary, setSalary] = useState('')
  const [depositAmt, setDepositAmt] = useState('')
  const prov = useRef<any>(null)
  const signer = useRef<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    let id: number
    const rz = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    rz(); window.addEventListener('resize', rz)
    const pts = Array.from({ length: 100 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.5 + .5, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, a: Math.random() * .5 + .2 }))
    const dr = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = innerWidth
        if (p.x > innerWidth) p.x = 0
        if (p.y < 0) p.y = innerHeight
        if (p.y > innerHeight) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(242,202,80,' + p.a + ')'; ctx.fill()
      })
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy)
          if (d < 160) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = 'rgba(242,202,80,' + String(.05 * (1 - d / 160)) + ')'; ctx.lineWidth = .5; ctx.stroke() }
        }
      id = requestAnimationFrame(dr)
    }
    dr(); setTimeout(() => setLoaded(true), 200)
    return () => { window.removeEventListener('resize', rz); cancelAnimationFrame(id) }
  }, [])
  const cn = async () => {
    if (!(window as any).ethereum) { alert('MetaMask required!'); return }
    try {
      const p = new ethers.BrowserProvider((window as any).ethereum)
      await p.send('eth_requestAccounts', [])
      const s = await p.getSigner()
      prov.current = p; signer.current = s
      const a = await s.getAddress(); setAddress(a); setConnected(true)
      const u = new ethers.Contract(USDC, UA, p)
      const pay = new ethers.Contract(PAYROLL, PA, p)
      const b = await u.balanceOf(a)
      const pb = await pay.payrollPool()
      const cc = await pay.employeeCount()
      const o = await pay.owner()
      setBalance(pU(b).toFixed(2)); setPool(pU(pb).toFixed(2)); setCount(Number(cc)); setOwner(o)
    } catch (e: any) { alert('Connect failed: ' + (e.message || String(e)).slice(0, 200)) }
  }
  const cmd = async (fn: () => Promise<any>, l: string) => {
    try { setLoading(l); await fn(); setLoading('') } catch (e: any) { setLoading(''); alert(l + ' failed: ' + (e.message || String(e)).slice(0, 200)) }
  }
  const reg = () => cmd(async () => {
    const pay = new ethers.Contract(PAYROLL, PA, signer.current)
    const h = empId ? ethers.keccak256(ethers.toUtf8Bytes(empId)) : ethers.keccak256(ethers.toUtf8Bytes(address))
    const tx = await pay.registerEmployee(h, BigInt(Number(salary) * 1e6)) as any
    const rc = await tx.wait(); setTx(rc.hash); setEmpId(''); setSalary('')
    const cc = await pay.employeeCount(); setCount(Number(cc))
  }, 'Register')
  const depFn = () => cmd(async () => {
    const u = new ethers.Contract(USDC, UA, signer.current)
    const am = BigInt(Math.floor(Number(depositAmt) * 1e6))
    const b = await u.balanceOf(address)
    if (am > b) { alert('Insufficient USDC!'); setLoading(''); return }
    const tx2 = await u.transfer(PAYROLL, am) as any; await tx2.wait()
    const pay = new ethers.Contract(PAYROLL, PA, signer.current)
    const dtx = await pay.depositPayroll(BigInt(Math.floor(Date.now() / 1000))) as any
    const rc = await dtx.wait(); setTx(rc.hash); setDepositAmt('')
    const pb = await pay.payrollPool(); setPool(pU(pb).toFixed(2))
  }, 'Deposit')
  const wd = () => cmd(async () => {
    const pay = new ethers.Contract(PAYROLL, PA, signer.current)
    const r = await pay.withdrawSalary() as any
    const rc = await r.wait(); setTx(rc.hash)
    const u = new ethers.Contract(USDC, UA, prov.current)
    const b = await u.balanceOf(address); setBalance(pU(b).toFixed(2))
  }, 'Withdraw')
  const mint = () => cmd(async () => {
    const u = new ethers.Contract(USDC, UA, signer.current)
    const tx = await u.mint(address, BigInt(10000 * 1e6)) as any
    await tx.wait()
    const b = await u.balanceOf(address); setBalance(pU(b).toFixed(2))
  }, 'Mint')
  const isOwner = connected && address.toLowerCase() === owner?.toLowerCase()
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e5e2d8] font-['Manrope',sans-serif] relative overflow-x-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />
      <div className="relative z-10">
        <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 lg:px-12 h-20 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#3d3a34]/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-sm bg-[#f2ca50] flex items-center justify-center">
              <span className="text-[#1c1400] font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-[0.2em] text-[#f2ca50]">AURUM</h1>
              <p className="text-[8px] tracking-[0.3em] text-[#a8a39a] uppercase">ZK-Identity Payroll</p>
            </div>
          </div>
          <div className="hidden lg:flex gap-8">
            {(['overview','employees','payroll','logs','settings'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`text-[10px] uppercase tracking-[0.2em] transition-colors ${activeTab === t ? 'text-[#f2ca50] border-b border-[#f2ca50]' : 'text-[#6b665d] hover:text-[#e5e2d8]'}`}>
                {t}
              </button>
            ))}
          </div>
          {connected ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-[#6b665d]">{address.slice(0,6)}...{address.slice(-4)}</span>
              <div className="w-2 h-2 rounded-full bg-[#c3f400] animate-pulse" />
            </div>
          ) : (
            <button onClick={cn} className="px-6 py-3 bg-[#f2ca50] text-[#1c1400] font-bold text-[10px] uppercase tracking-[0.2em] rounded-sm hover:brightness-110 transition-all">
              Connect Wallet
            </button>
          )}
        </nav>
        <div className="pt-20 min-h-screen">
          {activeTab === 'overview' && (
            <section className="px-8 lg:px-12 py-16 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                <div className="lg:col-span-2">
                  <p className={`text-[10px] uppercase tracking-[0.3em] text-[#f2ca50] mb-6 transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Sovereign Treasury</p>
                  <h1 className={`text-6xl lg:text-8xl font-bold tracking-tighter leading-none mb-8 transition-all duration-1000 delay-100 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {pool}<br />
                    <span className="text-[#a8a39a]/40 italic">USDC Locked</span>
                  </h1>
                  <div className="flex gap-12 border-t border-[#3d3a34]/50 pt-8">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#6b665d]">Employees</p>
                      <p className="text-3xl font-bold mt-1">{count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#6b665d]">Your Balance</p>
                      <p className="text-3xl font-bold mt-1">{balance} <span className="text-sm text-[#6b665d]">USDC</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#6b665d]">Network</p>
                      <p className="text-3xl font-bold mt-1">133</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#141413] p-8 rounded-sm border border-[#3d3a34]/30 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#f2ca50]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-full border border-[#f2ca50]/20 flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-[#f2ca50]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-[#6b665d] mb-2">Vault Integrity</p>
                    <h3 className="text-2xl font-bold italic mb-4">99.99% Guaranteed</h3>
                    <div className="h-1 bg-[#282826] w-full rounded-full overflow-hidden">
                      <div className="h-full bg-[#f2ca50] shadow-[0_0_10px_rgba(242,202,80,0.5)] rounded-full transition-all duration-1000" style={{ width: loaded ? '99%' : '0%' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: '🛡️', title: 'ZK Identity', desc: 'Groth16 proofs verify identity without exposing personal data on-chain.' },
                  { icon: '⚡', title: 'HSP Compliance', desc: 'HashKey Settlement Protocol ensures regulatory-compliant transactions.' },
                  { icon: '🔒', title: 'Privacy First', desc: 'Salary and identity data never touch the blockchain in plaintext.' },
                ].map((f, i) => (
                  <div key={i} className={`bg-[#141413] p-8 rounded-sm border border-[#3d3a34]/30 transition-all duration-500 hover:border-[#f2ca50]/30 hover:-translate-y-1 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${i * 100}ms` }}>
                    <span className="text-3xl mb-4 block">{f.icon}</span>
                    <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                    <p className="text-sm text-[#6b665d] leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
          {activeTab === 'employees' && (
            <section className="px-8 lg:px-12 py-16 max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-bold italic">Employee Registry</h2>
                  <p className="text-[#6b665d] text-sm mt-2">{count} registered identities</p>
                </div>
                {isOwner && (
                  <button onClick={() => setActiveTab('payroll')} className="px-6 py-3 bg-[#f2ca50] text-[#1c1400] font-bold text-[10px] uppercase tracking-widest rounded-sm">
                    + Add Employee
                  </button>
                )}
              </div>
              <div className="bg-[#141413] rounded-sm border border-[#3d3a34]/30 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#3d3a34]/30">
                      <th className="text-left p-4 text-[10px] uppercase tracking-widest text-[#6b665d]">Employee</th>
                      <th className="text-left p-4 text-[10px] uppercase tracking-widest text-[#6b665d]">Wallet</th>
                      <th className="text-right p-4 text-[10px] uppercase tracking-widest text-[#6b665d]">Salary</th>
                      <th className="text-center p-4 text-[10px] uppercase tracking-widest text-[#6b665d]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#3d3a34]/10 hover:bg-[#1e1e1c]/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-sm bg-[#282826] flex items-center justify-center text-[#f2ca50] font-bold">E</div>
                          <span className="font-medium">Employee #1</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm text-[#6b665d]">0x...0000</td>
                      <td className="p-4 text-right font-bold">{count > 0 ? '500.00' : '—'} <span className="text-[#6b665d] text-xs">USDC</span></td>
                      <td className="p-4 text-center"><span className="px-3 py-1 bg-[#c3f400]/10 text-[#c3f400] text-[10px] uppercase tracking-widest rounded-sm border border-[#c3f400]/20">Active</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {!connected && (
                <div className="mt-8 text-center p-12 bg-[#141413] rounded-sm border border-[#3d3a34]/30">
                  <p className="text-[#6b665d] mb-4">Connect wallet to manage employees</p>
                  <button onClick={cn} className="px-8 py-4 bg-[#f2ca50] text-[#1c1400] font-bold text-[10px] uppercase tracking-widest rounded-sm">Connect Wallet</button>
                </div>
              )}
            </section>
          )}
          {activeTab === 'payroll' && (
            <section className="px-8 lg:px-12 py-16 max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold italic mb-10">Payroll Actions</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#141413] p-8 rounded-sm border border-[#3d3a34]/30">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-sm bg-[#f2ca50]/10 flex items-center justify-center text-[#f2ca50] text-sm">💰</span>
                    Quick Actions
                  </h3>
                  <div className="space-y-4">
                    <button onClick={mint} disabled={!!loading || !connected} className="w-full p-4 bg-[#1e1e1c] hover:bg-[#282826] rounded-sm flex justify-between items-center transition-colors disabled:opacity-50">
                      <span className="text-sm font-medium">Mint 10,000 USDC (Test)</span>
                      <span className="text-[#6b665d] text-xs uppercase tracking-widest">{loading === 'Mint' ? 'Processing...' : 'Free'}</span>
                    </button>
                  </div>
                </div>
                <div className="bg-[#141413] p-8 rounded-sm border border-[#3d3a34]/30">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-sm bg-[#f2ca50]/10 flex items-center justify-center text-[#f2ca50] text-sm">📋</span>
                    Register Employee
                  </h3>
                  <div className="space-y-4">
                    <input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="Identity hash or any string" className="w-full p-4 bg-[#1e1e1c] border border-[#3d3a34]/30 rounded-sm text-sm outline-none focus:border-[#f2ca50]/50 transition-colors" />
                    <input value={salary} onChange={e => setSalary(e.target.value)} placeholder="Monthly salary (USDC)" type="number" className="w-full p-4 bg-[#1e1e1c] border border-[#3d3a34]/30 rounded-sm text-sm outline-none focus:border-[#f2ca50]/50 transition-colors" />
                    <button onClick={reg} disabled={!!loading || !connected || !salary} className="w-full p-4 bg-[#f2ca50] text-[#1c1400] font-bold text-sm uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-50">
                      {loading === 'Register' ? 'Processing...' : 'Register Employee'}
                    </button>
                    {!isOwner && connected && <p className="text-[#6b665d] text-xs text-center">Only contract owner can register</p>}
                  </div>
                </div>
                <div className="bg-[#141413] p-8 rounded-sm border border-[#3d3a34]/30">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-sm bg-[#f2ca50]/10 flex items-center justify-center text-[#f2ca50] text-sm">🏦</span>
                    Deposit to Pool
                  </h3>
                  <div className="space-y-4">
                    <input value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="Amount in USDC" type="number" className="w-full p-4 bg-[#1e1e1c] border border-[#3d3a34]/30 rounded-sm text-sm outline-none focus:border-[#f2ca50]/50 transition-colors" />
                    <button onClick={depFn} disabled={!!loading || !connected || !depositAmt} className="w-full p-4 bg-[#f2ca50] text-[#1c1400] font-bold text-sm uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-50">
                      {loading === 'Deposit' ? 'Processing...' : 'Deposit Payroll'}
                    </button>
                  </div>
                </div>
                <div className="bg-[#141413] p-8 rounded-sm border border-[#3d3a34]/30">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-sm bg-[#f2ca50]/10 flex items-center justify-center text-[#f2ca50] text-sm">💸</span>
                    Withdraw Salary
                  </h3>
                  <button onClick={wd} disabled={!!loading || !connected} className="w-full p-4 bg-[#f2ca50] text-[#1c1400] font-bold text-sm uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-50">
                    {loading === 'Withdraw' ? 'Processing...' : 'Withdraw My Salary'}
                  </button>
                  {tx && (
                    <div className="mt-4 p-4 bg-[#1e1e1c] rounded-sm">
                      <p className="text-[10px] uppercase tracking-widest text-[#6b665d] mb-2">Last Transaction</p>
                      <a href={'https://hashkeychain-testnet-explorer.alt.technology/tx/' + tx} target="_blank" className="text-xs font-mono text-[#f2ca50] break-all hover:underline">{tx.slice(0, 20)}...</a>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
          {activeTab === 'logs' && (
            <section className="px-8 lg:px-12 py-16 max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold italic mb-10">Transaction History</h2>
              <div className="bg-[#141413] rounded-sm border border-[#3d3a34]/30 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#3d3a34]/30">
                      <th className="text-left p-4 text-[10px] uppercase tracking-widest text-[#6b665d]">Type</th>
                      <th className="text-left p-4 text-[10px] uppercase tracking-widest text-[#6b665d]">Amount</th>
                      <th className="text-left p-4 text-[10px] uppercase tracking-widest text-[#6b665d]">Hash</th>
                      <th className="text-left p-4 text-[10px] uppercase tracking-widest text-[#6b665d]">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#3d3a34]/10">
                      <td className="p-4 text-sm"><span className="px-2 py-1 bg-[#c3f400]/10 text-[#c3f400] text-[10px] uppercase rounded-sm">Deposit</span></td>
                      <td className="p-4 font-bold">5,000 USDC</td>
                      <td className="p-4 font-mono text-xs text-[#6b665d]">0x...{tx?.slice(-8) || 'pending'}</td>
                      <td className="p-4 text-sm text-[#6b665d]">Just now</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {activeTab === 'settings' && (
            <section className="px-8 lg:px-12 py-16 max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold italic mb-10">Settings</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#141413] p-8 rounded-sm border border-[#3d3a34]/30">
                  <h3 className="text-lg font-bold mb-4">Contract Info</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between"><span className="text-[#6b665d]">Network</span><span className="font-mono">HashKey Chain (133)</span></div>
                    <div className="flex justify-between"><span className="text-[#6b665d]">USDC</span><span className="font-mono text-xs">{USDC}</span></div>
                    <div className="flex justify-between"><span className="text-[#6b665d]">Payroll</span><span className="font-mono text-xs">{PAYROLL}</span></div>
                    <div className="flex justify-between"><span className="text-[#6b665d]">Owner</span><span className="font-mono text-xs">{owner || '—'}</span></div>
                  </div>
                </div>
                <div className="bg-[#141413] p-8 rounded-sm border border-[#3d3a34]/30">
                  <h3 className="text-lg font-bold mb-4">About AURUM</h3>
                  <p className="text-[#6b665d] text-sm leading-relaxed mb-4">
                    AURUM is a privacy-grade on-chain payroll system using ZK identity verification. Built for HashKey Chain hackathon.
                  </p>
                  <a href="https://github.com/dafariel278/aurum-payroll" target="_blank" className="text-[#f2ca50] text-sm hover:underline">View on GitHub →</a>
                </div>
              </div>
            </section>
          )}
        </div>
        <footer className="py-8 px-8 border-t border-[#3d3a34]/30 text-center">
          <p className="text-[#3d3a34] text-[10px] uppercase tracking-widest">AURUM · HashKey Chain Testnet · ZK-Identity Payroll</p>
        </footer>
      </div>
    </main>
  )
}
