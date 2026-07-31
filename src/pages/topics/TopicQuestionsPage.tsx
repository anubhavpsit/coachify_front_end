import QuestionsManager from '../../components/topics/QuestionsManager.tsx';

export default function TopicQuestionsPage() {
  const tenantId = Number(localStorage.getItem('tenant_id') ?? 0);

  return (
    <QuestionsManager apiBasePath="/admin/topics" topicsRoute="/topics" ownTenantId={tenantId} />
  );
}
