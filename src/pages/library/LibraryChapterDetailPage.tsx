import LibraryChapterDetailManager from '../../components/library/LibraryChapterDetailManager.tsx';

export default function LibraryChapterDetailPage() {
  return (
    <LibraryChapterDetailManager
      chaptersRoute="/library/chapters"
      topicDetailRoute={(topicId) => `/library/topics/${topicId}`}
    />
  );
}
