const EventEmitter = require("events");
const http = require("http");

class Sales extends EventEmitter {
  constructor() {
    super();
  }
}

const myEmitter = new Sales();

myEmitter.on("newSale", () => {
  console.log("There was a new sale");
});

myEmitter.on("newSale", () => {
  console.log("Customer name");
});

myEmitter.on("newSale", (stock) => {
  console.log(`There are ${stock} items`);
});

myEmitter.emit("newSale", 9);

///////////////////////

const server = http.createServer();
server.on("request", (req, res) => {
  console.log("Request received");
  res.end("Dummy");
});
