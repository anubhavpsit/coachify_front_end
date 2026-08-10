import LibraryChaptersManager from '../../components/library/LibraryChaptersManager.tsx';

export default function LibraryChaptersPage() {
  return (
    <LibraryChaptersManager chapterDetailRoute={(chapterId) => `/library/chapters/${chapterId}`} />
  );
}
