import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IUser extends Document {
  emailHash: string;       // SHA-256 of email — unique, indexed, for lookups
  emailEncrypted: string;  // AES-256-GCM ciphertext of email
  passwordHash: string;
  name: string;
  isVerified: boolean;     // true once OTP is confirmed
  createdAt: Date;
  lastExplored: Date | null;
  explorationStreak: number;
  totalExplored: number;
}

const UserSchema = new Schema<IUser>(
  {
    emailHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    emailEncrypted: { type: String, required: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 64 },
    isVerified: { type: Boolean, default: false },
    lastExplored: { type: Date, default: null },
    explorationStreak: { type: Number, default: 0 },
    totalExplored: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Strip sensitive fields from JSON output
UserSchema.methods.toJSON = function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: Record<string, any> = this.toObject({ versionKey: false });
  delete obj.passwordHash;
  delete obj.emailHash;
  delete obj.emailEncrypted;
  return obj;
};

export const User = models.User ?? model<IUser>("User", UserSchema);
