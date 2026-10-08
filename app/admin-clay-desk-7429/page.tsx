export const metadata = {
  title: 'Tournament Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <main className="admin-shell">
      <header>
        <div>
          <p>Private admin panel</p>
          <h1>Admin panel disabled</h1>
        </div>
        <div className="admin-actions">
          <a href="/" target="_blank">View public site</a>
        </div>
      </header>
      <section className="admin-section">
        <h2>Editing is locked</h2>
        <p className="empty-state">The tournament admin panel is currently disabled. Public standings and knockout information remain visible.</p>
      </section>
    </main>
  );
}
