import React, { useEffect, useState } from 'react'
import { Paper, Typography, Stack, TextField, Checkbox, FormControlLabel, Button } from '@mui/material'
import { Profile } from '../api'

export default function ProfileForm({ profile, setProfile }:{ profile:any; setProfile:(p:any)=>void }){
  const [name, setName] = useState(profile?.name || 'You')
  const [calories, setCalories] = useState(profile?.calories_target || 2000)
  const [conditions, setConditions] = useState((profile?.conditions||[]).join(', '))
  const [vegan, setVegan] = useState(!!profile?.preferences?.vegan)
  const [vegetarian, setVegetarian] = useState(!!profile?.preferences?.vegetarian)
  const [nutFree, setNutFree] = useState(!!profile?.preferences?.nut_free)
  const [dislikes, setDislikes] = useState((profile?.preferences?.dislikes||[]).join(', '))

  useEffect(()=>{
    setName(profile?.name||'You')
    setCalories(profile?.calories_target||2000)
    setConditions((profile?.conditions||[]).join(', '))
    setVegan(!!profile?.preferences?.vegan)
    setVegetarian(!!profile?.preferences?.vegetarian)
    setNutFree(!!profile?.preferences?.nut_free)
    setDislikes((profile?.preferences?.dislikes||[]).join(', '))
  }, [profile])

  async function save(){
    const payload = {
      name,
      calories_target: Number(calories),
      conditions: conditions.split(',').map(s=>s.trim()).filter(Boolean),
      preferences: {
        vegan, vegetarian, nut_free: nutFree,
        dislikes: dislikes.split(',').map(s=>s.trim()).filter(Boolean)
      }
    }
    await Profile.update(payload)
    const newp = await Profile.get()
    setProfile(newp)
  }

  return (
    <Paper sx={{ p:2, flex:1 }}>
      <Typography variant="h6">Profile</Typography>
      <Stack spacing={1}>
        <TextField label="Name" value={name} onChange={e=>setName(e.target.value)} />
        <TextField label="Daily calories target" value={calories} onChange={e=>setCalories(e.target.value)} />
        <TextField label="Health conditions (comma separated)" value={conditions} onChange={e=>setConditions(e.target.value)} />
        <FormControlLabel control={<Checkbox checked={vegan} onChange={e=>setVegan(e.target.checked)} />} label="Vegan" />
        <FormControlLabel control={<Checkbox checked={vegetarian} onChange={e=>setVegetarian(e.target.checked)} />} label="Vegetarian" />
        <FormControlLabel control={<Checkbox checked={nutFree} onChange={e=>setNutFree(e.target.checked)} />} label="Nut-free" />
        <TextField label="Dislikes (comma separated)" value={dislikes} onChange={e=>setDislikes(e.target.value)} />
        <Button variant="contained" onClick={save}>Save</Button>
      </Stack>
    </Paper>
  )
}
