const User = require('../user');

const signIn = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone and password are required' });
    }

    let user = await User.findOne({ phone });

    if (user) {
      if (user.password !== password) {
        return res.status(401).json({ message: 'Invalid phone or password' });
      }

      return res.status(200).json({
        message: 'Signed in successfully',
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role
        }
      });
    }

    user = await User.create({
      name: name || 'KHOJ Customer',
      phone,
      password,
      role: role || 'customer'
    });

    return res.status(201).json({
      message: 'Account created and signed in successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('signIn error:', error);
    return res.status(500).json({ message: 'Unable to sign in', error: error.message });
  }
};

module.exports = {
  signIn
};
