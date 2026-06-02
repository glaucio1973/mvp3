import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UserPlus,
  Edit,
  Key,
  UserX,
  UserCheck,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { User } from '../types';
import { formatDate } from '../utils/format';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useAuthStore } from '../store/authStore';

const userSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha mínima de 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'OPERATOR']),
});

const resetSchema = z.object({
  newPassword: z.string().min(6, 'Senha mínima de 6 caracteres'),
});

type UserFormData = z.infer<typeof userSchema>;

function UserModal({
  user,
  onClose,
  onSuccess,
}: {
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      role: user?.role || 'OPERATOR',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: UserFormData) => {
      const payload: any = { name: data.name, email: data.email, role: data.role };
      if (data.password) payload.password = data.password;
      if (user) return api.put(`/users/${user.id}`, payload);
      if (!data.password) throw new Error('Senha obrigatória para novo usuário');
      payload.password = data.password;
      return api.post('/users', payload);
    },
    onSuccess: () => {
      toast.success(user ? 'Usuário atualizado!' : 'Usuário criado!');
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || e.message || 'Erro ao salvar'),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input {...register('name')} className={errors.name ? 'border-red-500' : ''} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{user ? 'Nova senha (opcional)' : 'Senha'}</Label>
            <Input
              type="password"
              {...register('password')}
              placeholder={user ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Função</Label>
            <select
              {...register('role')}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="OPERATOR">Operador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : user ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.put(`/users/${user.id}/reset-password`, data),
    onSuccess: () => { toast.success('Senha redefinida!'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao redefinir senha'),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Redefinir Senha</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Usuário: <strong>{user.name}</strong></p>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input type="password" {...register('newPassword')} className={errors.newPassword ? 'border-red-500' : ''} />
            {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message as string}</p>}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Redefinir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Users() {
  const [userModal, setUserModal] = useState<User | null | 'new'>('new' as any);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (u: User) => api.put(`/users/${u.id}`, { active: !u.active }),
    onSuccess: () => { toast.success('Usuário atualizado'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Erro ao atualizar usuário'),
  });

  const [editUser, setEditUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>
        <Button onClick={() => { setEditUser(null); setShowUserModal(true); }} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Card key={user.id} className={!user.active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    {user.role === 'ADMIN' ? (
                      <Shield className="w-5 h-5 text-blue-600" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {user.role === 'ADMIN' ? 'Admin' : 'Operador'}
                  </Badge>
                  <Badge variant={user.active ? 'success' : 'destructive'}>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                Criado em {formatDate(user.createdAt)}
              </p>

              {user.id !== currentUser?.id && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                    onClick={() => { setEditUser(user); setShowUserModal(true); }}
                  >
                    <Edit className="w-3 h-3" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => setResetUser(user)}
                  >
                    <Key className="w-3 h-3" /> Senha
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1 text-xs ${user.active ? 'hover:text-red-500' : 'hover:text-green-500'}`}
                    onClick={() => toggleMutation.mutate(user)}
                  >
                    {user.active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {showUserModal && (
        <UserModal
          user={editUser}
          onClose={() => setShowUserModal(false)}
          onSuccess={() => {
            setShowUserModal(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}

      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
        />
      )}
    </div>
  );
}
