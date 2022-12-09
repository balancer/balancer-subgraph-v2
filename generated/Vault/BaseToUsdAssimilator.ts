// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class BaseToUsdAssimilator__viewNumeraireAmountAndBalanceResult {
  value0: BigInt;
  value1: BigInt;

  constructor(value0: BigInt, value1: BigInt) {
    this.value0 = value0;
    this.value1 = value1;
  }

  toMap(): TypedMap<string, ethereum.Value> {
    let map = new TypedMap<string, ethereum.Value>();
    map.set("value0", ethereum.Value.fromSignedBigInt(this.value0));
    map.set("value1", ethereum.Value.fromSignedBigInt(this.value1));
    return map;
  }
}

export class BaseToUsdAssimilator extends ethereum.SmartContract {
  static bind(address: Address): BaseToUsdAssimilator {
    return new BaseToUsdAssimilator("BaseToUsdAssimilator", address);
  }

  baseDecimals(): BigInt {
    let result = super.call("baseDecimals", "baseDecimals():(uint256)", []);

    return result[0].toBigInt();
  }

  try_baseDecimals(): ethereum.CallResult<BigInt> {
    let result = super.tryCall("baseDecimals", "baseDecimals():(uint256)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  baseToken(): Address {
    let result = super.call("baseToken", "baseToken():(address)", []);

    return result[0].toAddress();
  }

  try_baseToken(): ethereum.CallResult<Address> {
    let result = super.tryCall("baseToken", "baseToken():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  getRate(): BigInt {
    let result = super.call("getRate", "getRate():(uint256)", []);

    return result[0].toBigInt();
  }

  try_getRate(): ethereum.CallResult<BigInt> {
    let result = super.tryCall("getRate", "getRate():(uint256)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  oracle(): Address {
    let result = super.call("oracle", "oracle():(address)", []);

    return result[0].toAddress();
  }

  try_oracle(): ethereum.CallResult<Address> {
    let result = super.tryCall("oracle", "oracle():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  usdc(): Address {
    let result = super.call("usdc", "usdc():(address)", []);

    return result[0].toAddress();
  }

  try_usdc(): ethereum.CallResult<Address> {
    let result = super.tryCall("usdc", "usdc():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  viewNumeraireAmount(_amount: BigInt): BigInt {
    let result = super.call(
      "viewNumeraireAmount",
      "viewNumeraireAmount(uint256):(int128)",
      [ethereum.Value.fromUnsignedBigInt(_amount)]
    );

    return result[0].toBigInt();
  }

  try_viewNumeraireAmount(_amount: BigInt): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "viewNumeraireAmount",
      "viewNumeraireAmount(uint256):(int128)",
      [ethereum.Value.fromUnsignedBigInt(_amount)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  viewNumeraireAmountAndBalance(
    _amount: BigInt,
    vault: Address,
    poolId: Bytes
  ): BaseToUsdAssimilator__viewNumeraireAmountAndBalanceResult {
    let result = super.call(
      "viewNumeraireAmountAndBalance",
      "viewNumeraireAmountAndBalance(uint256,address,bytes32):(int128,int128)",
      [
        ethereum.Value.fromUnsignedBigInt(_amount),
        ethereum.Value.fromAddress(vault),
        ethereum.Value.fromFixedBytes(poolId)
      ]
    );

    return new BaseToUsdAssimilator__viewNumeraireAmountAndBalanceResult(
      result[0].toBigInt(),
      result[1].toBigInt()
    );
  }

  try_viewNumeraireAmountAndBalance(
    _amount: BigInt,
    vault: Address,
    poolId: Bytes
  ): ethereum.CallResult<
    BaseToUsdAssimilator__viewNumeraireAmountAndBalanceResult
  > {
    let result = super.tryCall(
      "viewNumeraireAmountAndBalance",
      "viewNumeraireAmountAndBalance(uint256,address,bytes32):(int128,int128)",
      [
        ethereum.Value.fromUnsignedBigInt(_amount),
        ethereum.Value.fromAddress(vault),
        ethereum.Value.fromFixedBytes(poolId)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(
      new BaseToUsdAssimilator__viewNumeraireAmountAndBalanceResult(
        value[0].toBigInt(),
        value[1].toBigInt()
      )
    );
  }

  viewNumeraireBalance(vault: Address, poolId: Bytes): BigInt {
    let result = super.call(
      "viewNumeraireBalance",
      "viewNumeraireBalance(address,bytes32):(int128)",
      [ethereum.Value.fromAddress(vault), ethereum.Value.fromFixedBytes(poolId)]
    );

    return result[0].toBigInt();
  }

  try_viewNumeraireBalance(
    vault: Address,
    poolId: Bytes
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "viewNumeraireBalance",
      "viewNumeraireBalance(address,bytes32):(int128)",
      [ethereum.Value.fromAddress(vault), ethereum.Value.fromFixedBytes(poolId)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  viewNumeraireBalanceLPRatio(
    _baseWeight: BigInt,
    _quoteWeight: BigInt,
    vault: Address,
    poolId: Bytes
  ): BigInt {
    let result = super.call(
      "viewNumeraireBalanceLPRatio",
      "viewNumeraireBalanceLPRatio(uint256,uint256,address,bytes32):(int128)",
      [
        ethereum.Value.fromUnsignedBigInt(_baseWeight),
        ethereum.Value.fromUnsignedBigInt(_quoteWeight),
        ethereum.Value.fromAddress(vault),
        ethereum.Value.fromFixedBytes(poolId)
      ]
    );

    return result[0].toBigInt();
  }

  try_viewNumeraireBalanceLPRatio(
    _baseWeight: BigInt,
    _quoteWeight: BigInt,
    vault: Address,
    poolId: Bytes
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "viewNumeraireBalanceLPRatio",
      "viewNumeraireBalanceLPRatio(uint256,uint256,address,bytes32):(int128)",
      [
        ethereum.Value.fromUnsignedBigInt(_baseWeight),
        ethereum.Value.fromUnsignedBigInt(_quoteWeight),
        ethereum.Value.fromAddress(vault),
        ethereum.Value.fromFixedBytes(poolId)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  viewRawAmount(_amount: BigInt): BigInt {
    let result = super.call(
      "viewRawAmount",
      "viewRawAmount(int128):(uint256)",
      [ethereum.Value.fromSignedBigInt(_amount)]
    );

    return result[0].toBigInt();
  }

  try_viewRawAmount(_amount: BigInt): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "viewRawAmount",
      "viewRawAmount(int128):(uint256)",
      [ethereum.Value.fromSignedBigInt(_amount)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  viewRawAmountLPRatio(
    _baseWeight: BigInt,
    _quoteWeight: BigInt,
    _amount: BigInt,
    vault: Address,
    poolId: Bytes
  ): BigInt {
    let result = super.call(
      "viewRawAmountLPRatio",
      "viewRawAmountLPRatio(uint256,uint256,int128,address,bytes32):(uint256)",
      [
        ethereum.Value.fromUnsignedBigInt(_baseWeight),
        ethereum.Value.fromUnsignedBigInt(_quoteWeight),
        ethereum.Value.fromSignedBigInt(_amount),
        ethereum.Value.fromAddress(vault),
        ethereum.Value.fromFixedBytes(poolId)
      ]
    );

    return result[0].toBigInt();
  }

  try_viewRawAmountLPRatio(
    _baseWeight: BigInt,
    _quoteWeight: BigInt,
    _amount: BigInt,
    vault: Address,
    poolId: Bytes
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "viewRawAmountLPRatio",
      "viewRawAmountLPRatio(uint256,uint256,int128,address,bytes32):(uint256)",
      [
        ethereum.Value.fromUnsignedBigInt(_baseWeight),
        ethereum.Value.fromUnsignedBigInt(_quoteWeight),
        ethereum.Value.fromSignedBigInt(_amount),
        ethereum.Value.fromAddress(vault),
        ethereum.Value.fromFixedBytes(poolId)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  virtualViewNumeraireBalanceIntake(
    vault: Address,
    poolId: Bytes,
    intakeAmount: BigInt
  ): BigInt {
    let result = super.call(
      "virtualViewNumeraireBalanceIntake",
      "virtualViewNumeraireBalanceIntake(address,bytes32,uint256):(int128)",
      [
        ethereum.Value.fromAddress(vault),
        ethereum.Value.fromFixedBytes(poolId),
        ethereum.Value.fromUnsignedBigInt(intakeAmount)
      ]
    );

    return result[0].toBigInt();
  }

  try_virtualViewNumeraireBalanceIntake(
    vault: Address,
    poolId: Bytes,
    intakeAmount: BigInt
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "virtualViewNumeraireBalanceIntake",
      "virtualViewNumeraireBalanceIntake(address,bytes32,uint256):(int128)",
      [
        ethereum.Value.fromAddress(vault),
        ethereum.Value.fromFixedBytes(poolId),
        ethereum.Value.fromUnsignedBigInt(intakeAmount)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  virtualViewNumeraireBalanceOutput(
    vault: Address,
    poolId: Bytes,
    outputAmount: BigInt
  ): BigInt {
    let result = super.call(
      "virtualViewNumeraireBalanceOutput",
      "virtualViewNumeraireBalanceOutput(address,bytes32,uint256):(int128)",
      [
        ethereum.Value.fromAddress(vault),
        ethereum.Value.fromFixedBytes(poolId),
        ethereum.Value.fromUnsignedBigInt(outputAmount)
      ]
    );

    return result[0].toBigInt();
  }

  try_virtualViewNumeraireBalanceOutput(
    vault: Address,
    poolId: Bytes,
    outputAmount: BigInt
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "virtualViewNumeraireBalanceOutput",
      "virtualViewNumeraireBalanceOutput(address,bytes32,uint256):(int128)",
      [
        ethereum.Value.fromAddress(vault),
        ethereum.Value.fromFixedBytes(poolId),
        ethereum.Value.fromUnsignedBigInt(outputAmount)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }
}

export class ConstructorCall extends ethereum.Call {
  get inputs(): ConstructorCall__Inputs {
    return new ConstructorCall__Inputs(this);
  }

  get outputs(): ConstructorCall__Outputs {
    return new ConstructorCall__Outputs(this);
  }
}

export class ConstructorCall__Inputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }

  get _baseDecimals(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }

  get _baseToken(): Address {
    return this._call.inputValues[1].value.toAddress();
  }

  get _quoteToken(): Address {
    return this._call.inputValues[2].value.toAddress();
  }

  get _oracle(): Address {
    return this._call.inputValues[3].value.toAddress();
  }
}

export class ConstructorCall__Outputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}
