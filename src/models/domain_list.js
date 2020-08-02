import mongoose, { Schema } from 'mongoose'

const schema = new Schema(
  {
    domains: [String],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
)

mongoose.model('domain_list', schema)
