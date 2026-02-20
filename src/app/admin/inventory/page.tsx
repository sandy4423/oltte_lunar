'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TodayChecklist } from '@/components/features/admin/inventory/TodayChecklist';
import { InventoryTable } from '@/components/features/admin/inventory/InventoryTable';
import { AdminLoginForm } from '@/components/features/admin/AdminLoginForm';
import type { InventoryItemRow } from '@/types/database';

const ADMIN_PASSWORD = '4423';
const AUTH_KEY = 'adminAuthenticated';

export default function InventoryPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [allItems, setAllItems] = useState<InventoryItemRow[]>([]);
  const [todayItems, setTodayItems] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullTable, setShowFullTable] = useState(false);

  // 인증 확인 (localStorage - /admin과 공유)
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored === 'true') setIsAuthenticated(true);
  }, []);

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inventory', { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const { items, todayItems: today } = await res.json();
      setAllItems(items);
      setTodayItems(today);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchInventory();
  }, [isAuthenticated, fetchInventory]);

  const handleSave = useCallback(
    async (id: string, mainQty: number | null, detailQty: number | null): Promise<boolean> => {
      try {
        const res = await fetch('/api/admin/inventory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, main_qty: mainQty, detail_qty: detailQty }),
        });
        if (!res.ok) return false;
        const { item } = await res.json();
        // 로컬 상태 업데이트
        setAllItems((prev) => prev.map((i) => (i.id === id ? item : i)));
        setTodayItems((prev) => prev.map((i) => (i.id === id ? item : i)));
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  if (!isAuthenticated) {
    return (
      <AdminLoginForm
        passwordInput={passwordInput}
        passwordError={passwordError}
        onPasswordChange={setPasswordInput}
        onSubmit={handlePasswordSubmit}
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
            {/* 오늘의 체크리스트 */}
            <TodayChecklist items={todayItems} onSave={handleSave} />

            {/* 전체 현황 토글 */}
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

            {showFullTable && <InventoryTable items={allItems} />}
          </div>
        )}
      </div>
    </main>
  );
}
