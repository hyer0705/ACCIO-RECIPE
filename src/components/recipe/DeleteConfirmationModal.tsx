'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AlertCircle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteConfirmationModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <AlertDialogContent className="sm:max-w-md p-6 rounded-[24px] gap-6 bg-white border-0 shadow-xl overflow-hidden">
        <AlertDialogHeader className="flex flex-col items-center sm:text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FCEFCC]">
            <AlertCircle className="h-8 w-8 text-[#FF5C2B]" strokeWidth={2.5} />
          </div>
          <div className="space-y-2 text-center w-full">
            <AlertDialogTitle className="text-[20px] font-extrabold text-[#3D2E24] m-0">
              레시피를 삭제하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] font-medium text-[#7C736B] m-0 pt-1">
              삭제된 레시피 데이터는 영구적으로 복구할 수 없습니다.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-3 sm:gap-4 mt-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className="flex-1 rounded-[12px] bg-[#F8F6F0] h-12 text-[15px] font-bold text-[#7C736B] border-0 shadow-none hover:bg-[#EAE5DB] hover:text-[#7C736B] focus:ring-0 sm:mt-0 transition-all active:scale-[0.98]"
          >
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={(e) => {
              e.preventDefault(); // Prevent default close behavior
              onConfirm();
            }}
            className="flex-1 rounded-[12px] bg-[#FF4444] h-12 text-[15px] font-bold text-white shadow-sm hover:bg-[#E03C3C] focus:ring-0 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isDeleting ? '삭제 중...' : '삭제하기'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
