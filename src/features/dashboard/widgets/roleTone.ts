/** Legacy colouring: teachers green, everyone else blue. */
export const roleAvatarTone = (role: string) =>
  role === 'teacher' ? 'tw:bg-success-soft tw:text-success' : 'tw:bg-info-soft tw:text-info'
