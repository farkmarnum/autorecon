import requireDir from 'require-dir'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

export const init = async () => {
  await requireDir(`${__dirname}/../models`)

  console.info(require('os').networkInterfaces())

  await mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
}
