import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import AdminPanelClient from './AdminPanelClient';

export const metadata = { title: 'Admin — Nexus Archive' };

export default async function AdminPage() {
  const session = await auth();

  // Server-side gate — never reached without valid admin session
  if (!session?.user?.email) {
    redirect('/?signin=required');
  }

  if (session.user.email !== process.env.ADMIN_EMAIL) {
    redirect('/?error=unauthorized');
  }

  return <AdminPanelClient />;
}
