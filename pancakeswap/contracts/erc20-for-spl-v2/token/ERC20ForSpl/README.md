# ERC20ForSPL standard

The **ERC20ForSPL** standard provides a standard **ERC20** interface supplemented with custom functions and variables 
providing compatibility with _Solana_'s **SPL Token** interface. This standard allows for _NeonEVM_ users and dApps to 
interact with **ERC20ForSPL** tokens deployed on _NeonEVM_ as well as **SPL** tokens deployed on _Solana_, all from a 
regular EVM wallet. It also makes it possible for _Solana_ users to natively interact with- **ERC20ForSPL** tokens deployed on _NeonEVM_ by 
scheduling _NeonEVM_ transactions from a regular _Solana_ wallet (see: **Solana native support**).

## ERC20ForSPL vs ERC20ForSPLMintable contracts

The **ERC20ForSPL** contract should be deployed on _NeonEVM_ as an interface to interact with already deployed, native 
**SPL Token** on _Solana_. 

On the other hand, when deploying the **ERC20ForSPLMintable** contract on _NeonEVM_, a new **SPL Token** is deployed on 
_Solana_ and its administrator is given permission to mint new tokens.

## ERC20ForSPLFactory contract

The **ERC20ForSPLFactory** contract should be used to deploy new instances of both **ERC20ForSPL** and 
**ERC20ForSPLMintable** contracts on _NeonEVM_ by calling the `createErc20ForSpl` and `createErc20ForSplMintable` 
functions respectively.

**ERC20ForSPLFactory** is already deployed on _Neon mainnet_ and _Neon devnet_:

| Network        | ERC20ForSPLFactory contract address          |
|----------------|----------------------------------------------|
| _Neon mainnet_ | `0x6B226a13F5FE3A5cC488084C08bB905533804720` |
| _Neon devnet_  | `0xF6b17787154C418d5773Ea22Afc87A95CAA3e957` |


## Custom functions and variables

| bytes32 tokenMint                                                       |
|:------------------------------------------------------------------------|
| Hex-encoded 32 bytes address of the underlying _Solana_ SPL Token mint. |

| **transferSolana**(bytes32 to, uint64 amount) → bool                                                                                                                          |
|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Transfers to a _Solana_ SPL Token account. <br/><br/>`to` The 32 bytes SPL Token account address of the recipient <br/>`amount` The amount to be transferred to the recipient |

| **transferSolanaFrom**(address from, bytes32 to, uint64 amount) → bool                                                                                                                                                                                                                                                                                 |
|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Spends the ERC20 allowance provided by the `from` account to `msg.sender` by transferring to a _Solana_ SPL Token account. <br/><br/>`from` The address of the _NeonEVM_ account that provided allowance to `msg.sender` <br/>`to` The 32 bytes SPL Token account address of the recipient <br/>`amount` The amount to be transferred to the recipient |

| **approveSolana**(bytes32 spender, uint64 amount) → bool                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Provides SPL Token delegation to a _Solana_ account. Token delegation is similar to an ERC20 allowance but it is not stored in the ERC20 `_allowances` mapping. The SPL Token standard's concept of delegation differs from ERC20 allowances in that it is only possible to delegate to one single Solana account and subsequent delegations will erase previous delegations.<br/><br/>`spender` The 32 bytes address of the delegate account, i.e. the _Solana_ SPL Token account to be approved <br/>`amount` The amount to be delegated to the delegate |

| **claim**(bytes32 from, uint64 amount) → bool                                                                                                                                                                                                                                                                                                                                                                                                        |
|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Spends the SPL Token delegation provided  by the `from` _Solana_ SPL Token account to the external authority of the _NeonEVM_ arbitrary token account attributed to `msg.sender`<br/><br/>`from` The 32 bytes SPL Token account address which provided delegation to the _NeonEVM_ arbitrary token account attributed to `msg.sender` <br/>`amount` The amount to be transferred to the _NeonEVM_ arbitrary token account attributed to `msg.sender` |

| **claimTo**(bytes32 from, address to, uint64 amount) → bool                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Spends the SPL Token delegation provided  by the `from` _Solana_ SPL Token account to the external authority of the _NeonEVM_ arbitrary token account attributed to `msg.sender` and transfers to the _NeonEVM_ arbitrary token account attributed to the `to` address<br/><br/>`from` The 32 bytes SPL Token account address which provided delegation to the _NeonEVM_ arbitrary token account attributed to `msg.sender`  <br/>`to` The _NeonEVM_ address of the recipient <br/>`amount` The amount to be transferred to the _NeonEVM_ arbitrary token account attributed to `msg.sender` |

