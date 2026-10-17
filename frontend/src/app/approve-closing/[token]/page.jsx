import PublicPlanClosingApprovalPage from '@/components/pages/PublicPlanClosingApprovalPage';

export default async function Page({ params }) {
  const { token } = await params;
  return <PublicPlanClosingApprovalPage token={token} />;
}
