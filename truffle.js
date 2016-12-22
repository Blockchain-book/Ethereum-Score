module.exports = {
  build: {
    "index.html": "index.html",
    "test.html": "test.html",
    "customer.html": "customer.html",
    "app.js": [
        "javascripts/app.js",
        "javascripts/customer.js"
    ],
    "app.css": [
      "stylesheets/app.css"
    ],
    "images/": "images/"
  },
  rpc: {
    host: "localhost",
    port: 8545
  }
};
