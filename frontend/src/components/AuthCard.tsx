import React, { useState } from 'react'
import { Paper, Typography, Stack, TextField, Button, Tabs, Tab } from '@mui/material'
import { Auth, setToken } from '../api'

export default function AuthCard({ onAuthed }:{ onAuthed: ()=>void }){
  const [tab, setTab] = useState(0)
  const [email, setEmail] = useState('demo@demo.com')
  const [password, setPassword] = useState('demo')
  const [loading, setLoading] = useState(false)

  async function submitSignIn(){
    setLoading(true)
    try {
      const r = await Auth.login(email, password)
      setToken(r.access_token, r.refresh_token)
      onAuthed()
    } catch(e){ alert('Sign in failed') }
    setLoading(false)
  }
  async function submitSignUp(){
    setLoading(true)
    try { await Auth.register(email, password); await submitSignIn() } 
    catch(e){ alert('Sign up failed') }
    setLoading(false)
  }

  return (
    <Paper sx={{ p:2 }}>
      <Tabs value={tab} onChange={(_,v)=>setTab(v)} sx={{ mb:2 }}>
        <Tab label="Sign in" /><Tab label="Sign up" />
      </Tabs>
      <Typography variant="h6" gutterBottom>{tab===0?'Sign in':'Create account'}</Typography>
      <Stack direction="row" spacing={2}>
        <TextField label="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <TextField label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {tab===0 ? (
          <Button variant="contained" disabled={loading} onClick={submitSignIn}>Sign in</Button>
        ) : (
          <Button variant="contained" disabled={loading} onClick={submitSignUp}>Sign up</Button>
        )}
      </Stack>
    </Paper>
  )
}
