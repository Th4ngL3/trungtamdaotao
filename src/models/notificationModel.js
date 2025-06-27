const { ObjectId } = require("mongodb");

async function notificationModel(db) {
  const notifications = db.collection("notifications");

  return {
    // Create a new notification
    createNotification: (notificationData) =>
      notifications.insertOne({
        ...notificationData,
        createdAt: new Date(),
        readBy: [],
      }),

    // Get notifications for a specific course
    getNotificationsByCourse: (courseId) =>
      notifications
        .find({
          courseId: new ObjectId(courseId),
        })
        .sort({ createdAt: -1 })
        .toArray(),

    // Get all notifications (admin/teacher only)
    getAllNotifications: () =>
      notifications.find().sort({ createdAt: -1 }).toArray(),

    // Get notifications that should be visible to a specific user
    // (course notifications for courses they're enrolled in + global notifications)
    getNotificationsForUser: async (userId, userCourseIds) => {
      // Handle empty course arrays
      const query = {
        $or: [
          { isGlobal: true },
          { createdBy: userId.toString() }, // Include notifications created by the current user
        ],
      };

      // Only add the courseId condition if we have course IDs
      if (userCourseIds && userCourseIds.length > 0) {
        const coursesObjectIds = userCourseIds.map((id) => {
          // Handle if id is already an ObjectId
          return id instanceof ObjectId ? id : new ObjectId(id);
        });

        // Add course IDs to the $or array
        query.$or.push({ courseId: { $in: coursesObjectIds } });
      }

      console.log("Final notification query:", JSON.stringify(query));

      return notifications.find(query).sort({ createdAt: -1 }).toArray();
    },

    // Get notification by ID
    getNotificationById: (id) =>
      notifications.findOne({
        _id: new ObjectId(id),
      }),

    // Mark notification as read by a user
    markAsRead: (notificationId, userId) =>
      notifications.updateOne(
        { _id: new ObjectId(notificationId) },
        { $addToSet: { readBy: userId } }
      ),

    // Mark all notifications as read for a user
    markAllAsRead: (userId, courseIds) => {
      // Base filter for unread notifications
      const filter = {
        readBy: { $ne: userId },
      };

      // Add course condition only if we have course IDs
      if (courseIds && courseIds.length > 0) {
        const coursesObjectIds = courseIds.map((id) => {
          return id instanceof ObjectId ? id : new ObjectId(id);
        });

        filter.$or = [
          { courseId: { $in: coursesObjectIds } },
          { isGlobal: true },
        ];
      } else {
        // If no courses, only mark global notifications
        filter.isGlobal = true;
      }

      return notifications.updateMany(filter, {
        $addToSet: { readBy: userId },
      });
    },

    // Delete notification
    deleteNotification: (id) =>
      notifications.deleteOne({
        _id: new ObjectId(id),
      }),

    // Update notification
    updateNotification: (id, updateData) =>
      notifications.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      ),

    // Get unread notifications count for a user
    getUnreadCount: async (userId, userCourseIds) => {
      // Base query for unread notifications
      const query = {
        readBy: { $ne: userId },
      };

      // Add course condition only if we have course IDs
      if (userCourseIds && userCourseIds.length > 0) {
        const coursesObjectIds = userCourseIds.map((id) => {
          return id instanceof ObjectId ? id : new ObjectId(id);
        });

        query.$or = [
          { courseId: { $in: coursesObjectIds } },
          { isGlobal: true },
        ];
      } else {
        // If no courses, only show global notifications
        query.isGlobal = true;
      }

      const count = await notifications.countDocuments(query);
      return count;
    },

    // Get unread notifications for a user
    getUnreadNotifications: async (userId, userCourseIds) => {
      // Base query for unread notifications
      const query = {
        readBy: { $ne: userId },
      };

      // Add course condition only if we have course IDs
      if (userCourseIds && userCourseIds.length > 0) {
        const coursesObjectIds = userCourseIds.map((id) => {
          return id instanceof ObjectId ? id : new ObjectId(id);
        });

        query.$or = [
          { courseId: { $in: coursesObjectIds } },
          { isGlobal: true },
        ];
      } else {
        // If no courses, only show global notifications
        query.isGlobal = true;
      }

      return notifications.find(query).sort({ createdAt: -1 }).toArray();
    },
  };
}

module.exports = notificationModel;
