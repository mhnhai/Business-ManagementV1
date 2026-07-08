module.exports = {
  proxy: 'http://localhost:3000',
  files: ['src/**/*.{ts,html,css,js}'],
  ignore: ['node_modules'],
  port: 3100,
  ui: {
    port: 3101,
  },
  open: false,
  notify: false,
};
