// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IWagerFactory
 * @dev Interface for WagerFactory fee tracking
 */
interface IWagerFactory {
    function recordFees(uint256 _amount) external;
}

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
        address token;
        uint256 amount;
        string creatorChessUsername;
        string opponentChessUsername;
        string gameId;
        WagerState state;
        address winner;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 expiresAt;
        uint256 settledAt;
        bool creatorDeposited;
        bool opponentDeposited;
        uint256 platformFee;
    }

    // ============ State Variables ============

    WagerData public wagerData;
    address public immutable treasury;
    address public immutable reclaimVerifier;
    address public immutable factory;
    
    uint256 public constant PLATFORM_FEE_BPS = 200;
    uint256 public constant DRAW_FEE_BPS = 100;
    uint256 public constant EXPIRY_DURATION = 24 hours;
    uint256 public constant SETTLEMENT_TIMEOUT = 7 days;

    mapping(address => bool) public cancelVotes;

    // ============ Events ============

    event WagerCreated(
        address indexed creator,
        address indexed opponent,
        address indexed token,
        uint256 amount,
        string creatorChessUsername
    );

    event WagerFunded(address indexed player, uint256 totalPot);

    event GameLinked(string indexed gameId, address indexed linkedBy);

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

    event WagerCancelled(address indexed cancelledBy, string reason);

    event DisputeInitiated(address indexed initiatedBy, string reason);

    // ============ Errors ============

    error WagerAlreadyFunded();
    error WagerExpired();
    error WagerNotExpired();
    error UnauthorizedCaller();
    error InvalidProof();
    error InvalidAmount();
    error InvalidState();
    error GameAlreadyLinked();
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

    constructor(
        address _creator,
        address _opponent,
        address _token,
        uint256 _amount,
        string memory _creatorChessUsername,
        address _treasury,
        address _reclaimVerifier,
        address _factory
    ) {
        if (_creator == address(0) || _opponent == address(0) || _token == address(0) || 
            _treasury == address(0) || _reclaimVerifier == address(0) || _factory == address(0)) {
            revert InvalidToken();
        }
        if (_amount == 0) {
            revert InvalidAmount();
        }
        if (_creator == _opponent) {
            revert SamePlayer();
        }
        if (bytes(_creatorChessUsername).length == 0) {
            revert InvalidProof();
        }

        treasury = _treasury;
        reclaimVerifier = _reclaimVerifier;
        factory = _factory;

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

        emit WagerCreated(_creator, _opponent, _token, _amount, _creatorChessUsername);
    }

    // ============ External Functions ============

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
        if (bytes(_opponentChessUsername).length == 0) {
            revert InvalidProof();
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

    function linkGame(string calldata _gameId) 
        external 
        onlyParticipants 
        inState(WagerState.Funded)
    {
        if (bytes(wagerData.gameId).length > 0) {
            revert GameAlreadyLinked();
        }
        if (bytes(_gameId).length == 0) {
            revert InvalidProof();
        }

        wagerData.gameId = _gameId;
        wagerData.state = WagerState.GameLinked;

        emit GameLinked(_gameId, msg.sender);
    }

    function resolveWager(address _winner, string calldata _result) 
        external 
        inState(WagerState.GameLinked)
    {
        if (msg.sender != reclaimVerifier) {
            revert UnauthorizedCaller();
        }
        
        if (_winner != address(0) && _winner != wagerData.creator && _winner != wagerData.opponent) {
            revert InvalidProof();
        }

        wagerData.winner = _winner;
        wagerData.state = WagerState.Completed;

        emit OutcomeVerified(wagerData.gameId, _winner, _result);
    }

    function settle() external nonReentrant inState(WagerState.Completed) {
        if (wagerData.winner == address(0)) {
            _settleDraw();
        } else {
            _settleWin();
        }

        wagerData.state = WagerState.Settled;
        wagerData.settledAt = block.timestamp;
    }

    function _settleDraw() internal {
        uint256 fee = (wagerData.amount * DRAW_FEE_BPS) / 10000;
        uint256 payout = wagerData.amount - fee;
        
        IERC20(wagerData.token).safeTransfer(wagerData.creator, payout);
        IERC20(wagerData.token).safeTransfer(wagerData.opponent, payout);
        
        if (fee > 0) {
            uint256 totalFee = fee * 2;
            IERC20(wagerData.token).safeTransfer(treasury, totalFee);
            
            try IWagerFactory(factory).recordFees(totalFee) {} catch {}
            wagerData.platformFee = totalFee;
        }
        
        emit WagerSettled(address(0), payout, fee * 2);
    }

    function _settleWin() internal {
        uint256 totalPot = wagerData.amount * 2;
        uint256 fee = (totalPot * PLATFORM_FEE_BPS) / 10000;
        uint256 payout = totalPot - fee;
        
        IERC20(wagerData.token).safeTransfer(wagerData.winner, payout);
        
        if (fee > 0) {
            IERC20(wagerData.token).safeTransfer(treasury, fee);
            
            try IWagerFactory(factory).recordFees(fee) {} catch {}
            wagerData.platformFee = fee;
        }
        
        emit WagerSettled(wagerData.winner, payout, fee);
    }

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

        if (wagerData.creatorDeposited) {
            IERC20(wagerData.token).safeTransfer(wagerData.creator, wagerData.amount);
        }

        emit WagerCancelled(msg.sender, "Expired or cancelled by creator");
    }

    function claimTimeout() external nonReentrant onlyParticipants {
        if (wagerData.state != WagerState.GameLinked) {
            revert InvalidState();
        }
        if (block.timestamp < wagerData.fundedAt + SETTLEMENT_TIMEOUT) {
            revert WagerNotExpired();
        }

        wagerData.state = WagerState.Cancelled;
        
        IERC20(wagerData.token).safeTransfer(wagerData.creator, wagerData.amount);
        IERC20(wagerData.token).safeTransfer(wagerData.opponent, wagerData.amount);

        emit WagerCancelled(msg.sender, "7-day timeout - game incomplete");
    }

    function voteToCancelMutual() external nonReentrant onlyParticipants {
        if (wagerData.state != WagerState.Funded && wagerData.state != WagerState.GameLinked) {
            revert InvalidState();
        }

        cancelVotes[msg.sender] = true;

        if (cancelVotes[wagerData.creator] && cancelVotes[wagerData.opponent]) {
            wagerData.state = WagerState.Cancelled;
            
            IERC20(wagerData.token).safeTransfer(wagerData.creator, wagerData.amount);
            IERC20(wagerData.token).safeTransfer(wagerData.opponent, wagerData.amount);

            emit WagerCancelled(msg.sender, "Mutual cancellation");
        }
    }

    function dispute(string calldata _reason) external onlyParticipants {
        if (wagerData.state == WagerState.Settled || wagerData.state == WagerState.Cancelled) {
            revert InvalidState();
        }

        wagerData.state = WagerState.Disputed;
        emit DisputeInitiated(msg.sender, _reason);
    }

    // ============ View Functions ============

    function getWagerData() external view returns (WagerData memory) {
        return wagerData;
    }

    function getBalance() external view returns (uint256) {
        return IERC20(wagerData.token).balanceOf(address(this));
    }

    function isExpired() external view returns (bool) {
        return block.timestamp > wagerData.expiresAt && wagerData.state == WagerState.Created;
    }

    // ============ Internal Functions ============

    function _checkIfFullyFunded() internal {
        if (wagerData.creatorDeposited && wagerData.opponentDeposited) {
            wagerData.state = WagerState.Funded;
            wagerData.fundedAt = block.timestamp;
            
            uint256 totalPot = wagerData.amount * 2;
            emit WagerFunded(msg.sender, totalPot);
        }
    }
}