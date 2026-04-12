const User = require('../models/user');

// Feature: Submit NID for Verification
exports.submitNidVerification = async (req, res) => {
    try {
        const { userId, nidNumber, frontImageUrl, backImageUrl } = req.body;
        
        // Find user and update their NID object to "pending"
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { 
                nidVerification: { 
                    nidNumber: nidNumber, 
                    frontImageUrl: frontImageUrl, 
                    backImageUrl: backImageUrl, 
                    status: 'pending' 
                } 
            },
            { new: true } // Returns the updated document
        );

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ 
            message: "NID submitted successfully. Awaiting admin approval.", 
            user: updatedUser 
        });
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