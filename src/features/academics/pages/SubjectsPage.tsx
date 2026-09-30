import { SquareLibrary } from 'lucide-react'
import CatalogManager, { type CatalogAdapter } from '../components/CatalogManager'
import { createSubject, deleteSubject, fetchSubjects, updateSubject, type Subject } from '../services/academicsService'

// Legacy behaviour: the list is patched locally after each change (no refetch).
const adapter: CatalogAdapter<Subject> = {
  load: fetchSubjects,
  create: async (name) => {
    const created = await createSubject(name)
    return created ? (prev) => [...prev, created] : null
  },
  update: async (item, name) =>
    (await updateSubject(item.id, name)) ? (prev) => prev.map((s) => (s.id === item.id ? { ...s, subject: name } : s)) : null,
  remove: async (item) => {
    await deleteSubject(item.id)
    return (prev) => prev.filter((s) => s.id !== item.id)
  },
  idOf: (s) => s.id,
  nameOf: (s) => s.subject,
  isGlobal: (s) => s.tenant_id === 0,
  apiField: 'subject',
}

/** Route gate: subjects.manage (unchanged). */
export default function SubjectsPage() {
  return (
    <CatalogManager
      adapter={adapter}
      title="Subjects"
      description="Subjects taught at your coaching. Default subjects are shared and read-only."
      noun="subject"
      fieldLabel="Subject Name"
      placeholder="Enter Subject Name"
      icon={SquareLibrary}
    />
  )
}
