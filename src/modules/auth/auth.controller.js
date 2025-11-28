const jwt = require("jsonwebtoken");
const authService = require("./auth.service");

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const user = await authService.register({
      name,
      email,
      phone,
      password,
    });

    res.json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    const user = await authService.login({ email, phone, password });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
