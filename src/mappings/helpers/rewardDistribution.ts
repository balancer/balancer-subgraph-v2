import { ipfs, json, JSONValue, Bytes, BigInt } from '@graphprotocol/graph-ts';
import { log } from '@graphprotocol/graph-ts';

export class UserData {
  address: string;
  amount: string;
}

export function getDistributionData(data: Bytes): UserData[] {
  let merkleTree = getMerkleTree(data);
  if (merkleTree == null) {
    log.warning("The given cid {}, does not contain merkle tree field", []);
    return [];
  }
  let usersData = getUsersData(merkleTree);

  return usersData;
}

function getMerkleTree(data: Bytes): JSONValue | null {
  log.debug("Original data {}", [data.toString()]);
  let jsonValue = json.fromBytes(data);
  let jsonObj = jsonValue.toObject();
  return jsonObj.get("merkleTree");
}

function getUsersData(merkleTree: JSONValue): UserData[] {
  let merkleTreeObject = merkleTree.toObject();
  let merkleTreeValues = merkleTreeObject.get("values");
  if (merkleTreeValues == null) {
    log.warning("The merkle tree is not in valid format", []);
    return [];
  }
  let distributionValuesArray = merkleTreeValues.toArray();
  log.debug("Distributor value array size {}", [distributionValuesArray.length.toString()]);
  let usersData: UserData[] = [];
  for (let i = 0; i < distributionValuesArray.length; i++) {
    let distributionValue = distributionValuesArray.at(i);
    if (!distributionValue) {
      log.warning("The values are not defined", []);
      return [];
    }
    let distributionValueObject = distributionValue.toObject();
    let value = distributionValueObject.get("value");
    if (value == null) {
      log.warning("The merkle tree is not in valid format", []);
      return [];
    }
    let valueArray = value.toArray();
    log.debug("Testing value {}", [valueArray.length.toString()]);
    if (valueArray.length != 2) {
      log.warning("The reward value is not in valid format", []);
      return [];
    }
    const address = valueArray.at(0);
    const amount = valueArray.at(1); // NOTE the graph syncing will fail if we call toBigInt(), so we will go toString, and then for plus/minut to BigInt
    if (!address || !amount) {
      log.warning("The values are not in valid format", []);
      return [];
    }
    log.debug("Value data {} {}", [address.toString(), amount.toString()]);
    let userData: UserData = {
      address: address.toString(),
      amount: amount.toString()
    };
    log.debug("The user data {} - {}", [userData.address, userData.amount]);
    usersData.push(userData);
  }
  return usersData;
}
