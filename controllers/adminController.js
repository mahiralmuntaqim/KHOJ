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