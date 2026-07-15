// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Chama {
    IERC20 public token;
    uint public contributionAmount;

    address[] public members;
    mapping(address => bool) public isMember;

    uint public currentRound;
    mapping(uint => mapping(address => bool)) public hasContributed;
    mapping(address => bool) public hasReceivedPayout;
    uint public nextRecipientIndex;
    uint public pool;

    event MemberJoined(address member);
    event Contributed(address member, uint round, uint amount);
    event PayoutSent(address member, uint amount, uint round);

    constructor(address _token, uint _contributionAmount) {
        token = IERC20(_token);
        contributionAmount = _contributionAmount;
    }
}
