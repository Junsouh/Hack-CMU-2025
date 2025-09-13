import React from 'react'
import { Paper, Typography, Button, Box } from '@mui/material'
import { Recipes } from '../api'

export default function RecipesPane({ recipes, setRecipes }:{ recipes:any[], setRecipes:(r:any[])=>void }){
  async function load(){
    const r = await Recipes.suggest()
    setRecipes(r)
  }
  return (
    <Paper sx={{ p:2, flex:1 }}>
      <Typography variant="h6">Recipes</Typography>
      <Button variant="contained" onClick={load}>Suggest</Button>
      <Box sx={{ maxHeight: 300, overflow:'auto', mt:1 }}>
        {recipes.map((r:any,i:number)=>(
          <Box key={i} sx={{ py:0.75, borderBottom:'1px solid #eee' }}>
            <strong>{r.title}</strong><br/>
            <small>{(r.ingredients||[]).join(', ')}</small>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
