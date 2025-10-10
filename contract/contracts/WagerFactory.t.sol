// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { WagerFactory } from "./WagerFactory.sol";
import { Wager } from "./Wager.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract WagerFactoryTest is Test {
    WagerFactory public factory;
    MockERC20 public usdc;
    MockERC20 public pyusd;
    
    address public treasury = address(0x3);
    address public creator = address(0x1);
    address public opponent = address(0x2);
    uint256 public constant WAGER_AMOUNT = 100e6;
    string public constant CREATOR_USERNAME = "player1";

    function setUp() public {
        // Deploy tokens
        usdc = new MockERC20("USD Coin", "USDC", 6);
        pyusd = new MockERC20("PayPal USD", "PYUSD", 6);
        
        // Create supported tokens array
        address[] memory supportedTokens = new address[](2);
        supportedTokens[0] = address(usdc);
        supportedTokens[1] = address(pyusd);
        
        // Deploy factory
        factory = new WagerFactory(treasury, supportedTokens);
        
        // Mint tokens to creator
        usdc.mint(creator, WAGER_AMOUNT * 10);
    }

    function test_InitialState() public view {
        assertTrue(factory.isSupportedToken(address(usdc)));
        assertTrue(factory.isSupportedToken(address(pyusd)));
        assertEq(factory.treasury(), treasury);
        assertEq(factory.getTotalWagers(), 0);
    }

    function test_CreateWager() public {
        vm.prank(creator);
        address wagerAddress = factory.createWager(
            opponent,
            address(usdc),
            WAGER_AMOUNT,
            CREATOR_USERNAME
        );
        
        // Check wager was created
        assertTrue(wagerAddress != address(0));
        assertEq(factory.getTotalWagers(), 1);
        
        // Check wager is tracked for both users
        address[] memory creatorWagers = factory.getUserWagers(creator);
        address[] memory opponentWagers = factory.getUserWagers(opponent);
        
        assertEq(creatorWagers.length, 1);
        assertEq(opponentWagers.length, 1);
        // Both should have the same wager address
        assertEq(creatorWagers[0], opponentWagers[0]);
        
        // Check wager contract state
        Wager wager = Wager(wagerAddress);
        Wager.WagerData memory data = wager.getWagerData();
        
        assertEq(data.creator, creator);
        assertEq(data.opponent, opponent);
        assertEq(data.token, address(usdc));
        assertEq(data.amount, WAGER_AMOUNT);
    }

    function test_CreateMultipleWagers() public {
        // Create first wager
        vm.prank(creator);
        address wager1 = factory.createWager(
            opponent,
            address(usdc),
            WAGER_AMOUNT,
            CREATOR_USERNAME
        );
        
        // Create second wager
        vm.prank(creator);
        address wager2 = factory.createWager(
            opponent,
            address(pyusd),
            WAGER_AMOUNT * 2,
            CREATOR_USERNAME
        );
        
        assertEq(factory.getTotalWagers(), 2);
        
        address[] memory creatorWagers = factory.getUserWagers(creator);
        assertEq(creatorWagers.length, 2);
        assertEq(creatorWagers[0], wager1);
        assertEq(creatorWagers[1], wager2);
    }

    function test_GetWagersPaginated() public {
        // Create 5 wagers
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(creator);
            factory.createWager(
                opponent,
                address(usdc),
                WAGER_AMOUNT,
                CREATOR_USERNAME
            );
        }
        
        // Get first 3 wagers
        address[] memory wagers = factory.getWagers(0, 3);
        assertEq(wagers.length, 3);
        
        // Get next 2 wagers
        wagers = factory.getWagers(3, 3);
        assertEq(wagers.length, 2);
        
        // Get beyond range
        wagers = factory.getWagers(10, 5);
        assertEq(wagers.length, 0);
    }

    function test_GetStats() public {
        vm.prank(creator);
        factory.createWager(
            opponent,
            address(usdc),
            WAGER_AMOUNT,
            CREATOR_USERNAME
        );
        
        (uint256 totalWagers, uint256 volume, uint256 fees) = factory.getStats();
        
        assertEq(totalWagers, 1);
        assertEq(volume, WAGER_AMOUNT * 2); // Both players' deposits
        assertEq(fees, 0); // No fees collected yet
    }

    function test_RevertUnsupportedToken() public {
        MockERC20 unsupportedToken = new MockERC20("Bad Token", "BAD", 18);
        
        vm.prank(creator);
        vm.expectRevert(WagerFactory.TokenNotSupported.selector);
        factory.createWager(
            opponent,
            address(unsupportedToken),
            WAGER_AMOUNT,
            CREATOR_USERNAME
        );
    }

    function test_EmitWagerCreatedEvent() public {
        vm.prank(creator);
        
        // Just check that event is emitted (don't check address)
        vm.expectEmit(false, true, true, true);
        emit WagerFactory.WagerCreated(
            address(0), // We don't know the address yet
            creator,
            opponent,
            address(usdc),
            WAGER_AMOUNT
        );
        
        factory.createWager(
            opponent,
            address(usdc),
            WAGER_AMOUNT,
            CREATOR_USERNAME
        );
    }
}
