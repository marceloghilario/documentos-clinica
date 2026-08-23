import { FileText } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Link to="/documentos" className="flex items-center gap-3">
            <span className="rounded-xl bg-primary-600 p-2 text-white">
              <FileText />
            </span>
            <span>
              <strong className="block text-lg">Documentos Clínica</strong>
              <small className="text-slate-500">Pro Avanço</small>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
