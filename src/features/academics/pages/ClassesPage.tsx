import { Layers } from 'lucide-react'
import CatalogManager, { type CatalogAdapter } from '../components/CatalogManager'
import { createClass, deleteClass, fetchClassList, updateClass, type CoachingClass } from '../services/academicsService'

// Legacy behaviour: refetch the list after each change.
const adapter: CatalogAdapter<CoachingClass> = {
  load: fetchClassList,
  create: async (name) => {
    await createClass(name)
    return 'reload'
  },
  update: async (item, name) => {
    await updateClass(item.id, name)
    return 'reload'
  },
  remove: async (item) => {
    await deleteClass(item.id)
    return 'reload'
  },
  idOf: (c) => c.id,
  nameOf: (c) => c.name,
  isGlobal: (c) => c.tenant_id === 0,
  apiField: 'name',
}

/** Route gate: classes.manage (unchanged). */
export default function ClassesPage() {
  return (
    <CatalogManager
      adapter={adapter}
      title="Classes"
      description="Classes (grades / batches) at your coaching. Default classes are shared and read-only."
      noun="class"
      fieldLabel="Class Name"
      placeholder="Class Name"
      icon={Layers}
    />
  )
}
