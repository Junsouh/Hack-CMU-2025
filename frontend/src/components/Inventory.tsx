import React, { useState } from 'react'
import { Paper, Typography, Stack, TextField, Button, Box, Chip, MenuItem, Select, InputLabel, FormControl } from '@mui/material'
import { Items } from '../api'
import Scanner from './Scanner'

export default function Inventory({ items, refresh }:{ items:any[]; refresh:()=>Promise<void> }){
  const [name, setName] = useState('')
  const [location, setLocation] = useState('fridge')

  async function addQuick(){
    if (!name) return
    await Items.add({ name, location })
    setName('')
    await refresh()
  }
  async function onScan(code:string){
    const meta = await Items.scan(code)
    await Items.add({ name: meta.name || 'Unknown', barcode: code, location: 'fridge', calories_per_unit: meta.calories_per_unit })
    await refresh()
  }

  return (
    <Paper sx={{ p:2, flex:1 }}>
      <Typography variant="h6">Inventory</Typography>
      <Stack spacing={1} direction="row" sx={{ my:1 }}>
        <TextField label="Item name" value={name} onChange={e=>setName(e.target.value)} />
        <FormControl sx={{ minWidth:140 }}>
          <InputLabel>Location</InputLabel>
          <Select label="Location" value={location} onChange={e=>setLocation(e.target.value)}>
            <MenuItem value="fridge">Fridge</MenuItem>
            <MenuItem value="freezer">Freezer</MenuItem>
            <MenuItem value="pantry">Pantry</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" onClick={addQuick}>Add</Button>
      </Stack>
      <Box sx={{ maxHeight: 260, overflow:'auto', border:'1px solid #eee', borderRadius:1 }}>
        {items.map(it => (
          <Box key={it.id} sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', py:0.75, px:1, borderBottom:'1px solid #f3f3f3' }}>
            <span>{it.name}</span>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={it.location} />
              {typeof it.sustainability_score === 'number' ? <Chip size="small" label={`S:${it.sustainability_score}`} /> : null}
              <Button size="small" color="error" onClick={async()=>{ await Items.del(it.id); await refresh() }}>Delete</Button>
            </Stack>
          </Box>
        ))}
      </Box>
      <Typography variant="subtitle2" sx={{ mt:2 }}>Scan barcode</Typography>
      <Scanner onScan={onScan} />
    </Paper>
  )
}
