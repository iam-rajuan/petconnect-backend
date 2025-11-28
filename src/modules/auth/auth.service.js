const bcrypt = require("bcrypt");
const User = require("./auth.model");

// exports.register = async ({ name, email, phone, password }) => {
//   // At least 1 required
//   if (!email && !phone) {
//     throw new Error("Email or phone must be provided");
//   }

//   const existingUser = await User.findOne({
//     $or: [{ email }, { phone }],
//   });

//   if (existingUser) {
//     throw new Error("User already exists with this email or phone");
//   }

//   const hashedPassword = await bcrypt.hash(password, 10);

//   const user = await User.create({
//     name,
//     email,
//     phone,
//     password: hashedPassword,
//   });

//   return user;
// };

exports.register = async ({ name, email, phone, password }) => {

  // sanitize & normalize
  name = name?.trim();
  email = email?.trim().toLowerCase();
  phone = phone?.trim();
  password = password?.trim();

  // Check: at least one identifier required
  if (!email && !phone) {
    throw new Error("Email or phone is required");
  }

  // check duplicates safely
  const existingUser = await User.findOne({
    $or: [
      email ? { email: email } : null,
      phone ? { phone: phone } : null
    ].filter(Boolean)    // removes null fields
  });

  if (existingUser) {
    throw new Error("User already exists with this email or phone");
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // create user
  const user = await User.create({
    name,
    email,
    phone,
    password: hashedPassword,
  });

  return user;
};


exports.login = async ({ email, phone, password }) => {
  const user = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (!user) {
    throw new Error("User not found");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new Error("Invalid credentials");
  }

  return user;
};
