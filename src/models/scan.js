import mongoose, { Schema } from 'mongoose'

const schema = new Schema(
  {
    entries: {
      type: [String],
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
)

mongoose.model('scan', schema)
