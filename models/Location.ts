import mongoose, { Schema, Document, Types, models, model } from "mongoose";

export interface ILocation extends Document {
  userId: Types.ObjectId;
  coordinates: { lat: number; lng: number };
  distanceKm: number;
  terrainType: string;
  footfallScore: number; // 0–100, higher = more hidden
  notes: string;
  imageUrl: string;
  dateExplored: Date;
  createdAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coordinates: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
    },
    distanceKm: { type: Number, default: 0 },
    terrainType: { type: String, default: "Open Land", maxlength: 64 },
    footfallScore: { type: Number, default: 50, min: 0, max: 100 },
    notes: { type: String, default: "", maxlength: 2000 },
    imageUrl: { type: String, default: "" },
    dateExplored: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Location =
  models.Location ?? model<ILocation>("Location", LocationSchema);
