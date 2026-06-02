import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post('/auth/login', data),
    onSuccess: (res) => {
      login(res.data.token, res.data.user);
      toast.success(`Bem-vindo, ${res.data.user.name}!`);
      navigate('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Email ou senha inválidos');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Preencha todos os campos'); return; }
    mutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* === Left panel — brand hero (desktop only) === */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col items-center justify-center overflow-hidden"
        style={{ background: '#1B2F6E' }}>
        {/* Pulpit background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/pulpito.jpg')", opacity: 0.22 }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(27,47,110,0.75) 0%, rgba(27,47,110,0.55) 50%, rgba(27,47,110,0.88) 100%)' }} />

        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <img
            src="/bdn-logo.png"
            onError={(e) => { (e.target as HTMLImageElement).src = '/bdn-logo.svg'; }}
            alt="Bola de Neve Church"
            className="w-60 mb-10 drop-shadow-2xl"
          />
          <h1 className="text-white text-3xl font-bold leading-snug mb-3">
            Cantina Bola de Neve
          </h1>
          <p className="text-white/65 text-base leading-relaxed max-w-xs">
            Sistema de gestão de estoque, vendas e caixa da cantina da igreja.
          </p>
          <div className="mt-10 text-white/40 text-sm italic">"In Jesus We Trust"</div>
        </div>

        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-24 opacity-10"
          style={{ background: 'radial-gradient(ellipse at center bottom, rgba(255,255,255,0.4) 0%, transparent 70%)' }} />
      </div>

      {/* === Right panel — login form === */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen lg:min-h-0 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
        {/* Mobile: subtle pulpit watermark */}
        <div
          className="lg:hidden absolute inset-0 bg-cover bg-top"
          style={{ backgroundImage: "url('/pulpito.jpg')", opacity: 0.05 }}
        />

        <div className="relative z-10 w-full max-w-sm px-6 py-10">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img
              src="/bdn-logo.png"
              onError={(e) => { (e.target as HTMLImageElement).src = '/bdn-logo.svg'; }}
              alt="Bola de Neve Church"
              className="w-32 mb-4 drop-shadow-md"
            />
            <h1 className="text-[#1B2F6E] font-bold text-lg text-center">Cantina Bola de Neve</h1>
            <p className="text-gray-500 text-xs mt-1 text-center">Sistema de gestão da cantina</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-[#1B2F6E] text-2xl font-bold">Bem-vindo de volta!</h2>
            <p className="text-gray-500 text-sm mt-1">Entre com suas credenciais para acessar</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100/80 p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10 rounded-xl"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full h-11 rounded-xl text-base font-semibold gap-2 mt-1"
                style={{ background: '#1B2F6E' }}
              >
                {mutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Bola de Neve Church &nbsp;·&nbsp; Sistema de Cantina
          </p>
        </div>
      </div>
    </div>
  );
}
