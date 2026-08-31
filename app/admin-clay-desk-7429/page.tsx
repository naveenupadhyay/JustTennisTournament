import AdminClient from './AdminClient';

export const metadata = {
  title: 'Tournament Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminClient />;
}
