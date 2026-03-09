const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let waitingUser = null;

io.on("connection", socket => {

  console.log("User connected");

  socket.on("join", data => {
    socket.userInfo = data;
    console.log(`${data.name} joined`);
  });

  socket.on("find", () => {
    if(waitingUser && waitingUser !== socket){
      socket.partner = waitingUser;
      waitingUser.partner = socket;

      socket.emit("matched");
      waitingUser.emit("matched");

      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit("status", "Searching for a partner...");
    }
  });

  socket.on("next", () => {
    if(socket.partner){
      socket.partner.emit("partner-left");
      socket.partner.partner = null;
      socket.partner = null;
    }
    socket.emit("status", "Searching for a partner...");
    socket.emit("matched"); // للسماح بالبحث من جديد
  });

  socket.on("message", msg => {
    if(socket.partner) socket.partner.emit("message", msg);
  });

  socket.on("image", data => {
    if(socket.partner) socket.partner.emit("image", data);
  });

  socket.on("offer", data => { if(socket.partner) socket.partner.emit("offer", data); });
  socket.on("answer", data => { if(socket.partner) socket.partner.emit("answer", data); });
  socket.on("ice", data => { if(socket.partner) socket.partner.emit("ice", data); });

  socket.on("disconnect", () => {
    if(waitingUser === socket) waitingUser = null;
    if(socket.partner) socket.partner.emit("partner-left");
  });

});
const PORT = process.env.PORT || 10000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));