import React, { Suspense } from 'react';
import GaDocumentsPage from '@/components/pages/GaDocumentsPage';
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
      <GaDocumentsPage />
    </Suspense>
  );
}
