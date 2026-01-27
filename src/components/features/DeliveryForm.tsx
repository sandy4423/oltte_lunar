/**
 * 배송 정보 폼 컴포넌트
 */

import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DeliveryFormProps {
  name: string;
  setName: (name: string) => void;
  dong: string;
  setDong: (dong: string) => void;
  ho: string;
  setHo: (ho: string) => void;
}

export function DeliveryForm({
  name,
  setName,
  dong,
  setDong,
  ho,
  setHo,
}: DeliveryFormProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          배송 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-base">받으시는 분</Label>
          <Input
            id="name"
            placeholder="홍길동"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            className="mt-1 text-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dong" className="text-base">동</Label>
            <Select value={dong} onValueChange={setDong}>
              <SelectTrigger className="mt-1 text-lg">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 30 }, (_, i) => i + 101).map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}동
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ho" className="text-base">호</Label>
            <Input
              id="ho"
              type="text"
              inputMode="numeric"
              placeholder="1234"
              value={ho}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHo(e.target.value)}
              className="mt-1 text-lg"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
