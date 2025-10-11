// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { Wager } from "./Wager.sol";
import { ReclaimVerifier } from "./ReclaimVerifier.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract WagerTest is Test {
    Wager public wager;
    MockERC20 public token;
    
    address public creator = address(0x1);
    address public opponent = address(0x2);
    address public treasury = address(0x3);
    uint256 public constant WAGER_AMOUNT = 100e6; // 100 USDC (6 decimals)
    string public constant CREATOR_USERNAME = "player1";
    string public constant OPPONENT_USERNAME = "player2";
    string public constant GAME_ID = "chess.com/game/123456";

    function setUp() public {
        // Deploy mock USDC token
        token = new MockERC20("Mock USDC", "USDC", 6);
        
        // Mint tokens to players
        token.mint(creator, WAGER_AMOUNT * 10);
        token.mint(opponent, WAGER_AMOUNT * 10);
        
        // Deploy ReclaimVerifier
        ReclaimVerifier verifier = new ReclaimVerifier();
        
        // Deploy wager contract
        wager = new Wager(
            creator,
            opponent,
            address(token),
            WAGER_AMOUNT,
            CREATOR_USERNAME,
            treasury,
            address(verifier)
        );
    }

    function test_InitialState() public view {
        Wager.WagerData memory data = wager.getWagerData();
        
        assertEq(data.creator, creator);
        assertEq(data.opponent, opponent);
        assertEq(data.token, address(token));
        assertEq(data.amount, WAGER_AMOUNT);
        assertEq(data.creatorChessUsername, CREATOR_USERNAME);
        assertEq(uint256(data.state), uint256(Wager.WagerState.Created));
        assertFalse(data.creatorDeposited);
        assertFalse(data.opponentDeposited);
    }

    function test_CreatorDeposit() public {
        // Approve and deposit as creator
        vm.startPrank(creator);
        token.approve(address(wager), WAGER_AMOUNT);
        wager.creatorDeposit();
        vm.stopPrank();

        Wager.WagerData memory data = wager.getWagerData();
        assertTrue(data.creatorDeposited);
        assertEq(token.balanceOf(address(wager)), WAGER_AMOUNT);
    }

    function test_AcceptWager() public {
        // Creator deposits first
        vm.startPrank(creator);
        token.approve(address(wager), WAGER_AMOUNT);
        wager.creatorDeposit();
        vm.stopPrank();

        // Opponent accepts wager
        vm.startPrank(opponent);
        token.approve(address(wager), WAGER_AMOUNT);
        wager.acceptWager(OPPONENT_USERNAME);
        vm.stopPrank();

        Wager.WagerData memory data = wager.getWagerData();
        assertTrue(data.opponentDeposited);
        assertEq(data.opponentChessUsername, OPPONENT_USERNAME);
        assertEq(uint256(data.state), uint256(Wager.WagerState.Funded));
        assertEq(token.balanceOf(address(wager)), WAGER_AMOUNT * 2);
    }

    function test_LinkGame() public {
        _fundWager();

        // Link game
        vm.prank(creator);
        wager.linkGame(GAME_ID);

        Wager.WagerData memory data = wager.getWagerData();
        assertEq(data.gameId, GAME_ID);
        assertEq(uint256(data.state), uint256(Wager.WagerState.GameLinked));
    }

    function test_SubmitProofAndSettle_Winner() public {
        _fundAndLinkGame();

        // Submit proof with creator as winner
        vm.prank(creator);
        wager.submitProof(creator, "win");

        Wager.WagerData memory data = wager.getWagerData();
        assertEq(data.winner, creator);
        assertEq(uint256(data.state), uint256(Wager.WagerState.Completed));

        // Settle wager
        uint256 creatorBalanceBefore = token.balanceOf(creator);
        uint256 treasuryBalanceBefore = token.balanceOf(treasury);
        
        wager.settle();

        // Check balances after settlement
        uint256 totalPot = WAGER_AMOUNT * 2;
        uint256 expectedFee = (totalPot * 200) / 10000; // 2%
        uint256 expectedWinnings = totalPot - expectedFee;

        assertEq(token.balanceOf(creator), creatorBalanceBefore + expectedWinnings);
        assertEq(token.balanceOf(treasury), treasuryBalanceBefore + expectedFee);
        
        data = wager.getWagerData();
        assertEq(uint256(data.state), uint256(Wager.WagerState.Settled));
    }

    function test_SubmitProofAndSettle_Draw() public {
        _fundAndLinkGame();

        // Submit proof with draw (winner = address(0))
        vm.prank(creator);
        wager.submitProof(address(0), "draw");

        // Settle wager
        uint256 creatorBalanceBefore = token.balanceOf(creator);
        uint256 opponentBalanceBefore = token.balanceOf(opponent);
        uint256 treasuryBalanceBefore = token.balanceOf(treasury);
        
        wager.settle();

        // Check balances after settlement (1% fee each)
        uint256 expectedFeePerPlayer = (WAGER_AMOUNT * 100) / 10000; // 1%
        uint256 expectedRefund = WAGER_AMOUNT - expectedFeePerPlayer;

        assertEq(token.balanceOf(creator), creatorBalanceBefore + expectedRefund);
        assertEq(token.balanceOf(opponent), opponentBalanceBefore + expectedRefund);
        assertEq(token.balanceOf(treasury), treasuryBalanceBefore + (expectedFeePerPlayer * 2));
    }

    function test_Cancel() public {
        // Creator deposits
        vm.startPrank(creator);
        token.approve(address(wager), WAGER_AMOUNT);
        wager.creatorDeposit();
        vm.stopPrank();

        // Fast forward past expiry
        vm.warp(block.timestamp + 25 hours);

        // Cancel wager
        uint256 creatorBalanceBefore = token.balanceOf(creator);
        
        vm.prank(creator);
        wager.cancel();

        // Check refund
        assertEq(token.balanceOf(creator), creatorBalanceBefore + WAGER_AMOUNT);
        
        Wager.WagerData memory data = wager.getWagerData();
        assertEq(uint256(data.state), uint256(Wager.WagerState.Cancelled));
    }

    function test_RevertUnauthorizedCaller() public {
        vm.expectRevert(Wager.UnauthorizedCaller.selector);
        vm.prank(address(0x999));
        wager.creatorDeposit();
    }

    function test_RevertInvalidAmount() public {
        // Test that constructor reverts with invalid amount
        bool reverted = false;
        ReclaimVerifier verifier = new ReclaimVerifier();
        try new Wager(creator, opponent, address(token), 0, CREATOR_USERNAME, treasury, address(verifier)) {
            // Should not reach here
        } catch {
            reverted = true;
        }
        assertTrue(reverted, "Should revert with invalid amount");
    }

    function test_RevertSamePlayer() public {
        // Test that constructor reverts when creator == opponent
        bool reverted = false;
        ReclaimVerifier verifier = new ReclaimVerifier();
        try new Wager(creator, creator, address(token), WAGER_AMOUNT, CREATOR_USERNAME, treasury, address(verifier)) {
            // Should not reach here
        } catch {
            reverted = true;
        }
        assertTrue(reverted, "Should revert when creator == opponent");
    }

    // Helper functions
    function _fundWager() internal {
        // Creator deposits
        vm.startPrank(creator);
        token.approve(address(wager), WAGER_AMOUNT);
        wager.creatorDeposit();
        vm.stopPrank();

        // Opponent accepts
        vm.startPrank(opponent);
        token.approve(address(wager), WAGER_AMOUNT);
        wager.acceptWager(OPPONENT_USERNAME);
        vm.stopPrank();
    }

    function _fundAndLinkGame() internal {
        _fundWager();
        
        vm.prank(creator);
        wager.linkGame(GAME_ID);
    }
}