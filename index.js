const express = require("express");
const request = require("request");
const Blockchain = require("./blockchain");
const PubSub = require("./publishsubscribe");

const app = express();
const blockchain = new Blockchain();
const pubsub = new PubSub({ blockchain });

const DEFAULT_PORT = 3000;
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/blocks", (req, res) => {
  res.json(blockchain.chain);
});

app.post("/api/mine", (req, res) => {
  
  const { data } = req.body;
  
  
  if (!data) {
    return res.status(400).json({ error: "Data is required" });
  }
  
  blockchain.addBlock({ data });
  
  const lastBlock = blockchain.chain[blockchain.chain.length - 1];
  console.log(`Broadcasting chain of length: ${blockchain.chain.length}`);
  
  pubsub.broadcastChain();
  res.redirect("/api/blocks");
});

const syncChains = () => {
  request(
    { url: `${ROOT_NODE_ADDRESS}/api/blocks` },
    (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const rootChain = JSON.parse(body);
        console.log("Replace chain on sync with", rootChain);
        blockchain.replaceChain(rootChain, () => {
          console.log("Sync successful - chain replaced");
        });
      } else if (error) {
        console.error("Error syncing chains:", error.message);
      }
    }
  );
};

let PEER_PORT;
if (process.env.GENERATE_PEER_PORT === "true") {
  PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random() * 1000);
}

const PORT = PEER_PORT || DEFAULT_PORT;

app.listen(PORT, () => {
  console.log(`listening to PORT:${PORT}`);
  if (PORT !== DEFAULT_PORT) {
    syncChains();
  }
});

setTimeout(() => pubsub.broadcastChain(), 1000);