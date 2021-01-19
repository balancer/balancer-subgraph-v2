import { Swap, User, UserBalance, Investment } from '../types/schema';

export function handleUserBalanceDeposited(event: Deposited): void {
  let userBalanceId: string = event.params.user.toHexString() + event.params.token.toHexString()
  let userBalance = UserBalance.load(userBalanceId);

  if (userBalance == null) {
    userBalance = new UserBalance(userBalanceId);
    userBalance.userAddress = event.params.user.toHexString();
    userBalance.token = event.params.token;
    userBalance.balance = ZERO_BD;
  }
  // TODO tokenToDeciml - amount is a BigInt
  let tokenAmount: BigDecimal = event.params.amount.toBigDecimal();
  userBalance.balance = userBalance.balance.plus(tokenAmount);
  userBalance.save();
}

export function handleUserBalanceWithdrawn(event: Withdrawn): void {
  let userBalanceId: string = event.params.user.toHexString() + event.params.token.toHexString()
  let userBalance = UserBalance.load(userBalanceId);

  if (userBalance == null) {
    // this should never happen since balances must be > 0
    userBalance = new UserBalance(userBalanceId);
    userBalance.userAddress = event.params.user.toHexString();
    userBalance.token = event.params.token;
    userBalance.balance = ZERO_BD;
  }
  // TODO tokenToDeciml
  let tokenAmount: BigDecimal = event.params.amount.toBigDecimal();
  userBalance.balance = userBalance.balance.minus(tokenAmount);
  userBalance.save();
}

