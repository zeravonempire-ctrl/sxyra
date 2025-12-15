const express = require("express");
const path = require("path");
const http = require("http");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

const io = require("socket.io")(server, {
  cors: { origin: "*" }
});

let waitingSocket = null;
let online = 0;

io.on("connection", socket => {
  online++;
  io.emit("online", online);
  console.log("Connected:", socket.id);

  if (waitingSocket && waitingSocket.connected && waitingSocket !== socket) {
    socket.partner = waitingSocket;
    waitingSocket.partner = socket;

    socket.emit("matched", { initiator: true });
    waitingSocket.emit("matched", { initiator: false });

    waitingSocket = null;
  } else {
    waitingSocket = socket;
    socket.emit("waiting");
  }

  socket.on("message", msg => socket.partner?.emit("message", msg));
  socket.on("typing", () => socket.partner?.emit("typing"));

  socket.on("offer", d => socket.partner?.emit("offer", d));
  socket.on("answer", d => socket.partner?.emit("answer", d));
  socket.on("ice-candidate", d => socket.partner?.emit("ice-candidate", d));

  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partner_left");
      socket.partner.partner = null;
      socket.partner = null;
    }
    if (waitingSocket === socket) waitingSocket = null;
    waitingSocket = socket;
    socket.emit("waiting");
  });

  socket.on("disconnect", () => {
    online--;
    io.emit("online", online);
    if (waitingSocket === socket) waitingSocket = null;
    if (socket.partner) socket.partner.emit("partner_left");
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("SERVER CHAL GAYA on", PORT);
});
