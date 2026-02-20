'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Save, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Account {
  id: string;
  name: string;
  role: 'staff' | 'admin';
  is_active: boolean;
  created_at: string;
}

export function AccountManagement() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'staff' | 'admin'>('staff');

  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'staff' | 'admin'>('staff');
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAdd = async () => {
    if (!newName.trim() || !newPassword.trim()) {
      setError('이름과 비밀번호를 모두 입력하세요.');
      return;
    }
    setError(null);
    const res = await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), password: newPassword, role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setNewName('');
    setNewPassword('');
    setNewRole('staff');
    setShowAdd(false);
    fetchAccounts();
  };

  const handleEdit = async (id: string) => {
    const updates: Record<string, unknown> = { id };
    if (editName.trim()) updates.name = editName.trim();
    if (editPassword.trim()) updates.password = editPassword;
    updates.role = editRole;

    const res = await fetch('/api/admin/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setEditId(null);
      fetchAccounts();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 계정을 삭제하시겠습니까?`)) return;
    await fetch('/api/admin/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchAccounts();
  };

  const startEdit = (acc: Account) => {
    setEditId(acc.id);
    setEditName(acc.name);
    setEditPassword('');
    setEditRole(acc.role);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">계정 관리</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAccounts} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              계정 추가
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 추가 폼 */}
        {showAdd && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="이름"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1"
              />
              <Input
                type="password"
                placeholder="비밀번호"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'staff' | 'admin')}
                className="border border-gray-300 rounded-md px-2 text-sm"
              >
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setError(null); }}>
                취소
              </Button>
              <Button size="sm" onClick={handleAdd}>추가</Button>
            </div>
          </div>
        )}

        {/* 목록 */}
        <div className="divide-y divide-gray-100">
          {accounts.map((acc) => (
            <div key={acc.id} className="py-3 flex items-center gap-3">
              {editId === acc.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-24 text-sm"
                    placeholder="이름"
                  />
                  <Input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-24 text-sm"
                    placeholder="새 비밀번호"
                  />
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'staff' | 'admin')}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="staff">staff</option>
                    <option value="admin">admin</option>
                  </select>
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => handleEdit(acc.id)} className="p-1.5 rounded hover:bg-green-100 text-green-600">
                      <Save className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditId(null)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-800 w-20">{acc.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    acc.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {acc.role}
                  </span>
                  {!acc.is_active && (
                    <span className="text-xs text-gray-400">(비활성)</span>
                  )}
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => startEdit(acc)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(acc.id, acc.name)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
