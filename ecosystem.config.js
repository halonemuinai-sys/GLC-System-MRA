module.exports = {
  apps: [
    {
      name: 'glc-backend',
      script: 'api/index.js',
      cwd: '/var/www/glc-system/GLC-System-MRA/backend',
      watch: false,
      env: {
        PORT: 5005,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'glc-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/glc-system/GLC-System-MRA/frontend',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
