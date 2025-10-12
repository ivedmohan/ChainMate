// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Wager.sol";

contract WagerFactory is Ownable {
    address public immutable treasury;
    address public immutable reclaimVerifier;
    address[] public allWagers;

    mapping(address => bool) public supportedTokens;
    mapping(address => address[]) public userWagers;
    mapping(address => bool) private wagerExists;

    uint256 public totalVolume;
    uint256 public totalFeesCollected;

    event WagerCreated(
        address indexed wagerAddress,
        address indexed creator,
        address indexed opponent,
        address token,
        uint256 amount
    );

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event FeesRecorded(address indexed wager, uint256 amount);

    error TokenNotSupported();
    error InvalidAddress();
    error InvalidAmount();

    constructor(
        address _treasury,
        address[] memory _supportedTokens,
        address _reclaimVerifier
    ) Ownable(msg.sender) {
        if (_treasury == address(0) || _reclaimVerifier == address(0)) {
            revert InvalidAddress();
        }

        treasury = _treasury;
        reclaimVerifier = _reclaimVerifier;

        for (uint256 i = 0; i < _supportedTokens.length; i++) {
            supportedTokens[_supportedTokens[i]] = true;
            emit TokenAdded(_supportedTokens[i]);
        }
    }

    function createWager(
        address _opponent,
        address _token,
        uint256 _amount,
        string calldata _creatorChessUsername
    ) external returns (address wagerAddress) {
        if (!supportedTokens[_token]) revert TokenNotSupported();
        if (_amount < 1e6) revert InvalidAmount();
        if (_amount > 10000e6) revert InvalidAmount();

        Wager wager = new Wager(
            msg.sender,
            _opponent,
            _token,
            _amount,
            _creatorChessUsername,
            treasury,
            reclaimVerifier,
            address(this)
        );

        wagerAddress = address(wager);

        allWagers.push(wagerAddress);
        wagerExists[wagerAddress] = true;
        userWagers[msg.sender].push(wagerAddress);
        userWagers[_opponent].push(wagerAddress);

        totalVolume += _amount * 2;

        emit WagerCreated(wagerAddress, msg.sender, _opponent, _token, _amount);
    }

    function recordFees(uint256 _amount) external {
        if (!wagerExists[msg.sender]) {
            revert InvalidAddress();
        }

        totalFeesCollected += _amount;
        emit FeesRecorded(msg.sender, _amount);
    }

    function addSupportedToken(address _token) external onlyOwner {
        if (_token == address(0)) revert InvalidAddress();
        supportedTokens[_token] = true;
        emit TokenAdded(_token);
    }

    function removeSupportedToken(address _token) external onlyOwner {
        supportedTokens[_token] = false;
        emit TokenRemoved(_token);
    }

    function getUserWagers(address _user) external view returns (address[] memory) {
        return userWagers[_user];
    }

    function getTotalWagers() external view returns (uint256) {
        return allWagers.length;
    }

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

    function isSupportedToken(address _token) external view returns (bool) {
        return supportedTokens[_token];
    }

    function getStats() 
        external 
        view 
        returns (uint256 totalWagers, uint256 volume, uint256 fees) 
    {
        return (allWagers.length, totalVolume, totalFeesCollected);
    }
}