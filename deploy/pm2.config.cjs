module.exports = {
  apps: [
    {
      name: "adflow-api",
      script: "./apps/api/dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      log_file: "./logs/api-combined.log",
      out_file: "./logs/api-out.log",
      error_file: "./logs/api-error.log",
      time: true,
    },
  ],
};
