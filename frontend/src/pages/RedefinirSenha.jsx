import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Factory, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import api from '../services/api'

export default function RedefinirSenha() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    if (novaSenha !== confirmacao) {
      setErro('As senhas não coincidem.')
      return
    }
    if (novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSalvando(true)
    try {
      await api.post('/auth/redefinir-senha', { token, nova_senha: novaSenha })
      setSucesso(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setErro(err.response?.data?.detail || 'Não foi possível redefinir a senha.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Factory size={32} className="text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Gestão Industrial</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!token ? (
            <div className="text-center space-y-3 py-4">
              <p className="font-bold text-gray-800">Link inválido</p>
              <p className="text-sm text-gray-500">Este link de redefinição está incompleto. Solicite um novo.</p>
            </div>
          ) : sucesso ? (
            <div className="text-center space-y-3 py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full">
                <CheckCircle2 size={26} className="text-green-600" />
              </div>
              <p className="font-bold text-gray-800">Senha redefinida!</p>
              <p className="text-sm text-gray-500">Você será redirecionado para o login...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Criar nova senha</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nova senha</label>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      className="input pr-10"
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      required
                      autoFocus
                    />
                    <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                      {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Confirmar nova senha</label>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    className="input"
                    value={confirmacao}
                    onChange={e => setConfirmacao(e.target.value)}
                    required
                  />
                </div>

                {erro && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{erro}</div>
                )}

                <button type="submit" disabled={salvando} className="btn-primary w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                  {salvando ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}

          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 mt-6">
            <ArrowLeft size={14} /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}
