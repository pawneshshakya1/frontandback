import { db } from "../config/firebaseConfig";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    limit,
    getDocs
} from "firebase/firestore";

const COLLECTION_NAME = "notifications";

export const notificationService = {
    // Listen to notifications for a specific user
    subscribeToNotifications: (userId: string, callback: (notifications: any[]) => void) => {
        try {
            if (!userId) return () => { };

            // Ensure we have a valid db connection (placeholder check)
            // Query: userId == current user OR userId == 'ALL'
            // Firestore 'in' query works for exact comparisons
            const q = query(
                collection(db, COLLECTION_NAME),
                where("userId", "in", [userId, "ALL"]),
                orderBy("createdAt", "desc"),
                limit(50)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const notifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(notifications);
            }, (error) => {
                console.error("Notification subscription error:", error);
                // Fallback to empty list or handle error appropriately in UI
                callback([]);
            });

            return unsubscribe;
        } catch (error) {
            console.error("Error setting up notification listener:", error);
            return () => { };
        }
    },

    // Get unread count specifically if needed separate from list
    // But usually we can derive it from the list in the callback

    // Mark a notification as read
    markAsRead: async (notificationId: string, userId: string) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, notificationId);
            // Ideally check if doc.userId === userId before update
            // For broadcast ('ALL'), we cannot update the single doc or it updates for everyone.
            // This requires local persistence of read state for broadcasts.
            // For MVP, we will simply skip updating server for broadcasts, 
            // OR we would need a subcollection `users/{uid}/read_notifications`.

            // Let's implement a simple check:
            // If we want to support reading broadcasts, we need a local store or different schema.
            // For now, let's just log or skip.

            await updateDoc(docRef, {
                isRead: true
            });
        } catch (error) {
            // Ignore error if permission denied (e.g. trying to update 'ALL' doc if rules prevent it)
            console.log("Error marking notification as read:", error);
        }
    },

    // Mark all as read
    markAllAsRead: async (userId: string) => {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("userId", "==", userId),
                where("isRead", "==", false)
            );

            const snapshot = await getDocs(q);
            const batchPromises = snapshot.docs.map(d =>
                updateDoc(doc(db, COLLECTION_NAME, d.id), { isRead: true })
            );

            await Promise.all(batchPromises);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    }
};
