import PublicApprovalPage from '@/components/pages/PublicApprovalPage';

export default async function Page({ params }) {
  const { token } = await params;
  return <PublicApprovalPage token={token} />;
}
