// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20ForSplBackbone, ERC20ForSpl, ERC20ForSplMintable} from './erc20_for_spl.sol';


/// @title ERC20ForSplFactory
/// @author https://twitter.com/mnedelchev_
/// @notice This contract serves as a factory to deploy ERC20ForSpl or ERC20ForSplMintable smart contracts.
/// @notice ERC20ForSpl is used for the creation of Solidity smart contract interface of already existing SPLToken on Solana.
/// @notice ERC20ForSplMintable mints new SPLToken on Solana and creates Solidity smart contract interface for it.
contract ERC20ForSplFactory {
    mapping(bytes32 => address) public getErc20ForSpl;
    address[] public allErc20ForSpl;

    /// @dev Event being emitted when a new Erc20ForSpl or Erc20ForSplMintable interface has been deployed
    event ERC20ForSplCreated(bytes32 _mint, address pair, uint);

    /// @dev Custom error indicating that there is an existing Erc20ForSpl interface for the particular token mint
    error ERC20ForSplAlreadyExists(bytes32 mint);
    /// @dev Custom error indicating that the create2 deploying request of the Erc20ForSpl interface has failed
    error ERC20ForSplNotCreated();
    /// @dev Custom error indicating that the create2 deploying request of the Erc20ForSplMintable interface has failed
    error ERC20ForSplMintableNotCreated();

    /// @notice Creation of Solidity smart contract interface of already existing SPLToken on Solana
    /// @param _mint The Solana-like address of the Token Mint on Solana in bytes32 format
    function createErc20ForSpl(bytes32 _mint) external returns (address erc20spl) {
        require(getErc20ForSpl[_mint] == address(0), ERC20ForSplAlreadyExists(_mint));

        bytes memory bytecode = abi.encodePacked(type(ERC20ForSpl).creationCode, abi.encode(_mint));
        assembly {
            let currentPointer := mload(0x40)
            mstore(currentPointer, _mint)
            erc20spl := create2(0, add(bytecode, 0x20), mload(bytecode), keccak256(currentPointer, 0x20))
            mstore(0x40, add(currentPointer, 0x20))
        }
        require(erc20spl != address(0), ERC20ForSplNotCreated());

        getErc20ForSpl[_mint] = erc20spl;
        allErc20ForSpl.push(erc20spl);

        emit ERC20ForSplCreated(_mint, erc20spl, allErc20ForSpl.length);
    }

    /// @notice Minting a new SPLToken on Solana and creating a Solidity smart contract interface pointing to the SPLToken
    /// @param _name The name of the SPLToken. This data is being stored inside the Metaplex program on Solana
    /// @param _symbol The symbol of the SPLToken. This data is being stored inside the Metaplex program on Solana
    /// @param _decimals The decimals of the SPLToken on Solana
    /// @param _mint_authority The owner of the ERC20ForSPLMintable contract, which has the permissions to mint new tokens
    function createErc20ForSplMintable(string memory _name, string memory _symbol, uint8 _decimals, address _mint_authority) external returns (address erc20spl) {
        bytes memory bytecode = abi.encodePacked(type(ERC20ForSplMintable).creationCode, abi.encode(_name, _symbol, _decimals, _mint_authority));
        assembly {
            erc20spl := create2(0, add(bytecode, 0x20), mload(bytecode), keccak256(add(0, 0x20), 0x20))
        }
        require(erc20spl != address(0), ERC20ForSplMintableNotCreated());

        bytes32 _mint = ERC20ForSplMintable(erc20spl).findMintAccount();
        getErc20ForSpl[_mint] = erc20spl;
        allErc20ForSpl.push(erc20spl);

        emit ERC20ForSplCreated(_mint, erc20spl, allErc20ForSpl.length);
    }

    function allErc20ForSplLength() external view returns (uint) {
        return allErc20ForSpl.length;
    }

    function getTokenMintByAddress(address token) external view returns (bytes32) {
        return ERC20ForSplBackbone(token).tokenMint();
    }
}