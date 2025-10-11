// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Wager
 * @dev Individual wager contract for peer-to-peer chess betting
 * @notice This contract manages a single wager between two players
 */
contract Wager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Enums ============

    enum WagerState {
        Created,        // Wager created, waiting for opponent deposit
        Funded,         // Both players deposited, game can start
        GameLinked,     // Chess.com game linked
        Completed,      // Game finished, waiting for proof
        Settled,        // Funds distributed
        Cancelled,      // Wager cancelled
        Disputed        // In dispute resolution
    }

    // ============ Structs ============

    struct WagerData {
        address creator;
        address opponent;
        address token;                  // USDC or PYUSD address
        uint256 amount;                 // Amount per player
        string creatorChessUsername;
        string opponentChessUsername;
        string gameId;                  // Chess.com game ID
        WagerState state;
        address winner;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 expiresAt;
        uint256 settledAt;
        bool creatorDeposited;
        bool opponentDeposited;
        uint256 platformFee;            // Calculated fee amount
    }

    // ============ State Variables ============

    WagerData public wagerData;
    address public immutable treasury;  // Platform treasury for fees
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2% in basis points
    uint256 public constant DRAW_FEE_BPS = 100;     // 1% each player for draws
    uint256 public constant EXPIRY_DURATION = 24 hours; // Time to accept wager

    // ============ Events ============

    event WagerCreated(
        address indexed creator,
        address indexed opponent,
        address indexed token,
        uint256 amount,
        string creatorChessUsername
    );

    event WagerFunded(
        address indexed player,
        uint256 totalPot
    );

    event GameLinked(
        string indexed gameId,
        address indexed linkedBy
    );

    event OutcomeVerified(
        string indexed gameId,
        address indexed winner,
        string result
    );

    event WagerSettled(
        address indexed winner,
        uint256 winnings,
        uint256 platformFee
    );

    event WagerCancelled(
        address indexed cancelledBy,
        string reason
    );

    event DisputeInitiated(
        address indexed initiatedBy,
        string reason
    );

    // ============ Errors ============

    error WagerAlreadyFunded();
    error WagerNotFunded();
    error WagerExpired();
    error WagerAlreadySettled();
    error UnauthorizedCaller();
    error InvalidProof();
    error InsufficientBalance();
    error InvalidAmount();
    error InvalidState();
    error GameAlreadyLinked();
    error UsernamesMismatch();
    error TransferFailed();
    error InvalidToken();
    error SamePlayer();

    // ============ Modifiers ============

    modifier onlyParticipants() {
        if (msg.sender != wagerData.creator && msg.sender != wagerData.opponent) {
            revert UnauthorizedCaller();
        }
        _;
    }

    modifier inState(WagerState _state) {
        if (wagerData.state != _state) {
            revert InvalidState();
        }
        _;
    }

    modifier notExpired() {
        if (block.timestamp > wagerData.expiresAt && wagerData.state == WagerState.Created) {
            revert WagerExpired();
        }
        _;
    }

    // ============ Constructor ============

    /**
     * @dev Initialize a new wager
     * @param _creator Address of the creator
     * @param _opponent Address of the opponent
     * @param _token Address of the token (USDC or PYUSD)
     * @param _amount Amount each player must deposit
     * @param _creatorChessUsername Creator's Chess.com username
     * @param _treasury Platform treasury address
     */
    constructor(
        address _creator,
        address _opponent,
        address _token,
        uint256 _amount,
        string memory _creatorChessUsername,
        address _treasury
    ) {
        if (_creator == address(0) || _opponent == address(0) || _token == address(0) || _treasury == address(0)) {
            revert InvalidToken();
        }
        if (_amount == 0) {
            revert InvalidAmount();
        }
        if (_creator == _opponent) {
            revert SamePlayer();
        }

        treasury = _treasury;

        wagerData = WagerData({
            creator: _creator,
            opponent: _opponent,
            token: _token,
            amount: _amount,
            creatorChessUsername: _creatorChessUsername,
            opponentChessUsername: "",
            gameId: "",
            state: WagerState.Created,
            winner: address(0),
            createdAt: block.timestamp,
            fundedAt: 0,
            expiresAt: block.timestamp + EXPIRY_DURATION,
            settledAt: 0,
            creatorDeposited: false,
            opponentDeposited: false,
            platformFee: 0
        });

        emit WagerCreated(
            msg.sender,
            _opponent,
            _token,
            _amount,
            _creatorChessUsername
        );
    }

    // ============ External Functions ============

    /**
     * @dev Creator deposits their stake
     * @notice Creator must approve tokens before calling this
     */
    function creatorDeposit() external nonReentrant {
        if (msg.sender != wagerData.creator) {
            revert UnauthorizedCaller();
        }
        if (wagerData.creatorDeposited) {
            revert WagerAlreadyFunded();
        }
        if (wagerData.state != WagerState.Created) {
            revert InvalidState();
        }

        wagerData.creatorDeposited = true;
        IERC20(wagerData.token).safeTransferFrom(
            msg.sender,
            address(this),
            wagerData.amount
        );

        _checkIfFullyFunded();
    }

    /**
     * @dev Opponent accepts wager and deposits their stake
     * @param _opponentChessUsername Opponent's Chess.com username
     */
    function acceptWager(string calldata _opponentChessUsername) 
        external 
        nonReentrant 
        inState(WagerState.Created)
        notExpired
    {
        if (msg.sender != wagerData.opponent) {
            revert UnauthorizedCaller();
        }
        if (wagerData.opponentDeposited) {
            revert WagerAlreadyFunded();
        }

        wagerData.opponentChessUsername = _opponentChessUsername;
        wagerData.opponentDeposited = true;

        IERC20(wagerData.token).safeTransferFrom(
            msg.sender,
            address(this),
            wagerData.amount
        );

        _checkIfFullyFunded();
    }

    /**
     * @dev Link a Chess.com game to this wager
     * @param _gameId Chess.com game ID
     */
    function linkGame(string calldata _gameId) 
        external 
        onlyParticipants 
        inState(WagerState.Funded)
    {
        if (bytes(wagerData.gameId).length > 0) {
            revert GameAlreadyLinked();
        }

        wagerData.gameId = _gameId;
        wagerData.state = WagerState.GameLinked;

        emit GameLinked(_gameId, msg.sender);
    }

    /**
     * @dev Submit proof of game outcome (placeholder for Reclaim integration)
     * @param _winner Address of the winner (address(0) for draw)
     * @param _result Game result string ("win", "draw", "loss")
     */
    function submitProof(address _winner, string calldata _result) 
        external 
        onlyParticipants 
        inState(WagerState.GameLinked)
    {
        // TODO: Integrate with Reclaim Protocol for actual proof verification
        // For now, this is a placeholder that accepts any participant's submission
        
        if (_winner != address(0) && _winner != wagerData.creator && _winner != wagerData.opponent) {
            revert InvalidProof();
        }

        wagerData.winner = _winner;
        wagerData.state = WagerState.Completed;

        emit OutcomeVerified(wagerData.gameId, _winner, _result);
    }

    /**
     * @dev Resolve wager with verified outcome (called by ReclaimVerifier)
     * @param _winner Address of the winner (address(0) for draw)
     * @param _result Game result string
     */
    function resolveWager(address _winner, string calldata _result) 
        external 
        inState(WagerState.GameLinked)
    {
        // TODO: Add access control - only allow verified ReclaimVerifier contract
        // For now, allow any caller for testing
        
        if (_winner != address(0) && _winner != wagerData.creator && _winner != wagerData.opponent) {
            revert InvalidProof();
        }

        wagerData.winner = _winner;
        wagerData.state = WagerState.Completed;

        emit OutcomeVerified(wagerData.gameId, _winner, _result);
    }

    /**
     * @dev Settle the wager after outcome verification
     */
    function settle() external nonReentrant inState(WagerState.Completed) {
        if (wagerData.winner == address(0)) {
            _settleDraw();
        } else {
            _settleWin();
        }

        wagerData.state = WagerState.Settled;
        wagerData.settledAt = block.timestamp;
    }

    /**
     * @dev Handle draw settlement
     */
    function _settleDraw() internal {
        uint256 fee = (wagerData.amount * DRAW_FEE_BPS) / 10000;
        uint256 payout = wagerData.amount - fee;
        
        // Transfer refunds
        IERC20(wagerData.token).safeTransfer(wagerData.creator, payout);
        IERC20(wagerData.token).safeTransfer(wagerData.opponent, payout);
        
        // Transfer fees to treasury
        if (fee > 0) {
            IERC20(wagerData.token).safeTransfer(treasury, fee * 2);
        }
        
        wagerData.platformFee = fee * 2;
        emit WagerSettled(address(0), payout, fee * 2);
    }

    /**
     * @dev Handle win settlement
     */
    function _settleWin() internal {
        uint256 totalPot = wagerData.amount * 2;
        uint256 fee = (totalPot * PLATFORM_FEE_BPS) / 10000;
        uint256 payout = totalPot - fee;
        
        // Transfer winnings to winner
        IERC20(wagerData.token).safeTransfer(wagerData.winner, payout);
        
        // Transfer fee to treasury
        if (fee > 0) {
            IERC20(wagerData.token).safeTransfer(treasury, fee);
        }
        
        wagerData.platformFee = fee;
        emit WagerSettled(wagerData.winner, payout, fee);
    }

    /**
     * @dev Cancel wager if opponent doesn't accept in time
     */
    function cancel() external nonReentrant {
        if (msg.sender != wagerData.creator) {
            revert UnauthorizedCaller();
        }
        if (wagerData.state != WagerState.Created) {
            revert InvalidState();
        }
        if (block.timestamp <= wagerData.expiresAt && wagerData.opponentDeposited) {
            revert InvalidState();
        }

        wagerData.state = WagerState.Cancelled;

        // Refund creator if they deposited
        if (wagerData.creatorDeposited) {
            IERC20(wagerData.token).safeTransfer(wagerData.creator, wagerData.amount);
        }

        emit WagerCancelled(msg.sender, "Expired or cancelled by creator");
    }

    /**
     * @dev Initiate dispute resolution
     * @param _reason Reason for dispute
     */
    function dispute(string calldata _reason) external onlyParticipants {
        if (wagerData.state == WagerState.Settled || wagerData.state == WagerState.Cancelled) {
            revert InvalidState();
        }

        wagerData.state = WagerState.Disputed;
        emit DisputeInitiated(msg.sender, _reason);
    }

    // ============ View Functions ============

    /**
     * @dev Get current wager data
     */
    function getWagerData() external view returns (WagerData memory) {
        return wagerData;
    }

    /**
     * @dev Get contract balance for the wager token
     */
    function getBalance() external view returns (uint256) {
        return IERC20(wagerData.token).balanceOf(address(this));
    }

    /**
     * @dev Check if wager is expired
     */
    function isExpired() external view returns (bool) {
        return block.timestamp > wagerData.expiresAt && wagerData.state == WagerState.Created;
    }

    // ============ Internal Functions ============

    /**
     * @dev Check if both players have deposited and update state
     */
    function _checkIfFullyFunded() internal {
        if (wagerData.creatorDeposited && wagerData.opponentDeposited) {
            wagerData.state = WagerState.Funded;
            wagerData.fundedAt = block.timestamp;
            
            uint256 totalPot = wagerData.amount * 2;
            emit WagerFunded(msg.sender, totalPot);
        }
    }
}