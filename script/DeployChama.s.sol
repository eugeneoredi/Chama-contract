// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Chama} from "../src/Chama.sol";
import {MockToken} from "../test/mocks/MockToken.sol";

/// @notice Deploys Chama to Sepolia.
///
/// Env vars:
///   PRIVATE_KEY          (required) deployer private key, no "0x" needed either way
///   CONTRIBUTION_AMOUNT  (optional) contribution per round, in the token's smallest
///                        unit (wei-equivalent). Defaults to 100 * 10^18.
///   TOKEN_ADDRESS        (optional) an existing ERC20 token to use. If omitted, this
///                        script deploys a fresh MockToken ("Mock Stablecoin", mUSD)
///                        on Sepolia so you have something to test with immediately.
///
/// Usage:
///   forge script script/DeployChama.s.sol:DeployChamaScript \
///     --rpc-url sepolia \
///     --broadcast \
///     --verify
contract DeployChamaScript is Script {
    function run() public {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint256 contributionAmount = vm.envOr("CONTRIBUTION_AMOUNT", uint256(100 ether));
        address tokenAddress = vm.envOr("TOKEN_ADDRESS", address(0));

        vm.startBroadcast(deployerKey);

        if (tokenAddress == address(0)) {
            MockToken token = new MockToken();
            tokenAddress = address(token);
            console.log("No TOKEN_ADDRESS provided - deployed a fresh MockToken at:", tokenAddress);
        } else {
            console.log("Using existing token at:", tokenAddress);
        }

        Chama chama = new Chama(tokenAddress, contributionAmount);

        vm.stopBroadcast();

        console.log("Chama deployed at:", address(chama));
        console.log("Token address:", tokenAddress);
        console.log("Contribution amount per round:", contributionAmount);
    }
}
