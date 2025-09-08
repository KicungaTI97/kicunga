import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import z from 'zod';
import { db } from '../database.js';
import { CheckSessionIdExists } from '../middlewares/check-session-id-exists.js';

export async function transactionsRoutes(app: FastifyInstance) {
	app.get(
		'/',
		{
			preHandler: [CheckSessionIdExists],
		},
		async (request:FastifyRequest) => {
			const { sessionId } = request.cookies;

			const transactions = await db('transactions')
				.where('session_id', sessionId)
				.select('*');

			return { transactions };
		},
	);

	app.get('/:id', async (request:FastifyRequest, reply:FastifyReply) => {
		const getTransactionParamsSchema = z.object({
			id: z.string().uuid(),
		});

		const { id } = getTransactionParamsSchema.parse(request.params);
		const { sessionId } = request.cookies;

		const transaction = await db('transactions')
			.where({
				id,
				session_id: sessionId,
			})
			.first();

		if (!transaction) {
			return reply.status(404).send({ message: 'Transaction not found' });
		}
		return { transaction };
	});

	app.get(
		'/summary',
		{
			preHandler: [CheckSessionIdExists],
		},
		async (request:FastifyRequest) => {
			const { sessionId } = request.cookies;

			const summary = await db('transactions')
				.where('session_id', sessionId)
				.sum('amount', { as: 'amount' })
				.first();

			return { summary };
		},
	);

	app.post(
		'/',
		async (request:FastifyRequest, reply:FastifyReply) => {
			const createTransactionBodySchema = z.object({
				title: z.string(),
				amount: z.number(),
				type: z.enum(['credit', 'debit']),
			});

			const { amount, title, type } = createTransactionBodySchema.parse(
				request.body,
			);

			let sessionId = request.cookies.sessionId;

			if (!sessionId) {
				sessionId = crypto.randomUUID();

				reply.cookie('sessionId', sessionId, {
					path: '/',
					maxAge: 60 * 60 * 24 * 7, // 7 days
				});
			}

			await db('transactions')
				.insert({
					id: crypto.randomUUID(),
					title,
					amount: type === 'credit' ? amount : amount * -1,
					type,
					session_id: sessionId,
				})
				.returning('*');

			return reply
				.status(201)
				.send({ message: 'Transaction created successfully' });
		},
	);
}
