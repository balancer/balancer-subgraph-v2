import { runTestCases } from './test-runner';
import { gql } from '@apollo/client/core'

const testCases = [
  {
    id: 'getPrices',
    query: gql`
            query {
              tokenPrices{
                id
                asset
                price
                pricingAsset
                amount
                block
              }
            }
            `
  },
]

runTestCases('TokenPrices', testCases);
