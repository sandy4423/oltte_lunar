/**
 * 배송 정보 폼 컴포넌트
 */

import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface DeliveryFormProps {
  name: string;
  setName: (name: string) => void;
  dong: string;
  setDong: (dong: string) => void;
  ho: string;
  setHo: (ho: string) => void;
  allConsent: boolean;
  setAllConsent: (consent: boolean) => void;
  personalInfoConsent: boolean;
  setPersonalInfoConsent: (consent: boolean) => void;
  marketingOptIn: boolean;
  setMarketingOptIn: (consent: boolean) => void;
  onShowPersonalInfoDialog: () => void;
  onShowMarketingDialog: () => void;
  highlightConsent?: boolean;
}

export function DeliveryForm({
  name,
  setName,
  dong,
  setDong,
  ho,
  setHo,
  allConsent,
  setAllConsent,
  personalInfoConsent,
  setPersonalInfoConsent,
  marketingOptIn,
  setMarketingOptIn,
  onShowPersonalInfoDialog,
  onShowMarketingDialog,
  highlightConsent = false,
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

        {/* 동의 섹션 */}
        <div className="space-y-3 pt-4 border-t">
          {/* 전체 동의 */}
          <div className={cn(
            "flex items-center space-x-2 p-2 rounded transition-all",
            highlightConsent && "border-2 border-red-500 bg-red-50"
          )}>
            <Checkbox 
              id="allConsent" 
              checked={allConsent}
              onCheckedChange={(checked) => {
                setAllConsent(checked as boolean);
                setPersonalInfoConsent(checked as boolean);
                setMarketingOptIn(checked as boolean);
              }}
            />
            <label htmlFor="allConsent" className="text-sm font-semibold cursor-pointer">
              전체 동의
            </label>
          </div>
          
          {/* 개인정보 수집 동의 (필수) */}
          <div className="flex items-center space-x-2 pl-6">
            <Checkbox 
              id="personalInfo" 
              checked={personalInfoConsent}
              onCheckedChange={(checked) => {
                setPersonalInfoConsent(checked as boolean);
                // 개인정보 동의 해제 시 전체 동의도 해제
                if (!checked) setAllConsent(false);
                // 모두 체크되면 전체 동의 활성화
                if (checked && marketingOptIn) setAllConsent(true);
              }}
            />
            <label htmlFor="personalInfo" className="text-xs cursor-pointer flex-1">
              개인정보 수집 및 이용 동의 (필수)
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onShowPersonalInfoDialog();
                }}
                className="ml-1 text-blue-600 underline hover:text-blue-800"
              >
                보기
              </button>
            </label>
          </div>
          
          {/* 마케팅 동의 (선택) */}
          <div className="flex items-center space-x-2 pl-6">
            <Checkbox 
              id="marketing" 
              checked={marketingOptIn}
              onCheckedChange={(checked) => {
                setMarketingOptIn(checked as boolean);
                // 마케팅 동의 해제 시 전체 동의도 해제
                if (!checked) setAllConsent(false);
                // 모두 체크되면 전체 동의 활성화
                if (checked && personalInfoConsent) setAllConsent(true);
              }}
            />
            <label htmlFor="marketing" className="text-xs cursor-pointer flex-1">
              마케팅 정보 수신 동의 (선택)
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onShowMarketingDialog();
                }}
                className="ml-1 text-blue-600 underline hover:text-blue-800"
              >
                보기
              </button>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
