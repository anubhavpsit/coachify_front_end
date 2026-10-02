/** Legacy colouring: teachers green, everyone else blue. */
export const roleAvatarTone = (role: string) =>
  role === 'teacher' ? 'bg-success-soft text-success' : 'bg-info-soft text-info'
