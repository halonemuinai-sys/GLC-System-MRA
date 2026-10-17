import PublicAssetDocApprovalPage from '@/components/pages/PublicAssetDocApprovalPage';

export default async function Page({ params }) {
  const { token } = await params;
  return <PublicAssetDocApprovalPage token={token} kind="handover" />;
}
