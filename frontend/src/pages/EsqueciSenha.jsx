import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Factory, ArrowLeft, MailCheck } from 'lucide-react'
import api from '../services/api'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await api.post('/auth/esqueci-senha', { email })
      setEnviado(true)
    } catch {
      setErro('Não foi possível enviar o link agora. Tente novamente em alguns minutos.')
    } finally {
      setEnviando(false)
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
          {enviado ? (
            <div className="text-center space-y-3 py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full">
                <MailCheck size={26} className="text-green-600" />
              </div>
              <p className="font-bold text-gray-800">Verifique seu e-mail</p>
              <p className="text-sm text-gray-500">
                Se o e-mail informado existir em nossa base, você receberá um link para redefinir sua senha em poucos minutos.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Esqueceu sua senha?</h2>
              <p className="text-sm text-gray-500 mb-6">Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">E-mail</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {erro && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{erro}</div>
                )}

                <button type="submit" disabled={enviando} className="btn-primary w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                  {enviando ? 'Enviando...' : 'Enviar link de redefinição'}
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
