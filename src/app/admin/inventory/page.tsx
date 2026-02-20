'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TodayChecklist } from '@/components/features/admin/inventory/TodayChecklist';
import { InventoryTable } from '@/components/features/admin/inventory/InventoryTable';
import { ItemLogDrawer } from '@/components/features/admin/inventory/ItemLogDrawer';
import { AdminLoginForm } from '@/components/features/admin/AdminLoginForm';
import type { InventoryItemRow } from '@/types/database';

interface AdminUser {
  id: string;
  name: string;
  role: 'staff' | 'admin';
}

export default function InventoryPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [allItems, setAllItems] = useState<InventoryItemRow[]>([]);
  const [todayItems, setTodayItems] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullTable, setShowFullTable] = useState(false);

  const [logItem, setLogItem] = useState<InventoryItemRow | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  // 메모 확인 팝업 상태
  const [memoPending, setMemoPending] = useState<{
    id: string;
    mainQty: number | null;
    detailQty: number | null;
    lastMemo: string;
    resolve: (keep: boolean) => void;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('adminUser');
      if (stored) {
        const user = JSON.parse(stored) as AdminUser;
        setAdminUser(user);
        setIsAuthenticated(true);
      }
    } catch {
      //
    }
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput, password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || '로그인 실패');
        setPasswordInput('');
        return;
      }
      const user = data.user as AdminUser;
      setAdminUser(user);
      setIsAuthenticated(true);
      sessionStorage.setItem('adminUser', JSON.stringify(user));
      sessionStorage.setItem('admin_auth', 'true');
    } catch {
      setLoginError('서버 연결에 실패했습니다.');
    } finally {
      setLoginLoading(false);
    }
  }, [nameInput, passwordInput]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inventory', { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const { items, todayItems: today } = await res.json();
      setAllItems(items);
      setTodayItems(today);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchInventory();
  }, [isAuthenticated, fetchInventory]);

  const doSave = useCallback(
    async (id: string, mainQty: number | null, detailQty: number | null, memo: string | null): Promise<boolean> => {
      try {
        const res = await fetch('/api/admin/inventory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            main_qty: mainQty,
            detail_qty: detailQty,
            memo,
            staff_name: adminUser?.name ?? '(알수없음)',
          }),
        });
        if (!res.ok) return false;
        const { item } = await res.json();
        setAllItems((prev) => prev.map((i) => (i.id === id ? item : i)));
        setTodayItems((prev) => prev.map((i) => (i.id === id ? item : i)));
        return true;
      } catch {
        return false;
      }
    },
    [adminUser]
  );

  /**
   * 저장 핸들러 — 직전 메모 팝업 로직 포함
   * 조건: last_memo 존재 + 새 메모 비어있음 → 삭제/유지 확인
   */
  const handleSave = useCallback(
    async (id: string, mainQty: number | null, detailQty: number | null, memo: string | null): Promise<boolean> => {
      const item = [...allItems, ...todayItems].find((i) => i.id === id);
      const lastMemo = item?.last_memo;

      if (lastMemo && (!memo || memo.trim() === '')) {
        return new Promise<boolean>((resolve) => {
          setMemoPending({
            id,
            mainQty,
            detailQty,
            lastMemo,
            resolve: async (keep: boolean) => {
              setMemoPending(null);
              const finalMemo = keep ? lastMemo : null;
              const ok = await doSave(id, mainQty, detailQty, finalMemo);
              resolve(ok);
            },
          });
        });
      }

      return doSave(id, mainQty, detailQty, memo);
    },
    [allItems, todayItems, doSave]
  );

  if (!isAuthenticated) {
    return (
      <AdminLoginForm
        nameInput={nameInput}
        passwordInput={passwordInput}
        loginError={loginError}
        loading={loginLoading}
        onNameChange={setNameInput}
        onPasswordChange={setPasswordInput}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              관리자
            </button>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="올때만두" width={90} height={24} />
              <span className="text-base font-bold text-gray-800">재고 관리</span>
            </div>
            {adminUser && (
              <span className="text-xs text-orange-600 font-medium ml-1">({adminUser.name})</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInventory}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <TodayChecklist
              items={todayItems}
              onSave={(id, main, detail, memo) => handleSave(id, main, detail, memo)}
            />

            <button
              onClick={() => setShowFullTable((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span>전체 재고 현황 ({allItems.length}개 항목)</span>
              {showFullTable ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {showFullTable && (
              <InventoryTable
                items={allItems}
                staffName={adminUser?.name ?? ''}
                onSave={handleSave}
                onItemClick={(item) => { setLogItem(item); setLogOpen(true); }}
              />
            )}
          </div>
        )}
      </div>

      <ItemLogDrawer
        item={logItem}
        open={logOpen}
        onClose={() => setLogOpen(false)}
      />

      {/* 직전 메모 삭제/유지 팝업 */}
      {memoPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative z-50 bg-white rounded-xl shadow-xl p-5 max-w-sm w-full mx-4">
            <p className="text-sm font-medium text-gray-800 mb-2">직전 메모</p>
            <p className="text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg mb-4">
              &ldquo;{memoPending.lastMemo}&rdquo;
            </p>
            <p className="text-sm text-gray-600 mb-4">메모를 삭제할까요?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => memoPending.resolve(true)}
                className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                유지
              </button>
              <button
                onClick={() => memoPending.resolve(false)}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
