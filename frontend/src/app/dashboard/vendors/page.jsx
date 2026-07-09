import React, { Suspense } from 'react';
import GaVendorsPage from '@/components/pages/GaVendorsPage';
import { Loader2 } from 'lucide-react';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <GaVendorsPage />
    </Suspense>
  );
}
