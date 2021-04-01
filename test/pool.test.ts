import { runTestCases } from './test-runner';
import { gql } from '@apollo/client/core';

const testCases = [
  {
    id: 'getPools',
    query: gql`
      query {
        pools {
          tokens {
            id
          }
          id
        }
      }
    `,
  },
];

runTestCases('Pools', testCases);
