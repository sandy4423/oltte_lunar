'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ArrowLeft, User, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminPassword } from '@/lib/adminAuth';
import { getProductBySku } from '@/lib/constants';
import Link from 'next/link';

interface LookupCustomer {
  id: string;
  phone: string;
  name: string;
}

interface LookupOrderItem {
  sku: string;
  qty: number;
  unit_price: number;
  line_amount: number;
}

interface LookupOrder {
  id: string;
  status: string;
  total_amount: number;
  dangol_discount: number;
  pickup_date: string | null;
  pickup_time: string | null;
  created_at: string;
  order_items: LookupOrderItem[];
}

interface LookupResult {
  customer: LookupCustomer;
  orders: LookupOrder[];
}

export default function LookupPage() {
  const [phone4, setPhone4] = useState('');
  const [results, setResults] = useState<LookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pw = getAdminPassword();
    if (pw) setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('admin_password', password);
    setIsAuthenticated(true);
  };

  const handleSearch = useCallback(async () => {
    if (phone4.length !== 4) return;
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/admin/orders/lookup?phone4=${phone4}`, {
        headers: { 'x-admin-password': getAdminPassword() },
      });
      const data = await res.json();
      setResults(data.success ? data.data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [phone4]);

  const handleClear = () => {
    setPhone4('');
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPhone4(v);
    if (v.length < 4) {
      setResults([]);
      setSearched(false);
    }
  };

  // 4자리 입력 완료 시 자동 검색
  useEffect(() => {
    if (phone4.length === 4) handleSearch();
  }, [phone4, handleSearch]);

  const formatPhone = (phone: string) =>
    phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');

  const getSkuLabel = (sku: string) => {
    const product = getProductBySku(sku);
    return product ? `${product.emoji} ${product.name}` : sku;
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-center mb-6">직원 인증</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full border rounded-lg px-4 py-3 text-lg mb-4"
            autoFocus
          />
          <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-3">
            확인
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">주문 조회</h1>
        </div>

        {/* 검색 입력 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <p className="text-sm text-gray-500 mb-3">핸드폰 번호 뒤 4자리를 입력하세요</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                value={phone4}
                onChange={handleInputChange}
                placeholder="0000"
                className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-4 py-4 text-3xl font-bold text-center tracking-[0.5em] outline-none transition-colors"
                autoFocus
              />
            </div>
            <Button
              onClick={handleClear}
              variant="outline"
              className="px-4 py-4 text-lg h-auto"
            >
              지우기
            </Button>
          </div>
        </div>

        {/* 결과 */}
        {loading && (
          <div className="text-center py-8">
            <Search className="h-8 w-8 animate-pulse mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">검색 중...</p>
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-gray-500 text-lg">주문 내역이 없습니다</p>
            <p className="text-gray-400 text-sm mt-1">번호를 다시 확인해주세요</p>
          </div>
        )}

        {results.map((result) => (
          <div key={result.customer.id} className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            {/* 고객 정보 */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <div className="bg-orange-100 rounded-full p-2">
                <User className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{result.customer.name}</p>
                <p className="text-sm text-gray-400">{formatPhone(result.customer.phone)}</p>
              </div>
            </div>

            {/* 주문 목록 */}
            {result.orders.map((order) => (
              <div key={order.id} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {order.pickup_date && `${order.pickup_date} ${order.pickup_time || ''}`}
                  </span>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    결제완료
                  </span>
                </div>

                {/* 주문 상품 */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  {order.order_items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-base">
                        {getSkuLabel(item.sku)} <span className="text-gray-500">x{item.qty}</span>
                      </span>
                      <span className="text-sm text-gray-600">
                        {item.line_amount.toLocaleString()}원
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between items-center">
                    <span className="font-bold">합계</span>
                    <span className="font-bold text-orange-600">
                      {order.total_amount.toLocaleString()}원
                    </span>
                  </div>
                  {order.dangol_discount > 0 && (
                    <p className="text-xs text-red-500">할인 적용: -{order.dangol_discount.toLocaleString()}원</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
