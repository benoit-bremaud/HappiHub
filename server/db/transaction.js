/** Run `work` on one checked-out client between BEGIN and COMMIT (never pool.query, spec § 2). */
export const withTransaction = async (pool, work) => {
  const client = await pool.connect();
  let broken;
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    // A failed ROLLBACK leaves the connection unusable: destroy it instead of returning it to the pool.
    await client.query('ROLLBACK').catch((rollbackError) => { broken = rollbackError; });
    throw error;
  } finally {
    client.release(broken);
  }
};
