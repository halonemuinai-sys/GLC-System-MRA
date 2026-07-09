import React, { Suspense } from 'react';
import GaVehiclesPage from '@/components/pages/GaVehiclesPage';
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
      <GaVehiclesPage />
    </Suspense>
  );
}
