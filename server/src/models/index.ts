import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IUser extends Document {
  emailHash: string;
  emailEncrypted: string;
  passwordHash: string;
  name: string;
  isVerified: boolean;
  explorationStreak: number;
  totalExplored: number;
  lastExplored: Date | null;
}

const UserSchema = new Schema<IUser>(
  {
    emailHash: { type: String, required: true, unique: true, index: true },
    emailEncrypted: { type: String, required: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 64 },
    isVerified: { type: Boolean, default: false },
    explorationStreak: { type: Number, default: 0 },
    totalExplored: { type: Number, default: 0 },
    lastExplored: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.methods.toJSON = function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: Record<string, any> = this.toObject({ versionKey: false });
  delete obj.passwordHash;
  delete obj.emailHash;
  delete obj.emailEncrypted;
  return obj;
};

export const User = models.User ?? model<IUser>("User", UserSchema);

// ── OTP ───────────────────────────────────────────────────────────────────────
export interface IOTP extends Document {
  emailHash: string;
  otpHash: string;
  expiresAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    emailHash: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export const OTP = models.OTP ?? model<IOTP>("OTP", OTPSchema);

// ── Location ──────────────────────────────────────────────────────────────────
export interface ILocation extends Document {
  userId: mongoose.Types.ObjectId;
  coordinates: { lat: number; lng: number };
  distanceKm: number;
  terrainType: string;
  footfallScore: number;
  notes?: string;
  imageUrl?: string;
  dateExplored: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    distanceKm: { type: Number, required: true },
    terrainType: { type: String, default: "unknown" },
    footfallScore: { type: Number, default: 50, min: 0, max: 100 },
    notes: { type: String, maxlength: 2000 },
    imageUrl: { type: String },
    dateExplored: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Location = models.Location ?? model<ILocation>("Location", LocationSchema);
