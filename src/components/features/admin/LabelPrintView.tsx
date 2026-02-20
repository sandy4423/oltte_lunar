'use client';

import { format } from 'date-fns';
import { getProductBySku } from '@/lib/constants';
import type { OrderFull } from '@/types/database';

interface LabelPrintViewProps {
  orders: OrderFull[];
  onClose: () => void;
}

export function LabelPrintView({ orders, onClose }: LabelPrintViewProps) {
  return (
    <main className="print-labels">
      <style jsx global>{`
        @media print {
          @page {
            size: 40mm 30mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print-labels {
            width: 100%;
          }
          .label-item {
            width: 40mm;
            height: 30mm;
            padding: 2mm;
            page-break-after: always;
            box-sizing: border-box;
            font-family: sans-serif;
          }
          .label-item:last-child {
            page-break-after: auto;
          }
        }
        @media screen {
          .print-labels {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 16px;
            background: #f0f0f0;
          }
          .label-item {
            width: 151px;
            height: 113px;
            padding: 4px;
            background: white;
            border: 1px solid #ccc;
            font-size: 9px;
          }
        }
      `}</style>

      {orders.map((order) => (
        <div key={order.id} className="label-item">
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '2px' }}>
            {order.dong}동 {order.ho}호
          </div>
          <div style={{ fontSize: '10px', marginBottom: '4px' }}>
            {order.customer.name} ({order.customer.phone.slice(-4)})
          </div>
          <div style={{ fontSize: '8px', borderTop: '1px solid #ccc', paddingTop: '2px' }}>
            {order.order_items.map((item) => {
              const product = getProductBySku(item.sku);
              return (
                <div key={item.id}>
                  {product?.name || item.sku} x {item.qty}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: '7px', color: '#666', marginTop: '2px' }}>
            {format(new Date(order.delivery_date), 'M/d')} 배송
          </div>
        </div>
      ))}

      <button
        onClick={onClose}
        className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded print:hidden"
      >
        닫기
      </button>
    </main>
  );
}
