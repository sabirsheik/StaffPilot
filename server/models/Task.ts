// @ts-nocheck
import mongoose from 'mongoose';

const TaskSubmissionSchema = new mongoose.Schema(
  {
    summary: {
      type: String,
      trim: true,
      maxlength: [5000, 'Submission summary cannot exceed 5000 characters.'],
      default: '',
    },
    file: {
      originalName: { type: String, trim: true },
      storedName: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      size: { type: Number },
      path: { type: String, trim: true },
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
  },
  { _id: false }
);

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required.'],
      trim: true,
      maxlength: [120, 'Task title cannot exceed 120 characters.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [4000, 'Task description cannot exceed 4000 characters.'],
      default: '',
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assigneeIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    assigneeName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Assignee name cannot exceed 100 characters.'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teamLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    submission: {
      type: TaskSubmissionSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ createdBy: 1, status: 1 });
TaskSchema.index({ assigneeId: 1, status: 1 });
TaskSchema.index({ teamLeadId: 1, dueDate: 1 });

export default mongoose.model('Task', TaskSchema);
