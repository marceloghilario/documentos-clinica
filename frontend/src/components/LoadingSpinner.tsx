import { Loader2 } from 'lucide-react';
export default function LoadingSpinner({
  label = 'Carregando...',
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
