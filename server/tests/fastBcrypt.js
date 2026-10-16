// Unit tests only: production bcrypt cost 12 is ~300 ms per hash in pure-JS bcryptjs, which made
// rate-limit tests (20+ failed sign-ins) exceed the Jest timeout on slow CI runners. Hashing at
// the minimum cost keeps comparisons real while integration tests still use the production cost.
const TEST_COST = 4;

jest.mock('bcryptjs', () => {
  const actual = jest.requireActual('bcryptjs');
  return {
    ...actual,
    hash: (password) => actual.hash(password, TEST_COST),
    hashSync: (password) => actual.hashSync(password, TEST_COST),
  };
});
