declare const notificationTypes: readonly ["new_booking", "booking_cancelled", "checkin", "new_student", "payment_received", "plan_purchased", "teacher_approval_needed", "student_approval_needed", "new_teacher", "booking_created"];
type NotificationType = typeof notificationTypes[number];
declare const router: import("express-serve-static-core").Router;
export declare function createNotification(academy_id: string, type: NotificationType, title: string, message: string, data?: any): Promise<boolean>;
export declare function createUserNotification(user_id: string, type: NotificationType, title: string, message: string, data?: any): Promise<boolean>;
export default router;
//# sourceMappingURL=notifications.d.ts.map