import React, { useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function Scanner({ onScan }:{ onScan:(code:string)=>void }){
  useEffect(()=>{
    const scanner = new Html5QrcodeScanner('reader', { fps:10, qrbox:200 }, false)
    scanner.render((dec:any)=>{ onScan(dec); scanner.clear() }, ()=>{})
    return ()=>{ scanner.clear().catch(()=>{}) }
  }, [])
  return <div id="reader" />
}
