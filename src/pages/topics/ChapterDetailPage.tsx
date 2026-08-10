import ChapterDetailManager from '../../components/topics/ChapterDetailManager.tsx';

export default function ChapterDetailPage() {
  const tenantId = Number(localStorage.getItem('tenant_id') ?? 0);

  return (
    <ChapterDetailManager
      apiBasePath="/admin/chapters"
      subjectsTenantId={String(tenantId)}
      ownTenantId={tenantId}
      chaptersRoute="/chapters"
      questionsRoute={(topicId) => `/topics/${topicId}/questions`}
    />
  );
}
