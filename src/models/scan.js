import mongoose, { Schema } from 'mongoose'

const schema = new Schema(
  {
    scan: {
      required: true,
      type: Map, // domain
      of: {
        type: Map, // subdomain
        of: {
          type: Map, // port
          of: {
            service: String,
          },
        },
      },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
)

mongoose.model('scan', schema)

/*

For example:

const scan = {
  "google.com": {
    "google.com": {
      "80": { service: 'HTTP' },
      "443": { service: 'HTTPS' },
    },
    "mail.google.com": {
      "80": { service: 'HTTP' },
      "443": { service: 'HTTPS' },
      "25": { service: 'SMTP' },
    },
  },
  "anothersite.org" : {
    "admin.anothersite.org" : {}
  },
  // etc...
}

*/
