const Message = require('../models/Message');
const User    = require('../models/User');

const ok  = (res, data, msg = 'Success', code = 200) => res.status(code).json({ success: true,  message: msg, ...data });
const err = (res, msg = 'Error',   code = 400)       => res.status(code).json({ success: false, message: msg });

// ─────────────────────────────────────────────────────────
// SEND a message
// POST /api/messages/send
// ─────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, bookingId } = req.body;
    if (!receiverId || !content?.trim()) return err(res, 'receiverId and content are required');

    const receiver = await User.findById(receiverId);
    if (!receiver) return err(res, 'Recipient not found', 404);

    const message = await Message.create({
      sender:   req.user._id,
      receiver: receiverId,
      booking:  bookingId || null,
      content:  content.trim(),
      messageType: 'text'
    });

    const populated = await Message.findById(message._id)
      .populate('sender',   'name role avatar')
      .populate('receiver', 'name role avatar');

    return ok(res, { message: populated }, 'Message sent', 201);
  } catch (e) {
    console.error('sendMessage error:', e.message);
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// GET conversation between me and another user
// GET /api/messages/conversation/:userId
// ─────────────────────────────────────────────────────────
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: me,     receiver: userId },
        { sender: userId, receiver: me     }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender',   'name role avatar')
    .populate('receiver', 'name role avatar');

    // Mark their messages to me as read
    await Message.updateMany(
      { sender: userId, receiver: me, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return ok(res, { messages, otherUserId: userId });
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// GET all my conversations (inbox — latest message per person)
// GET /api/messages/inbox
// ─────────────────────────────────────────────────────────
exports.getInbox = async (req, res) => {
  try {
    const me = req.user._id.toString();

    // Get all messages involving me
    const messages = await Message.find({
      $or: [{ sender: me }, { receiver: me }]
    })
    .sort({ createdAt: -1 })
    .populate('sender',   'name role avatar')
    .populate('receiver', 'name role avatar')
    .populate('booking',  'bookingRef status');

    // Group by other person — keep only the latest message per conversation
    const conversations = {};
    for (const msg of messages) {
      const otherId = msg.sender._id.toString() === me
        ? msg.receiver._id.toString()
        : msg.sender._id.toString();

      if (!conversations[otherId]) {
        const otherUser = msg.sender._id.toString() === me ? msg.receiver : msg.sender;
        conversations[otherId] = {
          otherUser,
          lastMessage: msg,
          unreadCount: 0
        };
      }
    }

    // Count unread messages per conversation
    for (const otherId of Object.keys(conversations)) {
      conversations[otherId].unreadCount = await Message.countDocuments({
        sender:   otherId,
        receiver: me,
        isRead:   false
      });
    }

    return ok(res, { conversations: Object.values(conversations) });
  } catch (e) {
    console.error('getInbox error:', e.message);
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// GET unread message count
// GET /api/messages/unread-count
// ─────────────────────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiver: req.user._id, isRead: false });
    return ok(res, { unreadCount: count });
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// GET booking notifications for provider
// GET /api/messages/booking-notifications
// ─────────────────────────────────────────────────────────
exports.getBookingNotifications = async (req, res) => {
  try {
    const notifications = await Message.find({
      receiver:    req.user._id,
      messageType: 'booking_notification'
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('sender', 'name phone');

    return ok(res, { notifications });
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};
