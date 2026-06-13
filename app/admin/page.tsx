import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isSuperAdminEmail } from '@/lib/cleanup/admin-auth';
import CleanupDashboard from '@/components/admin/CleanupDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/');
  }

  if (!isSuperAdminEmail(session.user.email)) {
    return (
      <div className="min-h-screen bg-[#000005] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold text-red-400">Access Denied</h1>
          <p className="text-slate-400 text-sm">Super Admin access required.</p>
          <a href="/" className="text-purple-400 text-sm hover:underline">Return to Archive</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000005] text-slate-200">
      <CleanupDashboard adminEmail={session.user.email} />
    </div>
  );
}
