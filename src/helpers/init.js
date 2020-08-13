import requireDir from 'require-dir'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

process.on('unhandledRejection', (err) => {
  throw err
})

dotenv.config()

const MAX_ATTEMPTS = 10

const connect = async (attempt = 0) => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
  } catch (err) {
    console.error(err)

    const newAttempt = attempt + 1
    if (newAttempt > MAX_ATTEMPTS) {
      console.error(`Connection failed after ${MAX_ATTEMPTS} attempts`)
      throw new Error(err)
    }

    const waitTime = 5
    console.error(`Waiting ${waitTime} seconds...`)
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    await wait(waitTime * 1000)

    console.error('Retrying...')
    await connect(newAttempt)
  }
}

export const init = async () => {
  await requireDir(`${__dirname}/../models`)

  await connect()
}

export const exit = async () => {
  mongoose.disconnect()
}