| **solanaAccount**(address account) → bytes32                                                                                                                                                                                                                     |
|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Returns the 32 bytes address of the arbitrary token account attributed to the `account` address by _NeonEVM_.<br/><br/>`account` The address of the account for which we want to get the 32 bytes address of the arbitrary token account attributed by _NeonEVM_ |

| **getAccountDelegateData**(address account) → (bytes32, uint64)                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Returns the 32 bytes _Solana_ SPL Token account address of the delegate and the amount that was delegated to that delegate by the _NeonEVM_ arbitrary token account attributed to the `account` address. Returned data corresponds to SPL Token delegation only and does not include any ERC20 allowances provided by the `account` address.<br/><br/>`account` The address of the account to which _NeonEVM_ has attributed an arbitrary token account for which we want to get SPL Token delegation data. |

| **getTokenMintATA**(bytes32 account) → bytes32                                                                                                                                                                                                                                                     |
|:---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Returns the 32 bytes SPL Token associated token account (ATA) address for this contract's `tokenMint` and provided _Solana_ account address.<br/><br/>`account` The 32 bytes _Solana_ address of the account for which we want to get the address of the SPL Token associated token account (ATA). |

## Solana native support

The _Solana native_ feature of _NeonEVM_ makes it possible to seamlessly execute state-mutative transactions
on _NeonEVM_ from a regular _Solana_ wallet. This is achieved via transactions scheduling: native _Solana_ users can now 
easily schedule _NeonEVM_ transactions using their regular _Solana_ wallet, and be attributed a _NeonEVM_ account. 

### Native Solana account registration

In order to register a native _Solana_ account into _NeonEVM_, a user must successfully schedule at least one 
transaction on _NeonEVM_ from that native _Solana_ account.

Registering a native _Solana_ account means a _NeonEVM_ account is attributed to the registered _Solana_ account and
the user who owns that _Solana_ account can now spend **ERC20ForSPL** tokens received on that _NeonEVM_ account, even if
those tokens were received prior to the _Solana_ account registration.

### Receiving ERC20ForSPL tokens

A native _Solana_ user can always receive **ERC20ForSPL** tokens on the _NeonEVM_ account derived from the user's 
_Solana_ account, even if that _Solana_ account has not yet been registered into _NeonEVM_. This _NeonEVM_ account 
address is derived as the last 20 bytes of the keccak256 hash of the _Solana_ account's public key.

Until a user's _Solana_ account has been registered, **ERC20ForSPL** tokens sent to that user's _NeonEVM_ account are
credited to the user's **arbitrary token account** on _Solana_.

Once a user's _Solana_ account has been registered, **ERC20ForSPL** tokens sent to that user's _NeonEVM_ account will be
credited to the user's **SPL associated token account** (ATA) on _Solana_.

### Spending ERC20ForSPL tokens

#### Spending arbitrary token account balance

To be able to spend **ERC20ForSPL** tokens received before the user's _Solana_ account has been registered (and credited
to the user's **arbitrary token account** on _Solana_) the user's native _Solana_ account must first be **registered** 
into _NeonEVM_.

#### Spending Solana ATA balance

To be able to spend the token balance held on a _Solana_ **SPL associated token account** (ATA) via the corresponding 
**ERC20ForSPL** smart contract deployed on _NeonEVM_, the native _Solana_ user who owns that ATA must have done the 
following:

 - To have successfully registered the native _Solana_ account that owns the ATA, i.e. to have scheduled at least one 
_NeonEVM_ transaction from the native _Solana_ account that owns the ATA in order to have a _NeonEVM_ account attributed
to that native _Solana_ account
 - To have delegated (on _Solana_) the ATA token balance to the **external authority** (_Solana_ account) associated to 
the attributed _NeonEVM_ account (the address of this **external authority** _Solana_ account can be obtained by calling
the `getUserExtAuthority` function, passing the attributed _NeonEVM_ account `address`).

Once those two steps have been completed, the _Solana_ user's ATA token balance will be included in the balance returned
by the `balanceOf` function and this ATA token balance will be spendable via the `transfer` and `transferFrom` functions.
