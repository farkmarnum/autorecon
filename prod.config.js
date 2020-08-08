module.exports = {
  apps: [
    {
      name: 'autorecon',
      script: `${__dirname}/dist/index.js`,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}
