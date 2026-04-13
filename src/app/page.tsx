'use client'
import { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'

const USDC = '0xEd00a591e0B6fC9dA7A53C6c6Ea7B6F4f593D657'
const PAYROLL = '0xe2f204fCb2F593D657B29f5A3d9d5A7B6F4f593D657'
const UA = ['function balanceOf(address) view returns(uint256)','function mint(address,uint256)','function transfer(address,uint256) returns(bool)']
const PA = ['function owner() view returns(address)','function registerEmployee(bytes32,address,uint256)','function depositPayroll(uint256)','function withdrawSalary()','function employeeCount() view returns(uint256)','function payrollPool() view returns(uint256)','function getEmployee(bytes32) view returns(tuple(address wallet,bytes32 identityHash,uint256 salary,uint256 lastPayroll,bool isActive))','function getActiveEmployeeCount() view returns(uint256)']

function pU(v: bigint) { return Number(v)/1e6 }

export default function Home(){
  const[c,setC]=useState(false)
  const[addr,setA]=useState('')
  const[bal,setBal]=useState('—')
  const[pool,setPool]=useState('0.00')
  const[cnt,setCnt]=useState(0)
  const[owner,setOwner]=useState('')
  const[load,setLoad]=useState('')
  const[tab,setTab]=useState<'l'|'d'>('l')
  const[eh,setEh]=useState('')
  const[sal,setSal]=useState('')
  const[dep,setDep]=useState('')
  const[tx,setTx]=useState('')
  const prov=useRef<any>(null)
  const signer=useRef<any>(null)
  const cv=useRef<HTMLCanvasElement>(null)
  const[ld,setLd]=useState(false)

  useEffect(()=>{
    const c=cv.current
    if(!c)return
    const ctx=c.getContext('2d')!
    let id:number
    const rz=()=>{c.width=innerWidth;c.height=innerHeight}
    rz();window.addEventListener('resize',rz)
    const pts=Array.from({length:80},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.5+.5,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,a:Math.random()*.5+.2}))
    const dr=()=>{
      ctx.clearRect(0,0,innerWidth,innerHeight)
      pts.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy
        if(p.x<0)p.x=innerWidth
        if(p.x>innerWidth)p.x=0
        if(p.y<0)p.y=innerHeight
        if(p.y>innerHeight)p.y=0
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle='rgba(242,202,80,'+p.a+')';ctx.fill()
      })
      for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy)
        if(d<150){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle='rgba(242,202,80,'+String(.04*(1-d/150))+')';ctx.lineWidth=.5;ctx.stroke()}
      }
      id=requestAnimationFrame(dr)
    }
    dr();setTimeout(()=>setLd(true),100)
    return()=>{window.removeEventListener('resize',rz);cancelAnimationFrame(id)}
  },[])

  const cn=async()=>{
    if(!(window as any).ethereum){alert('MetaMask required');return}
    try{
      const p=new ethers.BrowserProvider((window as any).ethereum)
      await p.send('eth_requestAccounts',[])
      const s=await p.getSigner()
      prov.current=p;signer.current=s
      const a=await s.getAddress();setA(a);setC(true)
      const u=new ethers.Contract(USDC,UA,p)
      const pay=new ethers.Contract(PAYROLL,PA,p)
      const b=await u.balanceOf(a)
      const pb=await pay.payrollPool()
      const cc=await pay.employeeCount()
      const o=await pay.owner()
      setBal(pU(b).toFixed(2));setPool(pU(pb).toFixed(2));setCnt(Number(cc));setOwner(o)
      setTab('d')
    }catch(e:any){alert('Failed: '+(e.message||e).slice(0,200))}
  }

  const cmd=async(fn:()=>Promise<any>,l:string)=>{
    try{setLoad(l);await fn();setLoad('')}catch(e:any){setLoad('');alert(l+' failed: '+(e.message||String(e)).slice(0,200))}
  }

  const reg=()=>cmd(async()=>{
    const pay=new ethers.Contract(PAYROLL,PA,signer.current)
    const h=eh?ethers.keccak256(ethers.toUtf8Bytes(eh)):ethers.keccak256(ethers.toUtf8Bytes(addr))
    const r=await pay.registerEmployee(h,addr,BigInt(Number(sal)*1e6))
    const rc=await r.wait();setTx(rc.hash);setEh('');setSal('')
    const cc=await pay.employeeCount();setCnt(Number(cc))
  },'Register')

  const depFn=()=>cmd(async()=>{
    const u=new ethers.Contract(USDC,UA,signer.current)
    const am=BigInt(Math.floor(Number(dep)*1e6))
    const b=await u.balanceOf(addr)
    if(am>b){alert('Insufficient USDC');setLoad('');return}
    const tx=await u.transfer(PAYROLL,am);await tx.wait()
    const pay=new ethers.Contract(PAYROLL,PA,signer.current)
    const pb=await pay.payrollPool();setPool(pU(pb).toFixed(2));setDep('');setTx(tx.hash)
  },'Deposit')

  const wd=()=>cmd(async()=>{
    const pay=new ethers.Contract(PAYROLL,PA,signer.current)
    const r=await pay.withdrawSalary()
    const rc=await r.wait();setTx(rc.hash)
    const u=new ethers.Contract(USDC,UA,prov.current)
    const b=await u.balanceOf(addr);setBal(pU(b).toFixed(2))
  },'Withdraw')

  const mint=()=>cmd(async()=>{
    const u=new ethers.Contract(USDC,UA,signer.current)
    const tx=await u.mint(addr,BigInt(5000*1e6));await tx.wait()
    const b=await u.balanceOf(addr);setBal(pU(b).toFixed(2))
  },'Mint')

  return (
    <div style={{minHeight:'100vh',background:'#0b0b0b',color:'#f0ede8',fontFamily:"'Inter',sans-serif",position:'relative',overflowX:'hidden'}}>
      <canvas ref={cv} style={{position:'fixed',inset:0,zIndex:0,opacity:0.5}} />

      <aside style={{position:'fixed',left:0,top:0,height:'100%',width:280,background:'#111',borderRight:'1px solid rgba(242,202,80,0.08)',zIndex:40,padding:'40px 0',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'0 32px 48px'}}>
          <h2 style={{fontSize:22,fontWeight:700,color:'#f2ca50',letterSpacing:'.15em'}}>AURUM</h2>
          <p style={{fontSize:9,color:'rgba(240,237,232,0.4)',letterSpacing:'.2em',textTransform:'uppercase',marginTop:4}}>ZK-Identity Payroll</p>
        </div>
        <nav style={{flex:1,display:'flex',flexDirection:'column',gap:2}}>
          {['Overview','Employees','ZK-Verification','Payroll Logs','Settings'].map((l,i)=>(
            <a key={i} href="#" style={{display:'flex',alignItems:'center',gap:16,padding:'14px 32px',color:i===1?'#f2ca50':'rgba(240,237,232,0.4)',background:i===1?'rgba(242,202,80,0.06)':'none',borderRight:i===1?'2px solid #f2ca50':'2px solid transparent',textDecoration:'none',fontSize:11,letterSpacing:'.12em',textTransform:'uppercase',transition:'all 0.2s'}}>
              {l}
            </a>
          ))}
        </nav>
        <div style={{padding:'0 32px'}}>
          <button style={{width:'100%',padding:'14px',background:'#f2ca50',color:'#0b0b0b',border:'none',fontSize:10,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',cursor:'pointer',marginBottom:24}}>
            Initiate Payout
          </button>
        </div>
      </aside>

      <main style={{marginLeft:280,minHeight:'100vh',position:'relative',zIndex:10}}>
        <header style={{position:'sticky',top:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 48px',background:'rgba(11,11,11,0.85)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(242,202,80,0.08)',zIndex:30}}>
          <div style={{display:'flex',alignItems:'center',gap:32}}>
            <h1 style={{fontSize:18,fontStyle:'italic',color:'#f2ca50',letterSpacing:'-.02em'}}>Sovereign Ledger</h1>
            <nav style={{display:'flex',gap:24}}>
              {['Treasury','Ledger','Compliance'].map((l,i)=>(
                <a key={i} href="#" style={{fontSize:9,letterSpacing:'.15em',textTransform:'uppercase',color:i===1?'#f2ca50':'rgba(240,237,232,0.4)',textDecoration:'none',borderBottom:i===1?'1px solid #f2ca50':'none',paddingBottom:2}}>{l}</a>
              ))}
            </nav>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:20}}>
            {!c ? (
              <button onClick={cn} style={{background:'#f2ca50',color:'#0b0b0b',border:'none',padding:'10px 24px',fontSize:10,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',cursor:'pointer'}}>
                Connect Wallet
              </button>
            ) : (
              <span style={{fontSize:11,color:'rgba(240,237,232,0.5)',fontFamily:'monospace'}}>{addr.slice(0,6)}...{addr.slice(-4)}</span>
            )}
          </div>
        </header>

        <div style={{padding:'48px',maxWidth:1400}}>
          <div style={{marginBottom:48,opacity:ld?1:0,transform:ld?'translateY(0)':'translateY(20px)',transition:'all 0.8s'}}>
            <p style={{fontSize:9,letterSpacing:'.3em',color:'#f2ca50',textTransform:'uppercase',marginBottom:16}}>Sovereign Treasury</p>
            <h2 style={{fontSize:'clamp(48px,6vw,80px)',fontWeight:800,letterSpacing:'-.04em',lineHeight:1}}>
              {pool}<span style={{fontSize:'40px',color:'rgba(240,237,232,0.25)',fontWeight:300}}>.00</span>
              <span style={{fontSize:14,color:'rgba(240,237,232,0.3)',marginLeft:16,textTransform:'uppercase',letterSpacing:'.1em'}}>USDC</span>
            </h2>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20,marginBottom:48}}>
            {[
              {l:'Your USDC',v:bal+' USDC'},
              {l:'Payroll Pool',v:pool+' USDC'},
              {l:'Employees',v:String(cnt)},
              {l:'Network',v:'HashKey 133'},
            ].map((s,i)=>(
              <div key={i} style={{background:'rgba(240,237,232,0.02)',border:'1px solid rgba(242,202,80,0.08)',padding:28,opacity:ld?1:0,transform:ld?'translateY(0)':'translateY(20px)',transition:'all 0.8s '+String(i*0.1)+'s'}}>
                <p style={{fontSize:9,color:'rgba(240,237,232,0.4)',letterSpacing:'.2em',textTransform:'uppercase',marginBottom:12}}>{s.l}</p>
                <p style={{fontSize:26,fontWeight:700,color:'#f2ca50'}}>{s.v}</p>
              </div>
            ))}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div style={{background:'rgba(240,237,232,0.02)',border:'1px solid rgba(242,202,80,0.08)',padding:32}}>
              <h3 style={{fontSize:11,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',marginBottom:20}}>Quick Actions</h3>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <button onClick={mint} disabled={!!load||!c} style={{background:(!c||!!load)?'#222':'#f2ca50',color:(!c||!!load)?'#555':'#0b0b0b',border:'none',padding:'12px 24px',fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',cursor:(!c||!!load)?'not-allowed':'pointer'}}>
                  {load==='Mint'?'Processing...':'Mint 5000 USDC'}
                </button>
              </div>
            </div>

            <div style={{background:'rgba(240,237,232,0.02)',border:'1px solid rgba(242,202,80,0.08)',padding:32}}>
              <h3 style={{fontSize:11,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',marginBottom:20}}>Register Employee (Owner Only)</h3>
              <div style={{display:'flex',gap:12}}>
                <input value={eh} onChange={e=>setEh(e.target.value)} placeholder="Identity hash or string" style={{flex:1,background:'rgba(240,237,232,0.05)',border:'1px solid rgba(242,202,80,0.15)',color:'#f0ede8',padding:'12px 16px',fontSize:12,outline:'none',fontFamily:"'Inter',sans-serif"}} />
                <input value={sal} onChange={e=>setSal(e.target.value)} placeholder="Salary (USDC)" type="number" style={{width:160,background:'rgba(240,237,232,0.05)',border:'1px solid rgba(242,202,80,0.15)',color:'#f0ede8',padding:'12px 16px',fontSize:12,outline:'none',fontFamily:"'Inter',sans-serif"}} />
                <button onClick={reg} disabled={!!load||!sal} style={{background:(!!load||!sal)?'#222':'#f2ca50',color:(!!load||!sal)?'#555':'#0b0b0b',border:'none',padding:'12px 24px',fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',cursor:(!!load||!sal)?'not-allowed':'pointer'}}>
                  {load==='Register'?'Processing...':'Register'}
                </button>
              </div>
            </div>

            <div style={{background:'rgba(240,237,232,0.02)',border:'1px solid rgba(242,202,80,0.08)',padding:32}}>
              <h3 style={{fontSize:11,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',marginBottom:20}}>Deposit to Payroll Pool</h3>
              <div style={{display:'flex',gap:12}}>
                <input value={dep} onChange={e=>setDep(e.target.value)} placeholder="Amount in USDC" type="number" style={{flex:1,background:'rgba(240,237,232,0.05)',border:'1px solid rgba(242,202,80,0.15)',color:'#f0ede8',padding:'12px 16px',fontSize:12,outline:'none',fontFamily:"'Inter',sans-serif"}} />
                <button onClick={depFn} disabled={!!load||!dep} style={{background:(!!load||!dep)?'#222':'#f2ca50',color:(!!load||!dep)?'#555':'#0b0b0b',border:'none',padding:'12px 24px',fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',cursor:(!!load||!dep)?'not-allowed':'pointer'}}>
                  {load==='Deposit'?'Processing...':'Deposit'}
                </button>
              </div>
            </div>

            <div style={{background:'rgba(240,237,232,0.02)',border:'1px solid rgba(242,202,80,0.08)',padding:32}}>
              <h3 style={{fontSize:11,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',marginBottom:20}}>Withdraw Salary</h3>
              <button onClick={wd} disabled={!!load||!c} style={{background:(!c||!!load)?'#222':'#f2ca50',color:(!c||!!load)?'#555':'#0b0b0b',border:'none',padding:'12px 24px',fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',cursor:(!c||!!load)?'not-allowed':'pointer'}}>
                {load==='Withdraw'?'Processing...':'Withdraw My Salary'}
              </button>
            </div>

            {tx&&(<div style={{padding:'16px 24px',background:'rgba(240,237,232,0.02)',border:'1px solid rgba(242,202,80,0.1)'}}>
              <p style={{fontSize:10,color:'rgba(240,237,232,0.4)',letterSpacing:'.1em',marginBottom:8}}>LAST TRANSACTION</p>
              <a href={'https://hashkeychain-testnet-explorer.alt.technology/tx/'+tx} target="_blank" style={{fontSize:11,color:'#f2ca50',wordBreak:'break-all',fontFamily:'monospace'}}>{tx}</a>
            </div>)}
          </div>
        </div>
      </main>
    </div>
  )
}
