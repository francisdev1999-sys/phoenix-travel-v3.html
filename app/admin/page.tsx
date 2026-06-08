import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdminSession } from '@/lib/auth';
import AdminPanelClient from './AdminPanelClient';

export const metadata = { title: 'Admin — Nexus Archive' };

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/?signin=required');
  }

  if (!isAdminSession(session)) {
    redirect('/?error=unauthorized');
  }

  return <AdminPanelClient />;
}
