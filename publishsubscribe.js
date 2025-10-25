const redis = require("redis");

const CHANNELS = {
  TEST: "TEST",
  BLOCKCHAIN: "BLOCKCHAIN",
};

class PubSub {
  constructor({ blockchain }) {
    this.blockchain = blockchain;
    this.publisher = redis.createClient();
    this.subscriber = this.publisher.duplicate();
    
    this.initialize();
  }

  async initialize() {
    try {
      await this.publisher.connect();
      await this.subscriber.connect();


      await this.subscribeToChannels();

      console.log("Redis clients connected and subscribed");
    } catch (error) {
      console.error("Redis initialization error:", error);
    }

    this.publisher.on("error", (err) => {
      console.error("Publisher Redis Error:", err);
    });

    this.subscriber.on("error", (err) => {
      console.error("Subscriber Redis Error:", err);
    });
  }

  async subscribeToChannels() {
    for (const channel of Object.values(CHANNELS)) {
      await this.subscriber.subscribe(channel, (message) => {
        this.handleMessage(channel, message);
      });
    }
  }

  handleMessage(channel, message) {
    console.log(`Message received. Channel: ${channel}`);
    
    if (channel === CHANNELS.BLOCKCHAIN) {
      try {
        const parsedMessage = JSON.parse(message);
        
        if (parsedMessage.length > this.blockchain.chain.length) {
          console.log(`Received longer chain of length ${parsedMessage.length}`);
          this.blockchain.replaceChain(parsedMessage, () => {
            console.log('Chain replaced successfully');
          });
        }
      } catch (error) {
        console.error("Error parsing message:", error.message);
      }
    }
  }

  async publish({ channel, message }) {
    try {
      await this.publisher.publish(channel, message);
    } catch (error) {
      console.error("Error publishing message:", error);
    }
  }

  broadcastChain() {
    console.log(`Broadcasting chain of length: ${this.blockchain.chain.length}`);
    this.publish({
      channel: CHANNELS.BLOCKCHAIN,
      message: JSON.stringify(this.blockchain.chain),
    });
  }
}

module.exports = PubSub;