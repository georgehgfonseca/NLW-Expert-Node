import { FastifyInstance } from "fastify";
import { voting } from "../../utils/voting-pub-sub";
import z from "zod";

export async function pollResults(app: FastifyInstance) {
  app.get(
    "/polls/:pollId/results",
    { websocket: true },
    (connection, request) => {
      // Run when the connection is create
      // Validate input
      const getPollParams = z.object({
        pollId: z.string().cuid(),
      });
      const { pollId } = getPollParams.parse(request.params);

      // Subscribe only in messagens published in the channed that has this pollId
      voting.subscribe(pollId, (message) => {
        console.log(message);
        connection.socket.send(JSON.stringify(message));
      });

      // Handle messagens from client
      //   connection.socket.on("message", (message: string) => {
      //     connection.socket.send("you sent:" + message);
      //     // After connectino, send message to the client at each 1 sec interval
      //     setInterval(() => {
      //       connection.socket.send("Hello!");
      //     }, 1000);
      //   });
    }
  );
}

// Pub/Sub publish/subscribe - used in apps to handle events

// Channel - categorize messages to direct it to its subscribers
