module.exports = {
  build: {
    "index.html": "index.html",
    "customer.html": "customer.html",
    "bank.html": "bank.html",
    "merchant.html": "merchant.html",
    "app.js": [
        "javascripts/app.js",
        "javascripts/customer.js",
        "javascripts/bank.js",
        "javascripts/merchant.js",
        "javascripts/utils.js"
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
