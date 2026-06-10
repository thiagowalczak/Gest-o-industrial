import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const u = localStorage.getItem('usuario')
    if (token && u) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUsuario(JSON.parse(u))
    }
    setCarregando(false)
  }, [])

  const login = async (email, senha) => {
    const form = new FormData()
    form.append('username', email)
    form.append('password', senha)
    const { data } = await api.post('/auth/login', form)
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
    setUsuario(data.usuario)
    return data.usuario
  }

  const cadastrar = async (empresaNome, nome, email, senha) => {
    const { data } = await api.post('/auth/cadastro', {
      empresa_nome: empresaNome,
      nome,
      email,
      senha,
    })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
    setUsuario(data.usuario)
    return data.usuario
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    delete api.defaults.headers.common['Authorization']
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, login, cadastrar, logout, carregando }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
