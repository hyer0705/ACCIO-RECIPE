'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

// 간단한 토글 스위치 컴포넌트 (동일 파일 내 배치 혹은 분리 가능)
function ToggleSwitch({
  checked,
  onChange,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  id: string;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-[#FF5A28]' : 'bg-[#EBEBEB]'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [editNicknameValue, setEditNicknameValue] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await fetch('/api/user/profile');
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedSettings: {
      alert_timer?: boolean;
      alert_expiry?: boolean;
      nickname?: string;
    }) => {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setIsEditingNickname(false);
    },
    onError: (error) => {
      alert('설정 변경에 실패했습니다: ' + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-[1000px] h-full flex flex-col items-center justify-center text-[#A59A94]">
        로딩 중...
      </div>
    );
  }

  if (isError || !data || !data.user) {
    return (
      <div className="max-w-[1000px] h-full flex flex-col items-center justify-center text-[#EF4444]">
        사용자 정보를 불러오는데 실패했습니다.
      </div>
    );
  }

  const user = data.user;
  const settings = user.user_settings || {};
  const timerAlert = settings.alert_timer ?? true;
  const expiryAlert = settings.alert_expiry ?? true;
  const nickname = user.nickname || '사용자';

  const handleToggleTimer = () => {
    updateMutation.mutate({ alert_timer: !timerAlert });
  };

  const handleToggleExpiry = () => {
    updateMutation.mutate({ alert_expiry: !expiryAlert });
  };

  const handleEditNicknameClick = () => {
    setEditNicknameValue(nickname);
    setIsEditingNickname(true);
  };

  const handleSaveNickname = () => {
    if (!editNicknameValue.trim()) return;
    updateMutation.mutate({ nickname: editNicknameValue });
  };

  const handleLogout = () => {
    // Clear all queries from the cache when logging out to prevent data exposure
    queryClient.clear();
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="max-w-[1000px]">
      <div className="mb-10">
        <h1 className="text-[28px] font-bold text-[#3C2D23] m-0">환경 설정</h1>
      </div>

      <div className="bg-white rounded-[32px] p-10 shadow-sm relative">
        {updateMutation.isPending && (
          <div
            className="absolute inset-0 z-10 rounded-[32px] bg-white/50 cursor-wait"
            aria-hidden="true"
          />
        )}

        {/* Profile Management Section */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-[#3C2D23] mb-6">프로필 관리</h2>
          <div className="border-t border-[#F5F5F5]">
            <div className="flex justify-between items-center py-6 border-b border-[#F5F5F5]">
              <div className="flex items-center gap-12 w-full">
                <span className="text-[15px] font-medium text-[#A59A94] w-20">닉네임</span>
                {isEditingNickname ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl px-4 py-2 text-[15px] text-[#3C2D23] outline-none focus:border-[#FF5A28] transition-colors disabled:opacity-50"
                      value={editNicknameValue}
                      onChange={(e) => setEditNicknameValue(e.target.value)}
                      disabled={updateMutation.isPending}
                      autoFocus
                    />
                  </div>
                ) : (
                  <span className="text-[15px] font-bold text-[#3C2D23] flex-1">{nickname}</span>
                )}

                {isEditingNickname ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsEditingNickname(false)}
                      disabled={updateMutation.isPending}
                      className="cursor-pointer text-[14px] font-medium text-[#8C847E] hover:text-[#3C2D23] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveNickname}
                      disabled={updateMutation.isPending}
                      className="cursor-pointer text-[14px] font-medium text-[#FF5A28] hover:text-[#E04D20] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEditNicknameClick}
                    disabled={updateMutation.isPending}
                    className="cursor-pointer text-[14px] font-medium text-[#FF5A28] hover:text-[#E04D20] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    수정하기
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Service Alerts Section */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-[#3C2D23] mb-6">서비스 알림</h2>
          <div className="border-t border-[#F5F5F5]">
            <div className="flex justify-between items-center py-6 border-b border-[#F5F5F5]">
              <span className="text-[15px] font-medium text-[#3C2D23]">조리 타이머 종료 알림</span>
              <ToggleSwitch
                id="timer-alert"
                checked={timerAlert}
                onChange={handleToggleTimer}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="flex justify-between items-center py-6 border-b border-[#F5F5F5]">
              <span className="text-[15px] font-medium text-[#3C2D23]">
                냉장고 재료 유통기한 임박 알림
              </span>
              <ToggleSwitch
                id="expiry-alert"
                checked={expiryAlert}
                onChange={handleToggleExpiry}
                disabled={updateMutation.isPending}
              />
            </div>
          </div>
        </section>

        {/* Data Integration Section */}
        <section className="mb-20">
          <h2 className="text-[18px] font-bold text-[#3C2D23] mb-6">데이터 연동</h2>
          <div className="border-t border-[#F5F5F5]">
            <div className="flex justify-between items-center py-6 border-b border-[#F5F5F5]">
              <span className="text-[15px] font-medium text-[#3C2D23]">
                요리 경험 기록 자동 내보내기 (.md)
              </span>
              <span
                className={`text-[14px] font-medium transition-colors ${
                  updateMutation.isPending
                    ? 'text-[#CCCCCC] cursor-not-allowed'
                    : 'text-[#A59A94] cursor-pointer hover:text-[#3C2D23]'
                }`}
              >
                깃허브/블로그 연동
              </span>
            </div>
          </div>
        </section>

        {/* Footer Actions */}
        <div className="flex justify-center items-center gap-2 text-[14px] font-medium text-[#CCCCCC] mt-10">
          <button
            onClick={handleLogout}
            disabled={updateMutation.isPending}
            className="cursor-pointer hover:text-[#A59A94] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            로그아웃
          </button>
          <span>|</span>
          <button
            disabled={updateMutation.isPending}
            className="cursor-pointer hover:text-[#A59A94] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            서비스 탈퇴
          </button>
        </div>
      </div>
    </div>
  );
}
