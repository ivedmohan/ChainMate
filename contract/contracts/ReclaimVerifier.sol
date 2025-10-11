// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Wager.sol";

/**
 * @title ReclaimVerifier
 * @dev Verifies Reclaim Protocol proofs for Chess.com games and resolves wagers
 * @notice This contract handles ZK proof verification and triggers wager settlement
 */
contract ReclaimVerifier {
    
    // ============ Events ============
    
    event ProofVerified(
        address indexed wager,
        address indexed winner,
        string gameId,
        bytes32 proofHash
    );
    
    event ProofRejected(
        address indexed wager,
        address indexed submitter,
        string reason,
        bytes32 proofHash
    );
    
    // ============ Errors ============
    
    error InvalidProof();
    error InvalidWagerContract();
    error ProofAlreadyUsed();
    error UnauthorizedSubmitter();
    error WagerNotActive();
    error InvalidGameData();
    
    // ============ State Variables ============
    
    // Track used proof hashes to prevent replay attacks
    mapping(bytes32 => bool) public usedProofs;
    
    // Track verified games to prevent double resolution
    mapping(address => bool) public resolvedWagers;
    
    // ============ Structs ============
    
    struct GameProof {
        string gameId;
        address winner;
        string whitePlayer;
        string blackPlayer;
        string result;
        uint256 timestamp;
    }
    
    // ============ Main Functions ============
    
    /**
     * @dev Verify a Chess.com game proof and resolve the associated wager
     * @param proof The Reclaim Protocol proof data
     * @param wagerContract Address of the wager contract to resolve
     * @param whitePlayerAddress Wallet address of the white player
     * @param blackPlayerAddress Wallet address of the black player
     */
    function verifyChessGameProof(
        bytes calldata proof,
        address wagerContract,
        address whitePlayerAddress,
        address blackPlayerAddress
    ) external {
        // Validate inputs
        if (wagerContract == address(0)) {
            revert InvalidWagerContract();
        }
        
        // Generate proof hash for replay protection
        bytes32 proofHash = keccak256(proof);
        if (usedProofs[proofHash]) {
            revert ProofAlreadyUsed();
        }
        
        // Check if wager is already resolved
        if (resolvedWagers[wagerContract]) {
            revert WagerNotActive();
        }
        
        // Verify the proof and extract game data
        GameProof memory gameData = _verifyAndExtractProof(proof, whitePlayerAddress, blackPlayerAddress);
        
        // Get wager details to validate participants
        Wager wager = Wager(wagerContract);
        _validateWagerParticipants(wager, gameData, msg.sender);
        
        // Mark proof as used and wager as resolved
        usedProofs[proofHash] = true;
        resolvedWagers[wagerContract] = true;
        
        // Resolve the wager with the winner
        wager.resolveWager(gameData.winner, gameData.result);
        
        emit ProofVerified(
            wagerContract,
            gameData.winner,
            gameData.gameId,
            proofHash
        );
    }
    
    /**
     * @dev Check if a proof is valid without executing resolution
     * @param proof The Reclaim Protocol proof data
     * @param whitePlayerAddress Wallet address of the white player
     * @param blackPlayerAddress Wallet address of the black player
     * @return isValid Whether the proof is valid
     * @return gameData Extracted game data if valid
     */
    function validateProof(
        bytes calldata proof,
        address whitePlayerAddress,
        address blackPlayerAddress
    ) external view returns (bool isValid, GameProof memory gameData) {
        try this._verifyAndExtractProof(proof, whitePlayerAddress, blackPlayerAddress) returns (GameProof memory data) {
            return (true, data);
        } catch {
            return (false, GameProof("", address(0), "", "", "", 0));
        }
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Verify Reclaim proof and extract game data
     * @param proof The Reclaim Protocol proof data
     * @return gameData Extracted and validated game data
     */
    function _verifyAndExtractProof(
        bytes calldata proof,
        address whitePlayerAddress,
        address blackPlayerAddress
    ) public pure returns (GameProof memory gameData) {
        // Parse the proof data structure
        // Note: This is a simplified implementation
        // In production, you'd integrate with Reclaim's on-chain verifier
        
        if (proof.length < 32) {
            revert InvalidProof();
        }
        
        // Extract proof components and map to addresses
        gameData = _parseProofData(proof, whitePlayerAddress, blackPlayerAddress);
        
        // Validate extracted data
        if (bytes(gameData.gameId).length == 0) {
            revert InvalidGameData();
        }
        
        if (gameData.winner == address(0)) {
            revert InvalidGameData();
        }
        
        // Validate timestamp (proof should be recent)
        if (gameData.timestamp == 0 || gameData.timestamp > block.timestamp) {
            revert InvalidGameData();
        }
        
        // Additional validation: proof should be within last 24 hours
        if (block.timestamp - gameData.timestamp > 24 hours) {
            revert InvalidGameData();
        }
        
        return gameData;
    }
    
    /**
     * @dev Parse Reclaim proof data to extract game information
     * @param proof Raw proof bytes (JSON string from Reclaim)
     * @return gameData Parsed game data
     */
    function _parseProofData(
        bytes calldata proof,
        address whitePlayerAddress,
        address blackPlayerAddress
    ) internal pure returns (GameProof memory gameData) {
        // Convert bytes to string for JSON parsing
        string memory proofJson = string(proof);
        
        // Parse the Reclaim proof structure
        // Expected format from your Chess.com provider:
        // {
        //   "claimData": {
        //     "context": "{\"extractedParameters\":{\"black_player\":\"...\",\"white_paper\":\"...\",\"result\":\"...\"}}"
        //     "timestampS": "..."
        //   }
        // }
        
        // Extract timestamp
        uint256 timestamp = _extractTimestamp(proofJson);
        
        // Extract game parameters
        (string memory whitePlayer, string memory blackPlayer, string memory result) = _extractGameParams(proofJson);
        
        // Determine winner based on result and provided addresses
        address winner = _determineWinner(result, whitePlayerAddress, blackPlayerAddress);
        
        // Generate game ID from proof hash (since Chess.com game ID might not be directly available)
        string memory gameId = _generateGameId(proof);
        
        gameData = GameProof({
            gameId: gameId,
            winner: winner,
            whitePlayer: whitePlayer,
            blackPlayer: blackPlayer,
            result: result,
            timestamp: timestamp
        });
        
        return gameData;
    }
    
    /**
     * @dev Extract timestamp from Reclaim proof JSON
     */
    function _extractTimestamp(string memory proofJson) internal pure returns (uint256) {
        // Simple timestamp extraction (in production, use a proper JSON parser)
        // For now, return current timestamp - 1 hour as placeholder
        return block.timestamp - 1 hours;
    }
    
    /**
     * @dev Extract game parameters from Reclaim proof
     */
    function _extractGameParams(string memory proofJson) 
        internal 
        pure 
        returns (string memory whitePlayer, string memory blackPlayer, string memory result) 
    {
        // Simplified parameter extraction
        // In production, you'd parse the actual JSON structure
        whitePlayer = "player1"; // Extract from extractedParameters.white_paper
        blackPlayer = "player2"; // Extract from extractedParameters.black_player  
        result = "white_wins";   // Extract from extractedParameters.result
        
        return (whitePlayer, blackPlayer, result);
    }
    
    /**
     * @dev Determine winner address based on game result
     */
    function _determineWinner(
        string memory result,
        address whitePlayerAddress,
        address blackPlayerAddress
    ) internal pure returns (address) {
        // Map game result to winner address
        if (_compareStrings(result, "1-0") || _compareStrings(result, "white_wins")) {
            return whitePlayerAddress;
        } else if (_compareStrings(result, "0-1") || _compareStrings(result, "black_wins")) {
            return blackPlayerAddress;
        } else if (_compareStrings(result, "1/2-1/2") || _compareStrings(result, "draw")) {
            return address(0); // Draw - no winner
        } else {
            revert InvalidGameData();
        }
    }
    
    /**
     * @dev Compare two strings for equality
     */
    function _compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
    
    /**
     * @dev Generate a unique game ID from proof data
     */
    function _generateGameId(bytes calldata proof) internal pure returns (string memory) {
        bytes32 hash = keccak256(proof);
        return _bytes32ToString(hash);
    }
    
    /**
     * @dev Convert bytes32 to string
     */
    function _bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        uint8 i = 0;
        while(i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }
    
    /**
     * @dev Validate that the proof submitter is authorized for this wager
     * @param wager The wager contract
     * @param gameData Extracted game data
     * @param submitter Address submitting the proof
     */
    function _validateWagerParticipants(
        Wager wager,
        GameProof memory gameData,
        address submitter
    ) internal view {
        // Get wager data
        Wager.WagerData memory wagerData = wager.wagerData();
        
        // Check that wager is in correct state
        if (wagerData.state != Wager.WagerState.GameLinked) {
            revert WagerNotActive();
        }
        
        // Verify submitter is a participant
        if (submitter != wagerData.creator && submitter != wagerData.opponent) {
            revert UnauthorizedSubmitter();
        }
        
        // Verify winner is a participant
        if (gameData.winner != wagerData.creator && gameData.winner != wagerData.opponent) {
            revert InvalidGameData();
        }
        
        // Additional validation could include:
        // - Checking Chess.com usernames match wager participants
        // - Verifying game ID matches linked game
        // - Ensuring game was played after wager creation
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Check if a proof hash has been used
     * @param proofHash Hash of the proof to check
     * @return used Whether the proof has been used
     */
    function isProofUsed(bytes32 proofHash) external view returns (bool used) {
        return usedProofs[proofHash];
    }
    
    /**
     * @dev Check if a wager has been resolved
     * @param wagerContract Address of the wager contract
     * @return resolved Whether the wager has been resolved
     */
    function isWagerResolved(address wagerContract) external view returns (bool resolved) {
        return resolvedWagers[wagerContract];
    }
    
    /**
     * @dev Generate proof hash for a given proof
     * @param proof The proof data
     * @return proofHash The keccak256 hash of the proof
     */
    function getProofHash(bytes calldata proof) external pure returns (bytes32 proofHash) {
        return keccak256(proof);
    }
}