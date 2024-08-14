const mongoose = require("mongoose");
const Document = require("./Document");
const http = require("http");
const socketIo = require("socket.io");
const os = require('os');

const PORT = 3001;

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("Could not connect to MongoDB", err));

// Create HTTP server
const server = http.createServer();
const io = socketIo(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

const defaultValue = "";

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("get-document", async (documentId) => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit("load-document", document.data);
    console.log("Document loaded:", documentId);

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  let document = await Document.findById(id);
  if (!document) {
    document = await Document.create({ _id: id, data: defaultValue });
  }

  function getLocalIPAddress() {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName];
    for (const address of addresses) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  return 'Local IP address not found';
}

// Print the local IP address
console.log('Sharing link:', getLocalIPAddress()+`:3000/documents/${document._id}`);
  return document;
}

// Start the server
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
