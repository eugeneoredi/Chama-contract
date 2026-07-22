// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Chama} from "../src/Chama.sol";
import {MockToken} from "./mocks/MockToken.sol";

contract ChamaTest is Test {
    Chama chama;
    MockToken token;

    address alice = address(0x1);
    address bob = address(0x2);
    address carol = address(0x3);

    uint constant CONTRIBUTION = 100 ether;

    function setUp() public {
        token = new MockToken();
        chama = new Chama(address(token), CONTRIBUTION);

        address[3] memory accounts = [alice, bob, carol];
        for (uint i = 0; i < accounts.length; i++) {
            token.mint(accounts[i], 1000 ether);
            vm.prank(accounts[i]);
            token.approve(address(chama), type(uint).max);
        }
    }

    function test_MemberCanJoinDuringSignup() public {
        vm.prank(alice);
        chama.joinChama();

        assertTrue(chama.isMember(alice));
        assertEq(chama.members(0), alice);
    }

    function test_CannotJoinAfterSignupPhase() public {
        vm.prank(alice);
        chama.joinChama();

        vm.prank(bob);
        chama.joinChama();

        vm.prank(alice);
        chama.contribute();
        vm.prank(bob);
        chama.contribute();
        chama.payout();

        vm.prank(carol);
        vm.expectRevert("Chama: signup phase is over");
        chama.joinChama();
    }
    function test_CannotContributeTwiceInSameRound() public {
        vm.prank(alice);
        chama.joinChama();

        vm.prank(alice);
        chama.contribute();

        vm.prank(alice);
        vm.expectRevert("Chama: already contributed this round");
        chama.contribute();
    }

    function test_SkippedMemberDoesNotBlockPayout() public {
        vm.prank(alice);
        chama.joinChama();
        vm.prank(bob);
        chama.joinChama();
        vm.prank(carol);
        chama.joinChama();

        // Alice deliberately does NOT contribute this round
        vm.prank(bob);
        chama.contribute();
        vm.prank(carol);
        chama.contribute();

        uint bobBalanceBefore = token.balanceOf(bob);
        chama.payout();
        uint bobBalanceAfter = token.balanceOf(bob);

        // Bob should be paid since Alice (first in line) was skipped
        assertEq(bobBalanceAfter - bobBalanceBefore, CONTRIBUTION * 2);
        assertTrue(chama.hasReceivedPayout(bob));
        assertFalse(chama.hasReceivedPayout(alice));
    }

    function test_MemberCannotReceivePayoutTwice() public {
        vm.prank(alice);
        chama.joinChama();
        vm.prank(bob);
        chama.joinChama();

        // Round 1: both contribute, Alice gets paid (first in line)
        vm.prank(alice);
        chama.contribute();
        vm.prank(bob);
        chama.contribute();
        chama.payout();

        assertTrue(chama.hasReceivedPayout(alice));

        // Round 2: both contribute again
        vm.prank(alice);
        chama.contribute();
        vm.prank(bob);
        chama.contribute();
        chama.payout();

        // Bob should now be paid, not Alice again
        assertTrue(chama.hasReceivedPayout(bob));
    }
}
