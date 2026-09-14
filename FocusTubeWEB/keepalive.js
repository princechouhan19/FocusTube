const https = require("https");
const URL = "https://focustube-web.onrender.com";

console.log(`[Keepalive] Starting keepalive ping to ${URL}`);

function ping() {
  // Random delay between 40 and 45 seconds (40000 to 45000 ms)
  const delay = Math.floor(Math.random() * (45000 - 40000 + 1) + 40000);
  
  setTimeout(() => {
    try {
      const protocol = URL.startsWith("https") ? require("https") : require("http");
      protocol.get(URL, (res) => {
        console.log(`[Keepalive] Pinged ${URL} - Status: ${res.statusCode}`);
      }).on("error", (err) => {
        console.error(`[Keepalive] Ping failed: ${err.message}`);
      });
    } catch (err) {
      console.error(`[Keepalive] Error: ${err.message}`);
    }
    
    // Schedule next ping
    ping();
  }, delay);
}

// Start the loop
ping();

