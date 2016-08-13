module.exports = {
  port: process.env.PORT || 3000,
  mongoURL:
    process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL ||
    process.env.MONGODB_URI ||
    'mongodb://localhost/mainstream_api',
};
