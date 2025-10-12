// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Wager.sol";

contract ReclaimVerifier {
    
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
    
    error InvalidProof();
    error InvalidWagerContract();
    error ProofAlreadyUsed();
    error UnauthorizedSubmitter();
    error WagerNotActive();
    error InvalidGameData();
    error ProofExpired();
    
    mapping(bytes32 => bool) public usedProofs;
    mapping(address => bool) public resolvedWagers;
    
    uint256 public constant PROOF_VALIDITY_PERIOD = 24 hours;

    struct EncodedGameProof {
        string gameId;
        string result;
        uint256 timestamp;
        bytes32 whitePlayerHash;
        bytes32 blackPlayerHash;
    }
    
    struct GameProof {
        string gameId;
        address winner;
        string result;
        uint256 timestamp;
    }
    
    function verifyChessGameProof(
        bytes calldata encodedProof,
        address wagerContract,
        address whitePlayerAddress,
        address blackPlayerAddress
    ) external {
        if (wagerContract == address(0)) {
            revert InvalidWagerContract();
        }
        
        bytes32 proofHash = keccak256(encodedProof);
        if (usedProofs[proofHash]) {
            revert ProofAlreadyUsed();
        }
        
        if (resolvedWagers[wagerContract]) {
            revert WagerNotActive();
        }
        
        GameProof memory gameData = _verifyAndExtractProof(
            encodedProof, 
            whitePlayerAddress, 
            blackPlayerAddress
        );
        
        Wager wager = Wager(wagerContract);
        _validateWagerParticipants(wager, gameData, msg.sender, whitePlayerAddress, blackPlayerAddress);
        
        usedProofs[proofHash] = true;
        resolvedWagers[wagerContract] = true;
        
        wager.resolveWager(gameData.winner, gameData.result);
        
        emit ProofVerified(
            wagerContract,
            gameData.winner,
            gameData.gameId,
            proofHash
        );
    }
    
    function validateProof(
        bytes calldata encodedProof,
        address whitePlayerAddress,
        address blackPlayerAddress
    ) external view returns (bool isValid, GameProof memory gameData) {
        try this._verifyAndExtractProof(encodedProof, whitePlayerAddress, blackPlayerAddress) 
            returns (GameProof memory data) 
        {
            return (true, data);
        } catch {
            return (false, GameProof("", address(0), "", 0));
        }
    }
    
    function _verifyAndExtractProof(
        bytes calldata encodedProof,
        address whitePlayerAddress,
        address blackPlayerAddress
    ) public view returns (GameProof memory gameData) {
        EncodedGameProof memory proof = abi.decode(encodedProof, (EncodedGameProof));
        
        if (bytes(proof.gameId).length == 0) {
            revert InvalidGameData();
        }
        
        if (bytes(proof.result).length == 0) {
            revert InvalidGameData();
        }
        
        if (proof.timestamp == 0 || proof.timestamp > block.timestamp) {
            revert InvalidGameData();
        }
        
        if (block.timestamp - proof.timestamp > PROOF_VALIDITY_PERIOD) {
            revert ProofExpired();
        }
        
        address winner = _determineWinner(proof.result, whitePlayerAddress, blackPlayerAddress);
        
        gameData = GameProof({
            gameId: proof.gameId,
            winner: winner,
            result: proof.result,
            timestamp: proof.timestamp
        });
        
        return gameData;
    }
    
    function _determineWinner(
        string memory result,
        address whitePlayerAddress,
        address blackPlayerAddress
    ) internal pure returns (address) {
        if (_compareStrings(result, "1-0") || _compareStrings(result, "1")) {
            return whitePlayerAddress;
        } else if (_compareStrings(result, "0-1") || _compareStrings(result, "0")) {
            return blackPlayerAddress;
        } else if (_compareStrings(result, "1/2-1/2") || _compareStrings(result, "0.5")) {
            return address(0);
        } else {
            revert InvalidGameData();
        }
    }
    
    function _compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
    
    function _validateWagerParticipants(
        Wager wager,
        GameProof memory gameData,
        address submitter,
        address whitePlayerAddress,
        address blackPlayerAddress
    ) internal view {
        Wager.WagerData memory wagerData = wager.getWagerData();
        
        if (wagerData.state != Wager.WagerState.GameLinked) {
            revert WagerNotActive();
        }
        
        if (submitter != wagerData.creator && submitter != wagerData.opponent) {
            revert UnauthorizedSubmitter();
        }
        
        if (gameData.winner != address(0)) {
            if (gameData.winner != wagerData.creator && gameData.winner != wagerData.opponent) {
                revert InvalidGameData();
            }
        }
        
        bool creatorMatches = (whitePlayerAddress == wagerData.creator || blackPlayerAddress == wagerData.creator);
        bool opponentMatches = (whitePlayerAddress == wagerData.opponent || blackPlayerAddress == wagerData.opponent);
        
        if (!creatorMatches || !opponentMatches) {
            revert UnauthorizedSubmitter();
        }
    }
    
    function isProofUsed(bytes32 proofHash) external view returns (bool) {
        return usedProofs[proofHash];
    }
    
    function isWagerResolved(address wagerContract) external view returns (bool) {
        return resolvedWagers[wagerContract];
    }
    
    function getProofHash(bytes calldata encodedProof) external pure returns (bytes32) {
        return keccak256(encodedProof);
    }
}