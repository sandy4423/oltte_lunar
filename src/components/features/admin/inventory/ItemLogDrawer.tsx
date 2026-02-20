'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { InventoryItemRow, InventoryLogRow } from '@/types/database';

interface ItemLogDrawerProps {
  item: InventoryItemRow | null;
  open: boolean;
  onClose: () => void;
}

export function ItemLogDrawer({ item, open, onClose }: ItemLogDrawerProps) {
  const [logs, setLogs] = useState<InventoryLogRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) {
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/inventory/logs?item_id=${item.id}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs);
        }
      } catch {
        //
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [open, item]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-50 bg-white rounded-t-2xl sm:rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-800">{item.name}</h3>
            <p className="text-xs text-gray-500">
              {item.category} · {item.unit}
              {item.detail_unit ? ` / ${item.detail_unit}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* 로그 목록 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              기록이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map((log) => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {log.staff_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(log.created_at), 'M/d (EEE) HH:mm', { locale: ko })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="font-medium">
                      {log.main_qty !== null ? log.main_qty : '—'}{' '}
                      <span className="text-xs text-gray-400">{log.unit}</span>
                    </span>
                    {log.detail_unit && log.detail_qty !== null && (
                      <span>
                        {log.detail_qty}{' '}
                        <span className="text-xs text-gray-400">{log.detail_unit}</span>
                      </span>
                    )}
                  </div>
                  {log.memo && (
                    <div className="mt-1 flex items-start gap-1 text-xs text-orange-600">
                      <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>{log.memo}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
