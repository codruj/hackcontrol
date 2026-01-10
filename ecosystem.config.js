module.exports = {
  apps: [{
    name: 'hackathons',
    script: 'npm',
    args: 'start',  // NOT 'dev'
    cwd: '/home/hackathons/apps/hack1',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
