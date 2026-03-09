const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*", methods: ["GET","POST"] } 
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let waitingUsers = [];

io.on("connection", socket => {

  console.log("User connected");

  socket.on("join", data => {
    socket.userInfo = data;
    console.log(`${data.name} joined`);
  });

  socket.on("find", () => {

    // إزالة أي ظهور سابق للمستخدم في قائمة الانتظار
    waitingUsers = waitingUsers.filter(s => s !== socket);

    // البحث عن شريك
    if(waitingUsers.length > 0){
        const partner = waitingUsers.shift(); // أول شخص في القائمة
        socket.partner = partner;
        partner.partner = socket;

        socket.emit("matched");
        partner.emit("matched");

    } else {
        waitingUsers.push(socket);
        socket.emit("status","Searching for a partner...");
    }

  });

  socket.on("next", () => {
    if(socket.partner){
        socket.partner.emit("partner-left");
        socket.partner.partner = null;
        socket.partner = null;
    }
    socket.emit("status","Searching for a new partner...");
    socket.emit("find"); // البحث مرة أخرى
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
      // إزالة من قائمة الانتظار إذا موجود
      waitingUsers = waitingUsers.filter(s => s !== socket);
      if(socket.partner){
          socket.partner.emit("partner-left");
          socket.partner.partner = null;
      }
  });

});
const PORT = process.env.PORT || 10000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));