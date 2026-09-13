// @ts-nocheck
import mongoose from 'mongoose';

const ProjectRemarkSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      trim: true,
      required: true,
    },
    content: {
      type: String,
      trim: true,
      required: [true, 'Remark content is required.'],
      maxlength: [2000, 'Remark cannot exceed 2000 characters.'],
    },
  },
  { timestamps: true }
);

const ProjectFileSchema = new mongoose.Schema(
  {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedByName: {
      type: String,
      trim: true,
      required: true,
    },
    originalName: {
      type: String,
      trim: true,
      required: true,
    },
    storedName: {
      type: String,
      trim: true,
      required: true,
    },
    mimeType: {
      type: String,
      trim: true,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
      trim: true,
      required: true,
    },
  },
  { timestamps: true }
);

const ProjectHistoryEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: {
      type: String,
      trim: true,
      required: true,
    },
  },
  { timestamps: true }
);

const ProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required.'],
      trim: true,
      maxlength: [120, 'Project title cannot exceed 120 characters.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [4000, 'Project description cannot exceed 4000 characters.'],
    },
    projectCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Project code cannot exceed 20 characters.'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [80, 'Category cannot exceed 80 characters.'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'],
      default: 'planning',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedInterns: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    remarks: [ProjectRemarkSchema],
    history: [ProjectHistoryEntrySchema],
    files: [ProjectFileSchema],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProjectSchema.index({ lead: 1, status: 1 });
ProjectSchema.index({ assignedInterns: 1 });

export default mongoose.model('Project', ProjectSchema);
