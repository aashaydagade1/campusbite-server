import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export function configureSocket(io: Server) {
  io.use((socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || "");
      const user = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; role: string };
      socket.data.user = user;
      next();
    } catch { next(new Error("Unauthorized")); }
  });
  io.on("connection", socket => {
    const user = socket.data.user as { id:number; role:string };
    socket.join(`user:${user.id}`);
    if (user.role === "vendor") socket.join("vendors");
  });
}
