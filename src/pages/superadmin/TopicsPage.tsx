import TopicsManager from '../../components/topics/TopicsManager.tsx';

export default function SuperAdminTopicsPage() {
  return (
    <TopicsManager
      apiBasePath="/superadmin/topics"
      subjectsTenantId="0"
      ownTenantId={0}
      questionsRoute={(topicId) => `/superadmin/topics/${topicId}/questions`}
    />
  );
}
