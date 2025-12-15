const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));
 app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

const io = require("socket.io")(server, {
  cors: { origin: "*" }
});

let waitingUser = null;
let onlineUsers = 0;

io.on("connection", (socket) => {
  onlineUsers++;
  io.emit("online", onlineUsers);
  console.log("User connected");

  if (waitingUser) {
    socket.partner = waitingUser;
    waitingUser.partner = socket;

    socket.emit("matched", { initiator: true });
    waitingUser.emit("matched", { initiator: false });

    waitingUser = null;
  } else {
    waitingUser = socket;
    socket.emit("waiting");
  }

  socket.on("message", msg => {
    if (socket.partner) socket.partner.emit("message", msg);
  });

  socket.on("offer", d => socket.partner?.emit("offer", d));
  socket.on("answer", d => socket.partner?.emit("answer", d));
  socket.on("ice-candidate", d => socket.partner?.emit("ice-candidate", d));

  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partner_left");
      socket.partner.partner = null;
      socket.partner = null;
    }
    waitingUser = socket;
    socket.emit("waiting");
  });

  socket.on("report", () => {
    console.log("⚠️ User reported");
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("online", onlineUsers);

    if (socket.partner) socket.partner.emit("partner_left");
    if (waitingUser === socket) waitingUser = null;
  });
});

server.listen(5000, () => {
  console.log("SERVER CHAL GAYA");
});
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
