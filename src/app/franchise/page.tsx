'use client'
import {useState,useEffect} from 'react'
import {createClient} from '@/lib/supabase/client'
import './portal.css'

export default function FranchisePortal(){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const [account,setAccount]=useState<{email?:string}|null>(null)
 const configured=!!process.env.NEXT_PUBLIC_SUPABASE_URL&&!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 useEffect(()=>{
  fetch('/api/franchise/session',{cache:'no-store'}).then(r=>r.json()).then(d=>setAccount(d.user)).catch(()=>setMessage('Accountstatus kon niet worden geladen.'))
  if(new URLSearchParams(location.search).has('login'))setMessage('Inloggen is niet voltooid. Probeer het opnieuw.')
 },[])
 async function google(){
  setBusy(true)
  try{
   const {error}=await createClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/franchise/auth'}})
   if(error)throw error
  }catch(e){setMessage(e instanceof Error?e.message:'Inloggen mislukt');setBusy(false)}
 }
 return <section className="franchise-portal"><div className="franchise-access">
  <img src="/franchise/Assets/Logos/league.png" alt="Honkbal Hoofdklasse" width="220" height="154"/>
  <h1>BUILD A DYNASTY.</h1><p>Jouw club. Jouw carrière. Opgeslagen in je account.</p>
  {account?<>
   <p>Ingelogd als {account.email}</p>
   <a className="franchise-enter" href="/franchise/game.html">DOORGAAN NAAR FRANCHISE →</a>
   <button onClick={async()=>{const {error}=await createClient().auth.signOut();if(error)setMessage(error.message);else setAccount(null)}}>Uitloggen</button>
  </>:<>
   <p>Log in met Google om je drie carrièreslots op verschillende apparaten te gebruiken.</p>
   <button className="franchise-enter" disabled={busy||!configured} onClick={google}>{busy?'INLOGGEN…':'DOORGAAN MET GOOGLE'}</button>
   {!configured&&<p>Accountopslag wordt nog aangesloten. Je kunt lokaal spelen en saves downloaden.</p>}
   <a href="/franchise/game.html">SPELEN ALS GAST →</a>
   <p>Als gast sla je op in deze browser. Download je save om hem later in je account te importeren.</p>
  </>}
  <p role="status">{message}</p><a href="/">Terug naar Honkbal Hoofdklasse</a>
 </div></section>
}
