import axios from "axios";

const FIREBASE_API_KEY = process.env.FIREBASE_WEB_API_KEY;

export const sendFirebaseOtp = async (phone: string) => {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`;

  const resp = await axios.post(url, {
    phoneNumber: phone,
  });

  return resp.data.sessionInfo;
};

export const verifyFirebaseOtp = async (sessionInfo: string, otp: string) => {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`;

  const resp = await axios.post(url, {
    sessionInfo,
    code: otp,
  });

  return resp.data; // contains idToken, phoneNumber, etc.
};
