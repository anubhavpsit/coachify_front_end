import TopicsManager from '../../components/topics/TopicsManager.tsx';

export default function TopicsPage() {
  const tenantId = Number(localStorage.getItem('tenant_id') ?? 0);

  return (
    <TopicsManager
      apiBasePath="/admin/topics"
      subjectsTenantId={String(tenantId)}
      ownTenantId={tenantId}
      questionsRoute={(topicId) => `/topics/${topicId}/questions`}
    />
  );
}
