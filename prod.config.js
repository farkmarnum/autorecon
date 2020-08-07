module.exports = {
  apps: [
    {
      name: 'autorecon',
      script: `${__dirname}/dist/index.js`,
      watch: false,
      instances: 1,
    },
  ],
}
