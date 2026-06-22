import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [carregando, setCarregando] = useState(true)

  const carregarEmpresa = async () => {
    try {
      const { data } = await api.get('/empresa/')
      setEmpresa(data)
    } catch {
      // backend offline ou rota indisponível — onboarding não é forçado nesse caso
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const u = localStorage.getItem('usuario')
    if (token && u) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUsuario(JSON.parse(u))
      carregarEmpresa()
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
    await carregarEmpresa()
    return data.usuario
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    delete api.defaults.headers.common['Authorization']
    setUsuario(null)
    setEmpresa(null)
  }

  const concluirOnboarding = async () => {
    const { data } = await api.post('/empresa/onboarding/concluir')
    setEmpresa(data)
  }

  return (
    <AuthContext.Provider value={{ usuario, empresa, login, logout, carregando, concluirOnboarding, recarregarEmpresa: carregarEmpresa }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
