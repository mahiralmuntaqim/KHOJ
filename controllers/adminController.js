const User = require('../models/user');
const Booking = require('../models/booking');

// Feature: Admin Dashboard Analytics
exports.getDashboardStats = async (req, res) => {
    try {
        // Pipeline 1: Count users by role
        const userDemographics = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        // Pipeline 2: Calculate total revenue from completed & paid bookings
        const revenueStats = await Booking.aggregate([
            { $match: { status: 'completed', "payment.status": 'paid' } },
            { 
                $group: { 
                    _id: null, 
                    totalPlatformRevenue: { $sum: "$payment.amount" },
                    successfulTransactions: { $sum: 1 }
                } 
            }
        ]);

        res.status(200).json({ 
            success: true, 
            data: {
                demographics: userDemographics, 
                financials: revenueStats[0] || { totalPlatformRevenue: 0, successfulTransactions: 0 }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch dashboard analytics" });
    }
};
// Feature: Get Lists of Pending and Verified NIDs
exports.getNidList = async (req, res) => {
    try {
        // Fetch users whose NID status is either pending or verified
        const users = await User.find({
            "nidVerification.status": { $in: ["pending", "verified"] }
        }).select("name phone role nidVerification");

        // Separate them into two arrays
        const pending = users.filter(u => u.nidVerification.status === 'pending');
        const verified = users.filter(u => u.nidVerification.status === 'verified');

        res.status(200).json({ success: true, pending, verified });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch NID lists" });
    }
};

// Feature: Reject NID
exports.rejectNid = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        
        if (!user) return res.status(404).json({ message: "User not found" });

        // Change status to rejected
        user.nidVerification.status = 'rejected';
        await user.save();
        
        res.status(200).json({ message: "NID Rejected successfully.", user });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
};
// Feature: Admin Approves NID
exports.approveNid = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        
        if (!user) return res.status(404).json({ message: "User not found" });

        // Change status to verified and award a badge
        user.nidVerification.status = 'verified';
        if (!user.badges.includes('Verified Provider')) {
            user.badges.push('Verified Provider');
        }
        
        await user.save();
        res.status(200).json({ message: "User identity verified successfully.", user });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
};