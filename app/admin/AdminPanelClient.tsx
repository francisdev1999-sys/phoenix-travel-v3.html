'use client';
import AdminPanel from '@/components/sections/AdminPanel';

// Thin client wrapper so AdminPanel (which uses useSession) works inside a
// server-rendered parent page. The auth gate lives in the server component above;
// AdminPanel's own useSession check is a secondary defence layer.
export default function AdminPanelClient() {
  return (
    <div className="min-h-screen bg-[#000005] text-slate-200">
      <div className="h-screen overflow-hidden">
        <AdminPanel />
      </div>
    </div>
  );
}
