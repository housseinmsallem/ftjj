module.exports = {
  apps: [{
    name: 'ftjj-api',
    cwd: './backend',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: 5000 },
    max_memory_restart: '700M',
    error_file: '/var/log/ftjj/api-error.log',
    out_file: '/var/log/ftjj/api-out.log'
  }]
};
