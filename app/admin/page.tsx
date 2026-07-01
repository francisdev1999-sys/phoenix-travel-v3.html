import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPanelAccess } from '@/lib/cleanup/admin-auth';
import AdminPanelClient from './AdminPanelClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/');
  }

  // Full control panel is open to the owner and admin roles alike.
  if (!hasPanelAccess(session)) {
    return (
      <div className="min-h-screen bg-[#000005] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold text-red-400">Access Denied</h1>
          <p className="text-slate-400 text-sm">Admin access required.</p>
          <a href="/" className="text-purple-400 text-sm hover:underline">Return to Archive</a>
        </div>
      </div>
    );
  }

  return <AdminPanelClient />;
}
