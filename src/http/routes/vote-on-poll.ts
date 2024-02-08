import z from "zod";
import { prisma } from "../../lib/prisma";
import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { redis } from "../../lib/redis";
import { voting } from "../../utils/voting-pub-sub";

export async function voteOnPoll(app: FastifyInstance) {
  app.post("/polls/:pollId/votes", async (request, reply) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().cuid(),
    });

    const voteOnPollParams = z.object({
      pollId: z.string().cuid(),
    });

    const { pollId } = voteOnPollParams.parse(request.params);
    const { pollOptionId } = voteOnPollBody.parse(request.body);

    let { sessionId } = request.cookies;

    if (sessionId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: { sessionId_pollId: { sessionId, pollId } },
      });

      if (userPreviousVoteOnPoll) {
        if (userPreviousVoteOnPoll.pollOptionId === pollOptionId) {
          return reply
            .status(400)
            .send({ message: "You already voted on this poll." });
        }
        // Delete previous vote
        await prisma.vote.delete({ where: { id: userPreviousVoteOnPoll.id } });
        const votes = await redis.zincrby(
          pollId,
          -1,
          userPreviousVoteOnPoll.pollOptionId
        );
        voting.publish(pollId, {
          pollOptionId: userPreviousVoteOnPoll.pollOptionId,
          votes: Number(votes),
        });
      }
    }

    if (!sessionId) {
      sessionId = randomUUID();

      reply.setCookie("sessionId", sessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true,
        httpOnly: true,
      });
    }

    const vote = await prisma.vote.create({
      data: { sessionId, pollId, pollOptionId },
    });

    const votes = await redis.zincrby(pollId, 1, pollOptionId);

    voting.publish(pollId, {
      pollOptionId,
      votes: Number(votes),
    });

    return reply.status(201).send({ voteId: vote.id });
  });
}
