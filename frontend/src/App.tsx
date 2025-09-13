import React, { useEffect, useState } from 'react'
import { ThemeProvider, createTheme, CssBaseline, Container, AppBar, Toolbar, Typography, Button, Box, Stack } from '@mui/material'
import { setToken, Profile as ProfileAPI, Items } from './api'
import AuthCard from './components/AuthCard'
import ProfileForm from './components/ProfileForm'
import Inventory from './components/Inventory'
import RecipesPane from './components/RecipesPane'

const theme = createTheme()

export default function App() {
  const [authed, setAuthed] = useState<boolean>(!!(typeof window !== 'undefined' && localStorage.getItem('access_token')))
  const [items, setItems] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [recipes, setRecipes] = useState<any[]>([])

  async function refresh(){
    const [p, its] = await Promise.all([ProfileAPI.get(), Items.list()])
    setProfile(p); setItems(its)
  }

  useEffect(()=>{ if (authed) refresh() }, [authed])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky"><Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>🥕 Pantry Bravo</Typography>
        {authed ? <Button color="inherit" onClick={()=>{ setToken(null, null); setAuthed(false) }}>Logout</Button> : null}
      </Toolbar></AppBar>
      <Container sx={{ my:3 }}>
        {!authed ? (
          <AuthCard onAuthed={()=>setAuthed(true)} />
        ) : (
          <Box>
            <Stack direction={{ xs:'column', md:'row' }} spacing={2}>
              <Inventory items={items} refresh={refresh} />
              <ProfileForm profile={profile} setProfile={setProfile} />
              <RecipesPane recipes={recipes} setRecipes={setRecipes} />
            </Stack>
          </Box>
        )}
      </Container>
    </ThemeProvider>
  )
}
