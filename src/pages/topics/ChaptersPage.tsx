import ChaptersManager from '../../components/topics/ChaptersManager.tsx';

export default function ChaptersPage() {
  const tenantId = Number(localStorage.getItem('tenant_id') ?? 0);

  return (
    <ChaptersManager
      apiBasePath="/admin/chapters"
      subjectsTenantId={String(tenantId)}
      ownTenantId={tenantId}
      chapterRoute={(chapterId) => `/chapters/${chapterId}`}
    />
  );
}
