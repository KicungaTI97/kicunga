import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { db } from '../src/database';

describe('Transactions routes', () => {
	beforeAll(async () => {
		await app.ready();

		await db.migrate.latest();
	});
	beforeEach(async () => {
		await db('transactions').delete();
	});

	afterAll(async () => {
		await app.close();

		await db.destroy();
	});
	it('should be able to create a new transaction', async () => {
		await request(app.server)
			.post('/transactions')
			.send({
				title: 'New Transaction',
				amount: 5000,
				type: 'credit',
			})
			.expect(201);
	});

	it('should be able to list all transactions', async () => {
		const createTransactionResponse = await request(app.server)
			.post('/transactions')
			.send({
				title: 'New Transaction',
				amount: 5000,
				type: 'credit',
			})
			.expect(201);

		const cookies = createTransactionResponse.get('Set-Cookie');

		const listTransactionsResponse = await request(app.server)
			.get('/transactions')
			.set('Cookie', cookies ?? [])
			.expect(200);

		expect(listTransactionsResponse.body.transactions).toEqual([
			expect.objectContaining({
				title: 'New Transaction',
				amount: 5000,
			}),
		]);
	});

  it('should be able to get a specific transaction', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New Transaction',
        amount: 5000,
        type: 'credit',
      })
      .expect(201);

    const cookies = createTransactionResponse.get('Set-Cookie');

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies ?? [])
      .expect(200);

    const transactionId = listTransactionsResponse.body.transactions[0].id;

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies ?? [])
      .expect(200);

    expect(getTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        title: 'New Transaction',
        amount: 5000,
      }),
    );
  });
  
  it('should be able to get the summary', async () => { 
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'Credit Transaction',
        amount: 5000,
        type: 'credit',
      })
      .expect(201);

    const cookies = createTransactionResponse.get('Set-Cookie');

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies ?? [])
      .send({
        title: 'Debit Transaction',
        amount: 2000,
        type: 'debit',
      })
      .expect(201);

    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies ?? [])
      .expect(200);

    expect(summaryResponse.body.summary).toEqual(
      expect.objectContaining({
        amount: 3000, // 5000 - 2000
      }),
    );
   })

});
