import LibraryTopicsManager from '../../components/library/LibraryTopicsManager.tsx';

export default function LibraryTopicsPage() {
  return (
    <LibraryTopicsManager topicDetailRoute={(topicId) => `/library/topics/${topicId}`} />
  );
}
