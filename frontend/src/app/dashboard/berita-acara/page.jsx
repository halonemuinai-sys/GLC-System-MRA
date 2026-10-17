import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const GaBeritaAcaraPage = dynamic(() => import('@/components/pages/GaBeritaAcaraPage'), {
  loading: () => <div className="min-h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>
});

export default async function Page({ searchParams }) {
  const { type } = await searchParams;
  return <GaBeritaAcaraPage initialType={type === 'bast' ? 'bast' : 'bap'} />;
}
