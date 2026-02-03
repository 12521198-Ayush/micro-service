module.exports = {
  apps: [
    {
      name: 'user-service',
      cwd: '/var/www/html/microservices-nyife/micro-service/user-service',
      script: 'src/app.js',
      interpreter: 'node',
      node_args: '--experimental-modules',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/user-service-error.log',
      out_file: '/var/log/pm2/user-service-out.log',
      time: true
    },
    {
      name: 'contact-service',
      cwd: '/var/www/html/microservices-nyife/micro-service/Contact Service',
      script: 'src/app.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/contact-service-error.log',
      out_file: '/var/log/pm2/contact-service-out.log',
      time: true
    },
    {
      name: 'campaign-service',
      cwd: '/var/www/html/microservices-nyife/micro-service/campaign-service',
      script: 'src/app.js',
      interpreter: 'node',
      node_args: '--experimental-modules',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/campaign-service-error.log',
      out_file: '/var/log/pm2/campaign-service-out.log',
      time: true
    },
    {
      name: 'template-service',
      cwd: '/var/www/html/microservices-nyife/micro-service/template-service',
      script: 'src/app.js',
      interpreter: 'node',
      node_args: '--experimental-modules',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/template-service-error.log',
      out_file: '/var/log/pm2/template-service-out.log',
      time: true
    },
    {
      name: 'team-service',
      cwd: '/var/www/html/microservices-nyife/micro-service/team-services',
      script: 'src/app.js',
      interpreter: 'node',
      node_args: '--experimental-modules',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/team-service-error.log',
      out_file: '/var/log/pm2/team-service-out.log',
      time: true
    },
    {
      name: 'whatsapp-service',
      cwd: '/var/www/html/microservices-nyife/micro-service/whatsapp-service',
      script: 'src/app.js',
      interpreter: 'node',
      node_args: '--experimental-modules',
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/whatsapp-service-error.log',
      out_file: '/var/log/pm2/whatsapp-service-out.log',
      time: true
    },
    {
      name: 'kafka-service',
      cwd: '/var/www/html/microservices-nyife/micro-service/kafka-service',
      script: 'src/app.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 3007
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/kafka-service-error.log',
      out_file: '/var/log/pm2/kafka-service-out.log',
      time: true
    },
    {
      name: 'frontend',
      cwd: '/var/www/html/microservices-nyife/micro-service/frontend/javascript-version',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/frontend-error.log',
      out_file: '/var/log/pm2/frontend-out.log',
      time: true
    }
  ]
};
