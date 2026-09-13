// @ts-nocheck
import asyncHandler from '../utils/asyncHandler.js';
import Setting, { DEFAULT_PLATFORM_SETTINGS } from '../models/Setting.js';

const allowedKeys = Object.keys(DEFAULT_PLATFORM_SETTINGS);

const sanitizeSettings = (payload = {}) => {
  const next = {};

  for (const key of allowedKeys) {
    if (payload[key] !== undefined) {
      next[key] = payload[key];
    }
  }

  return { ...DEFAULT_PLATFORM_SETTINGS, ...next };
};

export const getSettings = asyncHandler(async (req, res) => {
  let record = await Setting.findOne({ key: 'platform' }).lean();

  if (!record) {
    record = await Setting.create({ key: 'platform', values: DEFAULT_PLATFORM_SETTINGS });
  }

  res.status(200).json({
    success: true,
    data: { ...DEFAULT_PLATFORM_SETTINGS, ...(record.values || {}) },
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const payload = sanitizeSettings(req.body || {});

  const record = await Setting.findOneAndUpdate(
    { key: 'platform' },
    { key: 'platform', values: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    success: true,
    data: { ...DEFAULT_PLATFORM_SETTINGS, ...(record.values || {}) },
  });
});
