import QuestionsManager from '../../components/topics/QuestionsManager.tsx';

export default function SuperAdminTopicQuestionsPage() {
  return (
    <QuestionsManager apiBasePath="/superadmin/topics" topicsRoute="/superadmin/topics" ownTenantId={0} />
  );
}
