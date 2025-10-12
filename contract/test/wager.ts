import { describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
import { parseUnits } from "viem";
import "@nomicfoundation/hardhat-toolbox-viem";

// @ts-expect-error - viem is added by hardhat-toolbox-viem plugin
const viem = hre.viem;

describe("Wager Integration Tests", () => {
  async function deployWagerFixture() {
    const [creator, opponent, treasury, other] =
      await viem.getWalletClients();

    // Deploy MockERC20 token (USDC with 6 decimals)
    const mockToken = await viem.deployContract("MockERC20", [
      "Mock USDC",
      "USDC",
      6,
    ]);

    const wagerAmount = parseUnits("100", 6); // 100 USDC
    const creatorUsername = "player1";
    const opponentUsername = "player2";
    const gameId = "chess.com/game/123456";

    // Mint tokens to players
    await mockToken.write.mint([
      creator.account.address,
      parseUnits("1000", 6),
    ]);
    await mockToken.write.mint([
      opponent.account.address,
      parseUnits("1000", 6),
    ]);

    // Deploy ReclaimVerifier first
    const reclaimVerifier = await viem.deployContract("ReclaimVerifier");

    // Mock factory address
    const mockFactory = "0x0000000000000000000000000000000000000999";

    // Deploy Wager contract with proper contract address
    const wager = await viem.deployContract(
      "Wager",
      [
        creator.account.address,      // creator
        opponent.account.address,     // opponent
        mockToken.contract.address,   // token
        wagerAmount,                  // amount
        creatorUsername,              // creatorChessUsername
        treasury.account.address,     // treasury
        reclaimVerifier.address,      // reclaimVerifier
        mockFactory,                  // factory
      ],
      { client: { wallet: creator } }
    );

    const publicClient = await viem.getPublicClient();

    return {
      wager,
      mockToken,
      creator,
      opponent,
      treasury,
      other,
      wagerAmount,
      creatorUsername,
      opponentUsername,
      gameId,
      publicClient,
    };
  }

  describe("Deployment", () => {
    it("Should set the correct initial state", async () => {
      const {
        wager,
        creator,
        opponent,
        mockToken,
        wagerAmount,
        creatorUsername,
      } = await deployWagerFixture();

      const wagerData = await wager.read.getWagerData();

      assert.equal(
        wagerData.creator.toLowerCase(),
        creator.account.address.toLowerCase()
      );
      assert.equal(
        wagerData.opponent.toLowerCase(),
        opponent.account.address.toLowerCase()
      );
      assert.equal(
        wagerData.token.toLowerCase(),
        mockToken.contract.address.toLowerCase() // Fixed: use contract.address
      );
      assert.equal(wagerData.amount, wagerAmount);
      assert.equal(wagerData.creatorChessUsername, creatorUsername);
      assert.equal(wagerData.state, 0); // Created state
    });
  });

  describe("Deposits", () => {
    it("Should allow creator to deposit", async () => {
      const { wager, mockToken, creator, wagerAmount } =
        await deployWagerFixture();

      // Approve tokens - use contract.address
      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: creator.account,
      });

      // Deposit
      await wager.write.creatorDeposit([], { account: creator.account });

      const wagerData = await wager.read.getWagerData();
      assert.equal(wagerData.creatorDeposited, true);

      const balance = await mockToken.read.balanceOf([wager.contract.address]);
      assert.equal(balance, wagerAmount);
    });

    it("Should allow opponent to accept wager", async () => {
      const {
        wager,
        mockToken,
        creator,
        opponent,
        wagerAmount,
        opponentUsername,
      } = await deployWagerFixture();

      // Creator deposits first
      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: creator.account,
      });
      await wager.write.creatorDeposit([], { account: creator.account });

      // Opponent accepts
      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: opponent.account,
      });
      await wager.write.acceptWager([opponentUsername], {
        account: opponent.account,
      });

      const wagerData = await wager.read.getWagerData();
      assert.equal(wagerData.opponentDeposited, true);
      assert.equal(wagerData.opponentChessUsername, opponentUsername);
      assert.equal(wagerData.state, 1); // Funded state

      const balance = await mockToken.read.balanceOf([wager.contract.address]);
      assert.equal(balance, wagerAmount * 2n);
    });

    it("Should emit WagerFunded event when both players deposit", async () => {
      const {
        wager,
        mockToken,
        creator,
        opponent,
        wagerAmount,
        opponentUsername,
        publicClient,
      } = await deployWagerFixture();

      // Creator deposits
      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: creator.account,
      });
      await wager.write.creatorDeposit([], { account: creator.account });

      // Opponent accepts
      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: opponent.account,
      });
      const hash = await wager.write.acceptWager([opponentUsername], {
        account: opponent.account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      assert.equal(receipt.status, "success");

      // Check for WagerFunded event
      const events = await publicClient.getContractEvents({
        address: wager.contract.address,
        abi: wager.abi,
        eventName: "WagerFunded",
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      assert.equal(events.length, 1);
      assert.equal(events[0].args.totalPot, wagerAmount * 2n);
    });
  });

  describe("Game Linking", () => {
    it("Should allow linking a game after funding", async () => {
      const {
        wager,
        mockToken,
        creator,
        opponent,
        wagerAmount,
        opponentUsername,
        gameId,
      } = await deployWagerFixture();

      // Fund wager
      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: creator.account,
      });
      await wager.write.creatorDeposit([], { account: creator.account });

      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: opponent.account,
      });
      await wager.write.acceptWager([opponentUsername], {
        account: opponent.account,
      });

      // Link game
      await wager.write.linkGame([gameId], { account: creator.account });

      const wagerData = await wager.read.getWagerData();
      assert.equal(wagerData.gameId, gameId);
      assert.equal(wagerData.state, 2); // GameLinked state
    });
  });

  describe("Settlement", () => {
    async function setupFundedAndLinkedWager() {
      const fixture = await deployWagerFixture();
      const {
        wager,
        mockToken,
        creator,
        opponent,
        wagerAmount,
        opponentUsername,
        gameId,
      } = fixture;

      // Fund wager
      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: creator.account,
      });
      await wager.write.creatorDeposit([], { account: creator.account });

      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: opponent.account,
      });
      await wager.write.acceptWager([opponentUsername], {
        account: opponent.account,
      });

      // Link game
      await wager.write.linkGame([gameId], { account: creator.account });

      return fixture;
    }

    it("Should settle with winner correctly", async () => {
      const { wager, mockToken, creator, wagerAmount, treasury } =
        await setupFundedAndLinkedWager();

      // Submit proof with creator as winner
      await wager.write.submitProof([creator.account.address, "win"], {
        account: creator.account,
      });

      // Get balances before settlement
      const creatorBalanceBefore = await mockToken.read.balanceOf([
        creator.account.address,
      ]);
      const treasuryBalanceBefore = await mockToken.read.balanceOf([
        treasury.account.address,
      ]);

      // Settle
      await wager.write.settle();

      // Check balances after settlement
      const totalPot = wagerAmount * 2n;
      const expectedFee = (totalPot * 200n) / 10000n; // 2%
      const expectedWinnings = totalPot - expectedFee;

      const creatorBalanceAfter = await mockToken.read.balanceOf([
        creator.account.address,
      ]);
      const treasuryBalanceAfter = await mockToken.read.balanceOf([
        treasury.account.address,
      ]);

      assert.equal(
        creatorBalanceAfter - creatorBalanceBefore,
        expectedWinnings
      );
      assert.equal(
        treasuryBalanceAfter - treasuryBalanceBefore,
        expectedFee
      );

      const wagerData = await wager.read.getWagerData();
      assert.equal(wagerData.state, 4); // Settled state
    });

    it("Should settle draw correctly", async () => {
      const { wager, mockToken, creator, opponent, wagerAmount, treasury } =
        await setupFundedAndLinkedWager();

      // Submit proof with draw (address(0))
      await wager.write.submitProof(
        ["0x0000000000000000000000000000000000000000", "draw"],
        {
          account: creator.account,
        }
      );

      // Get balances before settlement
      const creatorBalanceBefore = await mockToken.read.balanceOf([
        creator.account.address,
      ]);
      const opponentBalanceBefore = await mockToken.read.balanceOf([
        opponent.account.address,
      ]);
      const treasuryBalanceBefore = await mockToken.read.balanceOf([
        treasury.account.address,
      ]);

      // Settle
      await wager.write.settle();

      // Check balances after settlement (1% fee each)
      const expectedFeePerPlayer = (wagerAmount * 100n) / 10000n; // 1%
      const expectedRefund = wagerAmount - expectedFeePerPlayer;

      const creatorBalanceAfter = await mockToken.read.balanceOf([
        creator.account.address,
      ]);
      const opponentBalanceAfter = await mockToken.read.balanceOf([
        opponent.account.address,
      ]);
      const treasuryBalanceAfter = await mockToken.read.balanceOf([
        treasury.account.address,
      ]);

      assert.equal(
        creatorBalanceAfter - creatorBalanceBefore,
        expectedRefund
      );
      assert.equal(
        opponentBalanceAfter - opponentBalanceBefore,
        expectedRefund
      );
      assert.equal(
        treasuryBalanceAfter - treasuryBalanceBefore,
        expectedFeePerPlayer * 2n
      );
    });
  });

  describe("Cancellation", () => {
    it("Should allow creator to cancel expired wager", async () => {
      const { wager, mockToken, creator, wagerAmount, publicClient } =
        await deployWagerFixture();

      // Creator deposits
      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: creator.account,
      });
      await wager.write.creatorDeposit([], { account: creator.account });

      // Fast forward time past expiry (24 hours)
      // Use test client methods for time manipulation
      await publicClient.request({
        method: "evm_increaseTime",
        params: [25 * 60 * 60], // 25 hours in seconds
      });
      await publicClient.request({
        method: "evm_mine",
        params: [],
      });

      // Get balance before cancel
      const balanceBefore = await mockToken.read.balanceOf([
        creator.account.address,
      ]);

      // Cancel
      await wager.write.cancel([], { account: creator.account });

      // Check refund
      const balanceAfter = await mockToken.read.balanceOf([
        creator.account.address,
      ]);
      assert.equal(balanceAfter - balanceBefore, wagerAmount);

      const wagerData = await wager.read.getWagerData();
      assert.equal(wagerData.state, 5); // Cancelled state
    });
  });

  describe("Access Control", () => {
    it("Should revert if non-creator tries to deposit as creator", async () => {
      const { wager, mockToken, opponent, wagerAmount } =
        await deployWagerFixture();

      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: opponent.account,
      });

      await assert.rejects(
        async () => {
          await wager.write.creatorDeposit([], { account: opponent.account });
        },
        {
          name: "ContractFunctionExecutionError",
        }
      );
    });

    it("Should revert if non-participant tries to link game", async () => {
      const {
        wager,
        mockToken,
        creator,
        opponent,
        wagerAmount,
        opponentUsername,
        gameId,
        other,
      } = await deployWagerFixture();

      // Fund wager
      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: creator.account,
      });
      await wager.write.creatorDeposit([], { account: creator.account });

      await mockToken.write.approve([wager.contract.address, wagerAmount], {
        account: opponent.account,
      });
      await wager.write.acceptWager([opponentUsername], {
        account: opponent.account,
      });

      // Try to link game as non-participant
      await assert.rejects(
        async () => {
          await wager.write.linkGame([gameId], { account: other.account });
        },
        {
          name: "ContractFunctionExecutionError",
        }
      );
    });
  });
});