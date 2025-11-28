// const express = require("express");
// const router = express.Router();
// const authController = require("./auth.controller");

// router.post("/register", authController.register);
// router.post("/login", authController.login);

// module.exports = router;


// const auth = require("../../middlewares/auth.middleware");

// // GET /auth/me
// router.get("/me", auth, (req, res) => {
//   res.json({
//     success: true,
//     message: "User authenticated",
//     user: req.user, // token decoded data
//   });
// });





// const express = require("express");
// const router = express.Router();
// const authController = require("./auth.controller");
// const auth = require("../../middlewares/auth.middleware");

// router.post("/register", authController.register);
// router.post("/login", authController.login);

// // Protected
// router.get("/me", auth, (req, res) => {
//   res.json({
//     success: true,
//     message: "User authenticated",
//     user: req.user,
//   });
// });

// module.exports = router;




const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const validate = require("../../middlewares/validate.middleware");
const { registerSchema, loginSchema } = require("./auth.validation");
const auth = require("../../middlewares/auth.middleware");

// Register
router.post("/register", validate(registerSchema), authController.register);

// Login
router.post("/login", validate(loginSchema), authController.login);

// Protected route
router.get("/me", auth, (req, res) => {
  res.json({
    success: true,
    message: "User authenticated",
    user: req.user,
  });
});

module.exports = router;
