import { useAuthStore } from '@/lib/stores/auth-store'

export function useTeacherApproval() {
  const { user } = useAuthStore()
  
  const isTeacher = user?.role === 'TEACHER'
  const approvalStatus = user?.approval_status
  const isApproved = approvalStatus === 'approved'
  const isPending = approvalStatus === 'pending' || !approvalStatus
  const isRejected = approvalStatus === 'rejected'
  const isNotApproved = !isApproved
  
  return {
    user,
    isTeacher,
    approvalStatus,
    isApproved,
    isPending,
    isRejected,
    isNotApproved
  }
}
