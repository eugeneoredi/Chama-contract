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

    function joinChama() public {
        require(currentRound == 0, "Chama: signup phase is over");
        require(!isMember[msg.sender], "Chama: already a member");

        isMember[msg.sender] = true;
        members.push(msg.sender);

        emit MemberJoined(msg.sender);
    }
    function contribute() public {
        require(isMember[msg.sender], "Chama: not a member");
        require(!hasContributed[currentRound][msg.sender], "Chama: already contributed this round");

        bool success = token.transferFrom(msg.sender, address(this), contributionAmount);
        require(success, "Chama: token transfer failed");

        hasContributed[currentRound][msg.sender] = true;
        pool += contributionAmount;

        emit Contributed(msg.sender, currentRound, contributionAmount);
    }
}