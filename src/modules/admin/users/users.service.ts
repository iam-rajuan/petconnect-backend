import User, { IUser } from "../../user/users/user.model";
import RefreshToken from "../../user/auth/refreshToken.model";

export const listPetOwners = async (): Promise<IUser[]> => {
  return User.find({ role: "user" }).sort({ createdAt: -1 });
};

export const getPetOwnerById = async (userId: string): Promise<IUser> => {
  const user = await User.findOne({ _id: userId, role: "user" });
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

export const deletePetOwner = async (userId: string): Promise<void> => {
  const user = await User.findOne({ _id: userId, role: "user" });
  if (!user) {
    throw new Error("User not found");
  }
  await RefreshToken.deleteMany({ user: user._id });
  await user.deleteOne();
};
