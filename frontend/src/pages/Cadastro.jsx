import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Factory, Eye, EyeOff } from 'lucide-react'

export default function Cadastro() {
  const [empresaNome, setEmpresaNome] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const { cadastrar } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setCarregando(true)
    try {
      await cadastrar(empresaNome, nome, email, senha)
      navigate('/')
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao criar a conta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Factory size={32} className="text-primary-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Gestão Industrial</h1>
          <p className="text-primary-100 mt-1 text-sm">Crie a conta da sua empresa</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Criar conta gratuita</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome da empresa</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Indústria ABC Ltda"
                value={empresaNome}
                onChange={e => setEmpresaNome(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Seu nome</label>
              <input
                type="text"
                className="input"
                placeholder="Seu nome completo"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="btn-primary w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {carregando ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
