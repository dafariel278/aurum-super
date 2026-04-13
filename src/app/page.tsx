'use client'
import { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'

const USDC = '0xEd00a591e0B6fC9dA7A53C6c6Ea7B6F4f593D657'
const PAYROLL = '0xe2f204fCb2F593D657B29f5A3d9d5A7B6F4f593D657'
const UA = ['function balanceOf(address) view returns(uint256)','function mint(address,uint256)','function transfer(address,uint256) returns(bool)']
const PA = ['function owner() view returns(address)','function registerEmployee(bytes32,address,uint256)','function depositPayroll(uint256)','function withdrawSalary()','function employeeCount() view returns(uint256)','function payrollPool() view returns(uint256)']

function pU(v: bigint) { return Number(v)/1e6 }

export default function Home(){
  const[connected,setConnected]=useState(false)
  const[addr,setAddr]=useState('')
  const[bal,setBal]=useState('—')
  const[pool,setPool]=useState('0.00')
  const[cnt,setCnt]=useState(0)
  const[load,setLoad]=useState('')
  const[tab,setTab]=useState('overview')
  const[eh,setEh]=useState('')
  const[sal,setSal]=useState('')
  const[dep,setDep]=useState('')
  const prov=useRef<any>(null)
  const signer=useRef<any>(null)
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const[loaded,setLoaded]=useState(false)

  useEffect(()=>{
    const canvas=canvasRef.current
    if(!canvas)return
    const ctx=canvas.getContext('2d')!
    let animId:number
    const resize=()=>{canvas.width=innerWidth;canvas.height=innerHeight}
    resize();window.addEventListener('resize',resize)
    const pts=Array.from({length:80},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.5+.5,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,a:Math.random()*.5+.2}))
    const draw=()=>{
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
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,dist=Math.sqrt(dx*dx+dy*dy)
        if(dist<150){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle='rgba(242,202,80,'+String(.04*(1-dist/150))+')';ctx.lineWidth=.5;ctx.stroke()}
      }
      animId=requestAnimationFrame(draw)
    }
    draw();setTimeout(()=>setLoaded(true),100)
    return()=>{window.removeEventListener('resize',resize);cancelAnimationFrame(animId)}
  },[])

  const connect=async()=>{
    if(!(window as any).ethereum){alert('MetaMask required');return}
    try{
      const provider=new ethers.BrowserProvider((window as any).ethereum)
      await provider.send('eth_requestAccounts',[])
      const s=await provider.getSigner()
      prov.current=provider;signer.current=s
      const a=await s.getAddress();setAddr(a);setConnected(true)
      const usdc=new ethers.Contract(USDC,UA,provider)
      const pay=new ethers.Contract(PAYROLL,PA,provider)
      const b=await usdc.balanceOf(a)
      const pb=await pay.payrollPool()
      const cc=await pay.employeeCount()
      setBal(pU(b).toFixed(2));setPool(pU(pb).toFixed(2));setCnt(Number(cc))
      setTab('overview')
    }catch(e:any){alert('Failed: '+(e.message||e).slice(0,200))}
  }

  const run=async(fn:()=>Promise<void>,label:string)=>{
    try{setLoad(label);await fn();setLoad('')}catch(e:any){setLoad('');alert(label+' failed: '+(e.message||String(e)).slice(0,200))}
  }
  const mint=()=>run(async()=>{const u=new ethers.Contract(USDC,UA,signer.current);await u.mint(addr,BigInt(5000*1e6));const b=await u.balanceOf(addr);setBal(pU(b).toFixed(2))},'Mint')
  const reg=()=>run(async()=>{const pay=new ethers.Contract(PAYROLL,PA,signer.current);const h=eh?ethers.keccak256(ethers.toUtf8Bytes(eh)):ethers.keccak256(ethers.toUtf8Bytes(addr));await pay.registerEmployee(h,addr,BigInt(Number(sal)*1e6));setEh('');setSal('')},'Register')
  const deposit=()=>run(async()=>{const u=new ethers.Contract(USDC,UA,signer.current);const am=BigInt(Math.floor(Number(dep)*1e6));await u.transfer(PAYROLL,am);const pay=new ethers.Contract(PAYROLL,PA,signer.current);const pb=await pay.payrollPool();setPool(pU(pb).toFixed(2));setDep('')},'Deposit')
  const withdraw=()=>run(async()=>{const pay=new ethers.Contract(PAYROLL,PA,signer.current);await pay.withdrawSalary();const u=new ethers.Contract(USDC,UA,prov.current);const b=await u.balanceOf(addr);setBal(pU(b).toFixed(2))},'Withdraw')

  const nav=[{k:'overview',l:'Overview'},{k:'employees',l:'Employees'},{k:'zk',l:'ZK-Verification'},{k:'logs',l:'Payroll Logs'},{k:'settings',l:'Settings'}]
  const btn=(onClick:()=>void,label:string,disabled:boolean)=>(
    <button onClick={onClick} disabled={disabled} style={{background:disabled?'#222':'#f2ca50',color:disabled?'#555':'#0b0b0b',border:'none',padding:'12px 24px',fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',cursor:disabled?'not-allowed':'pointer'}}>
      {load===label?label+'...':label}
    </button>
  )
  const card=(title:string,content:React.ReactNode)=>(
    <div style={{background:'rgba(240,237,232,0.02)',border:'1px solid rgba(242,202,80,0.08)',padding:32}}>
      <h3 style={{fontSize:11,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',marginBottom:20,color:'rgba(240,237,232,0.6)'}}>{title}</h3>
      {content}
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0b0b0b',color:'#f0ede8',fontFamily:"'Inter',sans-serif",position:'relative',overflowX:'hidden'}}>
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:0,opacity:0.3,pointerEvents:'none'}} />

      <aside style={{position:'fixed',left:0,top:0,height:'100%',width:280,background:'#111',borderRight:'1px solid rgba(242,202,80,0.08)',zIndex:40,padding:'40px 0',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'0 32px 48px'}}>
          <h2 style={{fontSize:22,fontWeight:700,color:'#f2ca50',letterSpacing:'.15em'}}>AURUM</h2>
          <p style={{fontSize:9,color:'rgba(240,237,232,0.4)',letterSpacing:'.2em',textTransform:'uppercase',marginTop:4}}>ZK-Identity Payroll</p>
        </div>
        <nav style={{flex:1,display:'flex',flexDirection:'column',gap:2}}>
          {nav.map((n)=>(
            <button key={n.k} onClick={()=>setTab(n.k)} style={{display:'flex',alignItems:'center',gap:16,padding:'14px 32px',color:tab===n.k?'#f2ca50':'rgba(240,237,232,0.4)',background:tab===n.k?'rgba(242,202,80,0.06)':'transparent',borderRight:tab===n.k?'2px solid #f2ca50':'2px solid transparent',border:'none',borderTop:'none',borderBottom:'none',cursor:'pointer',fontSize:11,letterSpacing:'.12em',textTransform:'uppercase',textAlign:'left',transition:'all 0.2s',width:'100%'}}>
              {n.l}
            </button>
          ))}
        </nav>
        <div style={{padding:'0 32px'}}>
          <button onClick={()=>connected&&setTab('overview')} style={{width:'100%',padding:'14px',background:connected?'#f2ca50':'#333',color:connected?'#0b0b0b':'#666',border:'none',fontSize:10,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',cursor:connected?'pointer':'not-allowed'}}>
            Initiate Payout
          </button>
        </div>
      </aside>

      <main style={{marginLeft:280,minHeight:'100vh',position:'relative',zIndex:10}}>
        <header style={{position:'sticky',top:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 48px',background:'rgba(11,11,11,0.85)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(242,202,80,0.08)',zIndex:30}}>
          <h1 style={{fontSize:18,fontStyle:'italic',color:'#f2ca50',letterSpacing:'-.02em'}}>Sovereign Ledger</h1>
          {!connected?<button onClick={connect} style={{background:'#f2ca50',color:'#0b0b0b',border:'none',padding:'10px 24px',fontSize:10,fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',cursor:'pointer'}}>Connect Wallet</button>:<span style={{fontSize:11,color:'rgba(240,237,232,0.5)',fontFamily:'monospace'}}>{addr.slice(0,6)}...{addr.slice(-4)}</span>}
        </header>

        <div style={{padding:'48px',maxWidth:1400}}>
          <div style={{marginBottom:48,opacity:loaded?1:0,transform:loaded?'translateY(0)':'translateY(20px)',transition:'all 0.8s'}}>
            <p style={{fontSize:9,letterSpacing:'.3em',color:'#f2ca50',textTransform:'uppercase',marginBottom:16}}>Sovereign Treasury</p>
            <h2 style={{fontSize:'clamp(48px,6vw,80px)',fontWeight:800,letterSpacing:'-.04em',lineHeight:1}}>{pool}<span style={{fontSize:'40px',color:'rgba(240,237,232,0.25)',fontWeight:300}}>.00</span> <span style={{fontSize:14,color:'rgba(240,237,232,0.3)',marginLeft:16,textTransform:'uppercase',letterSpacing:'.1em'}}>USDC</span></h2>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20,marginBottom:48}}>
            {[{l:'Your USDC',v:bal+' USDC'},{l:'Payroll Pool',v:pool+' USDC'},{l:'Employees',v:String(cnt)},{l:'Network',v:'HashKey 133'}].map((s,i)=>(
              <div key={i} style={{background:'rgba(240,237,232,0.02)',border:'1px solid rgba(242,202,80,0.08)',padding:28}}>
                <p style={{fontSize:9,color:'rgba(240,237,232,0.4)',letterSpacing:'.2em',textTransform:'uppercase',marginBottom:12}}>{s.l}</p>
                <p style={{fontSize:26,fontWeight:700,color:'#f2ca50'}}>{s.v}</p>
              </div>
            ))}
          </div>

          {card('Quick Actions',<div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{btn(mint,'Mint',!connected||!!load)}</div>)}
          {card('Register Employee',<div style={{display:'flex',gap:12}}><input value={eh} onChange={e=>setEh(e.target.value)} placeholder="Identity string" style={{flex:1,background:'rgba(240,237,232,0.05)',border:'1px solid rgba(242,202,80,0.15)',color:'#f0ede8',padding:'12px 16px',fontSize:12,outline:'none',fontFamily:"'Inter',sans-serif"}} /><input value={sal} onChange={e=>setSal(e.target.value)} placeholder="Salary USDC" type="number" style={{width:140,background:'rgba(240,237,232,0.05)',border:'1px solid rgba(242,202,80,0.15)',color:'#f0ede8',padding:'12px 16px',fontSize:12,outline:'none',fontFamily:"'Inter',sans-serif"}} />{btn(reg,'Register',!connected||!sal||!!load)}</div>)}
          {card('Deposit Payroll',<div style={{display:'flex',gap:12}}><input value={dep} onChange={e=>setDep(e.target.value)} placeholder="Amount USDC" type="number" style={{flex:1,background:'rgba(240,237,232,0.05)',border:'1px solid rgba(242,202,80,0.15)',color:'#f0ede8',padding:'12px 16px',fontSize:12,outline:'none',fontFamily:"'Inter',sans-serif"}} />{btn(deposit,'Deposit',!connected||!dep||!!load)}</div>)}
          {card('Withdraw Salary',btn(withdraw,'Withdraw',!connected||!!load))}
        </div>
      </main>
    </div>
  )
}
