'use client';

import { MoreVertical, Eye, UserX, UserCheck, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  _count: {
    chatSessions: number;
    histories: number;
  };
}

interface UsersTableProps {
  users: User[];
  loading: boolean;
  onViewDetail: (userId: string) => void;
  onStatusChange: (userId: string, status: string) => void;
  onDelete: (userId: string) => void;
}

function ActionMenu({ user, onViewDetail, onStatusChange, onDelete }: {
  user: User;
  onViewDetail: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-gray-100 rounded"
      >
        <MoreVertical className="w-5 h-5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          <button
            onClick={() => { onViewDetail(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            상세 보기
          </button>
          {user.status === 'active' ? (
            <button
              onClick={() => { onStatusChange('inactive'); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-gray-50"
            >
              <UserX className="w-4 h-4" />
              비활성화
            </button>
          ) : (
            <button
              onClick={() => { onStatusChange('active'); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-gray-50"
            >
              <UserCheck className="w-4 h-4" />
              활성화
            </button>
          )}
          <button
            onClick={() => { onDelete(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export function UsersTable({ users, loading, onViewDetail, onStatusChange, onDelete }: UsersTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <p>등록된 회원이 없습니다</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">회원</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">역할</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">세션</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">쿼리</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">가입일</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">액션</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {users.map((user) => (
          <tr key={user.id} className="hover:bg-gray-50">
            <td className="px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{user.name || '-'}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 text-xs rounded-full ${
                user.role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {user.role === 'admin' ? '관리자' : '사용자'}
              </span>
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 text-xs rounded-full ${
                user.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {user.status === 'active' ? '활성' : '비활성'}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-700">
              {user._count.chatSessions}
            </td>
            <td className="px-4 py-3 text-gray-700">
              {user._count.histories}
            </td>
            <td className="px-4 py-3 text-gray-500 text-sm">
              {new Date(user.createdAt).toLocaleDateString('ko-KR')}
            </td>
            <td className="px-4 py-3 text-right">
              <ActionMenu
                user={user}
                onViewDetail={() => onViewDetail(user.id)}
                onStatusChange={(status) => onStatusChange(user.id, status)}
                onDelete={() => onDelete(user.id)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
