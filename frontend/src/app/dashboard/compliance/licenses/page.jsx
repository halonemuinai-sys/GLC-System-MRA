import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ComplianceLicensesPage = dynamic(() => import('@/components/pages/ComplianceLicensesPage'), {
  loading: () => <div className="min-h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
});

export default function Page() {
  return <ComplianceLicensesPage />;
}
