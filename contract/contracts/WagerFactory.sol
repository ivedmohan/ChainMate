// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Wager.sol";

/**
 * @title WagerFactory
 * @dev Factory contract for creating and tracking wagers
 */
contract WagerFactory {
    // ============ State Variables ============
    
    address public immutable treasury;
    address public immutable reclaimVerifier;
    address[] public allWagers;
    
    // Supported tokens (USDC and PYUSD on Base and Arbitrum)
    mapping(address => bool) public supportedTokens;
    
    // User's wagers
    mapping(address => address[]) public userWagers;
    
    // Platform statistics
    uint256 public totalVolume;
    uint256 public totalFeesCollected;
    
    // ============ Events ============
    
    event WagerCreated(
        address indexed wagerAddress,
        address indexed creator,
        address indexed opponent,
        address token,
        uint256 amount
    );
    
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    
    // ============ Errors ============
    
    error TokenNotSupported();
    error InvalidAddress();
    
    // ============ Constructor ============
    
    constructor(
        address _treasury,
        address[] memory _supportedTokens,
        address _reclaimVerifier
    ) {
        if (_treasury == address(0) || _reclaimVerifier == address(0)) {
            revert InvalidAddress();
        }
        
        treasury = _treasury;
        reclaimVerifier = _reclaimVerifier;
        
        // Add supported tokens
        for (uint256 i = 0; i < _supportedTokens.length; i++) {
            supportedTokens[_supportedTokens[i]] = true;
            emit TokenAdded(_supportedTokens[i]);
        }
    }
    
    // ============ External Functions ============
    
    /**
     * @dev Create a new wager
     * @param _opponent Address of the opponent
     * @param _token Token address (must be supported)
     * @param _amount Wager amount per player
     * @param _creatorChessUsername Creator's Chess.com username
     * @return wagerAddress Address of the deployed wager contract
     */
    function createWager(
        address _opponent,
        address _token,
        uint256 _amount,
        string calldata _creatorChessUsername
    ) external returns (address wagerAddress) {
        if (!supportedTokens[_token]) revert TokenNotSupported();
        
        // Deploy new Wager contract with ReclaimVerifier address
        Wager wager = new Wager(
            msg.sender,  // creator
            _opponent,
            _token,
            _amount,
            _creatorChessUsername,
            treasury,
            reclaimVerifier  // Pass ReclaimVerifier address
        );
        
        wagerAddress = address(wager);
        
        // Track wager
        allWagers.push(wagerAddress);
        userWagers[msg.sender].push(wagerAddress);
        userWagers[_opponent].push(wagerAddress);
        
        // Update volume
        totalVolume += _amount * 2;
        
        emit WagerCreated(
            wagerAddress,
            msg.sender,
            _opponent,
            _token,
            _amount
        );
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get all wagers for a user
     * @param _user User address
     * @return Array of wager addresses
     */
    function getUserWagers(address _user) external view returns (address[] memory) {
        return userWagers[_user];
    }
    
    /**
     * @dev Get total number of wagers
     */
    function getTotalWagers() external view returns (uint256) {
        return allWagers.length;
    }
    
    /**
     * @dev Get all wagers (paginated)
     * @param _start Start index
     * @param _limit Number of wagers to return
     */
    function getWagers(uint256 _start, uint256 _limit) 
        external 
        view 
        returns (address[] memory) 
    {
        if (_start >= allWagers.length) {
            return new address[](0);
        }
        
        uint256 end = _start + _limit;
        if (end > allWagers.length) {
            end = allWagers.length;
        }
        
        uint256 length = end - _start;
        address[] memory result = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            result[i] = allWagers[_start + i];
        }
        
        return result;
    }
    
    /**
     * @dev Check if token is supported
     */
    function isSupportedToken(address _token) external view returns (bool) {
        return supportedTokens[_token];
    }
    
    /**
     * @dev Get platform statistics
     */
    function getStats() external view returns (
        uint256 totalWagers,
        uint256 volume,
        uint256 fees
    ) {
        return (allWagers.length, totalVolume, totalFeesCollected);
    }
}
