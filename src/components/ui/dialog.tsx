/**
 * Dialog 컴포넌트
 * 
 * 모달 다이얼로그를 표시합니다.
 */

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog Content */}
      <div className="relative z-50">
        {children}
      </div>
    </div>
  );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClose?: () => void;
  clickToClose?: boolean; // 클릭으로 닫기 여부
}

export function DialogContent({ children, className, onClose, clickToClose = false, ...props }: DialogContentProps) {
  return (
    <div 
      className={cn(
        "bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto",
        clickToClose && "cursor-pointer",
        className
      )}
      onClick={clickToClose ? onClose : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function DialogHeader({ children, className, ...props }: DialogHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 mb-4", className)} {...props}>
      {children}
    </div>
  );
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function DialogTitle({ children, className, ...props }: DialogTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold", className)} {...props}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function DialogDescription({ children, className, ...props }: DialogDescriptionProps) {
  return (
    <p className={cn("text-sm text-gray-500", className)} {...props}>
      {children}
    </p>
  );
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function DialogFooter({ children, className, ...props }: DialogFooterProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 mt-6", className)} {...props}>
      {children}
    </div>
  );
}
