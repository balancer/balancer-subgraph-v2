import { DocumentNode } from '@apollo/client/core';
import {
  ApolloClient,
  createHttpLink,
  InMemoryCache,
} from '@apollo/client/core';

const fetch = require("node-fetch");

interface TestCase {
  id: string
  query: DocumentNode, 
  variables?: Object
}

const SUBGRAPH_QUERY_ENDPOINT = 'http://127.0.0.1:8000/subgraphs/name/balancer-labs/balancer-v2'
let cache = new InMemoryCache(); 

export const runTestCases = async (
  groupName: string,
  testCases: TestCase[],
) => {
  const linkOptions = { uri: SUBGRAPH_QUERY_ENDPOINT, fetch };
  const link = createHttpLink(linkOptions)
  const cache = new InMemoryCache()
  let aClient = new ApolloClient({link, cache})

  describe(`${groupName} resolvers`, () => {
    for (let testCase of testCases) {
      it(testCase.id, async () => {
        const res = await aClient.query({
          query: testCase.query,
          variables: testCase.variables || {},
        });
        expect(res).toMatchSnapshot();
      });
    };
  });
};
