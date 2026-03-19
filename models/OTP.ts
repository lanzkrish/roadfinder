import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IOTP extends Document {
  emailHash: string;   // SHA-256 of the email — for lookup
  otpHash: string;     // bcrypt hash of the 6-digit code
  expiresAt: Date;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    emailHash: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  },
  { timestamps: true }
);

export const OTP = models.OTP ?? model<IOTP>("OTP", OTPSchema);
