'use client';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminLoginFormProps {
  passwordInput: string;
  passwordError: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AdminLoginForm({ passwordInput, passwordError, onPasswordChange, onSubmit }: AdminLoginFormProps) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <Lock className="h-12 w-12 text-brand" />
          </div>
          <CardTitle className="text-center text-2xl">관리자 로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={passwordInput}
                onChange={(e) => onPasswordChange(e.target.value)}
                className={passwordError ? 'border-red-500' : ''}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2">비밀번호가 올바르지 않습니다.</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
